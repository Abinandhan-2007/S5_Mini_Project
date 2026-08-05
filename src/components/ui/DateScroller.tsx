import React from 'react';
import { clsx } from 'clsx';

export interface DateOption {
  fullDate: string; // e.g. "2026-08-06"
  dayAbbrev: string; // e.g. "Thu"
  dayNumber: string; // e.g. "06"
  month: string; // e.g. "Aug"
}

export interface DateScrollerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

// Generate upcoming 10 days
export const generateUpcomingDates = (): DateOption[] => {
  const dates: DateOption[] = [];
  const today = new Date();

  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const fullDate = `${year}-${monthNum}-${dayNum}`;

    const dayAbbrev = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });

    dates.push({
      fullDate,
      dayAbbrev,
      dayNumber: dayNum,
      month,
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
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1">
      {dates.map((item) => {
        const isSelected = selectedDate === item.fullDate;

        return (
          <button
            key={item.fullDate}
            type="button"
            onClick={() => onSelectDate(item.fullDate)}
            className={clsx(
              'flex flex-col items-center justify-center min-w-[64px] h-[76px] rounded-2xl transition-all duration-200 shrink-0 border focus:outline-none active:scale-95',
              isSelected
                ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md ring-2 ring-[#0B5A54]/20'
                : 'bg-white text-[#111827] border-[#E4E7EC] hover:border-[#14B8A6] hover:bg-[#E3F3F1]/30'
            )}
          >
            <span className={clsx('text-[11px] font-bold uppercase tracking-wider', isSelected ? 'text-teal-200' : 'text-[#6B7280]')}>
              {item.dayAbbrev}
            </span>
            <span className="text-lg font-extrabold font-heading my-0.5 leading-none">{item.dayNumber}</span>
            <span className={clsx('text-[10px] font-semibold', isSelected ? 'text-teal-100' : 'text-[#9CA3AF]')}>{item.month}</span>
          </button>
        );
      })}
    </div>
  );
};
