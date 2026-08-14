import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle2,
  Ticket,
  X,
} from 'lucide-react';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
import { DateScroller } from '../../components/ui/DateScroller';
import { TimeSlotGrid } from '../../components/ui/TimeSlotGrid';
import { Button } from '../../components/ui/Button';
import { doctorService } from '../../services/doctorService';
import type { Doctor } from '../../lib/types';
import { MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';

export const BookAppointmentScreen: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const appointments = useCarePulseStore((s) => s.appointments);
  const addAppointment = useCarePulseStore((s) => s.addAppointment);

  const initialDoctor = MOCK_DOCTORS.find((d) => d.id === doctorId) || MOCK_DOCTORS[0];
  const [doctor, setDoctor] = useState<Doctor>(initialDoctor);

  useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;
    doctorService.getDoctorById(doctorId).then((doc) => {
      if (isMounted && doc) {
        setDoctor(doc);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('05:00 AM');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [bookedTicket, setBookedTicket] = useState('');

  const user = useCarePulseStore((s) => s.user);

  const handleConfirmBooking = async () => {
    const nextNum = 482 + appointments.length;
    const newTicketNum = `TK-${nextNum}`;
    setBookedTicket(newTicketNum);

    const payload = {
      patientId: user?.id || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      patientName: user?.fullName || 'Sarah Jenkins',
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
      const tryBook = async (url: string) => {
        return await fetch(`${url}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      };

      let res: Response | null = null;
      try {
        res = await tryBook('/api');
      } catch {
        try {
          res = await tryBook('http://localhost:5000/api');
        } catch {
          res = null;
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        addAppointment(data);
      } else {
        addAppointment({
          id: `app-${Date.now()}`,
          ticketNumber: newTicketNum,
          patientId: user?.id || 'usr-101',
          patientName: user?.fullName || 'Sarah Jenkins',
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
        patientId: user?.id || 'usr-101',
        patientName: user?.fullName || 'Sarah Jenkins',
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

    setIsSuccessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none text-left">
      {/* APP TOP HEADER */}
      <div className="bg-white border-b border-slate-200/80 pt-4 pb-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-[#E3F3F1] hover:text-[#0B5A54] flex items-center justify-center text-slate-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>

          <h1 className="text-base sm:text-lg font-black font-heading text-[#111827] tracking-tight">
            Booking
          </h1>

          <div className="w-9 h-9" />
        </div>
      </div>

      <main className="px-4 sm:px-6 md:px-8 py-5 space-y-5 max-w-2xl mx-auto w-full">
        {/* DOCTOR HERO PROFILE CARD */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-black font-heading text-[#111827] tracking-tight truncate">
                {doctor.name}
              </h2>
              <p className="text-xs font-bold text-slate-400">
                {doctor.specialty || 'Dental Care Specialist'}
              </p>

              <div className="pt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#0B5A54] font-heading">
                  ${(doctor as any).consultationFee || 180}
                </span>
                <span className="text-xs font-extrabold text-slate-400">Consult Fee</span>
              </div>
            </div>

            {/* Doctor Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 ring-2 ring-slate-100 shadow-xs">
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Glass Overlay Footer Bar Inside Doctor Card */}
          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 text-xs font-extrabold text-slate-700">
              <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0" />
              <span className="truncate">{doctor.hospitalName || 'UK Medical College'}</span>
            </div>
          </div>
        </div>

        {/* 3 METRICS STATS ROW */}
        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs text-center">
          <div className="space-y-0.5">
            <span className="text-base sm:text-lg font-black font-heading text-[#111827]">
              {(doctor as any).patientsCount || '200+'}
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Patients
            </span>
          </div>

          <div className="space-y-0.5 border-x border-slate-100">
            <span className="text-base sm:text-lg font-black font-heading text-[#111827]">
              {doctor.experienceYears || 8} Year
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Experience
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-base sm:text-lg font-black font-heading text-[#111827]">
              {doctor.rating || 4.9}
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Ratings
            </span>
          </div>
        </div>

        {/* ABOUT DOCTOR SECTION */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-black font-heading text-[#111827]">About Doctor</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {doctor.name} is a devoted specialist at {doctor.hospitalName}, committed to patient care, community support, and enhancing healthy, confident smiles.
          </p>
        </div>

        {/* SELECT DATE & TIME SECTION */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black font-heading text-[#111827]">Select Date & Time</h3>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="text-xs font-extrabold text-[#0B5A54] bg-[#E3F3F1] hover:bg-[#d5edea] px-3 py-1 rounded-full border border-[#14B8A6]/30 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>Feb 2026</span>
              <ChevronDown className="w-3 h-3 text-[#0B5A54]" />
            </button>
          </div>

          {/* Horizontal Date Scroller */}
          <DateScroller selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(d)} />

          {/* Time Slots Grid */}
          <TimeSlotGrid selectedSlot={selectedSlot} onSelectSlot={(slot) => setSelectedSlot(slot)} />
        </div>

        {/* CALENDAR POPUP MODAL */}
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-4 shadow-2xl max-w-sm w-full space-y-3 relative border border-slate-200 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
                  <h3 className="text-sm font-extrabold text-slate-900 font-heading">Select Date</h3>
                </div>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
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
            </div>
          </div>
        )}

        {/* BOOK APPOINTMENT BIG PILL BUTTON */}
        <div className="pt-3">
          <button
            type="button"
            onClick={handleConfirmBooking}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#0B5A54] via-[#14B8A6] to-[#0B5A54] text-white font-black text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-98 transition-all cursor-pointer font-heading"
          >
            Book Appointment
          </button>
        </div>
      </main>

      {/* ULTRA PREMIUM SUCCESS CONFIRMATION MODAL */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 border border-[#E4E7EC]">
            {/* Animated Success Badge */}
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold font-heading text-slate-900">Appointment Booked! 🎉</h3>
              <p className="text-xs text-slate-600 font-medium">
                Your consultation has been successfully scheduled.
              </p>
            </div>

            {/* Structured Ticket Details Card */}
            <div className="bg-[#F8FAFC] border border-[#E4E7EC] p-3.5 rounded-2xl text-left space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-[#0B5A54]" /> Ticket Pass
                </span>
                <span className="text-xs font-extrabold text-[#0B5A54] bg-[#0B5A54]/10 px-2.5 py-0.5 rounded-full">
                  {bookedTicket || 'TK-482'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Physician:</span>
                  <span className="font-bold text-slate-900">{doctor.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Date & Time:</span>
                  <span className="font-bold text-[#0B5A54]">{selectedDate} • {selectedSlot}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Facility:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{doctor.hospitalName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Type:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    In-Person Visit
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1">
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/home');
                }}
                className="py-3 rounded-xl font-bold text-xs shadow-sm"
              >
                Go to Dashboard
              </Button>
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/history');
                }}
                className="text-xs font-bold text-[#0B5A54] hover:underline block mx-auto pt-1 cursor-pointer"
              >
                View in Appointment History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
