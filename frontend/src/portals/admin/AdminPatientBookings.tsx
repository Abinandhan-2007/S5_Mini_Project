import React, { useState } from 'react';
import {
  Search,
  Clock,
  Download,
  Building2,
  FileSpreadsheet,
  Stethoscope,
  Smartphone,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminPatientBookingsProps {
  onShowToast: (msg: string) => void;
}

export const AdminPatientBookings: React.FC<AdminPatientBookingsProps> = ({ onShowToast }) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const hospitals = useStaffStore((s) => s.hospitals);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('All');

  const statuses = ['All', 'Pending', 'Completed', 'Cancelled'];

  const getDisplayStatus = (status: string) => {
    if (status === 'Completed') return 'Completed';
    if (status === 'Cancelled' || status === 'Skipped') return 'Cancelled';
    return 'Pending';
  };

  const filteredBookings = tokens.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctorSpecialty.toLowerCase().includes(searchTerm.toLowerCase());

    const itemDisplayStatus = getDisplayStatus(item.status);
    const matchesStatus = statusFilter === 'All' || itemDisplayStatus === statusFilter;
    const matchesDoctor = selectedDoctorFilter === 'All' || item.doctorId === selectedDoctorFilter;

    return matchesSearch && matchesStatus && matchesDoctor;
  });

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'TicketCode,TokenNumber,PatientName,Phone,Doctor,Specialty,TimeSlot,BookingType,Status\n' +
      filteredBookings
        .map(
          (b) =>
            `"${b.ticketNumber}","${b.tokenNumber}","${b.patientName}","${b.patientPhone}","${b.doctorName}","${b.doctorSpecialty}","${b.timeSlot}","${b.type === 'Walk-In' ? 'Offline (Walk-In)' : 'Online App'}","${getDisplayStatus(b.status)}"`
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
            Real-time searchable log of online and offline bookings with status managed via the Receptionist desk.
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

        {/* Status Filter (All, Pending, Completed, Cancelled) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
                <th className="py-3.5 px-4">Booking Type</th>
                <th className="py-3.5 px-5">Status</th>
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
                filteredBookings.map((item) => {
                  const displayStatus = getDisplayStatus(item.status);
                  const isOnline = item.type !== 'Walk-In';

                  return (
                    <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
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
                        <p className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#0B5A54]" />
                          <span>{item.timeSlot}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.date || 'Today'}</p>
                      </td>

                      {/* Booking Type Column: Online or Offline */}
                      <td className="py-3.5 px-4">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200/90 text-xs font-black">
                            <Smartphone className="w-3.5 h-3.5 text-[#0B5A54]" />
                            <span>Online App</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 text-xs font-black">
                            <Building2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Offline (Walk-In)</span>
                          </span>
                        )}
                      </td>

                      {/* Status Column: Pending, Completed, Cancelled */}
                      <td className="py-3.5 px-5">
                        {displayStatus === 'Completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Completed</span>
                          </span>
                        ) : displayStatus === 'Cancelled' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPatientBookings;
