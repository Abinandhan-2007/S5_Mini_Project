import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Clock, Sun, Sunrise, Sunset } from 'lucide-react';

export interface TimeSlot {
  time: string; // e.g. "09:00 AM"
  period: 'Morning' | 'Afternoon' | 'Evening';
}

export interface TimeSlotGridProps {
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  // Morning
  { time: '09:00 AM', period: 'Morning' },
  { time: '09:30 AM', period: 'Morning' },
  { time: '10:00 AM', period: 'Morning' },
  { time: '10:30 AM', period: 'Morning' },
  { time: '11:00 AM', period: 'Morning' },
  { time: '11:30 AM', period: 'Morning' },
  // Afternoon
  { time: '02:00 PM', period: 'Afternoon' },
  { time: '02:30 PM', period: 'Afternoon' },
  { time: '03:00 PM', period: 'Afternoon' },
  { time: '03:30 PM', period: 'Afternoon' },
  { time: '04:00 PM', period: 'Afternoon' },
  { time: '04:30 PM', period: 'Afternoon' },
  // Evening
  { time: '05:00 PM', period: 'Evening' },
  { time: '05:30 PM', period: 'Evening' },
  { time: '06:00 PM', period: 'Evening' },
  { time: '06:30 PM', period: 'Evening' },
  { time: '07:00 PM', period: 'Evening' },
  { time: '08:00 PM', period: 'Evening' },
];

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedSlot,
  onSelectSlot,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');

  const filteredSlots = React.useMemo(() => {
    if (activeTab === 'All') return DEFAULT_SLOTS;
    return DEFAULT_SLOTS.filter((s) => s.period === activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-3.5">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar">
        {(['All', 'Morning', 'Afternoon', 'Evening'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer',
                isActive
                  ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              )}
            >
              {tab === 'Morning' && <Sunrise className="w-3.5 h-3.5 text-amber-500" />}
              {tab === 'Afternoon' && <Sun className="w-3.5 h-3.5 text-orange-500" />}
              {tab === 'Evening' && <Sunset className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{tab}</span>
            </button>
          );
        })}
      </div>

      {/* Slots Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {filteredSlots.map((slot) => {
          const isSelected = selectedSlot === slot.time;

          return (
            <motion.button
              key={slot.time}
              type="button"
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectSlot(slot.time)}
              className={clsx(
                'relative flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-200 border text-left focus:outline-none cursor-pointer select-none',
                isSelected
                  ? 'bg-gradient-to-r from-[#0B5A54] to-[#0D6D65] text-white border-[#0B5A54] shadow-md shadow-teal-900/15 ring-2 ring-[#14B8A6]/40'
                  : 'bg-white hover:bg-teal-50/40 text-slate-700 border-slate-200/80 hover:border-[#14B8A6]/40 shadow-2xs'
              )}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={clsx(
                    'w-3.5 h-3.5 shrink-0',
                    isSelected ? 'text-teal-200' : 'text-slate-400'
                  )}
                />
                <span className={clsx('font-black font-heading', isSelected ? 'text-white' : 'text-slate-800')}>
                  {slot.time}
                </span>
              </div>

              {isSelected && (
                <span className="text-[9px] font-black uppercase text-teal-100 bg-white/20 px-1.5 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
