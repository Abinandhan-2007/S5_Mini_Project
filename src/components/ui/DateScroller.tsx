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
        // Extract first letter of day of week (e.g. S, M, T, W, T, F, S)
        const dayLetter = item.dayAbbrev === 'TODAY' 
          ? new Date(item.fullDate).toLocaleDateString('en-US', { weekday: 'narrow' })
          : item.dayAbbrev.charAt(0);

        return (
          <button
            key={item.fullDate}
            type="button"
            onClick={() => onSelectDate(item.fullDate)}
            className={clsx(
              'flex flex-col items-center justify-between min-w-[62px] h-[92px] p-2 rounded-3xl transition-all duration-200 shrink-0 border focus:outline-none active:scale-95 cursor-pointer',
              isSelected
                ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md scale-105 ring-2 ring-[#0B5A54]/20'
                : 'bg-slate-100/80 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 shadow-2xs'
            )}
          >
            {/* Top: Date Number */}
            <span
              className={clsx(
                'text-sm font-extrabold font-heading pt-0.5',
                isSelected ? 'text-white' : 'text-slate-700'
              )}
            >
              {item.dayNumber}
            </span>

            {/* Bottom: Day Letter Circle Disc */}
            <div
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-colors',
                isSelected
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'bg-white/80 text-slate-800 border border-slate-200/60'
              )}
            >
              {dayLetter}
            </div>
          </button>
        );
      })}
    </div>
  );
};
