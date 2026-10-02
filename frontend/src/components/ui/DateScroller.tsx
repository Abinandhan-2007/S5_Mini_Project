import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export interface DateOption {
  fullDate: string; // e.g. "2026-08-07"
  dayAbbrev: string; // e.g. "TODAY", "TOMORROW", "Sun"
  dayNameShort: string; // e.g. "Thu", "Fri"
  dayNumber: string; // e.g. "27"
  month: string; // e.g. "Feb"
  isToday?: boolean;
  isTomorrow?: boolean;
  slotsAvailableCount?: number;
}

export interface ApprovedLeaveRange {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DateScrollerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  hideToday?: boolean;
  approvedLeaves?: ApprovedLeaveRange[];
  frozenDates?: string[];
}

// Generate upcoming 8 rolling days starting from today or tomorrow
export const generateUpcomingDates = (hideToday = false, count = 8): DateOption[] => {
  const dates: DateOption[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const startIndex = hideToday ? 1 : 0;
  const endIndex = startIndex + count;

  for (let i = startIndex; i < endIndex; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const fullDate = `${year}-${monthNum}-${dayNum}`;

    const isToday = i === 0;
    const isTomorrow = i === 1;

    let dayAbbrev = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    if (isToday) dayAbbrev = 'TODAY';
    else if (isTomorrow) dayAbbrev = 'TOMORROW';

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
      isToday,
      isTomorrow,
      slotsAvailableCount: slotsCount,
    });
  }

  return dates;
};

export const DateScroller: React.FC<DateScrollerProps> = ({
  selectedDate,
  onSelectDate,
  hideToday = false,
  approvedLeaves = [],
  frozenDates = [],
}) => {
  const dates = React.useMemo(() => generateUpcomingDates(hideToday), [hideToday]);

  return (
    <div className="relative w-full">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth text-left snap-x">
        {dates.map((item) => {
          const isSelected = selectedDate === item.fullDate;

          const isDateFrozen = Boolean(
            frozenDates?.includes(item.fullDate) ||
            approvedLeaves?.some((l) => {
              const s = l.startDate ? l.startDate.split('T')[0] : '';
              const e = l.endDate ? l.endDate.split('T')[0] : '';
              return s && e && item.fullDate >= s && item.fullDate <= e;
            })
          );

          const matchedLeave = approvedLeaves?.find((l) => {
            const s = l.startDate ? l.startDate.split('T')[0] : '';
            const e = l.endDate ? l.endDate.split('T')[0] : '';
            return s && e && item.fullDate >= s && item.fullDate <= e;
          });

          return (
            <motion.button
              key={item.fullDate}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectDate(item.fullDate)}
              title={
                isDateFrozen
                  ? `Doctor on Approved Leave (${matchedLeave?.reason || 'Schedule Frozen'})`
                  : undefined
              }
              className={clsx(
                'group relative flex flex-col items-center justify-between min-w-[72px] sm:min-w-[78px] h-[102px] p-2.5 rounded-2xl transition-all duration-200 shrink-0 border focus:outline-none cursor-pointer snap-start select-none shadow-xs',
                isDateFrozen
                  ? isSelected
                    ? 'bg-rose-50/95 text-rose-900 border-2 border-rose-500 shadow-md ring-2 ring-rose-200'
                    : 'bg-rose-50/40 hover:bg-rose-50/80 text-rose-700/80 border-rose-200/90 hover:border-rose-400/90 shadow-2xs'
                  : isSelected
                  ? 'bg-[#E3F3F1] text-[#0B5A54] border-2 border-[#0B5A54] shadow-sm'
                  : 'bg-white hover:bg-slate-50/90 text-slate-700 border-slate-200/80 hover:border-[#14B8A6]/40 shadow-xs'
              )}
            >
              {/* Top: Month / Today / Tomorrow / FROZEN Tag */}
              <div className="w-full flex justify-between items-center px-0.5">
                {isDateFrozen ? (
                  <span
                    className={clsx(
                      'text-[9.5px] font-black tracking-wider uppercase flex items-center gap-0.5',
                      isSelected ? 'text-rose-700' : 'text-rose-500'
                    )}
                  >
                    <Lock className="w-2.5 h-2.5 inline shrink-0" />
                    FROZEN
                  </span>
                ) : (
                  <span
                    className={clsx(
                      'text-[10px] font-black tracking-wider uppercase',
                      isSelected ? 'text-[#0B5A54]' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  >
                    {item.isToday ? 'TODAY' : item.isTomorrow ? 'TOM' : item.month}
                  </span>
                )}

                {isDateFrozen ? (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-rose-500"
                    title="Doctor on Approved Leave"
                  />
                ) : item.isToday || (hideToday && item.isTomorrow) ? (
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      isSelected ? 'bg-[#0B5A54]' : 'bg-teal-500'
                    )}
                    title={item.isToday ? 'Today' : 'Tomorrow'}
                  />
                ) : null}
              </div>

              {/* Middle: Big Day Number */}
              <span
                className={clsx(
                  'text-xl sm:text-2xl font-black font-heading tracking-tight -my-1 transition-colors',
                  isDateFrozen
                    ? isSelected
                      ? 'text-rose-900 font-black'
                      : 'text-rose-400 line-through decoration-rose-400/80 decoration-2'
                    : isSelected
                    ? 'text-[#0B5A54]'
                    : 'text-slate-800'
                )}
              >
                {item.dayNumber}
              </span>

              {/* Bottom: Day of Week Pill */}
              <div
                className={clsx(
                  'w-full py-1 rounded-xl flex items-center justify-center font-bold text-[10.5px] transition-colors',
                  isDateFrozen
                    ? isSelected
                      ? 'bg-rose-600 text-white font-black shadow-xs'
                      : 'bg-rose-100/70 text-rose-700 font-extrabold border border-rose-200/60'
                    : isSelected
                    ? 'bg-[#0B5A54] text-white font-extrabold'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#0B5A54]'
                )}
              >
                {isDateFrozen ? (isSelected ? 'ON LEAVE' : 'LEAVE') : item.dayNameShort}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
