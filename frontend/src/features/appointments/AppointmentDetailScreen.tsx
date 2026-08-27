import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Building2,
  AlertTriangle,
  CheckCircle2,
  User as UserIcon,
  Star,
  Award,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Avatar } from '../../components/ui/Avatar';
import { useCarePulseStore } from '../../lib/store';

export interface ActivityDetailState {
  id?: string;
  timeSlot?: string;
  type?: string;
  clientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  facilityName?: string;
  facilityAddress?: string;
  facilityPhone?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconName?: string;
}

export const AppointmentDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const user = useCarePulseStore((s) => s.user);
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const rescheduleAppointment = useCarePulseStore((s) => s.rescheduleAppointment);
  const cancelAppointment = useCarePulseStore((s) => s.cancelAppointment);

  // Extract appointment detail from navigation state or store fallback
  const passedState = (location.state as ActivityDetailState) || {};

  const appointmentData: ActivityDetailState = {
    id: passedState.id || id || activeAppointment?.id || 'app-1',
    timeSlot: passedState.timeSlot || activeAppointment?.timeSlot || '10:40 AM - 12:30 PM',
    type: passedState.type || activeAppointment?.doctorSpecialty || 'Vaccination Drive',
    clientName: passedState.clientName || user?.fullName || 'SIVANAGU E',
    doctorName: passedState.doctorName || activeAppointment?.doctorName || 'Dr. Marvin McKinney',
    doctorSpecialty: passedState.doctorSpecialty || activeAppointment?.doctorSpecialty || 'Immunology Specialist',
    doctorPhoto: passedState.doctorPhoto || activeAppointment?.doctorPhoto || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    facilityName: passedState.facilityName || activeAppointment?.hospitalName || 'CarePulse Central Hospital',
    facilityAddress: passedState.facilityAddress || '4517 Washington Ave, Medical Hub',
    facilityPhone: passedState.facilityPhone || '+1 (555) 735-4614',
    bgColor: passedState.bgColor || 'bg-[#F0FDF4]',
    borderColor: passedState.borderColor || 'border-emerald-200',
    textColor: passedState.textColor || 'text-emerald-950',
  };

  // Interactive Reschedule & Cancel States
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('2026-08-18');
  const [newSlot, setNewSlot] = useState('10:40 AM - 12:30 PM');

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Schedule Conflict');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const availableSlots = [
    '09:00 AM - 10:00 AM',
    '10:40 AM - 12:30 PM',
    '02:00 PM - 03:00 PM',
    '04:30 PM - 05:30 PM',
  ];

  const handleReschedule = () => {
    if (appointmentData.id) {
      rescheduleAppointment(appointmentData.id, newDate, newSlot);
    }
    setIsRescheduleOpen(false);
    setActionSuccess(`Appointment successfully rescheduled to ${newDate} at ${newSlot}`);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleCancel = () => {
    if (appointmentData.id) {
      cancelAppointment(appointmentData.id, cancelReason);
    }
    setIsCancelOpen(false);
    setActionSuccess('Appointment cancelled successfully.');
    setTimeout(() => navigate('/home'), 1500);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 text-slate-900 pb-28 select-none">
      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-4 sm:pt-6 space-y-4 text-left animate-in fade-in duration-300">

        {/* 1. PROFESSIONAL PREMIUM HEADER (NO NOTIFICATION / MESSAGE BUTTONS) */}
        <header className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between transition-all">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/80 shadow-xs"
              title="Go Back"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar src={user?.avatarUrl || appointmentData.doctorPhoto || ''} size="md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-slate-900 leading-tight font-heading">
                    {user?.fullName || appointmentData.clientName || 'SIVANAGU E'}
                  </h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <p className="text-[11px] font-semibold text-slate-400">Patient Profile</p>
              </div>
            </div>
          </div>
        </header>

        {/* Action Success Alert Banner */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 rounded-2xl flex items-center gap-3 shadow-xs animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{actionSuccess}</p>
          </div>
        )}

        {/* 2. APPOINTMENT SUMMARY CARD */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3.5 relative overflow-hidden">
          {/* Subtle top accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B5A54] via-teal-500 to-emerald-400" />

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                APPOINTMENT ACTIVITY
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5 font-heading">
                {appointmentData.type}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-[#0B5A54] border border-teal-200/80 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B5A54]" />
              CONFIRMED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs font-bold text-slate-800">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Scheduled Time</p>
                <p className="text-xs font-black text-[#0B5A54] truncate">{appointmentData.timeSlot}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs font-bold text-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Client / Patient</p>
                <p className="text-xs font-black text-slate-800 truncate">{appointmentData.clientName}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CENTRAL DOCTOR PROFILE CARD */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              ATTENDING DOCTOR
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-extrabold">4.9</span>
              <span className="text-[11px] text-amber-800/80 font-semibold">(120+ reviews)</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative shrink-0">
              <img
                src={appointmentData.doctorPhoto}
                alt={appointmentData.doctorName}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-teal-100 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                ✓
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-slate-900 leading-tight truncate font-heading">
                {appointmentData.doctorName}
              </h3>
              <p className="text-xs font-bold text-[#0B5A54] mt-0.5 flex items-center gap-1 truncate">
                {appointmentData.doctorSpecialty}
              </p>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>15+ Yrs Exp</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FACILITY INFORMATION CARD */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200/80 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                PRACTICE BUILDING & FACILITY
              </span>
              <h4 className="text-sm font-black text-slate-900 truncate">{appointmentData.facilityName}</h4>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100 font-medium">
            <a
              href={`tel:${appointmentData.facilityPhone}`}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-100 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Phone className="w-4 h-4 text-[#0B5A54] shrink-0" />
                <span className="font-bold text-slate-800">{appointmentData.facilityPhone}</span>
              </div>
              <span className="text-[10px] font-bold text-teal-700 uppercase group-hover:underline">Call Direct</span>
            </a>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0" />
                <span className="truncate">{appointmentData.facilityAddress}</span>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(appointmentData.facilityAddress || '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-teal-700 uppercase hover:underline shrink-0 ml-2 inline-flex items-center gap-0.5"
              >
                Directions <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </section>

        {/* Reschedule Interactive Drawer */}
        {isRescheduleOpen && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#0B5A54] shadow-xl space-y-4 animate-in slide-in-from-bottom-3 duration-200 text-left">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0B5A54]" />
                <span>Select New Date & Time Slot</span>
              </h5>
              <button
                onClick={() => setIsRescheduleOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Choose Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Select Time Slot</label>
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setNewSlot(slot)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      newSlot === slot
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleReschedule}
              className="w-full py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              Confirm Reschedule
            </button>
          </div>
        )}

        {/* Cancel Interactive Confirmation Drawer */}
        {isCancelOpen && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-rose-300 shadow-xl space-y-4 animate-in slide-in-from-bottom-3 duration-200 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Confirm Cancellation</h5>
              </div>
              <button
                onClick={() => setIsCancelOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel this appointment? You will be able to book another slot anytime.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              >
                <option value="Schedule Conflict">Schedule Conflict</option>
                <option value="Feeling Better">Feeling Better / Recovered</option>
                <option value="Booked Another Doctor">Booked Another Doctor</option>
                <option value="Personal Reason">Personal Reason</option>
              </select>
            </div>

            <button
              onClick={handleCancel}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              Yes, Cancel Appointment
            </button>
          </div>
        )}

        {/* 5. BOTTOM CALL-TO-ACTION BUTTONS */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-3">
          {/* Primary Action Button: Reschedule */}
          <button
            onClick={() => {
              setIsRescheduleOpen(!isRescheduleOpen);
              setIsCancelOpen(false);
            }}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
          >
            {isRescheduleOpen ? 'Close Reschedule' : 'Reschedule'}
          </button>

          {/* Secondary Action Button: Cancel Appointment */}
          <button
            onClick={() => {
              setIsCancelOpen(!isCancelOpen);
              setIsRescheduleOpen(false);
            }}
            className="flex-1 py-3.5 px-4 bg-slate-50 hover:bg-rose-50/80 border border-slate-200 hover:border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
          >
            {isCancelOpen ? 'Close Cancel' : 'Cancel Appointment'}
          </button>
        </div>

      </main>

      <BottomNav />
    </div>
  );
};

