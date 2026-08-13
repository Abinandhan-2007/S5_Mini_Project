import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  FileText,
  Phone,
  Stethoscope,

  Sparkles,
  CheckCircle2,

  Smartphone,
  UserPlus,
  Calendar,
  X,

} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { NewAppointmentModal } from './NewAppointmentModal';

export const PatientBookings: React.FC = () => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'OFFLINE' | 'ALL'>('ONLINE');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('ALL');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [showOfflineSuccessAlert, setShowOfflineSuccessAlert] = useState(false);

  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    tokens.forEach((t) => datesSet.add(t.date || '13 Aug 2026'));
    return Array.from(datesSet);
  }, [tokens]);

  const availableSlots = useMemo(() => {
    const slotsSet = new Set<string>();
    tokens.forEach((t) => slotsSet.add(t.timeSlot));
    return Array.from(slotsSet).sort();
  }, [tokens]);

  const handleOfflinePatientAdded = () => {
    setActiveTab('OFFLINE');
    setSearchQuery('');
    setSelectedDateFilter('ALL');
    setSelectedSlotFilter('ALL');
    setShowOfflineSuccessAlert(true);
    setTimeout(() => setShowOfflineSuccessAlert(false), 4500);
  };

  // Filter and sort date-time wise
  const filteredBookings = useMemo(() => {
    return tokens
      .filter((item) => {
        // Tab Filter: Online Tokens vs Offline Walk-Ins vs All
        const isOnline = item.type === 'In-Person' || item.type === 'Video Call' || !item.type.includes('Walk-In');
        const matchesTab =
          activeTab === 'ALL' ||
          (activeTab === 'ONLINE' && isOnline) ||
          (activeTab === 'OFFLINE' && !isOnline);

        const matchesDoctor = selectedDoctorFilter === 'ALL' || item.doctorId === selectedDoctorFilter;
        const matchesDate = selectedDateFilter === 'ALL' || (item.date || '13 Aug 2026') === selectedDateFilter;
        const matchesSlot = selectedSlotFilter === 'ALL' || item.timeSlot === selectedSlotFilter;
        const matchesSearch =
          item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.patientPhone.includes(searchQuery);

        return matchesTab && matchesDoctor && matchesDate && matchesSlot && matchesSearch;
      })
      .sort((a, b) => {
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [tokens, activeTab, selectedDoctorFilter, selectedDateFilter, selectedSlotFilter, searchQuery]);



  const onlineTokensCount = tokens.filter(
    (t) => t.type === 'In-Person' || t.type === 'Video Call' || !t.type.includes('Walk-In')
  ).length;
  const offlineTokensCount = tokens.filter((t) => t.type === 'Walk-In').length;

  return (
    <div className="space-y-8 pb-16 text-left max-w-[1600px] mx-auto px-1 sm:px-2">
      {/* EXECUTIVE HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B5A54] via-teal-800 to-[#084540] rounded-3xl p-7 sm:p-8 text-white shadow-xl shadow-teal-950/10 border border-teal-700/50">
        {/* Subtle Background Decorative Blur Shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wider text-teal-100 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Online & Offline Patient Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              Patient Bookings Record
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed">
              Organized date & time-wise schedule for online patient app tokens with full offline walk-in patient registration support.
            </p>
          </div>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-6 py-3.5 bg-white hover:bg-teal-50 text-[#0B5A54] font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <UserPlus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Add Offline Patient (Walk-In)</span>
          </button>

        </div>
      </div>

      {/* FILTER & CATEGORY NAVIGATION TOOLBAR */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
        {/* Main Tab Switcher */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('ONLINE')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 ${activeTab === 'ONLINE'
                  ? 'bg-[#0B5A54] text-white shadow-md shadow-teal-900/10'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
                }`}
            >
              <Smartphone className="w-4 h-4 text-teal-300" />
              <span>Online App Tokens ({onlineTokensCount})</span>
              <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">Date & Time-wise</span>
            </button>

            <button
              onClick={() => setActiveTab('OFFLINE')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 ${activeTab === 'OFFLINE'
                  ? 'bg-[#0B5A54] text-white shadow-md shadow-teal-900/10'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
                }`}
            >
              <UserPlus className="w-4 h-4 text-amber-300" />
              <span>Offline Walk-Ins ({offlineTokensCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 ${activeTab === 'ALL'
                  ? 'bg-[#0B5A54] text-white shadow-md shadow-teal-900/10'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
                }`}
            >
              <FileText className="w-4 h-4 text-blue-300" />
              <span>All Records ({tokens.length})</span>
            </button>
          </div>
        </div>


        {/* Search Bar & Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 text-[#0B5A54] absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search patient name, phone number, or token # (#TOK-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 placeholder:text-slate-400 transition-all shadow-2xs"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Booked Date Filter */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-[#0B5A54]" />
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none text-slate-900 cursor-pointer pr-1"
              >
                <option value="ALL">All Booked Dates</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Time Slot Filter */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-[#0B5A54]" />
              <select
                value={selectedSlotFilter}
                onChange={(e) => setSelectedSlotFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none text-slate-900 cursor-pointer pr-1"
              >
                <option value="ALL">All Time Slots</option>
                {availableSlots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Filter */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700">
              <Stethoscope className="w-4 h-4 text-[#0B5A54]" />
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none text-slate-900 cursor-pointer pr-1"
              >
                <option value="ALL">All Assigned Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>


        </div>
      </div>

      {/* EXECUTIVE PATIENT BOOKINGS DATA TABLE (PROPER SPACING & PREMIUM PADDING) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden text-left">
        {/* Table Subheader Row */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-[#0B5A54]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 font-heading">
                Showing {filteredBookings.length} {activeTab === 'ONLINE' ? 'Online App' : activeTab === 'OFFLINE' ? 'Offline Walk-In' : ''} Patient Bookings
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Complete appointment log & scheduled patient queue
              </p>
            </div>
          </div>
        </div>


        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase text-[#0B5A54]/80 tracking-wider">
                <th className="py-4.5 px-6 sm:px-8">Booked Date</th>
                <th className="py-4.5 px-6">Patient Profile</th>
                <th className="py-4.5 px-6">Assigned Doctor</th>
                <th className="py-4.5 px-6">Scheduled Slot (Time-wise)</th>
                <th className="py-4.5 px-6">Token #</th>
                <th className="py-4.5 px-6 sm:px-8">Booking Source</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 px-6">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54] mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900">No Patient Records Found</h4>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        No {activeTab.toLowerCase()} booking records match your selected date or doctor filter.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedDoctorFilter('ALL');
                            setSelectedDateFilter('ALL');
                            setSelectedSlotFilter('ALL');
                            setActiveTab('ALL');
                          }}

                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Reset Filters
                        </button>
                        <button
                          onClick={() => setIsBookModalOpen(true)}
                          className="px-4 py-2 bg-[#0B5A54] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Add Offline Patient
                        </button>

                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isOnlineToken = b.type === 'In-Person' || b.type === 'Video Call' || !b.type.includes('Walk-In');

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-[#0B5A54]/[0.02] transition-colors group"
                    >
                      {/* Booked Date */}
                      <td className="py-5 px-6 sm:px-8 text-slate-900">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/90 text-[#0B5A54] text-xs font-black shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                          <span>{b.date || '13 Aug 2026'}</span>
                        </div>
                      </td>



                      {/* Patient Profile */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                            {b.patientName.charAt(0)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs sm:text-sm leading-tight">{b.patientName}</span>
                              {b.age && (
                                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  {b.age} yrs
                                </span>
                              )}
                              {b.bloodGroup && (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                                  {b.bloodGroup}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono text-slate-600">{b.patientPhone}</span>
                            </div>
                            {b.healthIssue && (
                              <div className="text-[10.5px] font-medium line-clamp-1 italic bg-amber-50/70 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200/60 mt-1">
                                Issue: {b.healthIssue}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>


                      {/* Doctor & Specialty */}
                      <td className="py-5 px-6 text-slate-700">
                        <div className="font-black text-slate-900 text-xs sm:text-sm leading-tight">{b.doctorName}</div>
                        <span className="inline-block mt-1 text-[10.5px] font-bold text-[#0B5A54] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/80">
                          {b.doctorSpecialty}
                        </span>
                      </td>

                      {/* Time Slot (Ordered Date & Time-wise) */}
                      <td className="py-5 px-6 text-slate-600">
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-800 shadow-2xs">
                          <Clock className="w-4 h-4 text-[#0B5A54]" />
                          <span>{b.timeSlot}</span>
                        </div>
                      </td>

                      {/* Token Number */}
                      <td className="py-5 px-6">
                        <span className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-300/60 text-[#0B5A54] font-mono font-black text-xs shadow-2xs">
                          {b.tokenNumber}
                        </span>
                      </td>

                      {/* Booking Source */}
                      <td className="py-5 px-6 sm:px-8">
                        {isOnlineToken ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200/90 text-[11px] font-bold shadow-2xs">
                            <Smartphone className="w-3.5 h-3.5 text-[#0B5A54]" />
                            <span>Online App Token</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/90 text-[11px] font-bold shadow-2xs">
                            <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                            <span>Offline Walk-In</span>
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


      {/* SUCCESS NOTIFICATION ALERT BANNER */}
      {showOfflineSuccessAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-extrabold">
              Offline Walk-In Patient successfully registered! The record has been added to the screen below.
            </span>
          </div>
          <button
            onClick={() => setShowOfflineSuccessAlert(false)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NEW OFFLINE PATIENT APPOINTMENT MODAL */}
      <NewAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={handleOfflinePatientAdded}
      />
    </div>
  );
};


