import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  User as UserIcon,
  Building2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import type { Appointment } from '../../lib/types';

export interface AppointmentCardStackProps {
  appointments: Appointment[];
  onViewDetails: (appointment: Appointment) => void;
  onScheduleNew?: () => void;
}

export const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-sample-1',
    patientId: 'pat-1',
    patientName: 'SIVANAGU E',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ethan Reynolds',
    doctorSpecialty: 'Neurologist',
    doctorPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    hospitalId: 'hosp-1',
    hospitalName: 'Metropolitan General Hospital',
    date: '2026-09-02',
    timeSlot: '02:00 PM',
    status: 'Scheduled',
    ticketNumber: 'TK-482',
    type: 'In-Person',
  },
  {
    id: 'apt-sample-2',
    patientId: 'pat-1',
    patientName: 'SIVANAGU E',
    doctorId: 'doc-2',
    doctorName: 'Dr. Priya Sharma',
    doctorSpecialty: 'Cardiologist',
    doctorPhoto: 'https://images.unsplash.com/photo-1594824813583-69022e5e1e07?w=150&auto=format&fit=crop&q=80',
    hospitalId: 'hosp-2',
    hospitalName: 'City Heart & Vascular Institute',
    date: '2026-09-04',
    timeSlot: '10:30 AM',
    status: 'Confirmed',
    ticketNumber: 'TK-503',
    type: 'In-Person',
  },
  {
    id: 'apt-sample-3',
    patientId: 'pat-1',
    patientName: 'SIVANAGU E',
    doctorId: 'doc-3',
    doctorName: 'Dr. Marcus Vance',
    doctorSpecialty: 'Orthopedic Surgeon',
    doctorPhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    hospitalId: 'hosp-3',
    hospitalName: 'Apex Medical Specialty Center',
    date: '2026-09-07',
    timeSlot: '04:15 PM',
    status: 'Scheduled',
    ticketNumber: 'TK-512',
    type: 'Follow-up',
  },
];

export const AppointmentCardStack: React.FC<AppointmentCardStackProps> = ({
  appointments = [],
  onViewDetails,
  onScheduleNew: _onScheduleNew,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Combine user appointment with sample stack items so stack interaction is always visible and functional!
  const displayList: Appointment[] = React.useMemo(() => {
    if (appointments && appointments.length > 1) {
      return appointments;
    }
    if (appointments && appointments.length === 1) {
      const userApp = appointments[0];
      const otherSamples = SAMPLE_APPOINTMENTS.filter((s) => s.id !== userApp.id);
      return [{ ...userApp, patientName: userApp.patientName || 'SIVANAGU E' }, ...otherSamples.slice(0, 2)];
    }
    return SAMPLE_APPOINTMENTS;
  }, [appointments]);

  const activeApp = displayList[currentIndex] || displayList[0];
  const totalCount = displayList.length;
  const isStacked = totalCount > 1;

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

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 10,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.96,
      zIndex: 0,
    }),
  };

  return (
    <div className="relative w-full">
      {/* 1/3 indicator above the card on the right side */}
      {isStacked && (
        <div className="flex justify-end mb-1.5 px-1 select-none pointer-events-none">
          <span className="text-xs font-bold text-slate-500 font-mono tracking-wide select-none cursor-default">
            {currentIndex + 1}/{totalCount}
          </span>
        </div>
      )}

      {/* Physical Stack Container */}
      <div className="relative">
        {/* Decorative Background Stacked Cards Behind */}
        {isStacked && (
          <>
            {/* Third Layer Card (Deep Stack) */}
            {totalCount > 2 && (
              <div
                className="absolute inset-x-3 top-3.5 h-full rounded-2xl bg-slate-200/70 border border-slate-300/80 shadow-xs scale-[0.93] -z-20 transition-all duration-300 pointer-events-none"
                style={{ transformOrigin: 'top center' }}
              />
            )}

            {/* Second Layer Card (Mid Stack) */}
            <div
              onClick={handleNext}
              className="absolute inset-x-1.5 top-2 h-full rounded-2xl bg-teal-50/90 border border-[#14B8A6]/40 shadow-xs scale-[0.96] -z-10 cursor-pointer transition-all duration-300 hover:top-2.5"
              style={{ transformOrigin: 'top center' }}
              title="Click to view next token"
            />
          </>
        )}

        {/* Foreground Active Appointment Token Card with Instant Swipe Response */}
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
            onDragEnd={(_, info) => {
              const swipeOffset = info.offset.x;
              const swipeVelocity = info.velocity.x;
              if (swipeOffset < -20 || swipeVelocity < -150) {
                handleNext();
              } else if (swipeOffset > 20 || swipeVelocity > 150) {
                handlePrev();
              }
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.5 }}
            className="relative bg-white rounded-2xl shadow-xs border border-[#E4E7EC] overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] z-10 text-left touch-pan-y cursor-grab active:cursor-grabbing select-none"
          >
            {/* Physical Boarding Pass Left & Right Notch Cutouts */}
            <div className="absolute top-[30px] -left-2 w-4 h-4 rounded-full bg-white border-r border-[#E4E7EC] z-10" />
            <div className="absolute top-[30px] -right-2 w-4 h-4 rounded-full bg-white border-l border-[#E4E7EC] z-10" />

            {/* Clean White Header Strip */}
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

            {/* Token Card Body */}
            <div className="p-4 space-y-3 relative z-20 bg-white/95">
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> PATIENT
                  </span>
                  <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">
                    {activeApp.patientName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> HOSPITAL
                  </span>
                  <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">
                    {activeApp.hospitalName}
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
                  <span className="text-xs text-[#6B7280] font-semibold">{activeApp.timeSlot}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onViewDetails(activeApp)}
                  className="bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white px-3.5 py-1.5 rounded-pill text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  View Details →
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stack Pagination Indicator Dots Below Card */}
      {isStacked && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {displayList.map((_, idx) => (
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
              aria-label={`Switch to appointment token ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
