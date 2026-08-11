import React, { useState } from 'react';
import { Users, UserCheck, Stethoscope, Ticket, Plus, Clock, Volume2, CheckCircle2, XCircle } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { NewAppointmentModal } from './NewAppointmentModal';


export const ReceptionistDashboard: React.FC = () => {
  const doctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const activeDoctorsCount = doctors.filter((d) => d.isAvailable).length;
  const activeToken = tokens.find((t) => t.status === 'In Consultation');
  const waitingTokens = tokens.filter((t) => t.status === 'Waiting');
  const completedTokensCount = tokens.filter((t) => t.status === 'Completed').length;

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0B5A54] p-8 rounded-3xl text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <span className="px-3.5 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            OPD Operations Hub
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white font-heading">
            Good day
          </h1>
          <p className="text-sm text-teal-100/90 leading-relaxed">
            Monitor real-time patient arrivals, toggle doctor availability status, issue live queue tokens, and manage hourly seat allocations.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-6 py-3.5 bg-white text-[#0B5A54] hover:bg-teal-50 font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 text-xs uppercase tracking-wider hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + New Appointment
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Booked Patients */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Patients</span>
            <div className="p-3 bg-teal-50 rounded-2xl text-[#0B5A54]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{tokens.length}</div>
          <p className="text-xs text-slate-400 font-medium">Total appointments logged</p>
        </div>

        {/* Checked-In Waiting Queue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting in Queue</span>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600">{waitingTokens.length}</div>
          <p className="text-xs text-slate-400 font-medium">Pending consultation</p>
        </div>

        {/* Active Doctors Available */}
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
        {/* Left Column (2 Cols): Live Queue & Quick Caller */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Consultation Call Card */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#0B5A54]" />
                Live OPD Token Caller
              </h2>

              <button
                onClick={() => callNextToken()}
                disabled={waitingTokens.length === 0}
                className="px-4 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
              >
                Call Next Token
              </button>
            </div>

            {activeToken ? (
              <div className="p-6 bg-teal-50/70 rounded-2xl border border-teal-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-black text-[#0B5A54] tracking-wider">
                    Currently In Consultation
                  </span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-1">
                    {activeToken.tokenNumber} <span className="text-xs font-medium text-slate-500">({activeToken.ticketNumber})</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {activeToken.patientName} • <span className="text-[#0B5A54]">{activeToken.doctorName}</span>
                  </p>
                </div>

                <button
                  onClick={() => updateTokenStatus(activeToken.id, 'Completed')}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Mark Completed
                </button>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs font-medium border border-slate-100">
                No active token in consultation. Click "Call Next Token" to advance queue.
              </div>
            )}
          </div>

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
                      item.status === 'In Consultation'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : item.status === 'Waiting'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Doctor Availability Status Switches */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#0B5A54]" />
                Doctor Live Status
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
                    onClick={() => toggleDoctorAvailability(doctor.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      doctor.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
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
    </div>
  );
};

export default ReceptionistDashboard;
