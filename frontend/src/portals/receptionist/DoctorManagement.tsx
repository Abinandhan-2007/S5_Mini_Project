import React, { useState } from 'react';
import {
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Settings,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DoctorRecord, TimeSlotCapacity } from '../../types/receptionist';

interface DoctorManagementProps {
  onShowToast?: (msg: string) => void;
}

const STANDARD_OPD_PRESETS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

const advanceSlotHour = (currentEnd: string) => {
  const match = currentEnd.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { nextStart: '10:00 AM', nextEnd: '11:00 AM' };
  let hour = parseInt(match[1], 10);
  const min = match[2];
  let period = match[3].toUpperCase();

  const nextStart = `${String(hour).padStart(2, '0')}:${min} ${period}`;
  let nextHour = hour + 1;
  let nextPeriod = period;
  if (nextHour === 12) {
    nextPeriod = period === 'AM' ? 'PM' : 'AM';
  } else if (nextHour > 12) {
    nextHour = 1;
  }
  const nextEnd = `${String(nextHour).padStart(2, '0')}:${min} ${nextPeriod}`;
  return { nextStart, nextEnd };
};

export const DoctorManagement: React.FC<DoctorManagementProps> = ({ onShowToast }) => {
  const doctors = useStaffStore((s) => s.doctors);
  const updateSlotCapacity = useStaffStore((s) => s.updateSlotCapacity);
  const addTimeSlot = useStaffStore((s) => s.addTimeSlot);
  const removeTimeSlot = useStaffStore((s) => s.removeTimeSlot);
  const addStandardSlots = useStaffStore((s) => s.addStandardSlots);

  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState<DoctorRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add custom time slot state
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [newSlotMaxSeats, setNewSlotMaxSeats] = useState<number>(6);
  const [isAddingNewSlot, setIsAddingNewSlot] = useState(false);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [isGeneratingStandard, setIsGeneratingStandard] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<{
    doctorId: string;
    doctorName: string;
    slotId: string;
    timeSlot: string;
  } | null>(null);

  const activeDoctorInModal =
    doctors.find((d) => d.id === selectedDoctorForSlots?.id || (selectedDoctorForSlots?.staffCode && (d.staffCode === selectedDoctorForSlots.staffCode || d.staff_code === selectedDoctorForSlots.staffCode))) || selectedDoctorForSlots;

  const handleOpenSlotModal = (doctor: DoctorRecord) => {
    setSelectedDoctorForSlots(doctor);
    setIsAddingNewSlot(false);
    setStartTime('09:00 AM');
    setEndTime('10:00 AM');
    setNewSlotMaxSeats(6);
  };

  const handleUpdateSeatLimit = async (slot: TimeSlotCapacity, delta: number) => {
    if (!activeDoctorInModal) return;
    const updatedSeats = Math.max(slot.bookedSeats || 0, slot.maxSeats + delta);
    const res = await updateSlotCapacity(activeDoctorInModal.id, slot.timeSlot, updatedSeats, slot.isAvailable);
    if (res?.error) {
      onShowToast?.(`Error: ${res.error}`);
    } else {
      onShowToast?.(`Seat capacity for ${slot.timeSlot} updated to ${updatedSeats}.`);
    }
  };

  const handleAddNewSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctorInModal) return;

    const formattedSlotString = `${startTime.trim()} - ${endTime.trim()}`;
    const existingSlots = activeDoctorInModal.slotCapacities || [];
    const alreadyExists = existingSlots.some(
      (s) => s.timeSlot.trim().toLowerCase() === formattedSlotString.toLowerCase()
    );

    if (alreadyExists) {
      onShowToast?.(`⚠️ Slot "${formattedSlotString}" is already configured for this doctor.`);
      return;
    }

    setIsSavingSlot(true);
    try {
      const res = await addTimeSlot(activeDoctorInModal.id, formattedSlotString, newSlotMaxSeats);
      if (res?.error) {
        onShowToast?.(`Error adding slot: ${res.error}`);
      } else {
        onShowToast?.(`✅ Time slot "${formattedSlotString}" added for Dr. ${activeDoctorInModal.name}.`);
        const { nextStart, nextEnd } = advanceSlotHour(endTime);
        setStartTime(nextStart);
        setEndTime(nextEnd);
        setIsAddingNewSlot(false);
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'Failed to add slot');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleGenerateStandardRoster = async () => {
    if (!activeDoctorInModal) return;
    setIsGeneratingStandard(true);
    try {
      const res = await addStandardSlots(activeDoctorInModal.id, 6);
      if (res?.error) {
        onShowToast?.(`Error loading standard slots: ${res.error}`);
      } else {
        onShowToast?.(`✨ Standard 7-shift OPD roster loaded for Dr. ${activeDoctorInModal.name}.`);
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'Failed loading standard roster');
    } finally {
      setIsGeneratingStandard(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. EXECUTIVE HERO BANNER & ACTION BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                Physician Directory & Slot Capacities
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Manage doctor presence, consultation cabins, and 50/50 Online vs Offline seat allocations.
              </p>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="relative max-w-md pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search physician name, specialty, room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. DOCTOR CARDS GRID
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDoctors.map((doctor) => {
          const totalSeats = doctor.slotCapacities?.reduce((acc, s) => acc + s.maxSeats, 0) || 0;
          const bookedSeats = doctor.slotCapacities?.reduce((acc, s) => acc + s.bookedSeats, 0) || 0;

          return (
            <div
              key={doctor.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between space-y-5"
            >
              {/* Header & Toggle */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={doctor.photo || '/doctor_default.jpg'}
                      alt={doctor.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/doctor_default.jpg';
                      }}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 font-heading truncate">
                          {doctor.name}
                        </h3>
                        {(doctor.staff_code || doctor.staffCode) && (
                          <span className="font-mono text-[10px] font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 shadow-2xs">
                            {doctor.staff_code || doctor.staffCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-extrabold text-[#0B5A54] truncate">
                        {doctor.specialty} • {doctor.department}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {doctor.experienceYears} Yrs Experience • ₹{doctor.consultationFee} OPD Fee
                      </p>
                    </div>
                  </div>

                  {/* Read-Only Status Badge (Controlled by Doctor / Admin) */}
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs select-none shrink-0 ${
                      doctor.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                    title={`Duty Status: ${doctor.isAvailable ? 'Available On-Duty' : 'Off-Duty (Set by Doctor/Admin)'}`}
                  >
                    {doctor.isAvailable ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Available</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Off-Duty</span>
                      </>
                    )}
                  </div>
                </div>

                {!doctor.isAvailable && (
                  <div className="p-2.5 bg-rose-50/90 rounded-2xl border border-rose-200/80 text-[11px] text-rose-900 leading-tight">
                    <span className="font-extrabold block">Absence Reason: "{doctor.availabilityReason || 'Temporarily Stepped Out'}"</span>
                    {doctor.unavailableUntil && <span className="text-[10px] text-rose-700 font-semibold">Expected back: {doctor.unavailableUntil}</span>}
                  </div>
                )}

                {doctor.about && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-medium">
                    {doctor.about}
                  </p>
                )}

                {/* Contact & Cabin Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                    <span className="truncate font-semibold">{doctor.roomNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono truncate">{doctor.phone}</span>
                  </div>
                </div>

                {/* Slot Capacity Preview Pill */}
                <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0B5A54]" />
                    <span className="font-bold text-slate-800">
                      {doctor.slotCapacities?.length || 0} Hourly Slots
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-[#0B5A54]">
                    {bookedSeats} / {totalSeats} Seats Booked
                  </span>
                </div>
              </div>

              {/* Card Footer: Manage Slots Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Available Days: {doctor.availableDays?.join(', ') || 'Mon-Fri'}
                </span>

                <button
                  onClick={() => handleOpenSlotModal(doctor)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span>Configure Slots</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. SIMPLE & CLEAN TIME SLOT CAPACITY CONFIGURATION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {activeDoctorInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 text-left animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={activeDoctorInModal.photo || '/doctor_default.jpg'}
                  alt={activeDoctorInModal.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/doctor_default.jpg';
                  }}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    {activeDoctorInModal.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeDoctorInModal.specialty} • {activeDoctorInModal.roomNumber}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoctorForSlots(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Header summary */}
            <div className="flex items-center justify-between gap-2 pt-1 pb-1">
              <span className="text-xs font-bold text-slate-600">
                Consultation Shifts ({activeDoctorInModal.slotCapacities?.length || 0})
              </span>
              <button
                type="button"
                onClick={handleGenerateStandardRoster}
                disabled={isGeneratingStandard}
                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200/80 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Automatically populate standard OPD hours (9 AM to 5 PM)"
              >
                {isGeneratingStandard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isGeneratingStandard ? 'Configuring...' : 'Auto-Fill Standard Roster'}</span>
              </button>
            </div>

            {/* Simple Slots List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {(!activeDoctorInModal.slotCapacities || activeDoctorInModal.slotCapacities.length === 0) ? (
                <div className="py-7 px-4 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center mx-auto shadow-2xs">
                    <Clock className="w-5 h-5 text-[#0B5A54]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 font-heading">No Time Slots Configured</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Dr. {activeDoctorInModal.name} does not have consultation hours set. Auto-fill standard shifts or add custom slots.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateStandardRoster}
                      disabled={isGeneratingStandard}
                      className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingStandard ? 'Loading...' : 'Populate 7 Standard Shifts'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                activeDoctorInModal.slotCapacities.map((slot) => {
                  const maxSeats = slot.maxSeats || 6;
                  const onlineMax = slot.onlineMaxSeats ?? Math.ceil(maxSeats / 2);
                  const offlineMax = slot.offlineMaxSeats ?? Math.floor(maxSeats / 2);
                  return (
                    <div
                      key={slot.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex items-center justify-between gap-3"
                    >
                      {/* Left: Time & 50/50 split */}
                      <div className="space-y-0.5 min-w-[130px]">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#0B5A54]" />
                          <span>{slot.timeSlot}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium">
                          📱 {onlineMax} App • 🚶 {offlineMax} Walk-In
                        </p>
                      </div>

                      {/* Center: Total Seats Stepper */}
                      <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Seats:</span>
                        <button
                          onClick={() => handleUpdateSeatLimit(slot, -1)}
                          disabled={maxSeats <= (slot.bookedSeats || 0)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                          title="Decrease seats"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-slate-900 text-xs w-4 text-center">{maxSeats}</span>
                        <button
                          onClick={() => handleUpdateSeatLimit(slot, 1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                          title="Increase seats"
                        >
                          +
                        </button>
                      </div>

                      {/* Right: Delete */}
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            if (activeDoctorInModal) {
                              setSlotToDelete({
                                doctorId: activeDoctorInModal.id,
                                doctorName: activeDoctorInModal.name,
                                slotId: slot.id,
                                timeSlot: slot.timeSlot,
                              });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Custom Slot Form */}
            {isAddingNewSlot ? (
              <form
                onSubmit={handleAddNewSlotSubmit}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-in slide-in-from-top-1"
              >
                {/* Preset Chips */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Quick Select Preset Shift:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_OPD_PRESETS.map((preset) => {
                      const [pStart, pEnd] = preset.split(' - ');
                      const isSelected = startTime === pStart && endTime === pEnd;
                      const alreadyInRoster = (activeDoctorInModal.slotCapacities || []).some(
                        (s) => s.timeSlot.trim().toLowerCase() === preset.toLowerCase()
                      );

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setStartTime(pStart);
                            setEndTime(pEnd);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#0B5A54] text-white shadow-2xs'
                              : alreadyInRoster
                              ? 'bg-slate-200/80 text-slate-400 cursor-not-allowed opacity-60'
                              : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          {alreadyInRoster && <Check className="w-2.5 h-2.5" />}
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Time</label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">End Time</label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="10:00 AM"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Max Seats</label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={newSlotMaxSeats}
                      onChange={(e) => setNewSlotMaxSeats(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-medium">
                  50/50 Allocation: <strong className="text-slate-700">{Math.ceil(newSlotMaxSeats / 2)} App</strong> seats + <strong className="text-slate-700">{Math.floor(newSlotMaxSeats / 2)} Walk-In</strong> seats.
                </p>

                <div className="flex items-center justify-end gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSlot(false)}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSlot}
                    className="px-3.5 py-1 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-lg text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSavingSlot ? 'Saving...' : 'Save Slot'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingNewSlot(true)}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-dashed border-slate-300"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>+ Add Time Slot</span>
              </button>
            )}

            {/* Modal Close Button */}
            <div className="pt-1">
              <button
                onClick={() => setSelectedDoctorForSlots(null)}
                className="w-full py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ══════════════════════════════════════════════════════════════════
          5. CONFIRM DELETE TIME SLOT WARNING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {slotToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Deleting Time Slot?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove the slot <strong className="text-slate-900 font-extrabold">{slotToDelete.timeSlot}</strong> for <strong className="text-[#0B5A54] font-extrabold">{slotToDelete.doctorName}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/80 p-2.5 rounded-xl border border-rose-200/60">
                ⚠️ This time slot will be removed from future patient appointment booking rosters.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (slotToDelete) {
                    await removeTimeSlot(slotToDelete.doctorId, slotToDelete.slotId);
                    onShowToast?.(`Time slot "${slotToDelete.timeSlot}" removed.`);
                    setSlotToDelete(null);
                  }
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Delete Slot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorManagement;
