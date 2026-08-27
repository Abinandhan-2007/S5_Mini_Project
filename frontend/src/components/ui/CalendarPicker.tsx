import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface CalendarPickerProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const formatDateStr = (dayNum: number): string => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 space-y-4 select-none">
      {/* Month & Year Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shadow-2xs">
            <CalendarIcon className="w-4.5 h-4.5 text-[#0B5A54]" />
          </div>
          <div>
            <span className="text-sm font-black font-heading text-slate-900 block leading-tight">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <span className="text-[10px] font-bold text-slate-400">Select consultation date</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-xl hover:bg-white text-slate-700 hover:text-[#0B5A54] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-xl hover:bg-white text-slate-700 hover:text-[#0B5A54] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 text-center">
        {daysOfWeek.map((day) => (
          <span key={day} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {/* Empty padding slots before 1st of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9 sm:h-10" />
        ))}

        {/* Days of the Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = formatDateStr(dayNum);
          const cellDate = new Date(currentYear, currentMonth, dayNum);
          cellDate.setHours(0, 0, 0, 0);

          const isPast = cellDate < today;
          const isSelected = selectedDate === dateStr;
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <motion.button
              key={dateStr}
              type="button"
              disabled={isPast}
              whileTap={{ scale: isPast ? 1 : 0.92 }}
              onClick={() => onSelectDate(dateStr)}
              className={clsx(
                'h-9 sm:h-10 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center relative focus:outline-none cursor-pointer',
                isPast && 'text-slate-300 cursor-not-allowed pointer-events-none',
                !isPast && !isSelected && 'text-slate-700 hover:bg-[#E3F3F1] hover:text-[#0B5A54]',
                isSelected && 'bg-gradient-to-br from-[#0B5A54] to-[#08423D] text-white shadow-md shadow-teal-900/20 font-black scale-105 ring-2 ring-[#14B8A6]/50'
              )}
            >
              <span>{dayNum}</span>
              {isToday && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5A54] absolute bottom-1" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
