import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { TriagePriority } from '../../types/doctor';
import { playCallChime, speakDoctorAnnouncement } from '../../services/consultationService';
import { useStaffStore } from '../../store/staffStore';

export interface DoctorQueueProps {
  queue: TokenQueueItem[];
  onSelectPatient: (patient: TokenQueueItem) => void;
  onCallPatient: (patient: TokenQueueItem) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; bgLight: string }
> = {
  'In Consultation': {
    label: 'In Consultation',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500 animate-pulse',
    bgLight: 'bg-emerald-50/40',
  },
  'Checked In': {
    label: 'Checked In',
    badge: 'bg-teal-50 text-[#0B5A54] border-teal-300',
    dot: 'bg-teal-500',
    bgLight: 'bg-teal-50/40',
  },
  Waiting: {
    label: 'Waiting',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-400',
    bgLight: 'bg-amber-50/40',
  },
  Completed: {
    label: 'Completed',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    bgLight: 'bg-sky-50/40',
  },
  Done: {
    label: 'Completed',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    bgLight: 'bg-sky-50/40',
  },
  Pending: {
    label: 'Pending',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    bgLight: 'bg-slate-50',
  },
  Cancelled: {
    label: 'Cancelled / No-Show',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-400',
    bgLight: 'bg-rose-50/40',
  },
  Skipped: {
    label: 'Skipped / No-Show',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-400',
    bgLight: 'bg-rose-50/40',
  },
};

export const DoctorQueue: React.FC<DoctorQueueProps> = ({
  queue,
  onSelectPatient,
  onCallPatient,
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [slotFilter, setSlotFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique time slots
  const uniqueSlots = useMemo(() => {
    const slots = Array.from(new Set(queue.map((t) => t.timeSlot || '10:00 AM - 11:00 AM')));
    return ['All', ...slots];
  }, [queue]);

  // Derive priority for each token
  const getPriority = (token: TokenQueueItem): TriagePriority => {
    if (token.age && (token.age < 12 || token.age >= 65)) return 'Senior-Child';
    const issue = (token.healthIssue || (token as any).issue || '').toLowerCase();
    if (issue.includes('chest') || issue.includes('breath') || issue.includes('severe') || issue.includes('pain')) {
      return 'Urgent';
    }
    return 'Normal';
  };

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queue.filter((t) => {
      const matchStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Completed'
          ? t.status === 'Completed' || t.status === ('Done' as any)
          : t.status === statusFilter;

      const matchSlot = slotFilter === 'All' || (t.timeSlot || '10:00 AM - 11:00 AM') === slotFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        t.patientName?.toLowerCase().includes(q) ||
        (t as any).name?.toLowerCase().includes(q) ||
        t.tokenNumber?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.healthIssue?.toLowerCase().includes(q);

      return matchStatus && matchSlot && matchQuery;
    });
  }, [queue, statusFilter, slotFilter, searchQuery]);

  const handleCallVoice = (token: TokenQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playCallChime();
    speakDoctorAnnouncement(
      `Token ${token.tokenNumber}, ${token.patientName || (token as any).name}, please proceed to Cabin ${(currentStaff as any)?.roomNumber || '102'}`
    );
    onCallPatient(token);
  };

  const kanbanColumns = [
    { id: 'Waiting', label: 'Waiting in Lobby', color: 'border-amber-400', headerBg: 'bg-amber-50 text-amber-900' },
    { id: 'In Consultation', label: 'In Consultation', color: 'border-emerald-500', headerBg: 'bg-emerald-50 text-emerald-900' },
    { id: 'Completed', label: 'Completed Today', color: 'border-sky-400', headerBg: 'bg-sky-50 text-sky-900' },
  ];

  return (
    <div className="space-y-6 font-sans">
      
      {/* ── Top Header & Filter Controls ───────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0B5A54]" />
              <h1 className="text-lg font-black text-slate-900">Today's Outpatient Queue</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black">
                {filteredQueue.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time patient progression roster and consultation room routing.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient Name, Token, Ticket..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Waiting', 'Checked In', 'In Consultation', 'Completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Time Slot Filter */}
          <div className="sm:col-span-3">
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
            >
              {uniqueSlots.map((slot) => (
                <option key={slot} value={slot}>
                  Slot: {slot}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kanbanColumns.map((col) => {
            const colItems = filteredQueue.filter((t) => {
              if (col.id === 'Completed') return t.status === 'Completed' || t.status === ('Done' as any);
              if (col.id === 'Waiting') return t.status === 'Waiting' || t.status === 'Checked In' || t.status === ('Pending' as any);
              return t.status === col.id;
            });

            return (
              <div key={col.id} className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className={`px-3.5 py-2 rounded-xl flex items-center justify-between border ${col.headerBg}`}>
                  <h3 className="text-xs font-extrabold">{col.label}</h3>
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-white/60">
                    {colItems.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
                  {colItems.length === 0 && (
                    <div className="py-10 text-center text-xs text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-200">
                      No patients in this stage
                    </div>
                  )}

                  {colItems.map((patient) => {
                    const priority = getPriority(patient);
                    return (
                      <div
                        key={patient.id}
                        onClick={() => onSelectPatient(patient)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group relative"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-mono font-black text-xs text-slate-800 border border-slate-200">
                            {patient.tokenNumber}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                              priority === 'Urgent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : priority === 'Senior-Child'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                            }`}
                          >
                            {priority}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                          {patient.patientName || (patient as any).name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {patient.healthIssue || (patient as any).issue || 'General Outpatient Care'}
                        </p>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400 font-medium">
                            {patient.timeSlot || (patient as any).slot || '10:00 AM'}
                          </span>

                          {col.id === 'Waiting' && (
                            <button
                              type="button"
                              onClick={(e) => handleCallVoice(patient, e)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-[#0B5A54] text-[#0B5A54] hover:text-white font-bold text-[10px] flex items-center gap-1 border border-teal-200 transition-all cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Call Patient</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DATA TABLE VIEW ────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Token #</th>
                  <th className="py-3.5 px-4">Patient Name & Demographics</th>
                  <th className="py-3.5 px-4">Triage Priority</th>
                  <th className="py-3.5 px-4">Chief Complaint</th>
                  <th className="py-3.5 px-4">Time Slot</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredQueue.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No matching patients found
                    </td>
                  </tr>
                )}
                {filteredQueue.map((patient) => {
                  const priority = getPriority(patient);
                  const st = STATUS_CONFIG[patient.status] || STATUS_CONFIG['Waiting'];
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                        {patient.tokenNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                          {patient.patientName || (patient as any).name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {patient.age || 32}y · Blood {patient.bloodGroup || 'O+'} · {patient.patientPhone || '+91 98765 00000'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            priority === 'Urgent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : priority === 'Senior-Child'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {patient.healthIssue || (patient as any).issue || 'Routine Outpatient'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {patient.timeSlot || (patient as any).slot || '10:00 AM'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${st.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleCallVoice(patient, e)}
                            className="p-1.5 text-slate-500 hover:text-[#0B5A54] hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Call Patient Audio"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectPatient(patient)}
                            className="px-3 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <span>Consult</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorQueue;
