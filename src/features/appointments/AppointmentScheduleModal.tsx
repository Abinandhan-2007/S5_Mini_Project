import React, { useState } from 'react';
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  MessageSquare,
  Building2,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import type { Appointment } from '../../lib/types';

interface AppointmentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentScheduleModal: React.FC<AppointmentScheduleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const appointments = useCarePulseStore((s) => s.appointments);
  const rescheduleAppointment = useCarePulseStore((s) => s.rescheduleAppointment);
  const cancelAppointment = useCarePulseStore((s) => s.cancelAppointment);
  const user = useCarePulseStore((s) => s.user);

  const [selectedAppId, setSelectedAppId] = useState<string>(activeAppointment?.id || 'app-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Reschedule modal sub-state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('2026-08-15');
  const [newSlot, setNewSlot] = useState('10:00 AM - 10:30 AM');

  // Cancel modal sub-state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Schedule Conflict');

  if (!isOpen) return null;

  // Selected appointment
  const currentApp: Appointment =
    appointments.find((a) => a.id === selectedAppId) || activeAppointment || {
      id: 'app-1',
      ticketNumber: 'TK-482',
      patientId: user?.id || 'usr-1',
      patientName: user?.fullName || 'Sarah Jenkins',
      doctorId: 'doc-2',
      doctorName: 'Dr. Elena Rostova',
      doctorPhoto: 'https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80',
      doctorSpecialty: 'General Medicine',
      hospitalName: 'CarePulse Central Hospital',
      date: '2026-08-12',
      timeSlot: '09:00 AM - 09:30 AM',
      type: 'In-Person',
      status: 'Upcoming',
    };

  // Schedule Timeline Mock Items (matching user screenshot colors)
  const scheduleBlocks = [
    {
      id: 'slot-1',
      time: '8:00 AM',
      title: 'General Consultation',
      duration: '8:00 AM - 09:10 AM',
      patient: 'Jane Cooper',
      doctor: 'Dr. Elena Rostova',
      colorBg: 'bg-pink-100/90 border-pink-200 text-pink-950',
      tagColor: 'bg-pink-200/80 text-pink-900',
    },
    {
      id: 'slot-2',
      time: '10:00 AM',
      title: 'Vaccination Drive',
      duration: '10:00 AM - 11:10 AM',
      patient: 'Marvin McKinney',
      doctor: 'Dr. Marcus Vance',
      colorBg: 'bg-emerald-100/90 border-emerald-200 text-emerald-950',
      tagColor: 'bg-emerald-200/80 text-emerald-900',
    },
    {
      id: 'slot-3',
      time: '11:00 AM',
      title: 'Digital X-Ray & Scan',
      duration: '11:12 AM - 12:20 PM',
      patient: 'Cody Fisher',
      doctor: 'Dr. Sarah Jenkins',
      colorBg: 'bg-blue-100/90 border-blue-200 text-blue-950',
      tagColor: 'bg-blue-200/80 text-blue-900',
    },
    {
      id: 'slot-4',
      time: '13:00 PM',
      title: 'Flee & Health Checkup',
      duration: '12:55 PM - 14:05 PM',
      patient: 'Ronald Richards',
      doctor: 'Dr. Elena Rostova',
      colorBg: 'bg-amber-100/90 border-amber-200 text-amber-950',
      tagColor: 'bg-amber-200/80 text-amber-900',
    },
    {
      id: 'slot-5',
      time: '14:00 PM',
      title: 'Injury Examinations',
      duration: '14:30 PM - 15:30 PM',
      patient: user?.fullName || 'Sarah Jenkins',
      doctor: currentApp.doctorName,
      colorBg: 'bg-[#E3F3F1] border-teal-200 text-[#0B5A54]',
      tagColor: 'bg-[#0B5A54] text-white',
    },
  ];

  const handleSaveReschedule = () => {
    rescheduleAppointment(currentApp.id, newDate, newSlot);
    setIsRescheduleOpen(false);
  };

  const handleConfirmCancel = () => {
    cancelAppointment(currentApp.id, cancelReason);
    setIsCancelOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[92vh]">
        {/* LEFT COLUMN: SCHEDULE GRID & CALENDAR (60% width) */}
        <div className="lg:w-3/5 p-5 sm:p-7 space-y-6 overflow-y-auto border-r border-slate-100">
          {/* Top Search & Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search here ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>

          {/* Month Header & New Appointment Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 font-heading">August 2026</h2>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Today is Tuesday, August 12, 2026
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-2xl shadow-md text-xs uppercase tracking-wider transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Appointment</span>
            </button>
          </div>

          {/* Hourly Appointment Timeline Blocks */}
          <div className="space-y-4 pt-2">
            {scheduleBlocks.map((block) => (
              <div key={block.id} className="flex items-start gap-4">
                {/* Time Stamp */}
                <span className="w-16 text-xs font-extrabold text-slate-400 pt-3 text-right">
                  {block.time}
                </span>

                {/* Appointment Colored Card */}
                <div
                  onClick={() => setSelectedAppId(currentApp.id)}
                  className={`flex-1 rounded-2xl p-4 border shadow-2xs hover:shadow-md transition-all cursor-pointer ${block.colorBg} relative group`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black tracking-tight">{block.title}</h4>
                      <p className="text-xs font-bold opacity-80 mt-0.5">{block.duration}</p>
                      <div className="flex items-center gap-1.5 text-xs font-semibold mt-2 opacity-90">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{block.patient}</span>
                      </div>
                    </div>

                    <button className="text-slate-500 hover:text-slate-800 p-1">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: APPOINTMENT DETAILS & RESCHEDULE/CANCEL (40% width) */}
        <div className="lg:w-2/5 bg-slate-50/50 p-5 sm:p-7 space-y-6 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-6">
            {/* Top Right User Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2.5">
                <Avatar src={user?.avatarUrl || currentApp.doctorPhoto} size="sm" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.fullName || 'Sarah Jenkins'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Patient Profile</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <Bell className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Doctor Info Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <img
                src={currentApp.doctorPhoto}
                alt={currentApp.doctorName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
              />
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">{currentApp.doctorName}</h3>
                <p className="text-xs font-bold text-[#0B5A54] mt-0.5">{currentApp.doctorSpecialty}</p>
                <span className="inline-block bg-teal-50 text-[#0B5A54] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 border border-teal-200">
                  Today Hours: 7 hours available
                </span>
              </div>
            </div>

            {/* Clinic / Practice Building Info */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    PRACTICE BUILDING
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{currentApp.hospitalName}</h4>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>+1 (555) 735-4614</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>4517 Washington Ave, Medical Hub</span>
                </div>
              </div>
            </div>

            {/* Patient & Booking Schedule Details */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                APPOINTMENT DETAILS
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{currentApp.patientName}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">32 Yrs • Female</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${currentApp.status === 'Cancelled'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  {currentApp.status || 'Upcoming'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
                  {currentApp.date}
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-4 h-4 text-[#0B5A54]" />
                  {currentApp.timeSlot}
                </span>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION BUTTONS: RESCHEDULE & CANCEL APPOINTMENT */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            {/* Reschedule Button */}
            <button
              onClick={() => setIsRescheduleOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              Reschedule
            </button>

            {/* Cancel Appointment Button */}
            <button
              onClick={() => setIsCancelOpen(true)}
              className="w-full py-3.5 bg-white hover:bg-rose-50 border-2 border-rose-300 text-rose-600 hover:text-rose-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              Cancel Appointment
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL 1: RESCHEDULE APPOINTMENT */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setIsRescheduleOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Time Slot</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                  <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                  <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                  <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                  <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveReschedule}
              className="w-full py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: CANCEL APPOINTMENT CONFIRMATION */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Cancel Appointment?
              </h3>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Are you sure you want to cancel your consultation with <strong className="text-slate-900">{currentApp.doctorName}</strong> on {currentApp.date}?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="Schedule Conflict">Schedule Conflict</option>
                <option value="Feeling Better">Feeling Better / Recovered</option>
                <option value="Booked Another Doctor">Booked Another Doctor</option>
                <option value="Personal Reason">Personal Reason</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsCancelOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentScheduleModal;
