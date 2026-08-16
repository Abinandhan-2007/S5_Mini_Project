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
  Bell,
  MessageSquare,
  Star,
  Award,
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
    timeSlot: passedState.timeSlot || activeAppointment?.timeSlot || '10:30 AM - 11:30 AM',
    type: passedState.type || activeAppointment?.doctorSpecialty || 'General Consultation',
    clientName: passedState.clientName || user?.fullName || 'Sarah Jenkins',
    doctorName: passedState.doctorName || activeAppointment?.doctorName || 'Dr. Alex Morgan',
    doctorSpecialty: passedState.doctorSpecialty || activeAppointment?.doctorSpecialty || 'Cardiology Specialist',
    doctorPhoto: passedState.doctorPhoto || activeAppointment?.doctorPhoto || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    facilityName: passedState.facilityName || activeAppointment?.hospitalName || 'St. Jude Medical Center',
    facilityAddress: passedState.facilityAddress || '4517 Washington Ave, Medical Hub',
    facilityPhone: passedState.facilityPhone || '+1 (555) 735-4614',
    bgColor: passedState.bgColor || 'bg-[#F0FDF4]',
    borderColor: passedState.borderColor || 'border-emerald-200',
    textColor: passedState.textColor || 'text-emerald-950',
  };

  // Interactive Reschedule & Cancel States
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('2026-08-15');
  const [newSlot, setNewSlot] = useState('10:00 AM - 10:30 AM');

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Schedule Conflict');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleReschedule = () => {
    if (appointmentData.id) {
      rescheduleAppointment(appointmentData.id, newDate, newSlot);
    }
    setIsRescheduleOpen(false);
    setActionSuccess(`Appointment rescheduled to ${newDate} at ${newSlot}`);
  };

  const handleCancel = () => {
    if (appointmentData.id) {
      cancelAppointment(appointmentData.id, cancelReason);
    }
    setIsCancelOpen(false);
    setActionSuccess('Appointment cancelled successfully.');
    setTimeout(() => navigate('/home'), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 select-none">
      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-5 text-left animate-in fade-in duration-300">

        {/* 1. UNIFIED TOP NAVIGATION HEADER BAR (NO DUPLICATE HELLO SARAH BAR) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60"
              title="Back to Home"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-3">
              <Avatar src={user?.avatarUrl || appointmentData.doctorPhoto || ''} size="md" />
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-tight font-heading">
                  {user?.fullName || 'Sarah Mitchell'}
                </h4>
                <p className="text-[11px] font-bold text-slate-400">Patient Profile</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 text-[#0B5A54]" />
            </button>
            <button className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
              <MessageSquare className="w-4 h-4 text-[#0B5A54]" />
            </button>
          </div>
        </div>

        {/* Action Success Alert Banner */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 rounded-2xl flex items-center gap-3 shadow-xs animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-black">{actionSuccess}</p>
          </div>
        )}

        {/* 2. APPOINTMENT SUMMARY CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                APPOINTMENT ACTIVITY
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                {appointmentData.type}
              </h3>
            </div>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
              Confirmed
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0B5A54]">
              <Clock className="w-4 h-4" />
              <span>{appointmentData.timeSlot}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Client: {appointmentData.clientName}</span>
            </div>
          </div>
        </div>

        {/* 3. CENTRAL DOCTOR PROFILE CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              ATTENDING DOCTOR
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>4.9 (120+ reviews)</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={appointmentData.doctorPhoto}
              alt={appointmentData.doctorName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-100 shadow-md shrink-0"
            />
            <div className="flex-1">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {appointmentData.doctorName}
              </h3>
              <p className="text-xs font-extrabold text-[#0B5A54] mt-0.5">
                {appointmentData.doctorSpecialty}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>15+ Yrs Exp</span>
                </span>
                <span className="inline-flex items-center bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  Today Hours: 7 hrs available
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. FACILITY INFORMATION CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-200 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                PRACTICE BUILDING & FACILITY
              </span>
              <h4 className="text-sm font-black text-slate-900">{appointmentData.facilityName}</h4>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100 font-semibold">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#0B5A54] shrink-0" />
              <span>{appointmentData.facilityPhone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0" />
              <span>{appointmentData.facilityAddress}</span>
            </div>
          </div>
        </div>

        {/* Reschedule Interactive Picker Drawer */}
        {isRescheduleOpen && (
          <div className="bg-white rounded-3xl p-5 border-2 border-[#0B5A54] shadow-md space-y-3.5 animate-in slide-in-from-bottom-3 duration-200 text-left">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0B5A54]" />
              <span>Select New Date & Time Slot</span>
            </h5>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">New Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">New Time Slot</label>
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              >
                <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
              </select>
            </div>
            <button
              onClick={handleReschedule}
              className="w-full py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
            >
              Confirm Reschedule
            </button>
          </div>
        )}

        {/* Cancel Interactive Confirmation Drawer */}
        {isCancelOpen && (
          <div className="bg-white rounded-3xl p-5 border-2 border-rose-300 shadow-md space-y-3.5 animate-in slide-in-from-bottom-3 duration-200 text-left">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Confirm Cancellation</h5>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Cancellation Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Schedule Conflict">Schedule Conflict</option>
                <option value="Feeling Better">Feeling Better / Recovered</option>
                <option value="Booked Another Doctor">Booked Another Doctor</option>
                <option value="Personal Reason">Personal Reason</option>
              </select>
            </div>
            <button
              onClick={handleCancel}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
            >
              Yes, Cancel Appointment
            </button>
          </div>
        )}

        {/* 5. BOTTOM FLEX CONTAINER WITH TWO PRIMARY CALL-TO-ACTION BUTTONS */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-md flex flex-col sm:flex-row gap-3 pt-4">
          {/* Primary Solid Orange Button Labeled 'RESCHEDULE' */}
          <button
            onClick={() => {
              setIsRescheduleOpen(!isRescheduleOpen);
              setIsCancelOpen(false);
            }}
            className="flex-1 py-4 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
          >
            {isRescheduleOpen ? 'CLOSE RESCHEDULE' : 'RESCHEDULE'}
          </button>

          {/* Secondary Outlined Button Labeled 'CANCEL APPOINTMENT' */}
          <button
            onClick={() => {
              setIsCancelOpen(!isCancelOpen);
              setIsRescheduleOpen(false);
            }}
            className="flex-1 py-4 px-4 bg-white hover:bg-rose-50 border-2 border-rose-300 text-rose-600 hover:text-rose-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
          >
            {isCancelOpen ? 'CLOSE CANCEL' : 'CANCEL APPOINTMENT'}
          </button>
        </div>

      </main>

      <BottomNav />
    </div>
  );
};
