import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sun, Sunrise, Sunset, AlertCircle, X, Lock } from 'lucide-react';
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
  selectedDate?: string;
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

// Helper: convert 12-hour time string like "09:30 AM" or "02:00 PM" into total minutes from start of day
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return 0;
  const [timePart, meridiem] = parts;
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  const isPM = meridiem.toUpperCase() === 'PM';
  const isAM = meridiem.toUpperCase() === 'AM';

  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

// Helper: check if a date string represents today in local date
export const isDateToday = (dateStr?: string): boolean => {
  if (!dateStr) return true;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr.startsWith(todayStr)) return true;

  try {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
};

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
  selectedDate,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

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

  // Compute all slots with their frozen/active state
  const slotsWithState = React.useMemo(() => {
    if (isDoctorOffDuty) return [];

    const isToday = isDateToday(selectedDate);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minAllowedMinutes = currentMinutes + 30; // 30 minutes after current time

    return DEFAULT_SLOTS.map((slot) => {
      const isPastOrTooSoon = isToday && parseTimeToMinutes(slot.time) < minAllowedMinutes;
      const isBlocked = effectiveBlockedList.some((blocked) => isTimeInWindow(slot.time, blocked));
      const isFrozen = isPastOrTooSoon || isBlocked;

      return {
        ...slot,
        isFrozen,
        isPastOrTooSoon,
        isBlocked,
      };
    });
  }, [effectiveBlockedList, isDoctorOffDuty, selectedDate]);

  // List of valid, selectable slots
  const validSelectableSlots = React.useMemo(() => {
    return slotsWithState.filter((s) => !s.isFrozen);
  }, [slotsWithState]);

  // Auto-select first valid slot if current selectedSlot is frozen or invalid
  React.useEffect(() => {
    if (validSelectableSlots.length > 0) {
      const isCurrentSlotValid = validSelectableSlots.some((s) => s.time === selectedSlot);
      if (!isCurrentSlotValid) {
        onSelectSlot(validSelectableSlots[0].time);
      }
    } else if (selectedSlot) {
      onSelectSlot('');
    }
  }, [validSelectableSlots, selectedSlot, onSelectSlot]);

  // Filter based on selected period tab
  const filteredSlots = React.useMemo(() => {
    if (activeTab === 'All') return slotsWithState;
    return slotsWithState.filter((s) => s.period === activeTab);
  }, [activeTab, slotsWithState]);

  // Handle slot click
  const handleSlotClick = (slot: typeof slotsWithState[0]) => {
    if (slot.isFrozen) {
      if (slot.isBlocked) {
        setNoticeMessage(`⚠️ ${slot.time} has been reserved or closed by the clinic reception.`);
      } else if (slot.isPastOrTooSoon) {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setNoticeMessage(
          `⚠️ ${slot.time} is no longer available. Consultations must be booked at least 30 minutes in advance (current time is ${timeFormatted}). Please choose an upcoming active slot.`
        );
      }
      return;
    }

    setNoticeMessage(null);
    onSelectSlot(slot.time);
  };

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
    <div className="space-y-3">
      {/* Interactive Frozen Slot Notice Toast */}
      <AnimatePresence>
        {noticeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="bg-amber-50 border border-amber-200/90 text-amber-900 px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-start justify-between gap-2.5 shadow-2xs text-left animate-in fade-in"
          >
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-snug">{noticeMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="p-1 text-amber-600 hover:text-amber-900 font-bold shrink-0 cursor-pointer rounded-lg hover:bg-amber-100 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Slots Grid with Frozen States */}
      {filteredSlots.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
          <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No Slots in this Category</p>
          <p className="text-[11px] text-slate-400">Please choose another category or date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filteredSlots.map((slot) => {
            const isSelected = selectedSlot === slot.time && !slot.isFrozen;
            const isFrozen = slot.isFrozen;

            return (
              <motion.button
                key={slot.time}
                type="button"
                whileHover={isFrozen ? {} : { y: -1.5 }}
                whileTap={isFrozen ? { scale: 0.98 } : { scale: 0.97 }}
                onClick={() => handleSlotClick(slot)}
                className={clsx(
                  'relative flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-200 border text-left focus:outline-none cursor-pointer select-none',
                  isSelected
                    ? 'bg-gradient-to-r from-[#0B5A54] to-[#0D6D65] text-white border-[#0B5A54] shadow-md shadow-teal-900/15 ring-2 ring-[#14B8A6]/40'
                    : isFrozen
                    ? 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-400 border-slate-200/80 opacity-60'
                    : 'bg-white hover:bg-teal-50/40 text-slate-700 border-slate-200/80 hover:border-[#14B8A6]/40 shadow-2xs'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock
                    className={clsx(
                      'w-3.5 h-3.5 shrink-0',
                      isSelected ? 'text-teal-200' : isFrozen ? 'text-slate-400' : 'text-slate-400'
                    )}
                  />
                  <span
                    className={clsx(
                      'font-black font-heading truncate',
                      isSelected ? 'text-white' : isFrozen ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'
                    )}
                  >
                    {slot.time}
                  </span>
                </div>

                {isSelected && (
                  <span className="text-[9px] font-black uppercase text-teal-100 bg-white/20 px-1.5 py-0.5 rounded-full shrink-0">
                    Selected
                  </span>
                )}

                {isFrozen && (
                  <span className="text-[8.5px] font-black uppercase text-slate-500 bg-slate-200/90 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span>{slot.isBlocked ? 'Closed' : 'Passed'}</span>
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

