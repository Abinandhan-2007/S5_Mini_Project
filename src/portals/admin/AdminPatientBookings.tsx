import React, { useState } from 'react';
import {
  Search,
  Clock,
  User,
  X,
  Stethoscope,
  Eye,
  Printer,
  Download,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem, TokenStatus } from '../../types/receptionist';

interface AdminPatientBookingsProps {
  onShowToast: (msg: string) => void;
}

export const AdminPatientBookings: React.FC<AdminPatientBookingsProps> = ({ onShowToast }) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const hospitals = useStaffStore((s) => s.hospitals);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('All');

  // Detail drawer state
  const [selectedBooking, setSelectedBooking] = useState<TokenQueueItem | null>(null);

  const statuses = ['All', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'];

  const filteredBookings = tokens.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctorSpecialty.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesDoctor = selectedDoctorFilter === 'All' || item.doctorId === selectedDoctorFilter;

    return matchesSearch && matchesStatus && matchesDoctor;
  });

  const getStatusBadge = (status: TokenStatus) => {
    switch (status) {
      case 'In Consultation':
        return 'bg-teal-50 text-[#0B5A54] border-teal-200';
      case 'Waiting':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Cancelled':
      case 'Skipped':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleStatusChange = async (tokenId: string, newStatus: TokenStatus) => {
    await updateTokenStatus(tokenId, newStatus);
    if (selectedBooking && selectedBooking.id === tokenId) {
      setSelectedBooking({ ...selectedBooking, status: newStatus });
    }
    onShowToast(`Booking status updated to ${newStatus}`);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'TicketCode,PatientName,Phone,Doctor,Specialty,TimeSlot,Type,Status\n' +
      filteredBookings
        .map(
          (b) =>
            `"${b.ticketNumber}","${b.patientName}","${b.patientPhone}","${b.doctorName}","${b.doctorSpecialty}","${b.timeSlot}","${b.type}","${b.status}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'carepulse_patient_bookings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV Patient Bookings exported successfully!');
  };

  const handleExportPDF = () => {
    onShowToast('Generating and downloading Patient Booking Records PDF...');
  };

  const handlePrintSlip = (ticketNumber: string) => {
    onShowToast(`Printing appointment token slip for ${ticketNumber}...`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Patient Booking Records
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {tokens.length} Active Records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Searchable log of all hospital appointments, ticket codes, clinical consults, and token timestamps.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ticket code (e.g. #CP-4821), patient name, phone, or doctor..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>

        {/* Hospital Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedHospitalFilter}
            onChange={(e) => setSelectedHospitalFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="All">All Hospital Branches</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Doctor Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="All">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bookings Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Ticket & Token</th>
                <th className="py-3.5 px-4">Patient Information</th>
                <th className="py-3.5 px-4">Doctor & Hospital</th>
                <th className="py-3.5 px-4">Date & Time Slot</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No booking records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedBooking(item)}
                    className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Ticket & Token */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{item.ticketNumber}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.tokenNumber}
                        </span>
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{item.patientName}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{item.patientPhone}</p>
                      </div>
                    </td>

                    {/* Doctor & Hospital */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-800">{item.doctorName}</p>
                        <p className="text-[11px] text-[#0B5A54] font-extrabold">CarePulse Metro Hospital</p>
                      </div>
                    </td>

                    {/* Slot & Date */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0B5A54]" />
                          <span>{item.timeSlot}</span>
                        </p>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          item.type === 'Walk-In' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-[#0B5A54]'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getStatusBadge(item.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{item.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#0B5A54] hover:text-white text-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PATIENT DETAIL SLIDE-OUT DRAWER
      ══════════════════════════════════════════════════════════════════ */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-10 duration-200">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Booking Record Drawer
                  </span>
                  <h3 className="text-xl font-black text-slate-900 font-heading">
                    {selectedBooking.ticketNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Selector */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Appointment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Waiting', 'In Consultation', 'Completed', 'Cancelled'] as TokenStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, st)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        selectedBooking.status === st
                          ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Card */}
              <div className="space-y-3 p-4 rounded-2xl bg-teal-50/50 border border-teal-200/60">
                <div className="flex items-center gap-2 text-[#0B5A54]">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-extrabold uppercase tracking-wide">Patient Information</span>
                </div>
                <div className="text-xs space-y-1.5 font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Full Name:</span>
                    <span className="font-black text-slate-900">{selectedBooking.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Phone:</span>
                    <span className="font-bold text-[#0B5A54]">{selectedBooking.patientPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Token Number:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedBooking.tokenNumber}</span>
                  </div>
                  {selectedBooking.bloodGroup && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-normal">Blood Group:</span>
                      <span className="font-bold text-rose-600">{selectedBooking.bloodGroup}</span>
                    </div>
                  )}
                  {selectedBooking.healthIssue && (
                    <div className="pt-2 border-t border-teal-100">
                      <p className="text-slate-400 font-normal text-[11px]">Reported Symptoms & Notes:</p>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedBooking.healthIssue}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Card */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <Stethoscope className="w-4 h-4 text-[#0B5A54]" />
                  <span className="text-xs font-extrabold uppercase tracking-wide">Doctor & Facility</span>
                </div>
                <div className="text-xs space-y-1.5 font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Attending Doctor:</span>
                    <span className="font-black text-slate-900">{selectedBooking.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Specialty:</span>
                    <span className="font-bold text-[#0B5A54]">{selectedBooking.doctorSpecialty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Time Slot:</span>
                    <span className="font-bold text-slate-900">{selectedBooking.timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-normal">Hospital Location:</span>
                    <span className="font-bold text-slate-800">CarePulse Metro Central</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={() => handlePrintSlip(selectedBooking.ticketNumber)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="py-3 px-5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatientBookings;
