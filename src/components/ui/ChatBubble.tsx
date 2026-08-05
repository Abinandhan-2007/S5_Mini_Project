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

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  sender,
  text,
  timestamp,
  quickReplyChips,
  onChipClick,
}) => {
  const isBot = sender === 'bot';
  const isWarning = text.includes('⚠️') || text.toLowerCase().includes('emergency') || text.toLowerCase().includes('immediate');

  return (
    <div
      className={clsx(
        'flex gap-2 my-2 max-w-[84%] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',

        isBot ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
      )}
    >
      {/* Avatar Icon */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm mt-1 ring-2 ring-white',
          isBot ? 'bg-gradient-teal' : 'bg-[#0B5A54]'
        )}
      >
        {isBot ? <Sparkles className="w-4 h-4 text-yellow-200" /> : <UserIcon className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble Container */}
      <div className="space-y-2 max-w-[85%]">
        <div
          className={clsx(
            'p-4 text-xs leading-relaxed shadow-sm transition-all duration-200 relative overflow-hidden',
            isBot
              ? isWarning
                ? 'bg-amber-50 text-amber-900 border border-amber-300 rounded-2xl rounded-tl-xs'
                : 'bg-white text-[#111827] rounded-2xl rounded-tl-xs border border-[#E4E7EC] card-left-accent'
              : 'bg-[#0B5A54] text-white rounded-2xl rounded-tr-xs font-medium shadow-md'
          )}
        >
          {isWarning && isBot && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Medical Safety Alert</span>
            </div>
          )}

          <p className="whitespace-pre-line">{text}</p>
          
          <span
            className={clsx(
              'block text-[10px] mt-1.5 font-bold',
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
                className="bg-white border-[#14B8A6]/40 text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white shadow-xs font-semibold"
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
