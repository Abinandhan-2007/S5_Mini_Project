import React, { useState } from 'react';
import { Ticket, Clock, Search, Filter, Volume2 } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenStatus } from '../../types/receptionist';

export const TokenManagement: React.FC = () => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTokens = tokens.filter((t) => {
    const matchesDoctor = selectedDoctorFilter === 'ALL' || t.doctorId === selectedDoctorFilter;
    const matchesSearch =
      t.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientPhone.includes(searchQuery);
    return matchesDoctor && matchesSearch;
  });

  const activeInConsultation = tokens.find((t) => t.status === 'In Consultation');
  const waitingCount = tokens.filter((t) => t.status === 'Waiting').length;

  const handleCallNext = async () => {
    await callNextToken(selectedDoctorFilter === 'ALL' ? undefined : selectedDoctorFilter);
  };

  const getStatusBadgeClass = (status: TokenStatus) => {
    switch (status) {
      case 'In Consultation':
        return 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse';
      case 'Waiting':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'Skipped':
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Control Deck */}
      <div className="bg-[#0B5A54] rounded-3xl p-8 text-white shadow-xl shadow-teal-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-3.5 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            Live OPD Queue Controller
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-2 flex items-center gap-2 font-heading">
            <Ticket className="w-8 h-8" /> Token Queue Management
          </h1>
          <p className="text-xs text-teal-100/90 mt-1 max-w-lg">
            Monitor real-time patient queue tokens, call next waiting patients, and manage consultation stage updates.
          </p>
        </div>

        {/* Call Next Token Action Box */}
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-5 min-w-[300px]">
          <div className="flex-1">
            <span className="text-[11px] uppercase font-black text-teal-200 tracking-wider">Current Active Call</span>
            <div className="text-2xl font-black font-mono mt-0.5 text-white">
              {activeInConsultation ? activeInConsultation.tokenNumber : 'No Token Called'}
            </div>
            <p className="text-xs text-teal-100 truncate mt-0.5 font-medium">
              {activeInConsultation ? `${activeInConsultation.patientName} (${activeInConsultation.doctorName})` : `${waitingCount} Patients Waiting`}
            </p>
          </div>

          <button
            onClick={handleCallNext}
            disabled={waitingCount === 0}
            className="px-5 py-3.5 bg-white text-[#0B5A54] hover:bg-teal-50 font-black rounded-xl shadow-md transition-all flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 hover:scale-[1.02]"
          >
            <Volume2 className="w-4 h-4" />
            Call Next
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Token # (#TOK-001), Patient Name, Phone, or Ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
          >
            <option value="ALL">All Doctors Queue</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.specialty})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-6">Token #</th>
                <th className="py-4 px-4">Patient Info</th>
                <th className="py-4 px-4">Doctor & Specialty</th>
                <th className="py-4 px-4">Time Slot</th>
                <th className="py-4 px-4">Ticket Code</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Queue Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No tokens found matching the search filter.
                  </td>
                </tr>
              ) : (
                filteredTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4.5 px-6 font-black font-mono text-slate-900">
                      <span className="px-3 py-1 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200">
                        {token.tokenNumber}
                      </span>
                    </td>
                    <td className="py-4.5 px-4 font-bold text-slate-900">
                      <div>{token.patientName}</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">{token.patientPhone}</div>
                    </td>
                    <td className="py-4.5 px-4 text-slate-700">
                      <div className="font-bold text-slate-900">{token.doctorName}</div>
                      <div className="text-[11px] text-[#0B5A54] font-semibold mt-0.5">{token.doctorSpecialty}</div>
                    </td>
                    <td className="py-4.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {token.timeSlot}
                      </div>
                    </td>
                    <td className="py-4.5 px-4 font-mono font-bold text-slate-500">
                      {token.ticketNumber}
                    </td>
                    <td className="py-4.5 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeClass(
                          token.status
                        )}`}
                      >
                        {token.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right space-x-2">
                      {token.status === 'Waiting' && (
                        <button
                          onClick={() => updateTokenStatus(token.id, 'In Consultation')}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[11px] shadow-xs transition-all"
                        >
                          In Consultation
                        </button>
                      )}

                      {token.status === 'In Consultation' && (
                        <button
                          onClick={() => updateTokenStatus(token.id, 'Completed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-xs transition-all"
                        >
                          Mark Done
                        </button>
                      )}

                      {token.status !== 'Completed' && token.status !== 'Skipped' && (
                        <button
                          onClick={() => updateTokenStatus(token.id, 'Skipped')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-all"
                        >
                          Skip
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
    </div>
  );
};
