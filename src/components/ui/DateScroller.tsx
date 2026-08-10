import React from 'react';
import { clsx } from 'clsx';

export interface DateOption {
  fullDate: string; // e.g. "2026-08-07"
  dayAbbrev: string; // e.g. "TODAY", "TOM", "Sun"
  dayNumber: string; // e.g. "07"
  month: string; // e.g. "Aug"
  isToday?: boolean;
}

export interface DateScrollerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

// Generate upcoming 8 days (Today is Day 1, through Day 8)
export const generateUpcomingDates = (): DateOption[] => {
  const dates: DateOption[] = [];
  const today = new Date();

  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const fullDate = `${year}-${monthNum}-${dayNum}`;

    let dayAbbrev = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    if (i === 0) dayAbbrev = 'TODAY';

    const month = d.toLocaleDateString('en-US', { month: 'short' });

    dates.push({
      fullDate,
      dayAbbrev,
      dayNumber: dayNum,
      month,
      isToday: i === 0,
    });
  }

  return dates;
};

export const DateScroller: React.FC<DateScrollerProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const dates = generateUpcomingDates();

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 text-left">
      {dates.map((item) => {
        const isSelected = selectedDate === item.fullDate;

        return (
          <button
            key={item.fullDate}
            type="button"
            onClick={() => onSelectDate(item.fullDate)}
            className={clsx(
              'flex flex-col items-center justify-center min-w-[68px] h-[80px] rounded-2xl transition-all duration-200 shrink-0 border focus:outline-none active:scale-95 relative overflow-hidden',
              isSelected
                ? 'bg-gradient-to-b from-[#0B5A54] via-[#0D6B64] to-[#08453F] text-white border-[#0B5A54] shadow-md ring-2 ring-[#0B5A54]/30 scale-[1.03]'
                : 'bg-white text-slate-800 border-[#E4E7EC] hover:border-[#0B5A54]/50 hover:bg-[#E3F3F1]/30 shadow-2xs'
            )}
          >
            <span
              className={clsx(
                'text-[10px] font-extrabold tracking-wider uppercase',
                isSelected ? 'text-teal-200' : 'text-[#6B7280]'
              )}
            >
              {item.dayAbbrev}
            </span>
            <span className="text-lg font-black font-heading my-0.5 leading-none tracking-tight">
              {item.dayNumber}
            </span>
            <span
              className={clsx(
                'text-[10px] font-bold',
                isSelected ? 'text-teal-100' : 'text-slate-500'
              )}
            >
              {item.month}
            </span>

            {/* Subtle top indicator dot if Today */}
            {item.isToday && !isSelected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0B5A54]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
