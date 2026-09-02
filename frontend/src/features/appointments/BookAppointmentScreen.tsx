import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle2,
  Ticket,
  X,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  Navigation,
  ChevronRight,
  Info,
  AlertCircle,
  Star,
  Users,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
import { DateScroller } from '../../components/ui/DateScroller';
import { TimeSlotGrid } from '../../components/ui/TimeSlotGrid';
import { Button } from '../../components/ui/Button';
import { doctorService } from '../../services/doctorService';
import type { Doctor } from '../../lib/types';
import { MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';
import { apiFetch } from '../../lib/apiFetch';

/**
 * Ultra-Premium Executive Book Appointment Screen
 * Features signature Cyan/Blue header, cinematic doctor showcase,
 * interactive date/time slot selector, and holographic digital pass confirmation.
 */
export const BookAppointmentScreen: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const appointments = useCarePulseStore((s) => s.appointments);
  const addAppointment = useCarePulseStore((s) => s.addAppointment);
  const user = useCarePulseStore((s) => s.user);

  const initialDoctor = MOCK_DOCTORS.find((d) => d.id === doctorId) || MOCK_DOCTORS[0];
  const [doctor, setDoctor] = useState<Doctor>(initialDoctor);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;

    const fetchDoctor = () => {
      doctorService.getDoctorById(doctorId).then((doc) => {
        if (isMounted && doc) {
          setDoctor(doc);
        }
      });
    };

    fetchDoctor();
    const interval = setInterval(fetchDoctor, 4000);
    const handleFocus = () => fetchDoctor();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [doctorId]);

  // Appointment configurations
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('02:00 PM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [bookedTicket, setBookedTicket] = useState('');

  const ratingValue = doctor.rating || 4.8;
  const reviewsCount = doctor.reviewsCount || 160;
  const experienceYears = doctor.experienceYears || 16;
  const patientsCount = (doctor as any).patientsCount || '2,400+';

  const focusSpecialties = [
    '🧠 Neuro-Rehabilitation',
    '⚡ Migraines & Neuralgia',
    '🩺 Stroke Recovery',
    '🔬 Cognitive Health',
  ];

  // Helper for human-readable date
  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const currentMonthLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Feb 2026';
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!user || !user.id) {
      navigate('/login', { state: { message: 'Please log in to continue booking your appointment.' } });
    }
  }, [user, navigate]);

  const handleConfirmBooking = async () => {
    if (!user || !user.id) {
      navigate('/login', { state: { message: 'Please log in to continue booking your appointment.' } });
      return;
    }

    setIsSubmitting(true);
    const nextNum = 482 + appointments.length;
    const newTicketNum = `TK-${nextNum}`;
    setBookedTicket(newTicketNum);

    const payload = {
      patientId: user.id,
      patientName: user.fullName || 'CarePulse Patient',
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorPhoto: doctor.photoUrl,
      hospitalName: doctor.hospitalName,
      date: selectedDate,
      timeSlot: selectedSlot,
      type: 'In-Person',
      ticketNumber: newTicketNum,
    };

    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const data = await res.json();
        addAppointment(data);
      } else {
        addAppointment({
          id: `app-${Date.now()}`,
          ticketNumber: newTicketNum,
          patientId: user.id,
          patientName: user.fullName || 'CarePulse Patient',
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorSpecialty: doctor.specialty,
          doctorPhoto: doctor.photoUrl,
          hospitalName: doctor.hospitalName,
          date: selectedDate,
          timeSlot: selectedSlot,
          type: 'In-Person',
          status: 'Upcoming',
          daysLeftText: 'In 2 days',
        });
      }
    } catch {
      addAppointment({
        id: `app-${Date.now()}`,
        ticketNumber: newTicketNum,
        patientId: user.id,
        patientName: user.fullName || 'CarePulse Patient',
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        doctorPhoto: doctor.photoUrl,
        hospitalName: doctor.hospitalName,
        date: selectedDate,
        timeSlot: selectedSlot,
        type: 'In-Person',
        status: 'Upcoming',
        daysLeftText: 'In 2 days',
      });
    } finally {
      setIsSubmitting(false);
      setIsSuccessModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-36 w-full relative select-none text-left">
      {/* 1. SIGNATURE CYAN/BLUE LUMINOUS HEADER */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#22B3BD] via-[#28BAC4] to-[#35C6D0] text-white pt-4 pb-4 px-4 sm:px-6 shadow-md transition-all">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          <div className="text-center flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-black font-heading text-white tracking-tight drop-shadow-2xs truncate">
              Book Appointment
            </h1>
            <p className="text-[11px] font-medium text-cyan-50/90 tracking-wide">
              Step 1 of 2 • Slot & Facility Confirmation
            </p>
          </div>

          <span className="text-[10px] font-black text-white bg-white/20 border border-white/40 backdrop-blur-md px-2.5 py-1 rounded-full shadow-2xs tracking-wider shrink-0">
            OPD FASTPASS
          </span>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="px-4 sm:px-6 md:px-8 py-5 space-y-5 max-w-3xl mx-auto w-full">
        {/* 2. CINEMATIC DOCTOR HERO CARD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 relative overflow-hidden space-y-4"
        >
          {/* Subtle Ambient Teal Mesh in Top Corner */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-teal-500/10 via-cyan-400/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-2 min-w-0 flex-1">
              {/* Verified & Availability Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/70 text-[#0B5A54] text-[11px] font-extrabold tracking-wide">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span>Verified Specialist</span>
                </div>

                {doctor.isAvailable === false || doctor.is_available === false ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-extrabold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Off-Duty
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available Today
                  </span>
                )}
              </div>

              {/* Doctor Name & Staff Code */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight truncate">
                  {doctor.name}
                </h2>
                {(doctor.staff_code || doctor.staffCode) && (
                  <span className="font-mono text-xs font-bold text-[#0B5A54] bg-[#E3F3F1] px-2.5 py-0.5 rounded-full border border-[#14B8A6]/30 shadow-2xs">
                    {doctor.staff_code || doctor.staffCode}
                  </span>
                )}
              </div>

              {/* Specialty & Credentials */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
                <span className="text-[#0B5A54] bg-[#E3F3F1] px-2.5 py-0.5 rounded-md font-extrabold">
                  {doctor.specialty || 'General Medicine'}
                </span>
                <span>•</span>
                <span className="text-slate-600">MD, DM (Clinical Specialist)</span>
              </div>

              {/* Consultation Tags */}
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-[#0B5A54] bg-[#E3F3F1] px-3 py-1 rounded-full border border-[#14B8A6]/30">
                  🏥 OPD Hospital Visit
                </span>
                <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                  ⚡ Instant Token Sync
                </span>
              </div>
            </div>

            {/* Doctor Portrait with Status Halo */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-slate-100 shadow-md bg-slate-100">
                <img
                  src={doctor.photoUrl || '/doctor_default.jpg'}
                  alt={doctor.name}
                  onError={(e) => { e.currentTarget.src = '/doctor_default.jpg'; }}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-xs border border-slate-200/80 flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9.5px] font-black text-slate-700 whitespace-nowrap">Online</span>
              </div>
            </div>
          </div>

          {/* Hospital Location & Navigation Row */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100/70 text-[#0B5A54] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-800 truncate">
                  {doctor.hospitalName || 'CarePulse Medical Center'}
                </p>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  OPD Floor 3, Cabin 301 • Verified Department
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Directions to ${doctor.hospitalName || 'Medical Facility'} opened in Maps`)}
              className="text-[#0B5A54] font-black text-xs hover:underline flex items-center gap-1 shrink-0 cursor-pointer ml-auto sm:ml-0"
            >
              <span>Get Directions</span>
              <Navigation className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* 3. METRIC STATS ROW */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1"
          >
            <div className="w-8 h-8 rounded-full bg-teal-50 text-[#0B5A54] mx-auto flex items-center justify-center">
              <Users className="w-4 h-4 text-[#0B5A54]" />
            </div>
            <span className="text-base sm:text-lg font-black font-heading text-slate-900 block">
              {patientsCount}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Treated
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-base sm:text-lg font-black font-heading text-slate-900 block">
              {experienceYears}+ Yrs
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Experience
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1"
          >
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            </div>
            <span className="text-base sm:text-lg font-black font-heading text-slate-900 block">
              {ratingValue} ({reviewsCount})
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Reviews
            </span>
          </motion.div>
        </div>

        {/* 4. ABOUT DOCTOR & CLINICAL FOCUS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black font-heading text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#0B5A54]" />
              <span>About Specialist</span>
            </h3>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
              Board Certified
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {doctor.about ||
              `${doctor.name} is a senior consultant specialist at ${doctor.hospitalName || 'CarePulse Medical Center'}, providing clinical diagnosis, treatment planning, and personalized patient recovery.`}
            {isBioExpanded && (
              <span className="block pt-2 text-slate-500">
                Specialized in minimally invasive clinical procedures, comprehensive health diagnostics, and ongoing patient monitoring with over {experienceYears} years of medical experience.
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={() => setIsBioExpanded(!isBioExpanded)}
            className="text-xs font-extrabold text-[#0B5A54] hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <span>{isBioExpanded ? 'Show Less' : 'Read Full Bio'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isBioExpanded ? '-rotate-90' : 'rotate-90'}`} />
          </button>

          {/* Clinical Focus Badges */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider pb-2">
              Clinical Specializations
            </p>
            <div className="flex flex-wrap gap-1.5">
              {focusSpecialties.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-bold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0B5A54] px-2.5 py-1 rounded-xl transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5. SELECT DATE & TIME SECTION */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black font-heading text-slate-900 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
                <span>Select Appointment Date</span>
              </h3>
              <p className="text-[11px] font-bold text-slate-400">
                {formattedSelectedDate} • <span className="text-[#0B5A54] font-black">{selectedSlot}</span>
              </p>
            </div>

            <button
              onClick={() => setIsCalendarOpen(true)}
              className="text-xs font-black text-[#0B5A54] bg-[#E3F3F1] hover:bg-[#d4ece8] px-3.5 py-1.5 rounded-2xl border border-[#14B8A6]/30 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>{currentMonthLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#0B5A54]" />
            </button>
          </div>

          {/* Horizontal Date Scroller */}
          <div className="space-y-1.5">
            <div className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider px-0.5">
              <span>Available Dates</span>
            </div>
            <DateScroller selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(d)} />
          </div>

          {/* Time Slots Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider px-0.5">
              <span>Available Time Slots (30 min)</span>
            </div>
            <TimeSlotGrid
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              doctor={doctor}
              slotCapacities={(doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities}
              selectedDate={selectedDate}
            />
          </div>
        </div>

        {/* 6. APPOINTMENT GUIDELINES & PATIENT CARE GUARANTEE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3.5">
          <h3 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B5A54]" />
            <span>OPD Guidelines & Token Policy</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-600 font-medium">
            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Consultation Category</span>
              <span className="font-extrabold text-[#0B5A54] bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/60">
                In-Person Hospital Visit
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Queue Token Type</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                Live FastPass OPD Token
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Hospital Check-In</span>
              <span className="font-bold text-slate-800">
                Reception Desk A • Ground Floor
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200/70 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-[11px] font-medium leading-tight">
              <span className="font-black">Patient Care Guarantee:</span> Zero cancellation fees & free rescheduling anytime prior to visit.
            </p>
          </div>
        </div>
      </main>

      {/* 7. FLOATING STICKY ACTION BOTTOM BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-4 sm:px-8 z-40 shadow-2xl">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3.5">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div>
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                Appointment Schedule
              </p>
              <p className="text-xs font-black text-slate-800 font-heading">
                {formattedSelectedDate} • <span className="text-[#0B5A54]">{selectedSlot}</span>
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex-1 max-w-md">
            {doctor.isAvailable === false || doctor.is_available === false ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-200 text-slate-500 font-black text-sm tracking-wide cursor-not-allowed font-heading flex items-center justify-center gap-2 select-none border border-slate-300"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Doctor is Currently Off-Duty</span>
              </button>
            ) : !selectedSlot ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-200 text-slate-500 font-black text-sm tracking-wide cursor-not-allowed font-heading flex items-center justify-center gap-2 select-none border border-slate-300"
              >
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>Select a Time Slot Above</span>
              </button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0B5A54] via-[#0D6D65] to-[#14B8A6] text-white font-black text-sm tracking-wide shadow-lg shadow-teal-900/20 hover:shadow-xl hover:shadow-teal-900/30 transition-all cursor-pointer font-heading flex items-center justify-center gap-2 select-none"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Confirming Pass...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-200" />
                    <span>Confirm & Generate Token</span>
                    <ChevronRight className="w-4 h-4 text-teal-200 ml-auto sm:ml-0" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* 8. CALENDAR POPUP MODAL */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 shadow-2xl max-w-sm w-full space-y-3 relative border border-slate-200"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4.5 h-4.5 text-[#0B5A54]" />
                  <h3 className="text-sm font-black text-slate-900 font-heading">Choose Appointment Date</h3>
                </div>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <CalendarPicker
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setIsCalendarOpen(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. ULTRA LUXURY SUCCESS CONFIRMATION MODAL & DIGITAL PASS */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black font-heading text-slate-900 tracking-tight">
                  Appointment Confirmed! 🎉
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Your official OPD pass has been generated and synced with hospital queue desk.
                </p>
              </div>

              {/* DIGITAL FASTPASS TICKET */}
              <div className="bg-gradient-to-b from-slate-50 to-[#F8FAFC] border border-slate-200/90 rounded-3xl p-4 text-left space-y-3.5 shadow-xs relative">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                  <span className="text-[11px] font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-[#0B5A54]" /> CarePulse FastPass
                  </span>
                  <span className="text-xs font-black text-[#0B5A54] bg-[#0B5A54]/10 px-3 py-1 rounded-full border border-[#0B5A54]/20">
                    {bookedTicket || 'TK-482'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={doctor.photoUrl || '/doctor_default.jpg'}
                    alt={doctor.name}
                    onError={(e) => { e.currentTarget.src = '/doctor_default.jpg'; }}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black font-heading text-slate-900 truncate">
                      {doctor.name}
                    </h4>
                    <p className="text-xs font-bold text-[#0B5A54]">
                      {doctor.specialty} Specialist
                    </p>
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-slate-200 -mx-4 my-2 relative">
                  <div className="w-4 h-4 rounded-full bg-white absolute -left-2 -top-2 border-r border-slate-200" />
                  <div className="w-4 h-4 rounded-full bg-white absolute -right-2 -top-2 border-l border-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">DATE & TIME</span>
                    <span className="font-black text-slate-800">
                      {formattedSelectedDate}
                    </span>
                    <span className="font-bold text-[#0B5A54] block">{selectedSlot}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">FACILITY ROOM</span>
                    <span className="font-black text-slate-800 truncate block">
                      Cabin 301 (3rd Floor)
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium truncate block">
                      {doctor.hospitalName}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="h-5 flex items-center gap-0.5 overflow-hidden opacity-60">
                    <span className="w-1 h-5 bg-slate-900" />
                    <span className="w-0.5 h-5 bg-slate-900" />
                    <span className="w-1.5 h-5 bg-slate-900" />
                    <span className="w-0.5 h-5 bg-slate-900" />
                    <span className="w-2 h-5 bg-slate-900" />
                    <span className="w-1 h-5 bg-slate-900" />
                    <span className="w-0.5 h-5 bg-slate-900" />
                    <span className="w-1.5 h-5 bg-slate-900" />
                  </div>
                  <span className="font-bold text-slate-600 tracking-wider">VERIFIED #CP-4824</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    navigate('/home');
                  }}
                  className="py-3.5 rounded-2xl font-black text-xs shadow-md bg-[#0B5A54] hover:bg-[#08423D]"
                >
                  Return to Dashboard
                </Button>

                <button
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    navigate('/history');
                  }}
                  className="text-xs font-bold text-[#0B5A54] hover:underline block mx-auto pt-1 cursor-pointer"
                >
                  View in Appointment History →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
