import React from 'react';
import { clsx } from 'clsx';
import { User as UserIcon, AlertTriangle } from 'lucide-react';

import doctorAvatar from '../../assets/doctor_avatar_fullbody.png';

export interface ChatBubbleProps {
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplyChips?: string[];
  onChipClick?: (chipText: string) => void;
}

// Simple text formatter for clean bullet points and bolding
const formatMessageText = (content: string, isUser = false) => {
  if (!content) return '';
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <span key={lineIdx} className="block">
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong
                key={pIdx}
                className={clsx('font-bold', isUser ? 'text-black' : 'text-[#0B5A54]')}
              >
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return (
              <em
                key={pIdx}
                className={clsx('italic', isUser ? 'text-slate-800' : 'text-slate-600')}
              >
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
      </span>
    );
  });
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  sender,
  text,
  timestamp,
}) => {
  const isBot = sender === 'bot';
  const isCriticalEmergency = isBot && (text.includes('🚨') || text.toLowerCase().includes('critical safety alert') || text.toLowerCase().includes('important medical safety alert'));

  return (
    <div
      className={clsx(
        'flex gap-2.5 my-2.5 max-w-[90%] sm:max-w-[85%] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
        isBot ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
      )}
    >
      {/* Avatar Icon */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs mt-0.5 ring-2 ring-white overflow-hidden',
          isBot
            ? isCriticalEmergency
              ? 'bg-rose-600 shadow-rose-200'
              : 'bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6]'
            : 'bg-gradient-to-tr from-slate-700 to-slate-900 shadow-xs'
        )}
      >
        {isBot ? (
          isCriticalEmergency ? (
            <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
          ) : (
            <img src={doctorAvatar} alt="Health AI Doctor" className="w-full h-full object-contain p-0.5" />
          )
        ) : (
          <UserIcon className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble Container */}
      <div className="space-y-1.5 max-w-[88%]">
        <div
          className={clsx(
            'p-3 sm:p-3.5 text-xs leading-relaxed transition-all duration-200 relative overflow-hidden',
            isBot
              ? isCriticalEmergency
                ? 'bg-rose-50 text-rose-950 border border-rose-300 rounded-2xl rounded-tl-xs shadow-rose-100 shadow-sm'
                : 'bg-white text-[#111827] rounded-2xl rounded-tl-xs border border-[#E4E7EC] card-left-accent shadow-xs'
              : 'bg-white text-black rounded-2xl rounded-tr-xs shadow-xs border border-slate-200 font-normal'
          )}
        >
          {isCriticalEmergency && (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-800 uppercase tracking-wider mb-1.5 pb-1 border-b border-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Critical Medical Emergency</span>
            </div>
          )}

          <div
            className={clsx(
              'space-y-1 text-[13px] leading-relaxed',
              isBot ? 'text-slate-800' : 'text-black'
            )}
          >
            {formatMessageText(text, !isBot)}
          </div>

          <span
            className={clsx(
              'block text-[10px] mt-1 font-medium tracking-tight',
              isBot ? 'text-[#9CA3AF]' : 'text-slate-400 text-right'
            )}
          >
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};
