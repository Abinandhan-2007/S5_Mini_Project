import React from 'react';
import { motion } from 'framer-motion';
import {
  Sunrise,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Clock,
  Pill,
} from 'lucide-react';
import { clsx } from 'clsx';

export type DoseStatus = 'taken' | 'upcoming' | 'missed';

export interface DoseSlot {
  id: string;
  period: 'morning' | 'afternoon' | 'evening';
  time: string; // e.g. "8:00 AM"
  medicationCount: number;
  status: DoseStatus;
}

export interface TodaysDosageScheduleProps {
  slots?: DoseSlot[]; // exactly 3, one per period
  onSlotPress?: (slot: DoseSlot) => void;
  className?: string;
  title?: string;
  showHeader?: boolean;
}

export const DEFAULT_DOSAGE_SLOTS: DoseSlot[] = [
  {
    id: 'slot-morning',
    period: 'morning',
    time: '8:00 AM',
    medicationCount: 2,
    status: 'taken',
  },
  {
    id: 'slot-afternoon',
    period: 'afternoon',
    time: '1:00 PM',
    medicationCount: 1,
    status: 'upcoming',
  },
  {
    id: 'slot-evening',
    period: 'evening',
    time: '9:00 PM',
    medicationCount: 2,
    status: 'upcoming',
  },
];

interface PeriodTheme {
  label: string;
  icon: React.FC<{ className?: string }>;
  medallionBg: string;
  medallionGlow: string;
  cardBg: string;
  defaultBorder: string;
  hoverGlow: string;
  accentText: string;
}

const PERIOD_CONFIG: Record<'morning' | 'afternoon' | 'evening', PeriodTheme> = {
  morning: {
    label: 'Morning',
    icon: Sunrise,
    medallionBg: 'bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EF4444]',
    medallionGlow: 'shadow-[0_6px_18px_-2px_rgba(249,115,22,0.45)]',
    cardBg: 'bg-gradient-to-b from-[#FFFBF5] via-[#FFF7ED] to-[#FEF3C7]/60',
    defaultBorder: 'border-amber-200/90',
    hoverGlow: 'hover:border-amber-300 hover:shadow-[0_8px_20px_-4px_rgba(245,158,11,0.22)]',
    accentText: 'text-amber-800',
  },
  afternoon: {
    label: 'Afternoon',
    icon: Sun,
    medallionBg: 'bg-gradient-to-br from-[#FDE047] via-[#F59E0B] to-[#EA580C]',
    medallionGlow: 'shadow-[0_6px_18px_-2px_rgba(245,158,11,0.45)]',
    cardBg: 'bg-gradient-to-b from-[#FFFFFA] via-[#FEFCE8] to-[#FEF08A]/40',
    defaultBorder: 'border-yellow-200/90',
    hoverGlow: 'hover:border-amber-300 hover:shadow-[0_8px_20px_-4px_rgba(249,115,22,0.22)]',
    accentText: 'text-amber-800',
  },
  evening: {
    label: 'Evening',
    icon: Moon,
    medallionBg: 'bg-gradient-to-br from-[#818CF8] via-[#6366F1] to-[#1E1B4B]',
    medallionGlow: 'shadow-[0_6px_18px_-2px_rgba(99,102,241,0.45)]',
    cardBg: 'bg-gradient-to-b from-[#FAF8FF] via-[#F3F0FF] to-[#EDE9FE]/60',
    defaultBorder: 'border-indigo-200/90',
    hoverGlow: 'hover:border-indigo-300 hover:shadow-[0_8px_20px_-4px_rgba(99,102,241,0.22)]',
    accentText: 'text-indigo-900',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 28,
    },
  },
};

export const TodaysDosageSchedule: React.FC<TodaysDosageScheduleProps> = ({
  slots = DEFAULT_DOSAGE_SLOTS,
  onSlotPress,
  className = '',
  title = "Today's Dosage Schedule",
  showHeader = true,
}) => {
  const totalSlots = slots.length;
  const takenCount = slots.filter((s) => s.status === 'taken').length;
  const percentTaken = totalSlots > 0 ? Math.round((takenCount / totalSlots) * 100) : 0;

  return (
    <div className={clsx('w-full space-y-3', className)}>
      {/* 1. HEADER ROW */}
      {showHeader && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-[#E3F3F1] border border-[#14B8A6]/30 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4 h-4 text-[#0B5A54]" />
            </div>
            <span className="font-extrabold text-sm sm:text-[15px] text-[#0B5A54] tracking-tight truncate">
              {title}
            </span>
          </div>

          {/* Animated Proportional Progress Badge */}
          <div
            className="relative overflow-hidden px-3 py-1 rounded-full border border-[#14B8A6]/40 bg-[#E3F3F1]/85 text-[#0B5A54] text-xs font-black shadow-2xs shrink-0 select-none"
            title={`${takenCount} of ${totalSlots} doses taken today (${percentTaken}%)`}
          >
            {/* Animated proportional fill bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentTaken}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#14B8A6]/25 via-[#14B8A6]/35 to-[#0B5A54]/30 rounded-full"
            />
            <span className="relative z-10 flex items-center gap-1 font-mono font-extrabold text-[11.5px] sm:text-xs">
              <Check className="w-3 h-3 text-[#0B5A54] stroke-[3]" />
              <span>
                {takenCount} of {totalSlots} taken
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 2. THREE-COLUMN SLOTS ROW */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-2.5 sm:gap-3"
      >
        {slots.map((slot) => {
          const config = PERIOD_CONFIG[slot.period] || PERIOD_CONFIG.morning;
          const IconComponent = config.icon;
          const isTaken = slot.status === 'taken';
          const isUpcoming = slot.status === 'upcoming';
          const isMissed = slot.status === 'missed';

          return (
            <motion.button
              key={slot.id}
              type="button"
              variants={cardVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSlotPress && onSlotPress(slot)}
              className={clsx(
                'group relative rounded-2xl p-3 sm:p-3.5 border flex flex-col items-center text-center transition-all duration-300 select-none shadow-xs',
                config.cardBg,
                config.hoverGlow,
                isTaken && 'border-emerald-400/80 ring-1 ring-emerald-400/30 bg-emerald-50/40',
                isUpcoming && clsx(config.defaultBorder, 'ring-1 ring-amber-400/40 shadow-sm'),
                isMissed && 'border-rose-400/80 ring-1 ring-rose-400/30 bg-rose-50/40'
              )}
              title={`${config.label} (${slot.time}) • ${slot.medicationCount} med${slot.medicationCount > 1 ? 's' : ''} • Status: ${slot.status}`}
            >
              {/* Subtle card top gloss highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />

              {/* 48px RADIAL GRADIENT MEDALLION */}
              <div className="relative mb-2 shrink-0">
                {/* Pulsing ring animation for upcoming slot */}
                {isUpcoming && (
                  <motion.span
                    animate={{ scale: [1, 1.35, 1], opacity: [0.75, 0, 0.75] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -inset-1 rounded-full border-2 border-amber-400/80 pointer-events-none"
                  />
                )}

                {/* Main 48px Medallion Circle */}
                <div
                  className={clsx(
                    'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white relative transition-transform duration-300 group-hover:scale-105',
                    config.medallionBg,
                    config.medallionGlow
                  )}
                >
                  {/* Subtle inner gloss reflection */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/10 pointer-events-none" />

                  {/* Icon */}
                  <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-xs relative z-10 stroke-[2.2]" />

                  {/* Status Badges Overlapping Bottom-Right Edge */}
                  {isTaken && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0B5A54] text-white flex items-center justify-center shadow-md ring-2 ring-white z-20"
                    >
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                    </motion.div>
                  )}

                  {isMissed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md ring-2 ring-white z-20"
                    >
                      <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* SLOT CONTENT */}
              <div className="w-full space-y-0.5 relative z-10">
                {/* Period Label */}
                <h5 className="font-black text-xs sm:text-[13.5px] text-slate-800 tracking-tight truncate leading-tight">
                  {config.label}
                </h5>

                {/* Scheduled Time */}
                <p className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-500 tracking-tight truncate">
                  {slot.time}
                </p>

                {/* Medication Count Pill */}
                <div className="pt-1 flex items-center justify-center">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs truncate',
                      isTaken
                        ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300/70'
                        : isMissed
                          ? 'bg-rose-100/90 text-rose-800 border-rose-300/70'
                          : isUpcoming
                            ? 'bg-amber-100/90 text-amber-900 border-amber-300/70'
                            : 'bg-white/90 text-slate-600 border-slate-200'
                    )}
                  >
                    <Pill className="w-2.5 h-2.5 shrink-0 opacity-80" />
                    <span>
                      {slot.medicationCount} {slot.medicationCount === 1 ? 'med' : 'meds'}
                    </span>
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default TodaysDosageSchedule;
