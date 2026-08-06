import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Send, Sparkles, RefreshCw, ClipboardCheck, Bell } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { Badge } from '../../components/ui/Badge';
import { ConfidenceBadge } from '../../components/ui/ConfidenceBadge';
import { useCarePulseStore } from '../../lib/store';

export const HealthAIChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const chatMessages = useCarePulseStore((s) => s.chatMessages);
  const addChatMessage = useCarePulseStore((s) => s.addChatMessage);
  const clearChat = useCarePulseStore((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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

      // Trigger red flag check
      if (query.toLowerCase().includes('chest pain') || query.toLowerCase().includes('breath') || query.toLowerCase().includes('emergency')) {
        navigate('/escalation', { state: { symptomSummary: query } });
      }
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`min-h-screen bg-white flex flex-col w-full relative ${isInputFocused ? 'pb-20' : 'pb-36'}`}>
      {/* HEADER WITH NOTIFICATION & BADGE (MATCHING HISTORY & HOSPITALS PAGE STYLE) */}
      <div className="bg-white border-b border-[#E4E7EC] pt-4 pb-3.5 px-4 sticky top-0 z-30 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex justify-between items-center">
            <h1 className="text-base font-extrabold font-heading text-[#111827]">Health AI</h1>
            <div className="flex items-center gap-2">
              <Badge variant="tint" size="sm">
                AI Active
              </Badge>
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all relative active:scale-95 shadow-2xs shrink-0"
                title="Clear Chat"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#111827]" />
              </button>
              <button
                onClick={() => alert('Notifications: You have 1 upcoming appointment!')}
                className="w-8 h-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all relative active:scale-95 shadow-2xs shrink-0"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-[#111827]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Clinical Assistant & Symptom Evaluator
          </p>
        </div>
      </div>
      <div className="h-[1px] bg-[#E4E7EC] w-full" />

      {/* CHAT MESSAGES AREA */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {/* Safety Disclaimer Banner */}
        <div className="p-3 rounded-2xl bg-[#0B5A54]/5 border border-[#0B5A54]/15 flex items-start gap-2.5 text-left shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#0B5A54] leading-relaxed font-medium">
            <span className="font-bold">Medical Disclaimer: </span>
            This AI tool provides preliminary symptom guidance. For severe emergencies, call 108 immediately.
          </div>
        </div>

        {/* Message Stream */}
        {chatMessages.map((msg) => (
          <div key={msg.id} className="space-y-1 text-left">
            <ChatBubble
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
            />
            {msg.sender === 'bot' && (
              <div className="pl-2 pt-0.5">
                <ConfidenceBadge confidence={92} riskLevel="low" size="sm" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0B5A54] pl-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-[#14B8A6]" />
            <span>AI Care Assistant is evaluating symptoms...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* PREMIUM CLEAN SYMPTOM EVALUATION FLOATING CARD */}
      {!isInputFocused && (
        <div className="fixed bottom-34 sm:bottom-36 left-0 right-0 z-20 max-w-md mx-auto px-4">
          <div className="bg-white/90 backdrop-blur-md border border-[#E4E7EC] rounded-2xl p-2.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span className="text-[11px] font-extrabold text-[#111827] font-heading tracking-tight">
                  Common Symptom Evaluations
                </span>
              </div>
              <button
                onClick={() => navigate('/assessment-confirm')}
                className="text-[10px] font-bold text-[#0B5A54] bg-[#E3F3F1] border border-[#0B5A54]/20 px-2.5 py-0.5 rounded-full hover:bg-[#0B5A54] hover:text-white transition-all flex items-center gap-1 shadow-2xs"
              >
                <ClipboardCheck className="w-3 h-3" />
                <span>SOAP Note</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => handleSend('I have seasonal allergy symptoms like sneezing & congestion')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0B5A54] bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0B5A54] hover:bg-[#E3F3F1]/40 transition-all shadow-2xs shrink-0 active:scale-95"
              >
                Seasonal Allergies
              </button>
              <button
                onClick={() => handleSend('I have a mild headache and fatigue')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0B5A54] bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0B5A54] hover:bg-[#E3F3F1]/40 transition-all shadow-2xs shrink-0 active:scale-95"
              >
                Headache & Fatigue
              </button>
              <button
                onClick={() => handleSend('I have acute chest pain and breathing trouble')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-rose-700 bg-rose-50/80 border border-rose-200 hover:border-rose-300 hover:bg-rose-100 transition-all shadow-2xs shrink-0 active:scale-95"
              >
                Emergency Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM COMPACT FLOATING INPUT BAR */}
      <div
        className={`fixed left-0 right-0 z-30 max-w-xs sm:max-w-sm mx-auto px-2 transition-all duration-200 ${
          isInputFocused ? 'bottom-3' : 'bottom-22 sm:bottom-24'
        }`}
      >
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#E4E7EC] rounded-full p-1.5 pl-3 shadow-lg shadow-[#0B5A54]/10 focus-within:border-[#0B5A54] focus-within:ring-2 focus-within:ring-[#0B5A54]/15 transition-all">
          <div className="w-7 h-7 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI or describe symptoms..."
            className="flex-1 bg-transparent text-xs font-semibold text-[#111827] placeholder-[#9CA3AF] focus:outline-none py-1"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center disabled:opacity-30 hover:shadow-md active:scale-95 transition-all shrink-0 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Render BottomNav ONLY when keyboard / text box is not focused */}
      {!isInputFocused && <BottomNav />}
    </div>
  );
};
