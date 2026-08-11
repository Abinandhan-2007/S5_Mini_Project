import React, { useState } from 'react';
import { Search, Clock, FileText, Plus } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { NewAppointmentModal } from './NewAppointmentModal';

export const PatientBookings: React.FC = () => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const filteredBookings = tokens.filter((item) => {
    const matchesStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;
    const matchesDoctor = selectedDoctorFilter === 'ALL' || item.doctorId === selectedDoctorFilter;
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patientPhone.includes(searchQuery);

    return matchesStatus && matchesDoctor && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-50 rounded-2xl text-[#0B5A54]">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-heading">Patient Bookings Record</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete appointment log for walk-ins, phone bookings, and mobile patient app bookings.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-2xl shadow-md transition-all text-xs uppercase tracking-wider hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Book New Walk-In
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search patient name, phone, ticket # (#CP-4821)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {['ALL', 'Waiting', 'In Consultation', 'Completed', 'Skipped'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatusFilter === st
                    ? 'bg-white text-[#0B5A54] shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
          >
            <option value="ALL">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-6">Ticket ID</th>
                <th className="py-4 px-4">Patient Name & Contact</th>
                <th className="py-4 px-4">Doctor & Department</th>
                <th className="py-4 px-4">Time Slot</th>
                <th className="py-4 px-4">Token #</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    No appointment records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4.5 px-6 font-mono font-bold text-slate-900">
                      {b.ticketNumber}
                    </td>
                    <td className="py-4.5 px-4 font-bold text-slate-900">
                      <div>{b.patientName}</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">{b.patientPhone}</div>
                    </td>
                    <td className="py-4.5 px-4 text-slate-700">
                      <div className="font-bold text-slate-900">{b.doctorName}</div>
                      <div className="text-[11px] text-[#0B5A54] font-semibold mt-0.5">{b.doctorSpecialty}</div>
                    </td>
                    <td className="py-4.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {b.timeSlot}
                      </div>
                    </td>
                    <td className="py-4.5 px-4 font-mono font-bold text-[#0B5A54]">
                      {b.tokenNumber}
                    </td>
                    <td className="py-4.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                        {b.type}
                      </span>
                    </td>
                    <td className="py-4.5 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${
                          b.status === 'In Consultation'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : b.status === 'Waiting'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      {b.status === 'Waiting' && (
                        <button
                          onClick={() => updateTokenStatus(b.id, 'In Consultation')}
                          className="px-3.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl text-[11px] shadow-xs transition-all"
                        >
                          Send to Doctor
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewAppointmentModal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} />
    </div>
  );
};
