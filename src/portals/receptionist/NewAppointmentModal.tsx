import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  Droplet,
  MapPin,
  Activity,
  UserPlus,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const doctors = useStaffStore((s) => s.doctors);
  const bookWalkInAppointment = useStaffStore((s) => s.bookWalkInAppointment);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [age, setAge] = useState<number | ''>(32);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [healthIssue, setHealthIssue] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{
    ticketNumber: string;
    tokenNumber: string;
    patientName: string;
    doctorName: string;
    doctorSpecialty: string;
    roomNumber: string;
    timeSlot: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim() || !selectedDoctor) return;

    setIsSubmitting(true);
    const generatedTicket = `#CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedToken = `#TOK-00${Math.floor(1 + Math.random() * 9)}`;

    await bookWalkInAppointment({
      patientName,
      patientPhone,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpecialty: selectedDoctor.specialty,
      date,
      timeSlot,
      age: Number(age) || undefined,
      bloodGroup,
      address,
      healthIssue,
    });

    setIsSubmitting(false);
    setCreatedTicket({
      ticketNumber: generatedTicket,
      tokenNumber: generatedToken,
      patientName,
      doctorName: selectedDoctor.name,
      doctorSpecialty: selectedDoctor.specialty,
      roomNumber: selectedDoctor.roomNumber || 'Cabin 101',
      timeSlot,
    });
    onSuccess?.();
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setPatientName('');
    setPatientPhone('');
    setAge(32);
    setBloodGroup('O+');
    setAddress('');
    setHealthIssue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200 text-left">
        {/* HEADER BANNER */}
        <div className="relative bg-gradient-to-r from-[#0B5A54] via-teal-800 to-[#084540] text-white p-6 sm:p-8 flex items-center justify-between border-b border-teal-700">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-extrabold tracking-wider text-teal-100 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Full-Screen Patient Onboarding</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              Add New Offline Patient Registration
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium">
              Complete patient intake details, medical symptoms, blood profile, and assign attending doctor.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdTicket ? (
          /* SUCCESS TICKET ISSUED SCREEN */
          <div className="p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Walk-In Registration Completed
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 font-heading">
                Patient Token Issued Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Offline patient <span className="font-extrabold text-slate-900">{createdTicket.patientName}</span> has been added to the live OPD Queue.
              </p>
            </div>

            {/* Ticket Preview Card */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4 text-left shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Queue Token #</span>
                  <div className="text-3xl font-black font-mono text-[#0B5A54]">{createdTicket.tokenNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400">Ticket Reference</span>
                  <div className="text-sm font-black font-mono text-slate-800">{createdTicket.ticketNumber}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Assigned Doctor:</span>
                  <div className="font-extrabold text-slate-900 mt-0.5">{createdTicket.doctorName}</div>
                  <div className="text-[11px] text-[#0B5A54] font-semibold">{createdTicket.doctorSpecialty}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Cabin Location:</span>
                  <div className="font-extrabold text-slate-900 mt-0.5">{createdTicket.roomNumber}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">{createdTicket.timeSlot}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Token Ticket</span>
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-3.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Done & Return to Bookings Record
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM (CLEAN 2-COLUMN FULL-SCREEN LAYOUT) */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT COLUMN: PATIENT PERSONAL DETAILS */}
              <div className="space-y-5 bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-heading">
                      1. Patient Identification & Demographics
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Personal contact info and blood profile</p>
                  </div>
                </div>

                {/* Patient Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Johnathan Doe"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                    />
                  </div>
                </div>

                {/* Age & Blood Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Age (Years) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        placeholder="e.g. 34"
                        value={age}
                        onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Blood Group</label>
                    <div className="relative">
                      <Droplet className="w-4 h-4 text-rose-500 absolute left-3.5 top-3.5" />
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none cursor-pointer"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>
                            Blood Group {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Flat 4B, Emerald Heights, MG Road, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CLINICAL INTAKE & DOCTOR ASSIGNMENT */}
              <div className="space-y-5 bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-heading">
                      2. Clinical Intake & Doctor Assignment
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Health issue description and doctor queue slot</p>
                  </div>
                </div>

                {/* Health Issue / Chief Complaint */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chief Health Issue / Symptoms
                  </label>
                  <div className="relative">
                    <Activity className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5" />
                    <textarea
                      rows={3}
                      placeholder="Describe primary symptoms, pain duration, or consultation reason (e.g. Chest tightness, hypertension checkup)..."
                      value={healthIssue}
                      onChange={(e) => setHealthIssue(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 resize-none"
                    />
                  </div>
                </div>

                {/* Assign Doctor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assign Doctor <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-[#0B5A54] absolute left-3.5 top-3.5" />
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none cursor-pointer"
                    >
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id} disabled={!doc.isAvailable}>
                          {doc.name} ({doc.specialty} - {doc.roomNumber}) {!doc.isAvailable ? '- Unavailable' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Appointment Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Time Slot</label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none cursor-pointer"
                      >
                        {selectedDoctor?.slotCapacities?.map((s) => {
                          const offlineAvail = s.offlineAvailableSeats ?? Math.floor(s.availableSeats / 2);
                          const offlineMax = s.offlineMaxSeats ?? Math.floor(s.maxSeats / 2);
                          return (
                            <option key={s.id} value={s.timeSlot} disabled={!s.isAvailable || offlineAvail <= 0}>
                              {s.timeSlot} ({offlineAvail}/{offlineMax} offline seats available)
                            </option>
                          );
                        }) || <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>}

                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM FOOTER ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-[#0B5A54] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering Patient & Issuing Token...' : 'Confirm Registration & Issue Token'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
