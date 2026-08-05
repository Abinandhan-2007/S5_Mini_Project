import React from 'react';
import { clsx } from 'clsx';
import { Sun, Sunset, Moon } from 'lucide-react';

export interface TimeSlot {
  time: string; // e.g. "09:00 AM"
  available: boolean;
}

export interface TimeSlotGroup {
  period: 'Morning' | 'Afternoon' | 'Evening';
  icon: React.ReactNode;
  slots: TimeSlot[];
}

export interface TimeSlotGridProps {
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
}

const DEFAULT_SLOTS: TimeSlotGroup[] = [
  {
    period: 'Morning',
    icon: <Sun className="w-4 h-4 text-amber-500" />,
    slots: [
      { time: '09:00 AM', available: true },
      { time: '09:30 AM', available: false },
      { time: '10:00 AM', available: true },
      { time: '10:30 AM', available: true },
      { time: '11:15 AM', available: true },
    ],
  },
  {
    period: 'Afternoon',
    icon: <Sunset className="w-4 h-4 text-orange-500" />,
    slots: [
      { time: '01:30 PM', available: true },
      { time: '02:00 PM', available: false },
      { time: '02:45 PM', available: true },
      { time: '03:30 PM', available: true },
      { time: '04:15 PM', available: true },
    ],
  },
  {
    period: 'Evening',
    icon: <Moon className="w-4 h-4 text-indigo-500" />,
    slots: [
      { time: '05:30 PM', available: true },
      { time: '06:00 PM', available: true },
      { time: '06:45 PM', available: false },
      { time: '07:30 PM', available: true },
    ],
  },
];

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedSlot,
  onSelectSlot,
}) => {
  return (
    <div className="space-y-4">
      {DEFAULT_SLOTS.map((group) => (
        <div key={group.period} className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
            {group.icon}
            <span>{group.period}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {group.slots.map((slot) => {
              const isSelected = selectedSlot === slot.time;

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => slot.available && onSelectSlot(slot.time)}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 border text-center focus:outline-none active:scale-95',
                    !slot.available && 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60 line-through',
                    slot.available && isSelected && 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-sm font-bold',
                    slot.available && !isSelected && 'bg-white text-[#111827] border-[#E4E7EC] hover:border-[#14B8A6] hover:bg-[#E3F3F1]/40'
                  )}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
