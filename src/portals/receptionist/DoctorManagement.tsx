import React, { useState } from 'react';
import { Stethoscope, CheckCircle, XCircle, Clock, Plus, Phone, Mail, MapPin, Settings, Trash2, PlusCircle, Minus } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DoctorRecord, TimeSlotCapacity } from '../../types/receptionist';
import CreateDoctor from './CreateDoctor';


export const DoctorManagement: React.FC = () => {
  const doctors = useStaffStore((s) => s.doctors);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const updateSlotCapacity = useStaffStore((s) => s.updateSlotCapacity);
  const addTimeSlot = useStaffStore((s) => s.addTimeSlot);
  const removeTimeSlot = useStaffStore((s) => s.removeTimeSlot);

  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState<DoctorRecord | null>(null);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);

  // New Slot Input Form State
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('09:00 AM');
  const [newSlotMaxSeats, setNewSlotMaxSeats] = useState<number>(5);
  const [isAddingNewSlot, setIsAddingNewSlot] = useState(false);

  const activeDoctorInModal = doctors.find((d) => d.id === selectedDoctorForSlots?.id) || selectedDoctorForSlots;

  const handleOpenSlotModal = (doctor: DoctorRecord) => {
    setSelectedDoctorForSlots(doctor);
    setIsAddingNewSlot(false);
  };

  const handleToggleSlotAvailability = async (slot: TimeSlotCapacity) => {
    if (!activeDoctorInModal) return;
    const newAvail = !slot.isAvailable;
    await updateSlotCapacity(activeDoctorInModal.id, slot.timeSlot, slot.maxSeats, newAvail);
  };

  const handleUpdateSeatLimit = async (slot: TimeSlotCapacity, delta: number) => {
    if (!activeDoctorInModal) return;
    const updatedSeats = Math.max(slot.bookedSeats, slot.maxSeats + delta);
    await updateSlotCapacity(activeDoctorInModal.id, slot.timeSlot, updatedSeats, slot.isAvailable);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (!activeDoctorInModal) return;
    removeTimeSlot(activeDoctorInModal.id, slotId);
  };

  const handleAddNewSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctorInModal) return;

    const formattedSlotString = `${startTime} - ${endTime}`;
    addTimeSlot(activeDoctorInModal.id, formattedSlotString, newSlotMaxSeats);
    setIsAddingNewSlot(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-50 rounded-2xl text-[#0B5A54]">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-heading">Doctor Directory & Availability</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage doctor records, toggle active presence, and configure hourly seat limits (10-11 AM, etc.).
          </p>
        </div>

        <button
          onClick={() => setIsAddDoctorOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-2xl shadow-md transition-all text-xs uppercase tracking-wider hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add New Doctor
        </button>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
          >
            {/* Header & Toggle Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={doctor.photo}
                  alt={doctor.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{doctor.name}</h3>
                  <p className="text-xs font-semibold text-[#0B5A54]">{doctor.specialty} • {doctor.department}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{doctor.experienceYears} Years Exp • ₹{doctor.consultationFee} Fee</p>
                </div>
              </div>

              {/* Available / Unavailable Toggle Switch */}
              <button
                onClick={() => toggleDoctorAvailability(doctor.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  doctor.isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {doctor.isAvailable ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Available
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Unavailable
                  </>
                )}
              </button>
            </div>

            {/* Doctor Contact & Location */}
            <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{doctor.roomNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{doctor.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{doctor.email}</span>
              </div>
            </div>

            {/* Slot Seats Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0B5A54]" />
                  Slot & Seat Capacities ({doctor.slotCapacities?.length || 0})
                </span>
                <button
                  onClick={() => handleOpenSlotModal(doctor)}
                  className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage Seats & Slots
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {doctor.slotCapacities?.slice(0, 4).map((slot) => (
                  <span
                    key={slot.id}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                      slot.isAvailable && slot.availableSeats > 0
                        ? 'bg-teal-50/80 text-[#0B5A54] border-teal-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {slot.timeSlot.split(' - ')[0]}: {slot.availableSeats}/{slot.maxSeats} seats
                  </span>
                ))}
                {doctor.slotCapacities?.length > 4 && (
                  <span className="px-2.5 py-1.5 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-500">
                    +{doctor.slotCapacities.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Time Slot & Seat Capacity Management Modal */}
      {activeDoctorInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-7 shadow-2xl border border-slate-200 relative space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setSelectedDoctorForSlots(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Time Slot & Seat Management
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 font-heading">
                {activeDoctorInModal.name} Schedule
              </h2>
              <p className="text-xs text-slate-500">
                Add custom time slots, remove unwanted slots, adjust seat capacities, or toggle availability.
              </p>
            </div>

            {/* Add New Slot Action Bar / Form */}
            {!isAddingNewSlot ? (
              <button
                onClick={() => setIsAddingNewSlot(true)}
                className="w-full py-3 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-[#0B5A54] font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <PlusCircle className="w-4 h-4" />
                Add Custom Time Slot
              </button>
            ) : (
              <form onSubmit={handleAddNewSlotSubmit} className="p-5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#0B5A54]">
                    Add New Time Slot
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSlot(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Time</label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    >
                      {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">End Time</label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    >
                      {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Seats Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={newSlotMaxSeats}
                      onChange={(e) => setNewSlotMaxSeats(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl shadow-xs text-xs uppercase tracking-wider"
                >
                  Save Time Slot
                </button>
              </form>
            )}

            {/* List of Time Slots */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activeDoctorInModal.slotCapacities?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  No time slots configured for this doctor. Click "Add Custom Time Slot" above.
                </div>
              ) : (
                activeDoctorInModal.slotCapacities.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    {/* Time Slot Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#0B5A54]" />
                        <span className="font-bold text-sm text-slate-900">{slot.timeSlot}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Booked: <strong className="text-slate-800">{slot.bookedSeats}</strong></span>
                        <span>•</span>
                        <span>Available Seats: <strong className="text-emerald-600 font-bold">{slot.availableSeats}</strong> / {slot.maxSeats}</span>
                      </div>
                    </div>

                    {/* Seat Limit Controls & Remove Action */}
                    <div className="flex items-center gap-3">
                      {/* Seat Count Increment/Decrement Buttons */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                          onClick={() => handleUpdateSeatLimit(slot, -1)}
                          disabled={slot.maxSeats <= slot.bookedSeats}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-black text-slate-900 font-mono">
                          {slot.maxSeats} seats
                        </span>
                        <button
                          onClick={() => handleUpdateSeatLimit(slot, 1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleSlotAvailability(slot)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          slot.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {slot.isAvailable ? 'Enabled' : 'Disabled'}
                      </button>

                      {/* Delete Time Slot Button */}
                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors border border-rose-200"
                        title="Remove Time Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Done Button */}
            <button
              onClick={() => setSelectedDoctorForSlots(null)}
              className="w-full py-3.5 bg-[#0B5A54] text-white font-bold rounded-2xl shadow-md hover:bg-[#084540] transition-all text-xs uppercase tracking-wider"
            >
              Done & Save Schedule
            </button>
          </div>
        </div>
      )}

      {/* Add New Doctor Modal */}
      <CreateDoctor isOpen={isAddDoctorOpen} onClose={() => setIsAddDoctorOpen(false)} />
    </div>
  );
};

export default DoctorManagement;
