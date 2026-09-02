import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Send, Sparkles, RefreshCw, ClipboardCheck, Bell, AlertTriangle } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { ConfidenceBadge } from '../../components/ui/ConfidenceBadge';
import { useCarePulseStore } from '../../lib/store';

export const HealthAIChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const chatMessages = useCarePulseStore((s) => s.chatMessages);
  const isAiTyping = useCarePulseStore((s) => s.isAiTyping);
  const addChatMessage = useCarePulseStore((s) => s.addChatMessage);
  const clearChat = useCarePulseStore((s) => s.clearChat);
  const latestAssessment = useCarePulseStore((s) => s.latestAssessment);

  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isAiTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    if (!textToSend) {
      setInput('');
    }

    // Trigger red flag check for instant urgent escalation
    const lower = query.toLowerCase();
    if (
      lower.includes('chest pain') ||
      lower.includes('cannot breathe') ||
      lower.includes('severe breathlessness') ||
      lower.includes('emergency')
    ) {
      navigate('/escalation', { state: { symptomSummary: query } });
      return;
    }

    await addChatMessage({
      sender: 'user',
      text: query.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenAssessment = () => {
    navigate('/assessment-confirm', {
      state: { assessment: latestAssessment },
    });
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col w-full relative select-none ${isInputFocused ? 'pb-20' : 'pb-36'}`}>
      {/* HEADER WITH NOTIFICATION & BADGE (HISTORY SCREEN CYAN/BLUE GRADIENT) */}
      <div className="bg-gradient-to-r from-[#22B3BD] via-[#28BAC4] to-[#35C6D0] text-white pt-4 pb-4 px-4 sticky top-0 z-30 shadow-sm transition-all">
        <div className="space-y-0.5">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight drop-shadow-2xs">
              Health AI
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white bg-white/20 border border-white/40 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-2xs tracking-wider">
                AI ACTIVE
              </span>
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-full bg-white text-[#111827] hover:bg-cyan-50 hover:text-[#0B5A54] flex items-center justify-center transition-all relative active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                title="Clear Chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 rounded-full bg-white text-[#111827] hover:bg-cyan-50 hover:text-[#0B5A54] flex items-center justify-center transition-all relative active:scale-95 shadow-sm shrink-0 cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
          <p className="text-[11px] font-medium text-cyan-50/90 tracking-wide">
            Clinical Assistant & Symptom Evaluator
          </p>
        </div>
      </div>

      {/* CHAT MESSAGES AREA */}
      <div className="flex-1 px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {/* Safety Disclaimer Banner */}
        <div className="p-3 rounded-2xl bg-[#0B5A54]/5 border border-[#0B5A54]/15 flex items-start gap-2.5 text-left shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#0B5A54] leading-relaxed font-medium">
            <span className="font-bold">Medical Disclaimer: </span>
            This AI tool provides clinical symptom guidance and preliminary triage. For severe emergencies, call 108 immediately.
          </div>
        </div>

        {/* Message Stream */}
        {chatMessages.map((msg) => (
          <div key={msg.id} className="space-y-1.5 text-left">
            <ChatBubble
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
            />

            {msg.sender === 'bot' && (
              <div className="pl-2 pt-0.5 flex items-center gap-2 flex-wrap">
                <ConfidenceBadge
                  confidence={msg.confidence ?? 88}
                  riskLevel={msg.riskLevel ?? 'low'}
                  size="sm"
                />
                {msg.specialty && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                    Routing: {msg.specialty}
                  </span>
                )}
                {msg.isEmergency && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Urgent / Emergency Care
                  </span>
                )}
              </div>
            )}

            {/* Quick Reply Action Chips */}
            {msg.sender === 'bot' && msg.quickReplyChips && msg.quickReplyChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-2 pt-1">
                {msg.quickReplyChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] font-semibold text-[#0B5A54] bg-[#E3F3F1] border border-[#0B5A54]/20 px-3 py-1 rounded-full hover:bg-[#0B5A54] hover:text-white transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isAiTyping && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0B5A54] pl-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-[#14B8A6]" />
            <span>Health AI is analyzing your symptoms...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* PREMIUM CLEAN SYMPTOM EVALUATION CARD */}
      {!isInputFocused && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-2 w-full">
          <div className="bg-white/95 backdrop-blur-md border border-[#E4E7EC] rounded-2xl p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span className="text-[11px] font-extrabold text-[#111827] font-heading tracking-tight">
                  Common Symptom Evaluations
                </span>
              </div>
              <button
                onClick={handleOpenAssessment}
                className="text-[10px] font-bold text-[#0B5A54] bg-[#E3F3F1] border border-[#0B5A54]/20 px-2.5 py-0.5 rounded-full hover:bg-[#0B5A54] hover:text-white transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <ClipboardCheck className="w-3 h-3" />
                <span>SOAP Note</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => handleSend('I have a fever and body chills')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0B5A54] bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0B5A54] hover:bg-[#E3F3F1]/40 transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              >
                Fever & Chills
              </button>
              <button
                onClick={() => handleSend('I have seasonal allergy symptoms like sneezing & congestion')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0B5A54] bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0B5A54] hover:bg-[#E3F3F1]/40 transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              >
                Seasonal Allergies
              </button>
              <button
                onClick={() => handleSend('I have a mild throbbing headache and fatigue')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0B5A54] bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0B5A54] hover:bg-[#E3F3F1]/40 transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              >
                Headache & Fatigue
              </button>
              <button
                onClick={() => handleSend('I have acute chest pain and breathing trouble')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-rose-700 bg-rose-50/80 border border-rose-200 hover:border-rose-300 hover:bg-rose-100 transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              >
                Emergency Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STABLE BOTTOM INPUT BAR */}
      <div
        className={`fixed left-0 right-0 z-30 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-2 bg-white/95 backdrop-blur-md border-t border-[#E4E7EC] shadow-md transition-all duration-200 ${
          isInputFocused ? 'bottom-2' : 'bottom-20 sm:bottom-22'
        }`}
      >
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E4E7EC] rounded-full px-3 py-1.5 focus-within:border-[#0B5A54] focus-within:ring-2 focus-within:ring-[#0B5A54]/20 transition-all">
          <div className="w-7 h-7 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI or describe symptoms (e.g. fever, headache, cough)..."
            className="flex-1 bg-transparent text-xs font-semibold text-[#111827] placeholder-[#9CA3AF] focus:outline-none py-1.5"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isAiTyping}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center disabled:opacity-30 hover:shadow-md active:scale-95 transition-all shrink-0 shadow-2xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RENDER BOTTOM NAV ONLY WHEN SEARCH INPUT IS NOT FOCUSED */}
      {!isInputFocused && <BottomNav />}
    </div>
  );
};
