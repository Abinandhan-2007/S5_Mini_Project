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
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Helper: Local date in YYYY-MM-DD
const getTodayLocalIso = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Check if date string matches today's local date
const isDateToday = (targetDate: string): boolean => {
  if (!targetDate) return true;
  return targetDate === getTodayLocalIso();
};

// Helper: Parse time string (e.g. "10:00 AM", "01:30 PM", "14:00") into minutes from midnight
const parseTimeToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // Match "10:00 AM" or "01:30 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match "14:00" or "09:30"
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hours = parseInt(m24[1], 10);
    const minutes = parseInt(m24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
};

// Helper: Extract end time from slot string (e.g. "09:00 AM - 10:00 AM" -> "10:00 AM")
const extractSlotEndTime = (slotString: string): string => {
  if (!slotString) return '';
  if (slotString.includes('-')) {
    return slotString.split('-')[1].trim();
  }
  return slotString.trim();
};

// Helper: Check if slot has already passed for today
const isSlotPassedToday = (slotString: string, targetDate: string): boolean => {
  if (!isDateToday(targetDate)) return false;
  const endTimeStr = extractSlotEndTime(slotString);
  const endMinutes = parseTimeToMinutes(endTimeStr);
  if (endMinutes === null) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= endMinutes;
};

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const doctors = useStaffStore((s) => s.doctors);
  const bookWalkInAppointment = useStaffStore((s) => s.bookWalkInAppointment);
  const addStandardSlots = useStaffStore((s) => s.addStandardSlots);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [age, setAge] = useState<number | ''>(32);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [healthIssue, setHealthIssue] = useState('');
  const [date, setDate] = useState(getTodayLocalIso());
  const [timeSlot, setTimeSlot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingQuickSlots, setIsAddingQuickSlots] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Default to first available doctor if one exists
  const initialDoctor = doctors.find((d) => d.isAvailable !== false && d.is_available !== false) || doctors[0];
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctor?.id || '');

  const [createdTicket, setCreatedTicket] = useState<{
    ticketNumber: string;
    tokenNumber: string;
    patientName: string;
    doctorName: string;
    doctorSpecialty: string;
    roomNumber: string;
    timeSlot: string;
  } | null>(null);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Auto-switch to an available doctor when modal opens or date updates if currently selected is unavailable today
  React.useEffect(() => {
    if (isOpen && doctors.length > 0) {
      const currentDoc = doctors.find((d) => d.id === selectedDoctorId);
      const isCurDocAvail = currentDoc ? (currentDoc.isAvailable !== false && currentDoc.is_available !== false) : false;
      if (!selectedDoctorId || (!isCurDocAvail && isDateToday(date))) {
        const firstAvail = doctors.find((d) => d.isAvailable !== false && d.is_available !== false);
        if (firstAvail && firstAvail.id !== selectedDoctorId) {
          setSelectedDoctorId(firstAvail.id);
        } else if (!selectedDoctorId) {
          setSelectedDoctorId(doctors[0].id);
        }
      }
    }
  }, [isOpen, doctors, date]);

  // Derived doctor availability
  const isDoctorAvailable = selectedDoctor ? (selectedDoctor.isAvailable !== false && selectedDoctor.is_available !== false) : true;
  const isDoctorUnavailableToday = isDateToday(date) && !isDoctorAvailable;
  const doctorUnavailableReason = selectedDoctor?.availabilityReason || selectedDoctor?.availability_reason || 'Lunch / Clinical Break';

  // Selected slot passed check
  const isSelectedSlotPassed = Boolean(timeSlot && isSlotPassedToday(timeSlot, date));

  // Auto-selection of valid time slot
  React.useEffect(() => {
    setFormError(null);
    if (selectedDoctor?.slotCapacities && selectedDoctor.slotCapacities.length > 0) {
      // Find the first slot that is available, not passed today, and has offline seats
      const validSlot = selectedDoctor.slotCapacities.find((s) => {
        const offlineAvail = s.offlineAvailableSeats ?? Math.floor((s.availableSeats ?? 1) / 2);
        return s.isAvailable !== false && !isSlotPassedToday(s.timeSlot, date) && offlineAvail > 0;
      });

      if (validSlot) {
        setTimeSlot(validSlot.timeSlot);
      } else {
        // Check if currently selected timeSlot is still valid
        const stillValid = selectedDoctor.slotCapacities.find(
          (s) => s.timeSlot === timeSlot && s.isAvailable !== false && !isSlotPassedToday(s.timeSlot, date)
        );
        if (!stillValid) {
          setTimeSlot('');
        }
      }
    } else {
      setTimeSlot('');
    }
  }, [selectedDoctorId, selectedDoctor, date]);

  const handleQuickAddStandardSlots = async () => {
    if (!selectedDoctor) return;
    setIsAddingQuickSlots(true);
    setFormError(null);
    try {
      const res = await addStandardSlots(selectedDoctor.id, 6);
      if (res?.doctor?.slotCapacities && res.doctor.slotCapacities.length > 0) {
        const firstValid = res.doctor.slotCapacities.find((s: any) => !isSlotPassedToday(s.timeSlot, date));
        setTimeSlot(firstValid ? firstValid.timeSlot : '');
      } else {
        setTimeSlot('09:00 AM - 10:00 AM');
      }
    } catch (e) {
      console.warn('Failed to quick add standard slots', e);
    } finally {
      setIsAddingQuickSlots(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!patientName.trim() || !patientPhone.trim() || !selectedDoctor || !timeSlot) return;

    if (isDoctorUnavailableToday) {
      setFormError(`Dr. ${selectedDoctor.name} is currently marked NOT AVAILABLE (${doctorUnavailableReason}). Offline walk-in tokens cannot be booked for today.`);
      return;
    }

    if (isSelectedSlotPassed) {
      setFormError(`The time slot "${timeSlot}" has already passed for today. Please select an active or upcoming time slot.`);
      return;
    }

    setIsSubmitting(true);
    const fallbackTicket = `#CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const fallbackToken = `#TOK-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const created = await bookWalkInAppointment({
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
        hospitalId: selectedDoctor.hospitalId || selectedDoctor.hospital_id,
        hospitalName: selectedDoctor.hospitalName || selectedDoctor.hospital_name,
      });

      setCreatedTicket({
        ticketNumber: created?.ticketNumber || fallbackTicket,
        tokenNumber: created?.tokenNumber || fallbackToken,
        patientName,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        roomNumber: selectedDoctor.roomNumber || 'Cabin 101',
        timeSlot,
      });
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to complete walk-in registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setFormError(null);
    setPatientName('');
    setPatientPhone('');
    setAge(32);
    setBloodGroup('O+');
    setAddress('');
    setHealthIssue('');
    setDate(getTodayLocalIso());
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
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-h-[85vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
              {/* LEFT COLUMN: PATIENT PERSONAL DETAILS */}
              <div className="space-y-4 sm:space-y-5 bg-slate-50/70 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading">
                      1. Patient Identification & Demographics
                    </h3>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 font-medium">Personal contact info and blood profile</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 font-mono"
                    />
                  </div>
                </div>

                {/* Physical Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Street, locality, area..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CLINICAL TRIAGE & SCHEDULING */}
              <div className="space-y-4 sm:space-y-5 bg-slate-50/70 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54] shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading">
                      2. Clinical Assignment & Slot Timing
                    </h3>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 font-medium">Select physician, room, and queue window</p>
                  </div>
                </div>

                {/* Chief Health Complaint */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chief Health Complaint / Symptoms <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Activity className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Severe chest pain, seasonal fever, migraine..."
                      value={healthIssue}
                      onChange={(e) => setHealthIssue(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                    />
                  </div>
                </div>

                {/* Doctor Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Assign Attending Physician <span className="text-rose-500">*</span>
                    </label>
                    {isDoctorUnavailableToday && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase">
                        Unavailable Today
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-white border ${
                        isDoctorUnavailableToday ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                      } rounded-2xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none cursor-pointer`}
                    >
                      {doctors.map((doc) => {
                        const isAvail = doc.isAvailable !== false && doc.is_available !== false;
                        const reason = doc.availabilityReason || doc.availability_reason;
                        return (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} ({doc.specialty} - {doc.roomNumber || 'Cabin 101'}) {!isAvail ? `⛔ [Not Available: ${reason || 'Away'}]` : '🟢 [Available]'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* PROMINENT UNAVAILABILITY BANNER */}
                  {isDoctorUnavailableToday && (
                    <div className="mt-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-2.5 text-rose-900 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <div className="font-black text-rose-950 flex items-center gap-1.5 flex-wrap">
                          <span>Dr. {selectedDoctor?.name} is Not Available Today</span>
                          <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Offline Booking Blocked
                          </span>
                        </div>
                        <p className="text-rose-700 text-[11px] leading-relaxed">
                          Reason: <strong>"{doctorUnavailableReason}"</strong>.
                          Walk-in tokens cannot be issued for today while the physician is marked not available. Please select an available physician or choose a future appointment date.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Appointment Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="date"
                        min={getTodayLocalIso()}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Time Slot</label>
                      {isSelectedSlotPassed && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                          Slot Ended
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className={`w-full pl-10 pr-3 py-3 bg-white border ${
                          isSelectedSlotPassed ? 'border-amber-300 ring-1 ring-amber-300' : 'border-slate-200'
                        } rounded-2xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 appearance-none cursor-pointer`}
                      >
                        {(!selectedDoctor?.slotCapacities || selectedDoctor.slotCapacities.length === 0) ? (
                          <option value="" disabled>No time slots configured</option>
                        ) : (
                          <>
                            {!timeSlot && (
                              <option value="" disabled>-- Select an upcoming slot --</option>
                            )}
                            {selectedDoctor.slotCapacities.map((s) => {
                              const offlineAvail = s.offlineAvailableSeats ?? Math.floor((s.availableSeats ?? 1) / 2);
                              const offlineMax = s.offlineMaxSeats ?? Math.floor((s.maxSeats ?? 1) / 2);
                              const hasPassed = isSlotPassedToday(s.timeSlot, date);
                              const isSlotFull = offlineAvail <= 0;
                              const isConfigUnavailable = s.isAvailable === false;
                              const isDisabled = hasPassed || isSlotFull || isConfigUnavailable;

                              let statusSuffix = '';
                              if (hasPassed) {
                                statusSuffix = ' ⛔ [Slot Ended]';
                              } else if (isConfigUnavailable) {
                                statusSuffix = ' ⛔ [Unavailable]';
                              } else if (isSlotFull) {
                                statusSuffix = ` ⚠️ [Full (0/${offlineMax})]`;
                              } else {
                                statusSuffix = ` (${offlineAvail}/${offlineMax} offline seats)`;
                              }

                              return (
                                <option key={s.id || s.timeSlot} value={s.timeSlot} disabled={isDisabled}>
                                  {s.timeSlot}{statusSuffix}
                                </option>
                              );
                            })}
                          </>
                        )}
                      </select>
                    </div>

                    {isDateToday(date) && selectedDoctor?.slotCapacities && selectedDoctor.slotCapacities.length > 0 && selectedDoctor.slotCapacities.every((s) => isSlotPassedToday(s.timeSlot, date)) && (
                      <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>All consultation slots for today have ended. Please choose a future appointment date.</span>
                      </div>
                    )}

                    {(!selectedDoctor?.slotCapacities || selectedDoctor.slotCapacities.length === 0) && (
                      <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2 text-left animate-in fade-in">
                        <div className="text-[11px] text-amber-900 leading-tight">
                          <span className="font-bold block">No consultation hours set.</span>
                          <span className="text-amber-700 text-[10px]">Unblock booking by loading standard shifts.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleQuickAddStandardSlots}
                          disabled={isAddingQuickSlots}
                          className="px-2.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-lg text-[10.5px] shrink-0 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isAddingQuickSlots ? 'Adding...' : '+ Quick Add Slots'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-2.5 text-rose-900 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

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
                disabled={isSubmitting || !timeSlot || isDoctorUnavailableToday || isSelectedSlotPassed}
                className="px-8 py-3.5 bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-[#0B5A54] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Registering Patient & Issuing Token...'
                    : isDoctorUnavailableToday
                    ? '⛔ Attending Physician Unavailable Today'
                    : isSelectedSlotPassed
                    ? '⛔ Selected Slot Has Ended'
                    : !timeSlot
                    ? 'Select a Valid Time Slot'
                    : 'Confirm Registration & Issue Token'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
