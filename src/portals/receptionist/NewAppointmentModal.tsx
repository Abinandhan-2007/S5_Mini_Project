import React, { useState } from 'react';
import { X, User, Phone, Calendar, Clock, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose }) => {
  const doctors = useStaffStore((s) => s.doctors);
  const bookWalkInAppointment = useStaffStore((s) => s.bookWalkInAppointment);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim() || !selectedDoctor) return;

    setIsSubmitting(true);
    await bookWalkInAppointment({
      patientName,
      patientPhone,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpecialty: selectedDoctor.specialty,
      date,
      timeSlot,
    });

    setIsSubmitting(false);
    setSuccessTicket(`#CP-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleReset = () => {
    setSuccessTicket(null);
    setPatientName('');
    setPatientPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200 relative">
        <button
          onClick={handleReset}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {successTicket ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Appointment Booked!</h3>
            <p className="text-sm text-slate-500 mb-6">
              Walk-in appointment ticket <span className="font-mono font-bold text-[#0B5A54]">{successTicket}</span> created successfully and added to the token queue.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-2xl shadow-md transition-all text-xs uppercase tracking-wider"
            >
              Done & Return to Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full">
                Walk-In / Phone Booking
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 font-heading">New Appointment</h2>
              <p className="text-xs text-slate-500">Book instant patient appointment & issue token queue ticket.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Attending Doctor
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 font-semibold appearance-none"
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id} disabled={!doc.isAvailable}>
                      {doc.name} ({doc.specialty}) {!doc.isAvailable ? '- Unavailable' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none"
                  >
                    {selectedDoctor?.slotCapacities?.map((s) => (
                      <option key={s.id} value={s.timeSlot} disabled={!s.isAvailable || s.availableSeats <= 0}>
                        {s.timeSlot} ({s.availableSeats} seats left)
                      </option>
                    )) || <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl shadow-md transition-all text-xs uppercase tracking-wider mt-2"
            >
              {isSubmitting ? 'Booking & Issuing Token...' : 'Confirm Booking & Issue Token'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
