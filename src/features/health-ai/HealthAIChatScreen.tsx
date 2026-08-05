import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Send, Sparkles, RefreshCw, Mic, Bot, HeartPulse, X, Bell } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { Chip } from '../../components/ui/Chip';
import { useCarePulseStore } from '../../lib/store';

export const HealthAIChatScreen: React.FC = () => {
  const chatMessages = useCarePulseStore((s) => s.chatMessages);
  const addChatMessage = useCarePulseStore((s) => s.addChatMessage);
  const clearChat = useCarePulseStore((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    addChatMessage({
      sender: 'user',
      text: query.trim(),
    });

    if (!textToSend) {
      setInput('');
    }

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const quickSymptoms = [
    { label: '🤒 Fever', query: 'Fever & Chills' },
    { label: '🤕 Headache', query: 'Severe Headache' },
    { label: '🫁 Breath', query: 'Shortness of breath' },
    { label: '🧴 Rash', query: 'Skin Rash & Itching' },
  ];

  return (
    <div className="min-h-screen bg-white pb-36 w-full relative">
      <main className="px-3.5 py-3 space-y-2.5">
        {/* Page Heading & Notification Button (No TopBar) */}
        <div className="flex justify-between items-center pt-1 px-0.5">
          <div>
            <h1 className="text-base font-extrabold font-heading text-[#111827]">Health AI Assistant</h1>
            <p className="text-[11px] text-[#6B7280]">Interactive medical symptom advisor & health guidance</p>
          </div>

          <button
            onClick={() => alert('Notifications: You have 1 upcoming appointment!')}
            className="w-8 h-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all relative active:scale-95 shadow-2xs shrink-0"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-[#111827]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        {/* COMPACT EXECUTIVE AI BANNER */}
        <div className="bg-gradient-teal text-white rounded-xl p-2.5 shadow-2xs relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 relative border border-white/30">
              <Bot className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-teal-100">
                <HeartPulse className="w-3 h-3 text-yellow-300" />
                <span>Empathetic AI</span>
              </div>
              <h2 className="text-xs font-bold font-heading text-white">How can I assist your health today?</h2>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-xs shrink-0 active:scale-95 shadow-2xs"
            title="Reset Chat Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-[#DCEEFB] border border-[#14B8A6]/30 rounded-xl p-2 flex gap-2 items-center text-[10px] text-[#0B5A54] shadow-2xs">
          <ShieldAlert className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
          <p className="italic leading-tight font-medium">
            AI suggestions provide general health guidance and do not replace clinical diagnosis.
          </p>
        </div>

        {/* Chat Feed Messages */}
        <div className="flex flex-col space-y-2 pb-4">
          {chatMessages.map((msg) => (
            <ChatBubble
              key={msg.id}
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
              quickReplyChips={msg.quickReplyChips}
              onChipClick={(chipText) => handleSend(chipText)}
            />
          ))}

          {isTyping && (
            <div className="flex gap-2 my-1.5 self-start mr-auto items-center">
              <div className="w-6 h-6 rounded-full bg-gradient-teal flex items-center justify-center text-white shrink-0 shadow-2xs">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white border border-[#E4E7EC] px-3 py-2 rounded-xl rounded-tl-xs shadow-2xs flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#6B7280]">CarePulse AI is analyzing</span>
                <span className="w-1 h-1 bg-[#0B5A54] rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-[#14B8A6] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-1 bg-[#0B5A54] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* COMPACT FLOATING INPUT DOCK */}
      <div className="fixed bottom-[54px] sm:bottom-[60px] left-0 right-0 w-[calc(100%-2rem)] max-w-[360px] sm:max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-[#E4E7EC] rounded-xl p-2 shadow-[0_6px_20px_rgba(11,90,84,0.12)] space-y-1.5 z-30 transition-all">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider shrink-0 flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-[#14B8A6]" /> Prompts:
          </span>
          {quickSymptoms.map((sym, idx) => (
            <Chip
              key={idx}
              size="sm"
              onClick={() => handleSend(sym.query)}
              className="bg-[#F3F5F8] border-transparent text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white font-semibold shrink-0 text-[10px] px-2 py-0.5"
            >
              {sym.label}
            </Chip>
          ))}
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about symptoms..."
            className="w-full bg-[#F3F5F8] border border-[#E4E7EC] text-xs text-[#111827] rounded-lg pl-3 pr-20 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B5A54] font-medium placeholder:text-[#9CA3AF]"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {input && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="p-0.5 rounded-full text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => alert('Voice Search: Speak your medical symptoms now...')}
              className="p-1 rounded-md text-[#6B7280] hover:text-[#0B5A54] hover:bg-white transition-colors"
              title="Voice Input"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="w-7 h-7 rounded-lg bg-[#0B5A54] text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:bg-[#08423D] transition-transform active:scale-95 shadow-2xs"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
