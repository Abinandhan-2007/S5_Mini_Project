import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, X, Lock } from 'lucide-react';
import type { TimeSlotCapacity } from '../../types/receptionist';
import type { Doctor } from '../../lib/types';

export interface TimeSlot {
  time: string; // e.g. "09:00 AM - 10:00 AM" or "09:00 AM"
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

/**
 * Extract starting time from a slot string (e.g. "09:00 AM - 10:00 AM" -> "09:00 AM")
 */
const extractStartTime = (timeSlotStr: string): string => {
  if (!timeSlotStr) return '';
  if (timeSlotStr.includes('-')) {
    return timeSlotStr.split('-')[0].trim();
  }
  return timeSlotStr.trim();
};

/**
 * Convert 12-hour time string like "09:30 AM" or "02:00 PM" into total minutes from start of day
 */
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const startPart = extractStartTime(timeStr);
  const parts = startPart.trim().split(' ');
  if (parts.length < 2) return 0;
  const [timePart, meridiem] = parts;
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  const isPM = meridiem?.toUpperCase() === 'PM';
  const isAM = meridiem?.toUpperCase() === 'AM';

  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

/**
 * Categorize a time slot into Morning, Afternoon, or Evening based on its starting time
 */
const getPeriodFromTime = (timeStr: string): 'Morning' | 'Afternoon' | 'Evening' => {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes < 12 * 60) {
    return 'Morning';
  } else if (minutes < 17 * 60) {
    return 'Afternoon';
  } else {
    return 'Evening';
  }
};

/**
 * Helper: check if a date string represents today in local date
 */
const isDateToday = (dateStr?: string): boolean => {
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

/**
 * Helper to check if a specific time falls inside a slot window
 */
const isTimeInWindow = (timeStr: string, windowStr: string) => {
  if (!timeStr || !windowStr) return false;
  const cleanTime = timeStr.toLowerCase().replace(/\s+/g, '');
  const cleanWindow = windowStr.toLowerCase().replace(/\s+/g, '');
  if (cleanTime === cleanWindow) return true;
  if (cleanWindow.includes(cleanTime) || cleanTime.includes(cleanWindow)) return true;

  const timeHour = timeStr.split(':')[0].trim();
  const timeAmPm = timeStr.slice(-2).toUpperCase();
  if (windowStr.includes(timeHour) && windowStr.includes(timeAmPm)) {
    return true;
  }
  return false;
};

/**
 * Helper to check if all of today's time slots for a doctor are completed / passed
 */
export const areAllTodaySlotsCompleted = (
  doctor?: Doctor,
  slotCapacities?: TimeSlotCapacity[],
  blockedSlots: string[] = []
): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minAllowedMinutes = currentMinutes + 30; // 30 minutes advance requirement for today

  const rawSlots: any[] =
    (slotCapacities && slotCapacities.length > 0 ? slotCapacities : null) ||
    ((doctor as any)?.slotCapacities && (doctor as any).slotCapacities.length > 0
      ? (doctor as any).slotCapacities
      : null) ||
    ((doctor as any)?.slot_capacities && (doctor as any).slot_capacities.length > 0
      ? (doctor as any).slot_capacities
      : null) ||
    [];

  if (!rawSlots || rawSlots.length === 0) return false;

  const allBlocked: string[] = [...blockedSlots];
  if (Array.isArray(rawSlots)) {
    rawSlots.forEach((s: any) => {
      if (s.isAvailable === false || s.is_available === false) {
        allBlocked.push(s.timeSlot || s.time_slot || '');
      }
    });
  }

  // If there's at least one upcoming, unblocked, non-full slot, today is not completed
  const hasAvailableSlot = rawSlots.some((slot: any) => {
    const timeStr = slot.timeSlot || slot.time_slot || slot.time || '';
    const startTime = extractStartTime(timeStr);
    const isPastOrTooSoon = parseTimeToMinutes(startTime) < minAllowedMinutes;
    if (isPastOrTooSoon) return false;

    const isExplicitlyDisabled = slot.isAvailable === false || slot.is_available === false;
    if (isExplicitlyDisabled) return false;

    const isBlocked = allBlocked.some((blocked) => isTimeInWindow(timeStr, blocked));
    if (isBlocked) return false;

    const onlineSeatsLeft =
      slot.onlineAvailableSeats !== undefined
        ? slot.onlineAvailableSeats
        : slot.availableSeats !== undefined
        ? slot.availableSeats
        : slot.maxSeats;

    const isFull = onlineSeatsLeft !== undefined && onlineSeatsLeft <= 0;
    if (isFull) return false;

    return true;
  });

  return !hasAvailableSlot;
};

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedSlot,
  onSelectSlot,
  doctor,
  slotCapacities,
  blockedSlots = [],
  selectedDate,
}) => {
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

  // Resolve doctor's receptionist-configured slots or fallback slots
  const slotsWithState = React.useMemo(() => {
    if (isDoctorOffDuty) return [];

    const isToday = isDateToday(selectedDate);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minAllowedMinutes = currentMinutes + 30; // 30 minutes advance requirement for today

    // 1. Check if doctor has receptionist-configured slot capacities
    const rawSlots: any[] | null =
      (slotCapacities && slotCapacities.length > 0 ? slotCapacities : null) ||
      ((doctor as any)?.slotCapacities && (doctor as any).slotCapacities.length > 0
        ? (doctor as any).slotCapacities
        : null) ||
      ((doctor as any)?.slot_capacities && (doctor as any).slot_capacities.length > 0
        ? (doctor as any).slot_capacities
        : null);

    if (rawSlots && rawSlots.length > 0) {
      return rawSlots.map((cap: any) => {
        const timeStr = cap.timeSlot || cap.time_slot || '';
        const startTime = extractStartTime(timeStr);
        const period = getPeriodFromTime(timeStr);

        const isPastOrTooSoon = isToday && parseTimeToMinutes(startTime) < minAllowedMinutes;
        const isExplicitlyDisabled = cap.isAvailable === false || cap.is_available === false;
        const isBlockedByList = effectiveBlockedList.some((blocked) => isTimeInWindow(timeStr, blocked));

        const onlineSeatsLeft =
          cap.onlineAvailableSeats !== undefined
            ? cap.onlineAvailableSeats
            : cap.availableSeats !== undefined
            ? cap.availableSeats
            : cap.maxSeats;

        const isFull = onlineSeatsLeft !== undefined && onlineSeatsLeft <= 0;
        const isBlocked = isExplicitlyDisabled || isBlockedByList;
        const isFrozen = isPastOrTooSoon || isBlocked || isFull;

        let statusBadge = 'Available';
        if (isBlocked) statusBadge = 'Closed';
        else if (isPastOrTooSoon) statusBadge = 'Completed';
        else if (isFull) statusBadge = 'Full';
        else if (onlineSeatsLeft !== undefined && onlineSeatsLeft > 0) {
          statusBadge = `${onlineSeatsLeft} ${onlineSeatsLeft === 1 ? 'seat' : 'seats'}`;
        }

        return {
          time: timeStr,
          period,
          isFrozen,
          isPastOrTooSoon,
          isBlocked,
          isFull,
          statusBadge,
          availableSeats: onlineSeatsLeft,
          maxSeats: cap.maxSeats,
        };
      });
    }

    // No slots configured by receptionist for this doctor
    return [];
  }, [effectiveBlockedList, isDoctorOffDuty, selectedDate, slotCapacities, doctor]);

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

  // Handle slot click
  const handleSlotClick = (slot: (typeof slotsWithState)[0]) => {
    if (slot.isFrozen) {
      if (slot.isBlocked) {
        setNoticeMessage(`⚠️ ${slot.time} has been closed or reserved by hospital reception.`);
      } else if (slot.isFull) {
        setNoticeMessage(`⚠️ ${slot.time} is fully booked. Please choose another time slot.`);
      } else if (slot.isPastOrTooSoon) {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setNoticeMessage(
          `⚠️ ${slot.time} is no longer available. Consultations must be booked in advance (current time is ${timeFormatted}). Please choose an upcoming active slot.`
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

      {/* Slots Grid with Dynamic Receptionist Slots */}
      {slotsWithState.length === 0 ? (
        <div className="p-6 text-center bg-slate-50/80 rounded-3xl border border-dashed border-slate-200 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs font-black text-slate-800 font-heading">No Time Slots Configured</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Hospital reception has not added consultation time slots for {doctor?.name || 'this specialist'} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {slotsWithState.map((slot) => {
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
                    ? 'bg-[#E3F3F1] text-[#0B5A54] border-2 border-[#0B5A54] shadow-xs'
                    : isFrozen
                    ? 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-400 border-slate-200/80 opacity-60'
                    : 'bg-white hover:bg-teal-50/40 text-slate-700 border-slate-200/80 hover:border-[#14B8A6]/40 shadow-2xs'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock
                    className={clsx(
                      'w-3.5 h-3.5 shrink-0',
                      isSelected ? 'text-[#0B5A54]' : isFrozen ? 'text-slate-400' : 'text-[#0B5A54]'
                    )}
                  />
                  <div className="min-w-0">
                    <span
                      className={clsx(
                        'font-black font-heading truncate block text-xs',
                        isSelected
                          ? 'text-[#0B5A54]'
                          : isFrozen
                          ? 'text-slate-500 line-through decoration-slate-300'
                          : 'text-slate-800'
                      )}
                    >
                      {slot.time}
                    </span>
                    {!isFrozen && !isSelected && slot.statusBadge && (
                      <span className="text-[10px] text-teal-700 font-bold block">
                        {slot.statusBadge}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[9.5px] font-black uppercase text-[#0B5A54] bg-[#0B5A54]/15 px-2 py-0.5 rounded-full shrink-0">
                    Selected
                  </span>
                )}

                {isFrozen && (
                  <span className="text-[8.5px] font-black uppercase text-slate-500 bg-slate-200/90 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span>{slot.isBlocked ? 'Closed' : slot.isFull ? 'Full' : 'Completed'}</span>
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
