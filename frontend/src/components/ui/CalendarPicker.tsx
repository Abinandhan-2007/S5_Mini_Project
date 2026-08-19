import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';

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
    <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs space-y-3">
      {/* Month & Year Navigation Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54]">
            <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
          </div>
          <span className="text-sm font-extrabold font-heading text-[#111827]">
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-[#0B5A54] transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-[#0B5A54] transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 text-center">
        {daysOfWeek.map((day) => (
          <span key={day} className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty padding slots before 1st of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9" />
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
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(dateStr)}
              className={clsx(
                'h-9 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative active:scale-95 focus:outline-none',
                isPast && 'text-gray-300 cursor-not-allowed pointer-events-none',
                !isPast && !isSelected && 'text-slate-800 hover:bg-[#E3F3F1] hover:text-[#0B5A54]',
                isSelected && 'bg-[#0B5A54] text-white shadow-md font-extrabold scale-105'
              )}
            >
              <span>{dayNum}</span>
              {isToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#0B5A54] absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
