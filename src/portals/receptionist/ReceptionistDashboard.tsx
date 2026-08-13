import React, { useState } from 'react';
import { Users, UserCheck, Stethoscope, Ticket, Plus, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { NewAppointmentModal } from './NewAppointmentModal';
import type { DoctorRecord } from '../../types/receptionist';


export const ReceptionistDashboard: React.FC = () => {
  const doctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [doctorToToggle, setDoctorToToggle] = useState<DoctorRecord | null>(null);

  const activeDoctorsCount = doctors.filter((d) => d.isAvailable).length;
  const completedTokensCount = tokens.filter((t) => t.status === 'Completed').length;

  const handleConfirmToggleAvailability = async () => {
    if (doctorToToggle) {
      await toggleDoctorAvailability(doctorToToggle.id);
      setDoctorToToggle(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0B5A54] p-8 rounded-3xl text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <h1 className="text-3xl font-black font-heading tracking-tight">OPD Reception Desk</h1>
          <p className="text-teal-100 text-sm font-medium">
            Manage live patient arrival queues, token calls, and doctor consultation room availability.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="px-6 py-3.5 bg-white hover:bg-teal-50 text-[#0B5A54] font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Book Walk-In Patient</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Waiting */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Queue Waiting</span>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {tokens.filter((t) => t.status === 'Waiting').length}
          </div>
          <p className="text-xs text-slate-400 font-medium">Patients in waiting hall</p>
        </div>

        {/* Currently In Consultation */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Consultation</span>
            <div className="p-3 bg-teal-50 rounded-2xl text-[#0B5A54]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0B5A54]">
            {tokens.filter((t) => t.status === 'In Consultation').length}
          </div>
          <p className="text-xs text-slate-400 font-medium">Active doctor consultations</p>
        </div>

        {/* Active Doctors */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Doctors</span>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {activeDoctorsCount} <span className="text-sm text-slate-400 font-medium">/ {doctors.length}</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Active OPD duty doctors</p>
        </div>

        {/* Completed Visits */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Visits</span>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600">{completedTokensCount}</div>
          <p className="text-xs text-slate-400 font-medium">Consultations done</p>
        </div>
      </div>

      {/* Main Grid: Live Queue & Doctor Quick Availability List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Live Queue Preview */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Queue Preview */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0B5A54]" />
                Recent Arrival Queue
              </h2>
              <span className="text-xs text-slate-400 font-semibold">{tokens.length} total tokens</span>
            </div>

            <div className="space-y-3">
              {tokens.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between hover:border-[#0B5A54]/30 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-3.5 py-1.5 bg-teal-50 rounded-xl font-mono font-black text-sm text-[#0B5A54] border border-teal-200">
                      {item.tokenNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.patientName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.doctorName} ({item.doctorSpecialty}) • <span className="font-mono text-slate-400">{item.timeSlot}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'In Consultation'
                        ? 'bg-teal-50 text-[#0B5A54] border border-teal-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Quick Doctor Duty Toggle */}
        <div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#0B5A54]" />
                On-Duty Doctors
              </h2>
              <p className="text-xs text-slate-500 mt-1">Toggle Available / Not Available status for active doctors.</p>
            </div>

            <div className="space-y-3.5">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={doctor.photo}
                      alt={doctor.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{doctor.name}</h4>
                      <p className="text-[11px] text-[#0B5A54] font-semibold mt-0.5">{doctor.specialty}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDoctorToToggle(doctor)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      doctor.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {doctor.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Unavailable
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NewAppointmentModal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} />

      {/* PREMIUM WARNING & CONFIRMATION MODAL */}
      {doctorToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Doctor Availability Change?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to set <strong className="text-slate-900 font-extrabold">{doctorToToggle.name}</strong> to{' '}
                <span className={`font-black ${doctorToToggle.isAvailable ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {doctorToToggle.isAvailable ? 'UNAVAILABLE' : 'AVAILABLE'}
                </span>.
              </p>
            </div>

            {/* Premium Notice Box */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Operational Warning</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal font-medium">
                {doctorToToggle.isAvailable
                  ? 'Marking this doctor as Unavailable will pause walk-in token assignments and notify patient queue handlers.'
                  : 'Marking this doctor as Available will resume patient token calls and open consultation room slots.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDoctorToToggle(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleAvailability}
                className={`flex-1 py-3 px-4 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer ${
                  doctorToToggle.isAvailable
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#0B5A54] hover:bg-[#084540]'
                }`}
              >
                Confirm {doctorToToggle.isAvailable ? 'Unavailable' : 'Available'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
