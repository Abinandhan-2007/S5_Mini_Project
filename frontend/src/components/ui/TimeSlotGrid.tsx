import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Clock, Sun, Sunrise, Sunset, AlertCircle } from 'lucide-react';
import type { TimeSlotCapacity } from '../../types/receptionist';
import type { Doctor } from '../../lib/types';

export interface TimeSlot {
  time: string; // e.g. "09:00 AM"
  period: 'Morning' | 'Afternoon' | 'Evening';
}

export interface TimeSlotGridProps {
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  doctor?: Doctor;
  slotCapacities?: TimeSlotCapacity[];
  blockedSlots?: string[];
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

// Helper to check if a specific time falls inside a slot window (e.g. "09:00 AM" inside "09:00 AM - 10:00 AM")
const isTimeInWindow = (timeStr: string, windowStr: string) => {
  if (!timeStr || !windowStr) return false;
  const cleanTime = timeStr.toLowerCase().replace(/\s+/g, '');
  const cleanWindow = windowStr.toLowerCase().replace(/\s+/g, '');
  if (cleanTime === cleanWindow) return true;
  if (cleanWindow.includes(cleanTime)) return true;

  // Check hour match
  const timeHour = timeStr.split(':')[0].trim();
  const timeAmPm = timeStr.slice(-2).toUpperCase();
  if (windowStr.includes(timeHour) && windowStr.includes(timeAmPm)) {
    return true;
  }
  return false;
};

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedSlot,
  onSelectSlot,
  doctor,
  slotCapacities,
  blockedSlots = [],
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');

  // Extract effective blocked slot strings
  const effectiveBlockedList = React.useMemo(() => {
    const list: string[] = [...blockedSlots];

    // Check doctor slotCapacities
    const slots = slotCapacities || (doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities || [];
    if (Array.isArray(slots)) {
      slots.forEach((s: any) => {
        if (s.isAvailable === false || s.is_available === false) {
          list.push(s.timeSlot || s.time_slot || '');
        }
      });
    }

    return list.filter(Boolean);
  }, [doctor, slotCapacities, blockedSlots]);

  const isDoctorOffDuty = doctor?.isAvailable === false || doctor?.is_available === false;

  // Filter slots to exclude any blocked slots
  const availableSlots = React.useMemo(() => {
    if (isDoctorOffDuty) return [];
    return DEFAULT_SLOTS.filter((slot) => {
      // If slot falls in any blocked window, hide it completely
      const isBlocked = effectiveBlockedList.some((blocked) => isTimeInWindow(slot.time, blocked));
      return !isBlocked;
    });
  }, [effectiveBlockedList, isDoctorOffDuty]);

  const filteredSlots = React.useMemo(() => {
    if (activeTab === 'All') return availableSlots;
    return availableSlots.filter((s) => s.period === activeTab);
  }, [activeTab, availableSlots]);

  if (isDoctorOffDuty) {
    return (
      <div className="p-6 text-center bg-rose-50/80 rounded-3xl border border-rose-200/90 space-y-2 shadow-xs">
        <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>
        <p className="text-sm font-black text-rose-900 font-heading">Specialist is Currently Off-Duty</p>
        <p className="text-xs text-rose-700/90 max-w-sm mx-auto leading-relaxed">
          {doctor?.name || 'This doctor'} has been marked unavailable by hospital reception. Online booking slots are temporarily closed.
        </p>
      </div>
    );
  }

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
      {filteredSlots.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
          <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No Available Slots for this Period</p>
          <p className="text-[11px] text-slate-400">
            All slots in this window are currently booked or reserved. Please choose another date or category.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
};
