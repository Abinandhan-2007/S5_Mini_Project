import React, { useState } from 'react';
import {
  Sliders,
  Search,
  X,
  Building2,
  Calendar,
  Stethoscope,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TimeSlotCapacity, DoctorRecord } from '../../types/receptionist';

interface AdminTokenSlotMgmtProps {
  onShowToast: (msg: string) => void;
}

export const AdminTokenSlotMgmt: React.FC<AdminTokenSlotMgmtProps> = ({ onShowToast }) => {
  const doctors = useStaffStore((s) => s.doctors);
  const hospitals = useStaffStore((s) => s.hospitals);
  const globalSlotOverride = useStaffStore((s) => s.globalSlotOverride);

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-17');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal override state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlotCapacity | null>(null);
  const [newMaxSeats, setNewMaxSeats] = useState(6);
  const [newIsAvailable, setNewIsAvailable] = useState(true);

  // Compute Total Metrics
  let totalHospitalSeats = 0;
  let totalBookedSeats = 0;
  let totalPeakSlotsCount = 0;

  doctors.forEach((doc) => {
    doc.slotCapacities.forEach((slot) => {
      totalHospitalSeats += slot.maxSeats;
      totalBookedSeats += slot.bookedSeats;
      if (slot.bookedSeats / slot.maxSeats >= 0.8) {
        totalPeakSlotsCount++;
      }
    });
  });

  const overallOccupancy = totalHospitalSeats > 0 ? Math.round((totalBookedSeats / totalHospitalSeats) * 100) : 0;

  const handleOpenOverride = (doc: DoctorRecord, slot: TimeSlotCapacity) => {
    setEditingDoctor(doc);
    setEditingSlot(slot);
    setNewMaxSeats(slot.maxSeats);
    setNewIsAvailable(slot.isAvailable);
    setIsOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor || !editingSlot) return;

    await globalSlotOverride(editingDoctor.id, editingSlot.id, newMaxSeats, newIsAvailable);
    setIsOverrideModalOpen(false);
    onShowToast(`Capacity for ${editingDoctor.name} (${editingSlot.timeSlot}) set to ${newMaxSeats} seats.`);
  };

  const displayedDoctors = doctors.filter((doc) => {
    const matchesDoc = selectedDoctorId === 'all' || doc.id === selectedDoctorId;
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDoc && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Token & Slot Capacity Matrix
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              Global Hospital View
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Centrally control doctor slot allocations, 50/50 online-offline distribution, and heat-indexed seat saturation.
          </p>
        </div>

        {/* Global Summary Capsule */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Capacity</p>
            <p className="text-sm font-black text-slate-900">{totalHospitalSeats} Seats</p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Occupancy</p>
            <p className="text-sm font-black text-[#0B5A54]">{totalBookedSeats} ({overallOccupancy}%)</p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[10px] text-amber-700 uppercase font-bold">Peak High Load</p>
            <p className="text-sm font-black text-amber-800">{totalPeakSlotsCount} Slots</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar: Hospital, Doctor, Date, Search ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctors by name or specialty..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>

        {/* Hospital Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All Hospital Locations</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Doctor Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
          </input>
        </div>
      </div>

      {/* ── Overview Grid: Hospital → Doctor → Time Slots → Available/Booked ── */}
      <div className="space-y-6">
        {displayedDoctors.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4"
          >
            {/* Hierarchy Header: Hospital Branch & Doctor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={doc.photo}
                  alt={doc.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 font-heading">{doc.name}</h3>
                    <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {doc.specialty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    CarePulse Metro Central Hospital • {doc.roomNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className={`px-2.5 py-0.5 rounded-full ${doc.isAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                  {doc.isAvailable ? '● Consultation Active' : '● Off-Duty'}
                </span>
              </div>
            </div>

            {/* Time Slot Heat Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {doc.slotCapacities.map((slot) => {
                const occupancyRate = slot.maxSeats > 0 ? Math.round((slot.bookedSeats / slot.maxSeats) * 100) : 0;
                const isHighDemand = occupancyRate >= 80;
                const isModerate = occupancyRate >= 50 && occupancyRate < 80;

                // Visual heat indicator color styling
                const heatCardStyle = !slot.isAvailable
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : isHighDemand
                    ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
                    : isModerate
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-teal-50/40 border-teal-200/80 hover:shadow-xs';

                const heatBarColor = isHighDemand ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-[#0B5A54]';

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleOpenOverride(doc, slot)}
                    className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between space-y-2.5 cursor-pointer hover:shadow-md active:scale-98 ${heatCardStyle}`}
                    title="Click slot to configure capacity"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 font-heading">
                          {slot.timeSlot}
                        </span>
                        {isHighDemand ? (
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-200/70 px-1.5 py-0.5 rounded">
                            {occupancyRate}% Full
                          </span>
                        ) : isModerate ? (
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-200/70 px-1.5 py-0.5 rounded">
                            {occupancyRate}% Load
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-wider text-teal-800 bg-teal-200/60 px-1.5 py-0.5 rounded">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Seats breakdown */}
                      <div className="mt-2 text-xs space-y-1 font-bold">
                        <div className="flex justify-between text-slate-800">
                          <span>Total Seats:</span>
                          <span className="font-black">{slot.bookedSeats} / {slot.maxSeats}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Online / Walk-In:</span>
                          <span>{slot.onlineBookedSeats}/{slot.onlineMaxSeats} • {slot.offlineBookedSeats}/{slot.offlineMaxSeats}</span>
                        </div>
                      </div>

                      {/* Heat Bar */}
                      <div className="mt-2.5 w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${occupancyRate}%` }}
                          className={`h-full rounded-full ${heatBarColor}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: CAPACITY OVERRIDE
      ══════════════════════════════════════════════════════════════════ */}
      {isOverrideModalOpen && editingDoctor && editingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B5A54]">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Override Slot Capacity
                </h3>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-xs font-black text-slate-900">{editingDoctor.name}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {editingDoctor.specialty} • Slot: <strong className="text-[#0B5A54]">{editingSlot.timeSlot}</strong>
              </p>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5">Maximum Total Seats</label>
                <input
                  type="number"
                  min={editingSlot.bookedSeats}
                  max={25}
                  required
                  value={newMaxSeats}
                  onChange={(e) => setNewMaxSeats(parseInt(e.target.value) || editingSlot.bookedSeats)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Automatic 50/50 balance will allocate {Math.ceil(newMaxSeats / 2)} online & {Math.floor(newMaxSeats / 2)} walk-in tokens.
                </p>
              </div>

              <div>
                <label className="block mb-1.5">Slot Status</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewIsAvailable(true)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${newIsAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                  >
                    Open / Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsAvailable(false)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${!newIsAvailable
                        ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                  >
                    Blocked / Closed
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Apply Capacity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTokenSlotMgmt;
