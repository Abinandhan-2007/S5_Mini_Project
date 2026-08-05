import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Send, Sparkles, RefreshCw, Bot, HeartPulse, ClipboardCheck, AlertTriangle } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { Chip } from '../../components/ui/Chip';
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
      {/* CLEAN PURE WHITE HEADER BAR */}
      <div className="bg-white border-b border-[#E4E7EC] py-3 px-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0B5A54]/10 flex items-center justify-center text-[#0B5A54] border border-[#0B5A54]/20 shadow-2xs">
              <Bot className="w-5 h-5 text-[#0B5A54] animate-pulse" />
            </div>
            <div className="text-left space-y-0.5">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-[#0B5A54] font-heading tracking-tight">CarePulse AI Triage</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[11px] font-semibold text-[#6B7280]">Clinical Assistant & Symptom Evaluator</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/escalation')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all flex items-center gap-1 text-[11px] font-bold shadow-2xs"
              title="Emergency Escalation Notice"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Emergency</span>
            </button>
            <button
              onClick={clearChat}
              className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC] text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors shadow-2xs"
              title="Clear Conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES AREA */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {/* Safety Disclaimer Banner */}
        <div className="p-3 rounded-2xl bg-[#0B5A54]/5 border border-[#0B5A54]/15 flex items-start gap-2.5 text-left shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#0B5A54] leading-relaxed font-medium">
            <span className="font-bold">Medical Disclaimer: </span>
            This AI tool provides preliminary symptom guidance. For severe chest pressure or acute emergencies, click Emergency or call 108.
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

      {/* QUICK SUGGESTIONS CAROUSEL */}
      {!isInputFocused && (
        <div className="px-4 py-2 bg-white/80 backdrop-blur-md max-w-md mx-auto w-full space-y-2">
          <div className="flex items-center justify-between text-left px-1">
            <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
              COMMON SYMPTOM EVALUATIONS
            </span>
            <button
              onClick={() => navigate('/assessment-confirm')}
              className="text-[10px] font-bold text-[#0B5A54] hover:underline flex items-center gap-1"
            >
              <ClipboardCheck className="w-3 h-3" />
              <span>Review SOAP Note</span>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip
              onClick={() => handleSend('I have seasonal allergy symptoms like sneezing & congestion')}
            >
              🤧 Seasonal Allergies
            </Chip>
            <Chip
              onClick={() => handleSend('I have a mild headache and fatigue')}
            >
              🤕 Headache & Fatigue
            </Chip>
            <Chip
              onClick={() => handleSend('I have acute chest pain and breathing trouble')}
            >
              🚨 Emergency Check
            </Chip>
          </div>
        </div>
      )}

      {/* BOTTOM INPUT BAR */}
      <div
        className={`fixed left-0 right-0 z-30 max-w-md mx-auto px-4 py-2.5 bg-white border-t border-[#E4E7EC] shadow-lg transition-all duration-150 ${
          isInputFocused ? 'bottom-0 rounded-none' : 'bottom-18 sm:bottom-20 rounded-t-2xl'
        }`}
      >
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E4E7EC] rounded-2xl px-3 py-1.5 shadow-2xs focus-within:border-[#0B5A54] focus-within:ring-2 focus-within:ring-[#0B5A54]/20 transition-all">
          <HeartPulse className="w-4 h-4 text-[#0B5A54] shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms..."
            className="flex-1 bg-transparent text-xs font-medium text-[#111827] placeholder-[#9CA3AF] focus:outline-none py-1.5"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="p-2 rounded-xl bg-[#0B5A54] text-white disabled:opacity-40 hover:bg-[#08453F] transition-all shadow-2xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Render BottomNav ONLY when keyboard / text box is not focused */}
      {!isInputFocused && <BottomNav />}
    </div>
  );
};
