import React from 'react';
import { clsx } from 'clsx';
import { Sparkles, User as UserIcon, AlertTriangle } from 'lucide-react';
import { Chip } from './Chip';

export interface ChatBubbleProps {
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplyChips?: string[];
  onChipClick?: (chipText: string) => void;
}

// Simple text formatter for clean bullet points and bolding
const formatMessageText = (content: string) => {
  if (!content) return '';
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <span key={lineIdx} className="block">
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} className="font-bold text-[#0B5A54]">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return <em key={pIdx} className="text-slate-600 italic">{part.slice(1, -1)}</em>;
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
  quickReplyChips,
  onChipClick,
}) => {
  const isBot = sender === 'bot';
  const isCriticalEmergency = isBot && (text.includes('🚨') || text.toLowerCase().includes('critical safety alert') || text.toLowerCase().includes('important medical safety alert'));

  return (
    <div
      className={clsx(
        'flex gap-2 my-2 max-w-[90%] sm:max-w-[85%] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
        isBot ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
      )}
    >
      {/* Avatar Icon */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs mt-1 ring-2 ring-white',
          isBot
            ? isCriticalEmergency
              ? 'bg-rose-600 shadow-rose-200'
              : 'bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6]'
            : 'bg-[#0B5A54]'
        )}
      >
        {isBot ? (
          isCriticalEmergency ? (
            <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-200" />
          )
        ) : (
          <UserIcon className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble Container */}
      <div className="space-y-2 max-w-[88%]">
        <div
          className={clsx(
            'p-3.5 sm:p-4 text-xs leading-relaxed shadow-2xs transition-all duration-200 relative overflow-hidden',
            isBot
              ? isCriticalEmergency
                ? 'bg-rose-50 text-rose-950 border border-rose-300 rounded-2xl rounded-tl-xs shadow-rose-100'
                : 'bg-white text-[#111827] rounded-2xl rounded-tl-xs border border-[#E4E7EC] card-left-accent'
              : 'bg-[#0B5A54] text-white rounded-2xl rounded-tr-xs font-medium shadow-2xs'
          )}
        >
          {isCriticalEmergency && (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-800 uppercase tracking-wider mb-1.5 pb-1 border-b border-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Critical Medical Emergency</span>
            </div>
          )}

          <div className="space-y-1 text-slate-800 text-[12.5px] leading-relaxed">
            {formatMessageText(text)}
          </div>
          
          <span
            className={clsx(
              'block text-[10px] mt-2 font-medium',
              isBot ? 'text-[#9CA3AF]' : 'text-teal-200'
            )}
          >
            {timestamp}
          </span>
        </div>

        {/* Embedded Quick Reply Chips */}
        {isBot && quickReplyChips && quickReplyChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {quickReplyChips.map((chip, idx) => (
              <Chip
                key={idx}
                size="sm"
                onClick={() => onChipClick && onChipClick(chip)}
                className="bg-[#E3F3F1] border-[#0B5A54]/20 text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white shadow-2xs font-semibold active:scale-95 transition-all cursor-pointer text-[11px] py-1 px-2.5 rounded-full"
              >
                + {chip}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
