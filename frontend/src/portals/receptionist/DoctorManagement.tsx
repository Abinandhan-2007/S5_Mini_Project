import React, { useState } from 'react';
import {
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Phone,
  MapPin,
  Settings,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DoctorRecord, TimeSlotCapacity } from '../../types/receptionist';
import { CreateDoctor } from './CreateDoctor';

interface DoctorManagementProps {
  onShowToast?: (msg: string) => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({ onShowToast }) => {
  const doctors = useStaffStore((s) => s.doctors);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const updateSlotCapacity = useStaffStore((s) => s.updateSlotCapacity);
  const addTimeSlot = useStaffStore((s) => s.addTimeSlot);
  const removeTimeSlot = useStaffStore((s) => s.removeTimeSlot);

  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState<DoctorRecord | null>(null);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [doctorToToggle, setDoctorToToggle] = useState<DoctorRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add custom time slot state
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('09:00 AM');
  const [newSlotMaxSeats, setNewSlotMaxSeats] = useState<number>(6);
  const [isAddingNewSlot, setIsAddingNewSlot] = useState(false);

  const activeDoctorInModal =
    doctors.find((d) => d.id === selectedDoctorForSlots?.id) || selectedDoctorForSlots;

  const handleConfirmToggleAvailability = async () => {
    if (doctorToToggle) {
      await toggleDoctorAvailability(doctorToToggle.id);
      const newState = !doctorToToggle.isAvailable ? 'Available' : 'Unavailable';
      onShowToast?.(`Dr. ${doctorToToggle.name} is now marked as ${newState}.`);
      setDoctorToToggle(null);
    }
  };

  const handleOpenSlotModal = (doctor: DoctorRecord) => {
    setSelectedDoctorForSlots(doctor);
    setIsAddingNewSlot(false);
  };

  const handleUpdateSeatLimit = async (slot: TimeSlotCapacity, delta: number) => {
    if (!activeDoctorInModal) return;
    const updatedSeats = Math.max(slot.bookedSeats, slot.maxSeats + delta);
    await updateSlotCapacity(activeDoctorInModal.id, slot.timeSlot, updatedSeats, slot.isAvailable);
    onShowToast?.(`Seat capacity for ${slot.timeSlot} updated to ${updatedSeats}.`);
  };

  const handleToggleSlotAvailability = async (slot: TimeSlotCapacity) => {
    if (!activeDoctorInModal) return;
    const newAvail = !slot.isAvailable;
    await updateSlotCapacity(activeDoctorInModal.id, slot.timeSlot, slot.maxSeats, newAvail);
    onShowToast?.(`Slot ${slot.timeSlot} marked as ${newAvail ? 'Available' : 'Unavailable'}.`);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (!activeDoctorInModal) return;
    removeTimeSlot(activeDoctorInModal.id, slotId);
    onShowToast?.('Time slot removed.');
  };

  const handleAddNewSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctorInModal) return;

    const formattedSlotString = `${startTime} - ${endTime}`;
    addTimeSlot(activeDoctorInModal.id, formattedSlotString, newSlotMaxSeats);
    setIsAddingNewSlot(false);
    onShowToast?.(`New time slot ${formattedSlotString} added for Dr. ${activeDoctorInModal.name}.`);
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

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddDoctorOpen(true)}
              className="px-5 py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Doctor</span>
            </button>
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
                      src={doctor.photo}
                      alt={doctor.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-900 font-heading truncate">
                        {doctor.name}
                      </h3>
                      <p className="text-xs font-extrabold text-[#0B5A54] truncate">
                        {doctor.specialty} • {doctor.department}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {doctor.experienceYears} Yrs Experience • ₹{doctor.consultationFee} OPD Fee
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDoctorToToggle(doctor)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 ${doctor.isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                  >
                    {doctor.isAvailable ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Available</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Unavailable</span>
                      </>
                    )}
                  </button>
                </div>

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
                  src={activeDoctorInModal.photo}
                  alt={activeDoctorInModal.name}
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

            {/* Simple Slots List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
              {activeDoctorInModal.slotCapacities?.map((slot) => {
                const maxSeats = slot.maxSeats || 6;
                const onlineMax = slot.onlineMaxSeats ?? Math.ceil(maxSeats / 2);
                const offlineMax = slot.offlineMaxSeats ?? Math.floor(maxSeats / 2);
                const isAvail = slot.isAvailable !== false;

                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isAvail ? 'bg-slate-50/70 hover:bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
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
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-slate-900 text-xs w-4 text-center">{maxSeats}</span>
                      <button
                        onClick={() => handleUpdateSeatLimit(slot, 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Right: Active Toggle & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleSlotAvailability(slot)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isAvail ? 'Active' : 'Closed'}
                      </button>

                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Custom Slot Form */}
            {isAddingNewSlot ? (
              <form
                onSubmit={handleAddNewSlotSubmit}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in slide-in-from-top-1"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Time</label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="08:00 AM"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">End Time</label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900"
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
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

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
                    className="px-3.5 py-1 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-lg text-xs cursor-pointer"
                  >
                    Save Slot
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
          4. SAFETY AVAILABILITY TOGGLE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {doctorToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Availability Change?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to set <strong className="text-slate-900 font-extrabold">{doctorToToggle.name}</strong> to{' '}
                <span className={`font-black ${doctorToToggle.isAvailable ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {doctorToToggle.isAvailable ? 'OFF-DUTY (UNAVAILABLE)' : 'ACTIVE (AVAILABLE)'}
                </span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDoctorToToggle(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleAvailability}
                className={`flex-1 py-3 px-4 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer ${doctorToToggle.isAvailable
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#0B5A54] hover:bg-[#084540]'
                  }`}
              >
                Confirm {doctorToToggle.isAvailable ? 'Off-Duty' : 'Available'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Doctor Modal */}
      <CreateDoctor
        isOpen={isAddDoctorOpen}
        onClose={() => setIsAddDoctorOpen(false)}
        onSuccess={() => {
          onShowToast?.('New physician record created successfully!');
        }}
      />
    </div>
  );
};

export default DoctorManagement;
