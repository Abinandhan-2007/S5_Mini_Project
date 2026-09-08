import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  User as UserIcon,
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import type { Appointment } from '../../lib/types';

export interface AppointmentCardStackProps {
  appointments: Appointment[];
  onViewDetails: (appointment: Appointment) => void;
  onScheduleNew?: () => void;
}

export const AppointmentCardStack: React.FC<AppointmentCardStackProps> = ({
  appointments = [],
  onViewDetails,
  onScheduleNew,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const totalCount = appointments ? appointments.length : 0;
  const isStacked = totalCount > 1;

  // Auto-clamp index if appointments count shrinks
  useEffect(() => {
    if (totalCount > 0 && currentIndex >= totalCount) {
      setCurrentIndex(Math.max(0, totalCount - 1));
    }
  }, [totalCount, currentIndex]);

  if (!appointments || appointments.length === 0) {
    return (
      <div
        onClick={onScheduleNew}
        className="relative bg-white rounded-2xl p-5 border border-dashed border-slate-200 shadow-2xs hover:border-[#14B8A6] transition-all cursor-pointer text-left space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B5A54]">
            <Ticket className="w-4 h-4 text-[#14B8A6]" />
            <span>APPOINTMENT TOKEN</span>
          </div>
          <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
            NO ACTIVE TOKEN
          </span>
        </div>
        <div className="flex items-center gap-3.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0B5A54] flex items-center justify-center font-bold shrink-0">
            <CalendarIcon className="w-6 h-6 text-[#0B5A54]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#111827]">No Appointments Scheduled</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Book a consultation with verified doctors to get your digital queue token.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onScheduleNew?.();
          }}
          className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Book Doctor Consultation →</span>
        </button>
      </div>
    );
  }

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalCount);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalCount) % totalCount);
  };

  const handleSelectIndex = (newIdx: number) => {
    setDirection(newIdx > currentIndex ? 1 : -1);
    setCurrentIndex(newIdx);
  };

  const activeApp = appointments[currentIndex] || appointments[0];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 10,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      scale: 0.98,
      zIndex: 0,
    }),
  };

  return (
    <div className="relative w-full select-none">
      {/* 1. STACK HEADER BAR (ONLY WHEN STACKED) */}
      {isStacked && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#0B5A54] font-heading">
              APPOINTMENT TOKENS
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500 font-mono tracking-wide mr-1">
              {currentIndex + 1} / {totalCount}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-[#E3F3F1] text-slate-600 hover:text-[#0B5A54] flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Token"
              aria-label="Previous Token"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-[#E3F3F1] text-slate-600 hover:text-[#0B5A54] flex items-center justify-center transition-colors cursor-pointer"
              title="Next Token"
              aria-label="Next Token"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. CLEAN CARD CONTAINER WITH SMOOTH SWIPE TRANSITION */}
      <div className="relative w-full overflow-hidden rounded-2xl">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={activeApp.id || currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              const swipeOffset = info.offset.x;
              const swipeVelocity = info.velocity.x;
              if (swipeOffset < -25 || swipeVelocity < -150) {
                handleNext();
              } else if (swipeOffset > 25 || swipeVelocity > 150) {
                handlePrev();
              }
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.5 }}
            className="relative w-full rounded-2xl shadow-xs border border-[#E4E7EC] overflow-hidden bg-white text-left select-none cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {/* Boarding Pass Left & Right Notch Cutouts */}
            <div className="absolute top-[30px] -left-2 w-4 h-4 rounded-full bg-white border-r border-[#E4E7EC] z-10" />
            <div className="absolute top-[30px] -right-2 w-4 h-4 rounded-full bg-white border-l border-[#E4E7EC] z-10" />

            {/* Header Strip */}
            <div className="bg-white border-b border-[#E4E7EC] px-4 py-2 flex justify-between items-center relative z-20">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B5A54]">
                <Ticket className="w-4 h-4 text-[#14B8A6]" />
                <span>APPOINTMENT TOKEN</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-xs px-2.5 py-0.5 rounded-pill font-bold shadow-2xs">
                  {activeApp.ticketNumber || `TK-${100 + currentIndex}`}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3 relative z-20 bg-white">
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> PATIENT
                  </span>
                  <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">
                    {activeApp.patientName || 'Patient'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> HOSPITAL
                  </span>
                  <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">
                    {activeApp.hospitalName || 'CarePulse Hospital'}
                  </p>
                </div>
              </div>

              <div className="dashed-divider my-1.5" />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <Avatar src={activeApp.doctorPhoto} size="md" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#111827]">{activeApp.doctorName}</h4>
                    <p className="text-xs font-semibold text-[#0B5A54]">{activeApp.doctorSpecialty}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-xs font-bold text-[#111827]">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span>{activeApp.date}</span>
                  </div>
                  <span className="text-xs text-[#6B7280] font-semibold">
                    {activeApp.timeSlot || (activeApp as any).time_slot || (activeApp as any).slot || 'Scheduled Time'}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  STATUS:{' '}
                  <strong className="text-[#0B5A54] font-black">
                    {activeApp.status || 'Upcoming'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(activeApp);
                  }}
                  className="bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white px-3.5 py-1.5 rounded-pill text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  View Details →
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. STACK PAGINATION INDICATOR PILLS BELOW CARD */}
      {isStacked && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {appointments.map((app, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectIndex(idx)}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                currentIndex === idx
                  ? 'w-6 bg-[#0B5A54]'
                  : 'w-1.5 bg-slate-200 hover:bg-slate-300'
              )}
              title={`Switch to Token ${app.ticketNumber || idx + 1}`}
              aria-label={`Switch to appointment token ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
