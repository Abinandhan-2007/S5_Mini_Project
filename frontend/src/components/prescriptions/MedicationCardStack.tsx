import React, { useState, useEffect, useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  Pill,
  Clock,
  User as UserIcon,
  Building2,
  Calendar,
  Sun,
  Moon,
  Sunrise,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface MedicationItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  hospitalName: string;
  status: 'Active' | 'Refill Soon' | 'As Needed' | 'Completed';
  iconType?: 'pill' | 'syringe' | 'bottle' | 'syrup' | 'inhaler';
  nextDose: string;
  totalDays?: number;
  daysCompleted?: number;
}

export interface MedicationCardStackProps {
  prescriptions: MedicationItem[];
  title?: string;
  onViewAll?: () => void;
  onSelectMedication?: (med: MedicationItem) => void;
  onMarkTaken?: (med: MedicationItem, isTaken: boolean) => void;
}

// 5 curated vibrant Samsung Pass gradient themes
const WALLET_CARD_THEMES = [
  {
    name: 'Cobalt Blue & Cyan',
    gradient: 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#38BDF8]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(29,78,216,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-sky-100',
    footerBorder: 'border-white/20',
    footerText: 'text-sky-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-blue-950 hover:bg-sky-50',
    tagBg: 'bg-white/20 text-white',
  },
  {
    name: 'Emerald Green & Mint Lime',
    gradient: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#34D399]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(4,120,87,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-emerald-100',
    footerBorder: 'border-white/20',
    footerText: 'text-emerald-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-emerald-950 hover:bg-emerald-50',
    tagBg: 'bg-white/20 text-white',
  },
  {
    name: 'Royal Violet & Amethyst',
    gradient: 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#A78BFA]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(109,40,217,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-purple-100',
    footerBorder: 'border-white/20',
    footerText: 'text-purple-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-purple-950 hover:bg-purple-50',
    tagBg: 'bg-white/20 text-white',
  },
  {
    name: 'Ocean Azure & Cornflower',
    gradient: 'bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#38BDF8]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(2,132,199,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-sky-100',
    footerBorder: 'border-white/20',
    footerText: 'text-sky-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-sky-950 hover:bg-sky-50',
    tagBg: 'bg-white/20 text-white',
  },
  {
    name: 'Magenta Berry & Fuchsia',
    gradient: 'bg-gradient-to-r from-[#9D174D] via-[#DB2777] to-[#F472B6]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(157,23,77,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-pink-100',
    footerBorder: 'border-white/20',
    footerText: 'text-pink-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-pink-950 hover:bg-pink-50',
    tagBg: 'bg-white/20 text-white',
  },
  {
    name: 'Sunset Coral & Amber',
    gradient: 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#FB923C]',
    border: 'border-white/20',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(194,65,12,0.38)]',
    titleColor: 'text-white',
    subtext: 'text-amber-100',
    footerBorder: 'border-white/20',
    footerText: 'text-amber-100',
    progressBg: 'bg-black/25',
    progressFill: 'bg-white',
    btnBg: 'bg-white text-orange-950 hover:bg-amber-50',
    tagBg: 'bg-white/20 text-white',
  },
];

// Smooth snappy spring config
const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};

const MAX_VISIBLE_PEEK = 3;
const BASE_CARD_HEIGHT = 300;

// Storage key prefix for daily dose tracking
const DOSE_STORAGE_PREFIX = 'carepulse_singlestack_dose_';

// Helper to get today's calendar date in YYYY-MM-DD format
const getTodayDateKey = () => new Date().toISOString().split('T')[0];

interface DoseSlot {
  id: string;
  label: string;
  timeHint: string;
  iconName: 'sunrise' | 'sun' | 'moon';
}

// Parses frequency criteria to determine daily dosage schedule (1x, 2x, 3x, or 4x per day)
const getDoseSlotsForMed = (frequencyStr = '', dosageStr = ''): DoseSlot[] => {
  const text = `${frequencyStr} ${dosageStr}`.toLowerCase();

  // 4 times a day
  if (text.includes('4 times') || text.includes('four times') || text.includes('qid') || text.includes('4x')) {
    return [
      { id: 'morning', label: 'Morning', timeHint: '8:00 AM', iconName: 'sunrise' },
      { id: 'afternoon', label: 'Afternoon', timeHint: '1:00 PM', iconName: 'sun' },
      { id: 'evening', label: 'Evening', timeHint: '6:00 PM', iconName: 'sun' },
      { id: 'bedtime', label: 'Bedtime', timeHint: '10:00 PM', iconName: 'moon' },
    ];
  }

  // 3 times a day (TID / Thrice / Every 8 Hours)
  if (
    text.includes('3 times') ||
    text.includes('three times') ||
    text.includes('thrice') ||
    text.includes('tid') ||
    text.includes('3x') ||
    text.includes('8 hours')
  ) {
    return [
      { id: 'morning', label: 'Morning', timeHint: '8:00 AM', iconName: 'sunrise' },
      { id: 'afternoon', label: 'Afternoon', timeHint: '2:00 PM', iconName: 'sun' },
      { id: 'night', label: 'Night', timeHint: '9:00 PM', iconName: 'moon' },
    ];
  }

  // 2 times a day (BID / Twice daily)
  if (
    text.includes('twice') ||
    text.includes('2 times') ||
    text.includes('two times') ||
    text.includes('bid') ||
    text.includes('2x') ||
    text.includes('12 hours')
  ) {
    return [
      { id: 'morning', label: 'Morning', timeHint: '8:00 AM', iconName: 'sunrise' },
      { id: 'night', label: 'Night', timeHint: '8:00 PM', iconName: 'moon' },
    ];
  }

  // Default: Once daily
  return [
    { id: 'daily', label: 'Daily Dose', timeHint: 'Scheduled', iconName: 'sun' },
  ];
};

// Default prescribed course lengths per medication index
const DEFAULT_COURSE_DAYS = [
  { total: 10, completed: 4 },
  { total: 14, completed: 11 },
  { total: 30, completed: 18 },
  { total: 7, completed: 5 },
  { total: 14, completed: 8 },
];

export const MedicationCardStack: React.FC<MedicationCardStackProps> = ({
  prescriptions = [],
  title = 'ACTIVE PRESCRIPTIONS',
  onViewAll,
  onSelectMedication,
  onMarkTaken,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [takenSlotsMap, setTakenSlotsMap] = useState<
    Record<string, { date: string; slots: Record<string, string> }>
  >({});
  const isScrollingRef = useRef(false);

  // Normalize data with resilient fallbacks and prescribed course days
  const normalizedMeds: MedicationItem[] = prescriptions.map((p, idx) => {
    const courseDefaults = DEFAULT_COURSE_DAYS[idx % DEFAULT_COURSE_DAYS.length];
    return {
      id: p.id || `rx-${idx}`,
      drugName: (p.drugName || 'Prescription Medication')
        .replace(/\s*\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|meq|%)\b/gi, '')
        .trim(),
      dosage: p.dosage || '1 dose',
      frequency: p.frequency || (idx === 1 || idx === 3 ? '1 capsule • 3 times daily for 7 days' : idx === 0 ? '1 tablet • Twice daily after meals' : '1 tablet • Daily every morning'),
      prescriber: p.prescriber || 'Treating Physician',
      hospitalName: p.hospitalName || 'CarePulse Medical Center',
      status: p.status || (idx === 1 ? 'Refill Soon' : 'Active'),
      iconType: p.iconType || 'pill',
      nextDose: p.nextDose || (idx === 0 ? 'Today at 8:00 PM' : 'Tomorrow 9:00 AM'),
      totalDays: p.totalDays || courseDefaults.total,
      daysCompleted: p.daysCompleted !== undefined ? p.daysCompleted : courseDefaults.completed,
    };
  });

  const totalCards = normalizedMeds.length;
  const hasPrescriptions = totalCards > 0;

  // On mount: load today's taken dose slots. Automatically resets on new calendar day!
  useEffect(() => {
    const today = getTodayDateKey();
    const loadedMap: Record<string, { date: string; slots: Record<string, string> }> = {};

    normalizedMeds.forEach((m) => {
      try {
        const stored = localStorage.getItem(`${DOSE_STORAGE_PREFIX}${m.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.date === today && parsed.slots) {
            loadedMap[m.id] = { date: today, slots: parsed.slots };
          }
        }
      } catch (e) {
        console.warn('Multi-dose check note:', e);
      }
    });

    setTakenSlotsMap(loadedMap);
  }, [prescriptions.length]);

  // Handle taking a specific dose slot (e.g. Morning, Afternoon, Night)
  const handleTakeSlotDose = (med: MedicationItem, slotId: string) => {
    const today = getTodayDateKey();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTakenSlotsMap((prev) => {
      const currentMedEntry = prev[med.id]?.date === today ? prev[med.id] : { date: today, slots: {} };
      const updatedSlots = {
        ...currentMedEntry.slots,
        [slotId]: nowTimeStr,
      };

      const updatedRecord = { date: today, slots: updatedSlots };
      try {
        localStorage.setItem(`${DOSE_STORAGE_PREFIX}${med.id}`, JSON.stringify(updatedRecord));
      } catch (e) {
        console.warn('Save dose slots storage note:', e);
      }

      return {
        ...prev,
        [med.id]: updatedRecord,
      };
    });

    if (onMarkTaken) {
      onMarkTaken(med, true);
    }
  };

  // Continuous infinite forward cycle (Swipe UP)
  const handleNextCard = () => {
    if (totalCards <= 1) return;
    setActiveIndex((prev) => (prev + 1) % totalCards);
  };

  // Continuous infinite backward cycle (Swipe DOWN)
  const handlePrevCard = () => {
    if (totalCards <= 1) return;
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
  };

  // Vertical drag release handler:
  // Swipe UP (negative offset.y) -> Advance to next card
  // Swipe DOWN (positive offset.y) -> Move to previous card
  const handleDragEnd = (info: PanInfo) => {
    if (totalCards <= 1) return;
    if (info.offset.y < -30 || info.velocity.y < -150) {
      handleNextCard();
    } else if (info.offset.y > 30 || info.velocity.y > 150) {
      handlePrevCard();
    }
  };

  // Debounced vertical mouse wheel handler
  const handleWheel = (e: React.WheelEvent) => {
    if (totalCards <= 1) return;
    if (Math.abs(e.deltaY) > 20) {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      if (e.deltaY > 0) {
        handleNextCard();
      } else {
        handlePrevCard();
      }
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 250);
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className="space-y-2 w-full text-left select-none"
    >
      {/* 1. HEADER ROW */}
      <div className="flex justify-between items-center px-1 pb-1">
        <h3 className="text-xs sm:text-sm font-black text-[#0B5A54] uppercase tracking-widest font-heading">
          {title}
        </h3>

        {hasPrescriptions && (
          <div className="flex items-center gap-2">
            <span className="bg-[#E3F3F1] text-[#0B5A54] font-black text-xs px-2.5 py-0.5 rounded-full border border-[#14B8A6]/25">
              {activeIndex + 1} of {totalCards}
            </span>

            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs sm:text-sm font-bold text-[#0B5A54] hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4 text-[#0B5A54]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT: COMPACT, CRISP STACK DECK */}
      {!hasPrescriptions ? (
        /* EMPTY STATE */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#EBF9F7] via-white to-teal-50/80 border border-[#14B8A6]/30 shadow-xs flex items-center gap-4"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-[#1FA2AC] text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-white/80">
            <Pill className="w-6 h-6 text-white animate-pulse" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                No Active Medications
              </h4>
              <span className="bg-[#0B5A54]/10 text-[#0B5A54] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Wallet Empty
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Active prescriptions and dosage schedules prescribed by your doctors will stack here automatically.
            </p>
          </div>
        </motion.div>
      ) : (
        /* PROPERLY SPACED STACK DECK */
        <div className="space-y-2">
          <div
            style={{ height: BASE_CARD_HEIGHT + 36 }}
            className="relative w-full overflow-visible"
          >
            {normalizedMeds.map((med, actualIndex) => {
              // Position relative to activeIndex (0 = top active card, 1 = 1st background card, 2 = 2nd background card)
              const relPos = (actualIndex - activeIndex + totalCards) % totalCards;
              const isTopCard = relPos === 0;
              const isVisibleInStack = relPos < MAX_VISIBLE_PEEK;

              const theme = WALLET_CARD_THEMES[actualIndex % WALLET_CARD_THEMES.length];
              const todayKey = getTodayDateKey();
              const medEntry = takenSlotsMap[med.id];
              const todaySlots = medEntry?.date === todayKey ? medEntry.slots : {};

              const doseSlots = getDoseSlotsForMed(med.frequency, med.dosage);
              const completedSlotsCount = doseSlots.filter((s) => Boolean(todaySlots[s.id])).length;
              const allDosesTakenToday = completedSlotsCount === doseSlots.length && doseSlots.length > 0;

              // Compute dynamic days and progress percentage
              const baseTotal = med.totalDays || 10;
              const baseCompleted = med.daysCompleted || 4;
              const effectiveCompleted = allDosesTakenToday ? Math.min(baseTotal, baseCompleted + 1) : baseCompleted;
              const progressPercent = Math.round((effectiveCompleted / baseTotal) * 100);
              const isCourseFinished = effectiveCompleted >= baseTotal;

              // Stepped background cards:
              let targetY = 0;
              let targetScale = 1.0;
              let targetOpacity = 1;
              let targetZIndex = 30;

              if (relPos === 0) {
                targetY = 0;
                targetScale = 1.0;
                targetOpacity = 1;
                targetZIndex = 30;
              } else if (relPos === 1) {
                targetY = -14;
                targetScale = 0.96;
                targetOpacity = 1;
                targetZIndex = 20;
              } else if (relPos === 2) {
                targetY = -26;
                targetScale = 0.92;
                targetOpacity = 1;
                targetZIndex = 10;
              } else {
                targetY = -34;
                targetScale = 0.88;
                targetOpacity = 0;
                targetZIndex = 5;
              }

              return (
                <motion.div
                  key={med.id}
                  drag={isTopCard ? 'y' : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.45}
                  onDragEnd={(_e, info) => handleDragEnd(info)}
                  animate={{
                    y: targetY,
                    scale: targetScale,
                    opacity: targetOpacity,
                  }}
                  transition={SPRING_TRANSITION}
                  onClick={() => {
                    if (!isTopCard) {
                      // Clicking any peeking card brings that stack into full focus
                      setActiveIndex(actualIndex);
                    } else if (onSelectMedication) {
                      onSelectMedication(med);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 28,
                    left: 0,
                    right: 0,
                    height: BASE_CARD_HEIGHT,
                    zIndex: targetZIndex,
                    pointerEvents: isVisibleInStack ? 'auto' : 'none',
                    transformOrigin: 'top center',
                  }}
                  className={clsx(
                    'rounded-3xl p-5 sm:p-5.5 border overflow-hidden select-none transition-shadow duration-300 flex flex-col justify-between',
                    theme.gradient,
                    theme.border,
                    theme.shadow,
                    isTopCard
                      ? 'cursor-grab active:cursor-grabbing shadow-xl ring-2 ring-white/30'
                      : 'cursor-pointer hover:-translate-y-1 hover:brightness-105 shadow-md'
                  )}
                >
                  {/* Soft top-light gloss overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/15 pointer-events-none rounded-3xl" />

                  {/* 1. Header Row (Drug Name & Schedule Summary) */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <h4 className={clsx('text-base sm:text-lg font-black tracking-tight leading-tight truncate', theme.titleColor)}>
                        {med.drugName}
                      </h4>
                      <p className={clsx('text-xs sm:text-[13px] font-bold tracking-wide truncate', theme.subtext)}>
                        {med.dosage}
                      </p>
                      {/* ENLARGED, CRISP SOLID WHITE FREQUENCY INSTRUCTION */}
                      <p className="text-xs sm:text-sm font-extrabold tracking-wide truncate text-white drop-shadow-xs">
                        {med.frequency}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                        {completedSlotsCount}/{doseSlots.length} doses
                      </span>
                    </div>
                  </div>

                  {/* 2. Expanded Details (Only Shown On The Focused Stack Card) */}
                  {isTopCard && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 space-y-3"
                    >
                      {/* Course Progress Bar */}
                      <div className={clsx('pt-3 border-t', theme.footerBorder)}>
                        <div className="flex items-center justify-between text-xs sm:text-[13.5px] mb-2">
                          <div className="flex items-center gap-1.5 text-white font-black">
                            <Calendar className="w-4 h-4 text-white/90" />
                            <span>Day {effectiveCompleted} of {baseTotal} Days Prescribed</span>
                          </div>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                            {progressPercent}% Done
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className={clsx('w-full h-2.5 rounded-full overflow-hidden p-0.5 border border-white/20', theme.progressBg)}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={clsx('h-full rounded-full shadow-xs', theme.progressFill)}
                          />
                        </div>
                      </div>

                      {/* Daily Dose Slots (Comfortable size with clear typography) */}
                      <div className={clsx('pt-2.5 border-t', theme.footerBorder)}>
                        <div className="flex items-center justify-between text-xs sm:text-[13px] mb-2">
                          <span className="font-bold text-white/95 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-white/85" />
                            <span>Today's Dosage Schedule:</span>
                          </span>
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                            {allDosesTakenToday ? 'All doses taken today' : `${completedSlotsCount} of ${doseSlots.length} taken`}
                          </span>
                        </div>

                        <div className={clsx('grid gap-2', doseSlots.length === 3 ? 'grid-cols-3' : doseSlots.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                          {doseSlots.map((slot) => {
                            const isSlotTaken = Boolean(todaySlots[slot.id]);
                            const slotTime = todaySlots[slot.id];

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isSlotTaken || isCourseFinished}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeSlotDose(med, slot.id);
                                }}
                                className={clsx(
                                  'px-2.5 py-2 sm:py-2.5 rounded-2xl flex items-center justify-between gap-1.5 transition-all shadow-md min-w-0',
                                  isSlotTaken
                                    ? 'bg-emerald-500 text-white cursor-not-allowed border border-emerald-400'
                                    : isCourseFinished
                                      ? 'bg-white/40 text-white/60 cursor-not-allowed'
                                      : clsx(theme.btnBg, 'active:scale-95 cursor-pointer')
                                )}
                                title={isSlotTaken ? `Dose recorded at ${slotTime}` : `Click to record ${slot.label} dose`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {slot.iconName === 'sunrise' ? (
                                    <Sunrise className={clsx('w-4 h-4 shrink-0', isSlotTaken ? 'text-white' : 'text-amber-500')} />
                                  ) : slot.iconName === 'moon' ? (
                                    <Moon className={clsx('w-4 h-4 shrink-0', isSlotTaken ? 'text-white' : 'text-indigo-500')} />
                                  ) : (
                                    <Sun className={clsx('w-4 h-4 shrink-0', isSlotTaken ? 'text-white' : 'text-amber-500')} />
                                  )}
                                  <span className="text-xs sm:text-[13px] font-black leading-none truncate">{slot.label}</span>
                                </div>

                                <span className="text-[10px] sm:text-[10.5px] font-mono shrink-0 font-extrabold opacity-95">
                                  {isSlotTaken ? `✓ ${slotTime}` : slot.timeHint}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prescriber & Hospital Strip */}
                      <div className={clsx('pt-2 border-t flex items-center justify-between gap-2 text-xs sm:text-[12.5px] text-white/95 font-medium', theme.footerBorder)}>
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-4 h-4 text-white/85 shrink-0" />
                          <span className="truncate font-semibold">{med.hospitalName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-xs">
                          <UserIcon className="w-3.5 h-3.5 text-white/85 shrink-0" />
                          <span className="truncate">{med.prescriber}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 3. PAGINATION DOTS (Click to jump to any stack card) */}
          {totalCards > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1.5">
              {normalizedMeds.map((_, idx) => (
                <button
                  key={`pag-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={clsx(
                    'transition-all duration-300 rounded-full cursor-pointer',
                    activeIndex === idx
                      ? 'w-7 h-2.5 bg-[#0B5A54]'
                      : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                  )}
                  title={`Go to medication ${idx + 1}`}
                  aria-label={`Go to medication ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
