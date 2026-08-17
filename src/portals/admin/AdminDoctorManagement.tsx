import React, { useState } from 'react';
import {
  Search,
  Filter,
  Stethoscope,
  LayoutGrid,
  List,
  Building2,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminDoctorManagementProps {
  onShowToast: (msg: string) => void;
}

export const AdminDoctorManagement: React.FC<AdminDoctorManagementProps> = () => {
  const doctors = useStaffStore((s) => s.doctors);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);

  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Not Available'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const specialtiesList = ['All', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 'General Physician', 'Orthopedic'];

  // Filtered doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'All' || doc.specialty === specialtyFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Available' && doc.isAvailable) ||
      (statusFilter === 'Not Available' && !doc.isAvailable);

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Doctors Directory
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {doctors.length} Registered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time directory of clinical specialists, consultation fees, departments, and hospital branches.
          </p>
        </div>

        {/* Live sync badge: Receptionist controlled */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-[#0B5A54] text-xs font-bold shadow-2xs self-start sm:self-auto">
          <Stethoscope className="w-4 h-4 text-[#0B5A54] shrink-0" />
          <span>Availability Live-Synced with Reception Desk</span>
        </div>
      </div>

      {/* ── Filter Bar & View Mode Toggle ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialty, or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>

        {/* Filter Chips & Specialty Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Specialty Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {specialtiesList.map((spec) => (
                <option key={spec} value={spec}>
                  {spec === 'All' ? 'All Specialties' : spec}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Status Chips */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {(['All', 'Available', 'Not Available'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* View Mode (Table vs Card Grid) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0B5A54] shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#0B5A54] shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Doctor Name</th>
                  <th className="py-3.5 px-4">Hospital Name</th>
                  <th className="py-3.5 px-4">Specialty</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Fee / Duration</th>
                  <th className="py-3.5 px-5">Availability Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      No doctors found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-teal-50/30 transition-colors">
                      {/* Doctor Name */}
                      <td className="py-3.5 px-5">
                        <p className="text-sm font-black text-slate-900 font-heading">
                          {doc.name}
                        </p>
                      </td>

                      {/* Hospital Name Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200/80 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{hospitalSettings.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Main Branch</p>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 font-extrabold text-[11px]">
                          {doc.specialty}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{doc.phone}</p>
                          <p className="text-[11px] text-slate-400">{doc.email}</p>
                        </div>
                      </td>

                      {/* Fee / Duration */}
                      <td className="py-3.5 px-4">
                        <p className="text-[#0B5A54] font-black text-xs">₹{doc.consultationFee}</p>
                        <p className="text-[11px] text-slate-400">30 mins / slot</p>
                      </td>

                      {/* Read-Only Live Availability Indicator */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border select-none ${
                            doc.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              doc.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>{doc.isAvailable ? 'Available' : 'Not Available'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Card Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={doc.photo}
                      alt={doc.name}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 font-heading">{doc.name}</h3>
                      <p className="text-[10px] font-bold text-[#0B5A54]">{hospitalSettings.name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 font-extrabold text-[10px]">
                        {doc.specialty}
                      </span>
                    </div>
                  </div>

                  {/* Read-Only Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border select-none ${
                      doc.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {doc.isAvailable ? '● Available' : '● Off-Duty'}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-semibold space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-black text-[#0B5A54]">₹{doc.consultationFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-bold text-slate-700">{doc.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-bold">{doc.experienceYears}+ Yrs Clinical Exp</span>
                <span className="text-[11px] text-[#0B5A54] font-bold">30 mins/slot</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDoctorManagement;
