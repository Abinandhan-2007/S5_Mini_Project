import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface DateOption {
  fullDate: string; // e.g. "2026-08-07"
  dayAbbrev: string; // e.g. "TODAY", "TOM", "Sun"
  dayNameShort: string; // e.g. "Thu", "Fri"
  dayNumber: string; // e.g. "27"
  month: string; // e.g. "Feb"
  isToday?: boolean;
  slotsAvailableCount?: number;
}

export interface DateScrollerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

// Generate upcoming 8 rolling days starting from today
const generateUpcomingDates = (baseDate?: Date, count = 8): DateOption[] => {
  const dates: DateOption[] = [];
  const start = baseDate ? new Date(baseDate) : new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const fullDate = `${year}-${monthNum}-${dayNum}`;

    let dayAbbrev = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    if (i === 0) dayAbbrev = 'TODAY';
    else if (i === 1) dayAbbrev = 'TOM';

    const dayNameShort = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });

    // Mock slots count: 6 to 12 slots available
    const slotsCount = ((i * 3 + 7) % 6) + 4;

    dates.push({
      fullDate,
      dayAbbrev,
      dayNameShort,
      dayNumber: dayNum,
      month,
      isToday: i === 0,
      slotsAvailableCount: slotsCount,
    });
  }

  return dates;
};

export const DateScroller: React.FC<DateScrollerProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const dates = React.useMemo(() => generateUpcomingDates(), []);

  return (
    <div className="relative w-full">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth text-left snap-x">
        {dates.map((item) => {
          const isSelected = selectedDate === item.fullDate;

          return (
            <motion.button
              key={item.fullDate}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectDate(item.fullDate)}
              className={clsx(
                'group relative flex flex-col items-center justify-between min-w-[70px] sm:min-w-[76px] h-[100px] p-2.5 rounded-2xl transition-all duration-200 shrink-0 border focus:outline-none cursor-pointer snap-start select-none shadow-xs',
                isSelected
                  ? 'bg-[#E3F3F1] text-[#0B5A54] border-2 border-[#0B5A54] shadow-sm'
                  : 'bg-white hover:bg-slate-50/90 text-slate-700 border-slate-200/80 hover:border-[#14B8A6]/40 shadow-xs'
              )}
            >
              {/* Top: Month / Today Tag */}
              <div className="w-full flex justify-between items-center px-0.5">
                <span
                  className={clsx(
                    'text-[10px] font-black tracking-wider uppercase',
                    isSelected ? 'text-[#0B5A54]' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                >
                  {item.isToday ? 'TODAY' : item.month}
                </span>

                {item.isToday && (
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      isSelected ? 'bg-[#0B5A54]' : 'bg-teal-500'
                    )}
                    title="Today"
                  />
                )}
              </div>

              {/* Middle: Big Day Number */}
              <span
                className={clsx(
                  'text-xl sm:text-2xl font-black font-heading tracking-tight -my-1',
                  isSelected ? 'text-[#0B5A54]' : 'text-slate-800'
                )}
              >
                {item.dayNumber}
              </span>

              {/* Bottom: Day of Week Pill */}
              <div
                className={clsx(
                  'w-full py-1 rounded-xl flex items-center justify-center font-bold text-[11px] transition-colors',
                  isSelected
                    ? 'bg-[#0B5A54] text-white font-extrabold'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#0B5A54]'
                )}
              >
                {item.dayNameShort}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
