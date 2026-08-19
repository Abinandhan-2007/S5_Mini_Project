import React from 'react';
import { clsx } from 'clsx';

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

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedSlot,
  onSelectSlot,
}) => {
  const allSlots = [
    '10:00 AM',
    '02:30 PM',
    '03:00 PM',
    '04:30 AM',
    '06:30 AM',
    '08:00 PM',
    '12:30 PM',
    '05:00 AM',
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
      {allSlots.map((slot) => {
        const isSelected = selectedSlot === slot;

        return (
          <button
            key={slot}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className={clsx(
              'py-2.5 px-3 rounded-full text-xs font-black transition-all duration-200 border text-center focus:outline-none active:scale-95 cursor-pointer shadow-2xs',
              isSelected
                ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md scale-[1.02]'
                : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80'
            )}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
};
