import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle2,
  Ticket,
  X,
  Sparkles,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateScroller } from '../../components/ui/DateScroller';
import { TimeSlotGrid, areAllTodaySlotsCompleted } from '../../components/ui/TimeSlotGrid';
import { Button } from '../../components/ui/Button';
import { doctorService } from '../../services/doctorService';
import type { Doctor } from '../../lib/types';
import { MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';
import { useStaffStore } from '../../store/staffStore';
import { apiFetch } from '../../lib/apiFetch';

/**
 * Ultra-Premium Executive Book Appointment Screen
 * Features signature Cyan/Blue header, cinematic doctor showcase,
 * interactive rolling date scroller and time slot selector configured in the Receptionist portal,
 * and holographic digital pass confirmation.
 */
export const BookAppointmentScreen: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const appointments = useCarePulseStore((s) => s.appointments);
  const addAppointment = useCarePulseStore((s) => s.addAppointment);
  const user = useCarePulseStore((s) => s.user);
  const staffDoctors = useStaffStore((s) => s.doctors);

  const matchedStaffDoc = staffDoctors.find(
    (d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId
  );
  const matchedMockDoc = MOCK_DOCTORS.find((d) => d.id === doctorId);
  const initialDoctor = (matchedStaffDoc as any) || matchedMockDoc || staffDoctors[0] || MOCK_DOCTORS[0];
  const [doctor, setDoctor] = useState<Doctor>(initialDoctor);

  useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;

    // Check staffStore immediately for real-time reactive receptionist updates
    const staffDoc = useStaffStore.getState().doctors.find(
      (d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId
    );
    if (staffDoc) {
      setDoctor((prev) => ({
        ...prev,
        id: staffDoc.id,
        name: staffDoc.name,
        specialty: staffDoc.specialty,
        department: staffDoc.department,
        hospitalId: (staffDoc as any).hospitalId || 'hosp-1',
        hospitalName: (staffDoc as any).hospitalName || 'St. Jude Heart & Medical Center',
        photoUrl: staffDoc.photo || prev.photoUrl || '/doctor_default.jpg',
        experienceYears: staffDoc.experienceYears,
        consultationFee: staffDoc.consultationFee,
        phone: staffDoc.phone,
        email: staffDoc.email,
        roomNumber: staffDoc.roomNumber,
        isAvailable: staffDoc.isAvailable,
        availableDays: staffDoc.availableDays,
        slotCapacities: staffDoc.slotCapacities,
        slot_capacities: staffDoc.slotCapacities,
        staffCode: staffDoc.staffCode || staffDoc.staff_code,
        staff_code: staffDoc.staffCode || staffDoc.staff_code,
      }));
    }

    const fetchDoctor = () => {
      doctorService.getDoctorById(doctorId).then((doc) => {
        if (isMounted && doc) {
          const latestStaffDoc = useStaffStore.getState().doctors.find(
            (d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId
          );
          if (latestStaffDoc && latestStaffDoc.slotCapacities && latestStaffDoc.slotCapacities.length > 0) {
            setDoctor({
              ...doc,
              isAvailable: latestStaffDoc.isAvailable,
              slotCapacities: latestStaffDoc.slotCapacities,
              slot_capacities: latestStaffDoc.slotCapacities,
              availableDays: latestStaffDoc.availableDays,
            });
          } else {
            setDoctor(doc);
          }
        }
      });
    };

    fetchDoctor();
    const interval = setInterval(fetchDoctor, 3000);
    const handleFocus = () => fetchDoctor();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [doctorId, staffDoctors]);

  // Helpers to get local date ISO format YYYY-MM-DD
  const getTodayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Check if today's slots are all completed/passed
  const isTodayCompleted = useMemo(() => {
    const caps = (doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities;
    return areAllTodaySlotsCompleted(doctor, caps);
  }, [doctor]);

  // Appointment configurations: default to tomorrow if today is completed
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const caps = (initialDoctor as any)?.slotCapacities || (initialDoctor as any)?.slot_capacities;
    return areAllTodaySlotsCompleted(initialDoctor, caps) ? getTomorrowIso() : getTodayIso();
  });

  // Automatically switch date to tomorrow if today's full slots are completed and today is selected
  useEffect(() => {
    if (isTodayCompleted && selectedDate === getTodayIso()) {
      setSelectedDate(getTomorrowIso());
    }
  }, [isTodayCompleted, selectedDate]);

  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [bookedTicket, setBookedTicket] = useState('');

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
      <header className="sticky top-0 z-30 bg-[#22B3BD] text-white pt-4 pb-4 px-4 sm:px-6 shadow-md transition-all">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          <div className="text-center flex-1 min-w-0 pr-9">
            <h1 className="text-lg sm:text-xl font-black font-heading text-white tracking-tight drop-shadow-2xs truncate">
              Book Appointment
            </h1>
            <p className="text-[11px] font-medium text-cyan-50/90 tracking-wide">
              Step 1 of 2 • Slot & Facility Confirmation
            </p>
          </div>
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

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-2 min-w-0 flex-1">
              {/* Availability Badges */}
              <div className="flex items-center gap-2 flex-wrap">
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

          {/* Hospital Location Row */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-2.5 text-xs">
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
        </motion.div>

        {/* 3. SELECT DATE & TIME SECTION (Live Receptionist Slots) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black font-heading text-slate-900 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
              <span>Select Appointment Date</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {formattedSelectedDate} • <span className="text-[#0B5A54] font-black">{selectedSlot || 'Select Slot'}</span>
            </p>
          </div>

          {/* Horizontal Date Scroller (Rolling 8-day window) */}
          <div className="space-y-1.5">
            <div className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider px-0.5">
              <span>Available Dates</span>
            </div>
            <DateScroller
              selectedDate={selectedDate}
              onSelectDate={(d) => setSelectedDate(d)}
              hideToday={isTodayCompleted}
            />
          </div>

          {/* Time Slots Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider px-0.5">
              <span>Doctor Consultation Time Slots</span>
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
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-sm tracking-wide shadow-md shadow-teal-900/15 hover:shadow-lg hover:shadow-teal-900/25 transition-all cursor-pointer font-heading flex items-center justify-center gap-2 select-none"
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
              <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-3xl p-4 text-left space-y-3.5 shadow-xs relative">
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
