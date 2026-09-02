import React, { useState, useEffect, useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  Pill,
  Clock,
  User as UserIcon,
  Building2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface MedicationItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  hospitalName?: string;
  status?: 'Active' | 'Refill Soon' | 'As Needed' | 'Completed' | string;
  iconType?: 'pill' | 'syringe' | 'bottle' | 'syrup' | 'inhaler' | 'capsule';
  nextDose?: string;
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

// 6 curated light hospital-themed palettes matching CarePulse branding
const WALLET_CARD_THEMES = [
  {
    name: 'CarePulse Hospital Teal',
    gradient: 'bg-gradient-to-br from-[#E0F3F1] via-[#E8F8F5] to-[#CEEFEA]',
    border: 'border-[#14B8A6]/45',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(11,90,84,0.18)]',
    titleColor: 'text-[#0B5A54]',
    subtext: 'text-[#0D6E66]',
    accentColor: 'text-[#0B5A54]',
    tagBg: 'bg-white/90 text-[#0B5A54] border-[#14B8A6]/35 shadow-2xs',
    progressBg: 'bg-white/80 border-teal-200/80',
    progressFill: 'bg-gradient-to-r from-[#0B5A54] via-[#0D7B73] to-[#14B8A6]',
    footerBorder: 'border-[#0B5A54]/15',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-[#14B8A6]/30 hover:bg-teal-50 hover:border-[#14B8A6]',
    btnTakenBg: 'bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white border-[#0B5A54]',
  },
  {
    name: 'Clinical Azure Sky',
    gradient: 'bg-gradient-to-br from-[#E0F2FE] via-[#EAF5FD] to-[#BAE6FD]',
    border: 'border-sky-300',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(2,132,199,0.18)]',
    titleColor: 'text-[#0369A1]',
    subtext: 'text-[#0284C7]',
    accentColor: 'text-[#0284C7]',
    tagBg: 'bg-white/90 text-[#0369A1] border-sky-300 shadow-2xs',
    progressBg: 'bg-white/80 border-sky-200',
    progressFill: 'bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#38BDF8]',
    footerBorder: 'border-sky-200',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-sky-300 hover:bg-sky-50 hover:border-sky-400',
    btnTakenBg: 'bg-gradient-to-r from-[#0369A1] to-[#0284C7] text-white border-[#0369A1]',
  },
  {
    name: 'Emerald Healing Mint',
    gradient: 'bg-gradient-to-br from-[#DCFCE7] via-[#EAFBF0] to-[#BBF7D0]',
    border: 'border-emerald-300',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(5,150,105,0.18)]',
    titleColor: 'text-[#047857]',
    subtext: 'text-[#059669]',
    accentColor: 'text-[#047857]',
    tagBg: 'bg-white/90 text-[#047857] border-emerald-300 shadow-2xs',
    progressBg: 'bg-white/80 border-emerald-200',
    progressFill: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#34D399]',
    footerBorder: 'border-emerald-200',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400',
    btnTakenBg: 'bg-gradient-to-r from-[#047857] to-[#059669] text-white border-[#047857]',
  },
  {
    name: 'Lavender Clinical Care',
    gradient: 'bg-gradient-to-br from-[#EDE9FE] via-[#F4F1FD] to-[#DDD6FE]',
    border: 'border-purple-300',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(109,40,217,0.18)]',
    titleColor: 'text-[#5B21B6]',
    subtext: 'text-[#7C3AED]',
    accentColor: 'text-[#6D28D9]',
    tagBg: 'bg-white/90 text-[#5B21B6] border-purple-300 shadow-2xs',
    progressBg: 'bg-white/80 border-purple-200',
    progressFill: 'bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#A78BFA]',
    footerBorder: 'border-purple-200',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-purple-300 hover:bg-purple-50 hover:border-purple-400',
    btnTakenBg: 'bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] text-white border-[#5B21B6]',
  },
  {
    name: 'Warm Amber Wellness',
    gradient: 'bg-gradient-to-br from-[#FEF3C7] via-[#FFF8DE] to-[#FDE68A]',
    border: 'border-amber-300',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(217,119,6,0.18)]',
    titleColor: 'text-[#92400E]',
    subtext: 'text-[#B45309]',
    accentColor: 'text-[#B45309]',
    tagBg: 'bg-white/90 text-[#92400E] border-amber-300 shadow-2xs',
    progressBg: 'bg-white/80 border-amber-200',
    progressFill: 'bg-gradient-to-r from-[#92400E] via-[#D97706] to-[#FBBF24]',
    footerBorder: 'border-amber-200',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-amber-300 hover:bg-amber-50 hover:border-amber-400',
    btnTakenBg: 'bg-gradient-to-r from-[#92400E] to-[#D97706] text-white border-[#92400E]',
  },
  {
    name: 'Soft Rose Vitality',
    gradient: 'bg-gradient-to-br from-[#FFE4E6] via-[#FFF0F2] to-[#FECDD3]',
    border: 'border-rose-300',
    shadow: 'shadow-[0_16px_36px_-6px_rgba(225,29,72,0.18)]',
    titleColor: 'text-[#9F1239]',
    subtext: 'text-[#BE123C]',
    accentColor: 'text-[#BE123C]',
    tagBg: 'bg-white/90 text-[#9F1239] border-rose-300 shadow-2xs',
    progressBg: 'bg-white/80 border-rose-200',
    progressFill: 'bg-gradient-to-r from-[#9F1239] via-[#E11D48] to-[#FB7185]',
    footerBorder: 'border-rose-200',
    footerText: 'text-slate-600',
    btnBg: 'bg-white text-slate-800 border-rose-300 hover:bg-rose-50 hover:border-rose-400',
    btnTakenBg: 'bg-gradient-to-r from-[#9F1239] to-[#E11D48] text-white border-[#9F1239]',
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

// Storage key prefix for daily dose tracking (fresh clean start with all doses untaken)
const DOSE_STORAGE_PREFIX = 'carepulse_med_dose_v3_';

// Helper to get today's calendar date in YYYY-MM-DD format
const getTodayDateKey = () => new Date().toISOString().split('T')[0];

interface DoseSlot {
  id: string;
  label: string;
  timeHint: string;
  iconName: 'sunrise' | 'sun' | 'moon';
}

interface SlotThemeConfig {
  emoji: string;
  label: string;
  unrecorded: string;
  taken: string;
}

// Tailored distinct borderless light color themes based on morning, afternoon, evening, and night
const TIME_SLOT_THEMES: Record<string, SlotThemeConfig> = {
  morning: {
    emoji: '🌅',
    label: 'Morning',
    // Soft morning golden amber (borderless)
    unrecorded: 'bg-amber-100/80 text-amber-950 hover:bg-amber-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-amber-200 text-amber-950 shadow-xs border-0 outline-none',
  },
  afternoon: {
    emoji: '☀️',
    label: 'Afternoon',
    // Soft solar orange (borderless)
    unrecorded: 'bg-orange-100/80 text-orange-950 hover:bg-orange-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-orange-200 text-orange-950 shadow-xs border-0 outline-none',
  },
  evening: {
    emoji: '🌇',
    label: 'Evening',
    // Soft dusk rose (borderless)
    unrecorded: 'bg-rose-100/80 text-rose-950 hover:bg-rose-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-rose-200 text-rose-950 shadow-xs border-0 outline-none',
  },
  night: {
    emoji: '🌙',
    label: 'Night',
    // Soft calming indigo / lavender (borderless)
    unrecorded: 'bg-indigo-100/80 text-indigo-950 hover:bg-indigo-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-indigo-200 text-indigo-950 shadow-xs border-0 outline-none',
  },
  bedtime: {
    emoji: '🌙',
    label: 'Bedtime',
    // Soft calming indigo / lavender (borderless)
    unrecorded: 'bg-indigo-100/80 text-indigo-950 hover:bg-indigo-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-indigo-200 text-indigo-950 shadow-xs border-0 outline-none',
  },
  daily: {
    emoji: '☀️',
    label: 'Daily',
    unrecorded: 'bg-teal-100/80 text-teal-950 hover:bg-teal-200/80 shadow-2xs border-0 outline-none',
    taken: 'bg-teal-200 text-teal-950 shadow-xs border-0 outline-none',
  },
};

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

// Curated diverse default sample medication stack cards
const DEFAULT_SAMPLE_PRESCRIPTIONS: MedicationItem[] = [
  {
    id: 'rx-sample-1',
    drugName: 'Amoxicillin Trihydrate',
    dosage: '500 mg',
    frequency: '1 capsule • Twice daily after meals',
    prescriber: 'Dr. Elena Rostova',
    hospitalName: 'Metropolitan General Hospital',
    status: 'Active',
    iconType: 'capsule',
    nextDose: 'Today at 8:00 PM',
    totalDays: 10,
    daysCompleted: 4,
  },
  {
    id: 'rx-sample-2',
    drugName: 'Lisinopril Oral',
    dosage: '10 mg',
    frequency: '1 tablet • Daily every morning',
    prescriber: 'Dr. Alex Morgan',
    hospitalName: 'St. Jude Heart & Medical Center',
    status: 'Active',
    iconType: 'pill',
    nextDose: 'Tomorrow 8:00 AM',
    totalDays: 30,
    daysCompleted: 18,
  },
  {
    id: 'rx-sample-3',
    drugName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    frequency: '1 tablet • 3 times daily with meals',
    prescriber: 'Dr. Johan Janson',
    hospitalName: 'St. Jude Heart & Medical Center',
    status: 'Active',
    iconType: 'pill',
    nextDose: 'Today at 2:00 PM',
    totalDays: 14,
    daysCompleted: 8,
  },
  {
    id: 'rx-sample-4',
    drugName: 'Atorvastatin Calcium',
    dosage: '20 mg',
    frequency: '1 tablet • Nightly before bedtime',
    prescriber: 'Dr. Michael Chen',
    hospitalName: 'City General Hospital',
    status: 'Active',
    iconType: 'pill',
    nextDose: 'Tonight at 10:00 PM',
    totalDays: 30,
    daysCompleted: 22,
  },
  {
    id: 'rx-sample-5',
    drugName: 'Salbutamol Inhaler',
    dosage: '100 mcg',
    frequency: '2 puffs • As needed for shortness of breath',
    prescriber: 'Dr. Arlene McCoy',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    status: 'Refill Soon',
    iconType: 'inhaler',
    nextDose: 'As needed',
    totalDays: 14,
    daysCompleted: 12,
  },
  {
    id: 'rx-sample-6',
    drugName: 'Azithromycin',
    dosage: '250 mg',
    frequency: '1 tablet • Daily every morning',
    prescriber: 'Dr. Eleanor Pena',
    hospitalName: 'CarePulse Central Hospital',
    status: 'Active',
    iconType: 'capsule',
    nextDose: 'Tomorrow 9:00 AM',
    totalDays: 5,
    daysCompleted: 3,
  },
];

// Default prescribed course lengths per medication index
const DEFAULT_COURSE_DAYS = [
  { total: 10, completed: 4 },
  { total: 14, completed: 11 },
  { total: 30, completed: 18 },
  { total: 7, completed: 5 },
  { total: 14, completed: 8 },
  { total: 5, completed: 3 },
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

  // Use passed prescriptions, or fallback to rich sample stack cards
  const sourceList = prescriptions && prescriptions.length > 0 ? prescriptions : DEFAULT_SAMPLE_PRESCRIPTIONS;

  // Normalize data with resilient fallbacks and prescribed course days
  const normalizedMeds: MedicationItem[] = sourceList.map((p, idx) => {
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
      status: p.status || (idx === 4 ? 'Refill Soon' : 'Active'),
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

  // Handle toggling a dose slot (Record dose or Untake/Reset to not taken)
  const handleTakeSlotDose = (med: MedicationItem, slotId: string) => {
    const today = getTodayDateKey();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTakenSlotsMap((prev) => {
      const currentMedEntry = prev[med.id]?.date === today ? prev[med.id] : { date: today, slots: {} };
      const isAlreadyTaken = Boolean(currentMedEntry.slots[slotId]);

      let updatedSlots: Record<string, string>;
      if (isAlreadyTaken) {
        // Toggle OFF: Untake / reset to pending (not taken)
        updatedSlots = { ...currentMedEntry.slots };
        delete updatedSlots[slotId];
      } else {
        // Toggle ON: Record dose with current timestamp
        updatedSlots = {
          ...currentMedEntry.slots,
          [slotId]: nowTimeStr,
        };
      }

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
                      ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#0B5A54]/20 shadow-xl'
                      : 'cursor-pointer hover:-translate-y-1 hover:brightness-98 shadow-md'
                  )}
                >
                  {/* Subtle clean medical light gloss overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/5 pointer-events-none rounded-3xl" />

                  {/* 1. Header Row (Drug Name & Schedule Summary) */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <h4 className={clsx('text-base sm:text-lg font-black tracking-tight leading-tight truncate', theme.titleColor)}>
                        {med.drugName}
                      </h4>
                      <p className={clsx('text-xs sm:text-[13px] font-extrabold tracking-wide truncate', theme.subtext)}>
                        {med.dosage}
                      </p>
                      {/* Crisp dark frequency instruction */}
                      <p className="text-xs sm:text-sm font-bold tracking-wide truncate text-slate-700">
                        {med.frequency}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                      <span className={clsx('text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs', theme.tagBg)}>
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
                          <div className="flex items-center gap-1.5 text-slate-800 font-extrabold">
                            <Calendar className={clsx('w-4 h-4', theme.accentColor)} />
                            <span>Day {effectiveCompleted} of {baseTotal} Days Prescribed</span>
                          </div>
                          <span className={clsx('text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs', theme.tagBg)}>
                            {progressPercent}% Done
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className={clsx('w-full h-2.5 rounded-full overflow-hidden p-0.5 border shadow-inner', theme.progressBg)}>
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
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Clock className={clsx('w-4 h-4', theme.accentColor)} />
                            <span>Today's Dosage Schedule:</span>
                          </span>
                          <span className={clsx('text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs', theme.tagBg)}>
                            {allDosesTakenToday ? 'All doses taken today' : `${completedSlotsCount} of ${doseSlots.length} taken`}
                          </span>
                        </div>

                        <div className={clsx('grid gap-2', doseSlots.length === 3 ? 'grid-cols-3' : doseSlots.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                          {doseSlots.map((slot) => {
                            const isSlotTaken = Boolean(todaySlots[slot.id]);
                            const slotTime = todaySlots[slot.id];
                            const slotTheme = TIME_SLOT_THEMES[slot.id] || TIME_SLOT_THEMES.daily;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isCourseFinished}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeSlotDose(med, slot.id);
                                }}
                                className={clsx(
                                  'py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-xs min-w-0 font-bold active:scale-95 cursor-pointer',
                                  isCourseFinished
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-0 outline-none'
                                    : isSlotTaken
                                      ? slotTheme.taken
                                      : slotTheme.unrecorded
                                )}
                                title={isSlotTaken ? `${slotTheme.label} dose recorded at ${slotTime} (Click to unmark)` : `Click to record ${slotTheme.label} dose`}
                              >
                                <span className="text-base sm:text-lg leading-none shrink-0 select-none" role="img" aria-label={slotTheme.label}>
                                  {slotTheme.emoji}
                                </span>

                                {isSlotTaken && (
                                  <span className="text-[11px] sm:text-xs font-black font-mono shrink-0 truncate">
                                    ✓ {slotTime}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prescriber & Hospital Strip */}
                      <div className={clsx('pt-2 border-t flex items-center justify-between gap-2 text-xs sm:text-[12.5px] font-medium', theme.footerBorder, theme.footerText)}>
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className={clsx('w-4 h-4 shrink-0', theme.accentColor)} />
                          <span className="truncate font-bold text-slate-700">{med.hospitalName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-xs">
                          <UserIcon className={clsx('w-3.5 h-3.5 shrink-0', theme.accentColor)} />
                          <span className="truncate font-semibold text-slate-700">{med.prescriber}</span>
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
