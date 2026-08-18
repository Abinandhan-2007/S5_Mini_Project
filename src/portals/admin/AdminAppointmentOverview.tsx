import React, { useState } from 'react';
import {
  Search,
  Clock,
  Building2,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  XCircle,
  RefreshCw,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem, TokenStatus } from '../../types/receptionist';

interface AdminAppointmentOverviewProps {
  onShowToast: (msg: string) => void;
}

export const AdminAppointmentOverview: React.FC<AdminAppointmentOverviewProps> = ({ onShowToast }) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const departments = useStaffStore((s) => s.departments);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarScale, setCalendarScale] = useState<'day' | 'week' | 'month'>('week');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Override & Detail modal states
  const [selectedAppointment, setSelectedAppointment] = useState<TokenQueueItem | null>(null);
  const [reassignModalToken, setReassignModalToken] = useState<TokenQueueItem | null>(null);
  const [newDoctorId, setNewDoctorId] = useState('');

  // Filtered Appointments
  const filteredAppointments = tokens.filter((token) => {
    const doc = doctors.find((d) => d.id === token.doctorId);
    const matchesSearch =
      token.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.patientPhone.includes(searchQuery);

    const matchesDept = selectedDept === 'All' || doc?.department === selectedDept;
    const matchesDoc = selectedDoc === 'All' || token.doctorId === selectedDoc;

    let mappedStatus = 'Pending';
    if (token.status === 'Completed') mappedStatus = 'Completed';
    else if (token.status === 'Cancelled') mappedStatus = 'Cancelled';
    const matchesStatus = selectedStatus === 'All' || mappedStatus === selectedStatus;

    const isOnline = token.type !== 'Walk-In';
    const bookingType = isOnline ? 'Online' : 'Walk-In';
    const matchesType = selectedType === 'All' || bookingType === selectedType;

    return matchesSearch && matchesDept && matchesDoc && matchesStatus && matchesType;
  });

  const handleStatusOverride = async (tokenId: string, newStatus: TokenStatus) => {
    await updateTokenStatus(tokenId, newStatus);
    onShowToast(`Appointment status updated to "${newStatus}".`);
    if (selectedAppointment?.id === tokenId) {
      setSelectedAppointment(null);
    }
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalToken || !newDoctorId) return;
    const targetDoc = doctors.find((d) => d.id === newDoctorId);
    if (!targetDoc) return;

    // Mutate token in store
    useStaffStore.setState((state) => ({
      tokens: state.tokens.map((t) =>
        t.id === reassignModalToken.id
          ? { ...t, doctorId: targetDoc.id, doctorName: targetDoc.name, doctorSpecialty: targetDoc.specialty }
          : t
      ),
    }));

    setReassignModalToken(null);
    onShowToast(`Appointment #${reassignModalToken.tokenNumber} reassigned to ${targetDoc.name}!`);
  };

  const handleExportData = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Token,Patient Name,Phone,Doctor,Department,Time Slot,Type,Status']
        .concat(
          filteredAppointments.map(
            (t) =>
              `${t.tokenNumber},"${t.patientName}",${t.patientPhone},"${t.doctorName}","${t.doctorSpecialty}","${t.timeSlot}","${t.type}","${t.status}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `carepulse_appointments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Appointments report exported as CSV!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Controls ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Appointment Overview
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
              {filteredAppointments.length} Bookings
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Master hospital appointment schedules, live status tracking, department heat maps, and administrative overrides.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Calendar Schedule
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Master List View
            </button>
          </div>

          <button
            onClick={handleExportData}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0B5A54]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-bold text-slate-700">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, token, doc..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Physicians</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending / In Queue</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Booking Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Online">Online App</option>
              <option value="Walk-In">Walk-In Desk</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── View Mode: CALENDAR SCHEDULE ── */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          {/* Calendar Header with Day/Week/Month */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                August 17 – August 23, 2026
              </h3>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(['day', 'week', 'month'] as const).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setCalendarScale(scale)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    calendarScale === scale
                      ? 'bg-white text-[#0B5A54] shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              '09:00 AM - 10:00 AM',
              '10:00 AM - 11:00 AM',
              '11:00 AM - 12:00 PM',
              '02:00 PM - 03:00 PM',
              '03:00 PM - 04:00 PM',
              '04:00 PM - 05:00 PM',
            ].map((slotTime) => {
              const slotAppointments = filteredAppointments.filter(
                (a) => a.timeSlot.toLowerCase().includes(slotTime.slice(0, 5).toLowerCase()) || a.timeSlot === slotTime
              );

              return (
                <div key={slotTime} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-[11px] font-black text-slate-900 font-heading">
                      {slotTime.split(' - ')[0]}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {slotAppointments.length} slots
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                    {slotAppointments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-medium italic text-center py-4">
                        No appointments
                      </p>
                    ) : (
                      slotAppointments.map((app) => {
                        const isOnline = app.type !== 'Walk-In';
                        const statusColor =
                          app.status === 'Completed'
                            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                            : app.status === 'Cancelled'
                            ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                            : 'border-teal-200 bg-white text-slate-800 shadow-2xs';

                        return (
                          <div
                            key={app.id}
                            onClick={() => setSelectedAppointment(app)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:scale-[1.02] transition-all ${statusColor}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-black text-[#0B5A54]">
                                {app.tokenNumber}
                              </span>
                              <span className="text-[9px] font-black uppercase">
                                {isOnline ? 'Online' : 'Walk-In'}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 truncate mt-1">{app.patientName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{app.doctorName}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View Mode: MASTER LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Token / Patient</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Assigned Doctor</th>
                  <th className="py-3.5 px-4">Time Slot</th>
                  <th className="py-3.5 px-4 text-center">Booking Type</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No appointments match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((token) => {
                    const isOnline = token.type !== 'Walk-In';
                    const mappedStatus =
                      token.status === 'Completed'
                        ? 'Completed'
                        : token.status === 'Cancelled'
                        ? 'Cancelled'
                        : 'Pending';

                    return (
                      <tr key={token.id} className="hover:bg-teal-50/20 transition-colors">
                        {/* Token & Patient Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                              {token.tokenNumber}
                            </span>
                            <div>
                              <p className="font-black text-slate-900">{token.patientName}</p>
                              {token.age && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Age: {token.age} {token.bloodGroup ? `• ${token.bloodGroup}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-4 text-slate-600 font-semibold">{token.patientPhone}</td>

                        {/* Doctor */}
                        <td className="py-4 px-4">
                          <p className="font-black text-slate-900">{token.doctorName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{token.doctorSpecialty}</p>
                        </td>

                        {/* Time Slot */}
                        <td className="py-4 px-4">
                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{token.timeSlot}</span>
                          </span>
                        </td>

                        {/* Booking Type */}
                        <td className="py-4 px-4 text-center">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-[#0B5A54] border border-teal-200">
                              <Smartphone className="w-3 h-3" />
                              <span>Online App</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200">
                              <Building2 className="w-3 h-3" />
                              <span>Walk-In</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border ${
                              mappedStatus === 'Completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : mappedStatus === 'Cancelled'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {mappedStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedAppointment(token)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setReassignModalToken(token);
                                setNewDoctorId(token.doctorId);
                              }}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54]"
                              title="Reassign Physician"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {mappedStatus !== 'Cancelled' && (
                              <button
                                onClick={() => handleStatusOverride(token.id, 'Cancelled')}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                title="Cancel Appointment"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Appointment Detail Modal ── */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black bg-teal-50 text-[#0B5A54] px-2.5 py-1 rounded-xl border border-teal-200">
                  {selectedAppointment.tokenNumber}
                </span>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Appointment Card
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Name</span>
                  <span className="text-sm font-black text-slate-900">{selectedAppointment.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Phone</span>
                  <span className="text-slate-900 font-semibold">{selectedAppointment.patientPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Consulting Physician</span>
                  <span className="text-slate-900">{selectedAppointment.doctorName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Time Slot</span>
                  <span className="text-slate-900">{selectedAppointment.timeSlot}</span>
                </div>
              </div>

              {selectedAppointment.healthIssue && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-amber-700">
                    Reported Symptoms / Chief Complaint
                  </span>
                  <p className="text-xs font-medium mt-0.5">{selectedAppointment.healthIssue}</p>
                </div>
              )}

              {/* Status Override Actions */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Administrative Status Override
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleStatusOverride(selectedAppointment.id, 'Waiting')}
                    className="py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs cursor-pointer"
                  >
                    Set In Queue
                  </button>
                  <button
                    onClick={() => handleStatusOverride(selectedAppointment.id, 'Completed')}
                    className="py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black text-xs cursor-pointer"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleStatusOverride(selectedAppointment.id, 'Cancelled')}
                    className="py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-black text-xs cursor-pointer"
                  >
                    Cancel Slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Doctor Modal ── */}
      {reassignModalToken && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Reassign Appointment #{reassignModalToken.tokenNumber}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Select a new consulting physician for patient <strong>{reassignModalToken.patientName}</strong>.
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Physician</label>
                <select
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.specialty} ({doc.isAvailable ? 'Available' : 'Unavailable'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalToken(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointmentOverview;
