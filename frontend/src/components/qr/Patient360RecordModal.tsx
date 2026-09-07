import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Pill,
  HeartPulse,
  Activity,
  Building2,
  Stethoscope,
  ChevronRight,
  Plus,
  Sparkles,
  ClipboardList,
  Flame,
  Globe,
  Droplet,
  Thermometer,
  Scale,
  Gauge,
  UserCheck,
} from 'lucide-react';

export interface Patient360RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Result from /api/staff/patient-qr-lookup
  portalRole?: 'receptionist' | 'doctor' | 'nurse' | 'admin' | 'staff';
  onCheckInPatient?: (patient: any, appointment?: any) => void;
  onStartConsultation?: (patient: any) => void;
  onRecordVitals?: (patient: any) => void;
  onNewAppointment?: (patient: any) => void;
}

export const Patient360RecordModal: React.FC<Patient360RecordModalProps> = ({
  isOpen,
  onClose,
  data,
  portalRole = 'staff',
  onCheckInPatient,
  onStartConsultation,
  onRecordVitals,
  onNewAppointment,
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'visits' | 'prescriptions' | 'vitals'>('appointments');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<'current' | 'all' | string>('current');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  if (!isOpen || !data || !data.patient) return null;

  const { patient, scannedHospital, currentHospitalRecords, otherHospitalsRecords, allRecords, summary, activeToken } = data;

  // Determine which records to display based on selectedHospitalFilter
  const isCurrentHospitalOnly = selectedHospitalFilter === 'current';
  const isAllHospitals = selectedHospitalFilter === 'all';

  let displayedActiveAppointments = [];
  let displayedPastAppointments = [];
  let displayedVisits = [];
  let displayedActiveRx = [];
  let displayedPreviousRx = [];
  let displayedVitals = currentHospitalRecords?.latestVitals || allRecords?.latestVitals;
  let displayedLabTests = currentHospitalRecords?.labTests || allRecords?.labTests || [];

  if (isCurrentHospitalOnly) {
    displayedActiveAppointments = currentHospitalRecords?.activeAppointments || [];
    displayedPastAppointments = currentHospitalRecords?.pastAppointments || [];
    displayedVisits = currentHospitalRecords?.visits || [];
    displayedActiveRx = currentHospitalRecords?.activePrescriptions || [];
    displayedPreviousRx = currentHospitalRecords?.previousPrescriptions || [];
  } else if (isAllHospitals) {
    displayedActiveAppointments = allRecords?.activeAppointments || [];
    displayedPastAppointments = allRecords?.pastAppointments || [];
    displayedVisits = allRecords?.visits || [];
    displayedActiveRx = allRecords?.activePrescriptions || [];
    displayedPreviousRx = allRecords?.previousPrescriptions || [];
  } else {
    // Specific other hospital selected
    const targetHosp = otherHospitalsRecords?.find((h: any) => h.hospitalId === selectedHospitalFilter);
    if (targetHosp) {
      displayedActiveAppointments = targetHosp.activeAppointments || [];
      displayedPastAppointments = targetHosp.pastAppointments || [];
      displayedVisits = targetHosp.visits || [];
      displayedActiveRx = targetHosp.activePrescriptions || [];
      displayedPreviousRx = targetHosp.previousPrescriptions || [];
    }
  }

  const currentHospName = scannedHospital?.name || 'Current Hospital';
  const currentHospCode = scannedHospital?.code || 'H001';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 font-sans">
        
        {/* ── TOP HEADER: HOSPITAL SCOPE & ACTIONS ── */}
        <div className="bg-gradient-to-r from-[#0B5A54] via-[#0D6E67] to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <Building2 className="w-6 h-6 text-teal-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black font-heading tracking-tight text-white truncate">
                  Patient Medical Dossier (360°)
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-teal-400/20 border border-teal-300/40 text-teal-200">
                  {portalRole} View
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Scanned Facility:</span>
                <strong className="text-white font-black">{currentHospName}</strong>
                <span className="text-teal-300 font-mono text-[11px]">({currentHospCode})</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shrink-0"
            title="Close Dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PATIENT DEMOGRAPHICS & CLINICAL ALERTS BANNER ── */}
        <div className="bg-slate-50 border-b border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0B5A54] text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden border-2 border-white ring-2 ring-teal-600/30 shrink-0">
                {patient.avatarUrl ? (
                  <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{patient.fullName.charAt(0)}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md bg-emerald-500 text-white shadow-2xs border border-white">
                {patient.bloodGroup}
              </span>
            </div>

            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  {patient.fullName}
                </h3>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-black font-mono shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-[#0B5A54]" />
                  <span>{patient.patientCode}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold">
                <span>{patient.age} yrs • {patient.gender}</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-[#0B5A54]">
                  <Phone className="w-3 h-3" />
                  <span>{patient.phone}</span>
                </span>
                {patient.email && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{patient.email}</span>
                  </>
                )}
              </div>

              {/* Emergency Contact & Address */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500 font-medium">
                {patient.emergencyContact?.phone && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                    <span>Emergency: {patient.emergencyContact.name} ({patient.emergencyContact.relationship}) - {patient.emergencyContact.phone}</span>
                  </span>
                )}
                {patient.address && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{patient.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Alert Flags */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 w-full md:w-auto">
            {patient.allergies && patient.allergies !== 'No known drug allergies' && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-black">
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>Allergies: {patient.allergies}</span>
              </div>
            )}
            {patient.preExistingConditions && patient.preExistingConditions !== 'None documented' && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                <span>History: {patient.preExistingConditions}</span>
              </div>
            )}
            {activeToken && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-300 text-[#0B5A54] text-xs font-black shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                <span>Today's Token: <strong>{activeToken.ticketNumber}</strong> ({activeToken.status})</span>
              </div>
            )}
          </div>
        </div>

        {/* ── HOSPITAL SCOPE SWITCHER BAR ── */}
        <div className="bg-teal-50/60 border-b border-teal-100 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0B5A54]" />
            <span className="text-xs font-bold text-slate-700">Hospital Scope Filter:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Scanned / Current Hospital Tab */}
            <button
              type="button"
              onClick={() => setSelectedHospitalFilter('current')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedHospitalFilter === 'current'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-white hover:bg-teal-100/70 text-slate-700 border border-teal-200'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>{currentHospName} Records (This Facility)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                selectedHospitalFilter === 'current' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {summary.currentHospitalAppointments + summary.currentHospitalVisits}
              </span>
            </button>

            {/* 2. All Hospitals / Cross-Hospital Network Tab */}
            <button
              type="button"
              onClick={() => setSelectedHospitalFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedHospitalFilter === 'all'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-white hover:bg-teal-100/70 text-slate-700 border border-teal-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>All Network Hospitals</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                selectedHospitalFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {summary.totalAppointments + summary.totalVisits}
              </span>
            </button>

            {/* 3. Individual Other Hospitals */}
            {otherHospitalsRecords && otherHospitalsRecords.map((h: any) => (
              <button
                key={h.hospitalId}
                type="button"
                onClick={() => setSelectedHospitalFilter(h.hospitalId)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedHospitalFilter === h.hospitalId
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'bg-white hover:bg-teal-100/70 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{h.hospitalName}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                  {h.activeAppointments.length + h.pastAppointments.length + h.visits.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── RECORD NAVIGATION TABS ── */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 font-heading text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'border-[#0B5A54] text-[#0B5A54]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bookings & Appointments</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-teal-50 text-[#0B5A54] font-bold border border-teal-200">
              {displayedActiveAppointments.length + displayedPastAppointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visits')}
            className={`pb-3 font-heading text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'visits'
                ? 'border-[#0B5A54] text-[#0B5A54]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Clinical Visits & EMR</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-teal-50 text-[#0B5A54] font-bold border border-teal-200">
              {displayedVisits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescriptions')}
            className={`pb-3 font-heading text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'prescriptions'
                ? 'border-[#0B5A54] text-[#0B5A54]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Prescriptions (Active & Past)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {displayedActiveRx.length} Active / {displayedPreviousRx.length} Past
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vitals')}
            className={`pb-3 font-heading text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vitals'
                ? 'border-[#0B5A54] text-[#0B5A54]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Vitals & Diagnostics</span>
          </button>
        </div>

        {/* ── TAB CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 text-left">

          {/* ════ TAB 1: APPOINTMENTS & BOOKINGS ════ */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              {/* Active / Upcoming Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider font-heading flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span>Active & Upcoming Appointments ({displayedActiveAppointments.length})</span>
                  </h4>
                  {portalRole === 'receptionist' && onNewAppointment && (
                    <button
                      type="button"
                      onClick={() => onNewAppointment(patient)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Book Walk-in</span>
                    </button>
                  )}
                </div>

                {displayedActiveAppointments.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs">
                    No active or upcoming appointments found for this hospital scope.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedActiveAppointments.map((appt: any) => (
                      <div
                        key={appt.id}
                        className="bg-white border-2 border-teal-600/30 rounded-2xl p-4 shadow-sm space-y-3 hover:border-[#0B5A54] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 font-mono">
                                {appt.ticketNumber}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {appt.status}
                              </span>
                            </div>
                            <h5 className="font-extrabold text-sm text-slate-900 mt-1">
                              {appt.doctorName}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium">
                              {appt.doctorSpecialty} • {appt.roomNumber}
                            </p>
                          </div>

                          <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                            {appt.hospitalName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-3 text-slate-600 font-semibold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#0B5A54]" />
                              <span>{appt.date}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#0B5A54]" />
                              <span>{appt.timeSlot}</span>
                            </span>
                          </div>

                          {portalRole === 'receptionist' && onCheckInPatient && (
                            <button
                              type="button"
                              onClick={() => onCheckInPatient(patient, appt)}
                              className="px-3 py-1 bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              Check In &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Appointments Section */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200/80">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider font-heading flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  <span>Past & Completed Appointments ({displayedPastAppointments.length})</span>
                </h4>

                {displayedPastAppointments.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                    No historical appointments found in this scope.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedPastAppointments.map((appt: any) => (
                      <div
                        key={appt.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{appt.doctorName}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{appt.doctorSpecialty}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-100 text-slate-600">
                              {appt.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {appt.date} at {appt.timeSlot} • {appt.hospitalName}
                          </p>
                        </div>

                        <span className="font-mono text-xs text-slate-400 font-bold">{appt.ticketNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ TAB 2: CLINICAL VISITS & EMR ════ */}
          {activeTab === 'visits' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider font-heading">
                  Previous Clinical Visits & Consultation Notes ({displayedVisits.length})
                </h4>
                {portalRole === 'doctor' && onStartConsultation && (
                  <button
                    type="button"
                    onClick={() => onStartConsultation(patient)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Start New Consultation</span>
                  </button>
                )}
              </div>

              {displayedVisits.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  No consultation records logged yet for this patient under the selected hospital scope.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedVisits.map((visit: any) => {
                    const isExpanded = expandedVisitId === visit.id;
                    return (
                      <div
                        key={visit.id}
                        className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs"
                      >
                        <div
                          onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900 font-heading">
                                {visit.doctorName}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">({visit.doctorSpecialty})</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                {visit.hospitalName}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold">
                              Diagnosis: <strong className="text-slate-900">{visit.diagnosis || visit.chiefComplaint}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500">{visit.date}</span>
                            <ChevronRight
                              className={`w-4 h-4 text-slate-400 transition-transform ${
                                isExpanded ? 'rotate-90 text-[#0B5A54]' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expanded SOAP Notes */}
                        {isExpanded && (
                          <div className="p-4.5 bg-slate-50/80 border-t border-slate-200/80 space-y-3 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 font-heading">
                                  Subjective Notes (Symptoms & Complaint)
                                </span>
                                <p className="text-slate-700 leading-relaxed font-medium">
                                  {visit.subjective || visit.chiefComplaint || 'No subjective narrative recorded.'}
                                </p>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 font-heading">
                                  Objective Findings (Exam & Vitals)
                                </span>
                                <p className="text-slate-700 leading-relaxed font-medium">
                                  {visit.objective || 'Physical examination within normal limits.'}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 font-heading">
                                Assessment & Clinical Plan
                              </span>
                              <p className="text-slate-800 font-bold">{visit.assessment || visit.diagnosis}</p>
                              <p className="text-slate-600 text-[11px] mt-0.5">{visit.plan || 'Standard care guidance provided.'}</p>
                            </div>

                            {/* Medications from this visit */}
                            {visit.prescriptions && visit.prescriptions.length > 0 && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 font-heading flex items-center gap-1">
                                  <Pill className="w-3 h-3 text-emerald-600" />
                                  <span>Medications Prescribed During This Visit ({visit.prescriptions.length})</span>
                                </span>
                                <div className="space-y-1">
                                  {visit.prescriptions.map((p: any, pIdx: number) => {
                                    const pName = typeof p === 'string' ? p : p.drugName || p.name || 'Medicine';
                                    const pInst = typeof p === 'object' ? `${p.dosage || ''} • ${p.frequency || ''} • ${p.duration || ''}` : '';
                                    return (
                                      <div key={pIdx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                        <span className="font-bold text-slate-900">{pName}</span>
                                        <span className="text-slate-500 text-[11px]">{pInst}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 3: PRESCRIPTIONS (ACTIVE & PREVIOUS) ════ */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-5">
              
              {/* ACTIVE PRESCRIPTIONS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider font-heading flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active & Ongoing Prescriptions ({displayedActiveRx.length})</span>
                  </h4>
                  <span className="text-[10.5px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Current Active Regimen
                  </span>
                </div>

                {displayedActiveRx.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-slate-500 text-xs">
                    No active prescriptions currently on file under this hospital scope.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedActiveRx.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="bg-white border-2 border-emerald-500/40 rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-sm text-slate-900 font-heading">
                                {rx.drugName}
                              </h5>
                              <span className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#0B5A54] mt-0.5">
                              {rx.instructions || `${rx.dosage} • ${rx.frequency}`}
                            </p>
                          </div>

                          <span className="text-[10.5px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {rx.hospitalName}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Prescriber: <strong>{rx.prescriber}</strong></span>
                          <span>Prescribed: <strong>{rx.prescribedDate}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PREVIOUS / ARCHIVED PRESCRIPTIONS */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider font-heading flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                    <span>Previous & Past Medication History ({displayedPreviousRx.length})</span>
                  </h4>
                  <span className="text-[10.5px] text-slate-400 font-medium">Completed Courses</span>
                </div>

                {displayedPreviousRx.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                    No historical completed prescriptions found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedPreviousRx.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{rx.drugName}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-semibold">{rx.instructions || `${rx.dosage} ${rx.frequency}`}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Prescribed on {rx.prescribedDate} by {rx.prescriber} ({rx.hospitalName})
                          </p>
                        </div>

                        <span className="text-[10.5px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ════ TAB 4: VITALS & DIAGNOSTICS ════ */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider font-heading flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-[#0B5A54]" />
                  <span>Latest Clinical Vitals & Diagnostics</span>
                </h4>
                {portalRole === 'nurse' && onRecordVitals && (
                  <button
                    type="button"
                    onClick={() => onRecordVitals(patient)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Record New Vitals</span>
                  </button>
                )}
              </div>

              {/* Vitals Metric Cards Grid */}
              {displayedVitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* BP */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Blood Pressure</span>
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.bloodPressure || `${displayedVitals.bpSystolic}/${displayedVitals.bpDiastolic} mmHg`}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      Standard
                    </span>
                  </div>

                  {/* Heart Rate */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Heart Rate</span>
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.heartRate} <span className="text-xs font-semibold text-slate-500">bpm</span>
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      Resting Pulse
                    </span>
                  </div>

                  {/* SpO2 */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Oxygen (SpO2)</span>
                      <Gauge className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.spo2}%
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      Optimal
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Temperature</span>
                      <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.temperature}°{displayedVitals.temperatureUnit || 'F'}
                    </p>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      Normal
                    </span>
                  </div>

                  {/* Weight & BMI */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Weight & BMI</span>
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.weightKg} kg
                    </p>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                      BMI: {displayedVitals.bmi || '23.5'}
                    </span>
                  </div>

                  {/* Blood Glucose */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                      <span>Blood Glucose</span>
                      <Droplet className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <p className="text-base font-black text-slate-900 font-heading">
                      {displayedVitals.bloodGlucose || 95} <span className="text-xs font-semibold text-slate-500">mg/dL</span>
                    </p>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      {displayedVitals.glucoseContext || 'Random'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No vital signs on record for this patient. Click 'Record New Vitals' to add intake vitals.
                </div>
              )}

              {/* Lab Reports Section */}
              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                <h5 className="text-xs font-black uppercase text-slate-600 tracking-wider font-heading">
                  Diagnostic Reports & Lab Tests ({displayedLabTests.length})
                </h5>
                {displayedLabTests.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                    No diagnostic lab reports recorded for this patient.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedLabTests.map((t: any) => (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{t.testType}</p>
                          <p className="text-[11px] text-slate-500">{t.freeTextResult || 'Status: Completed'}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{t.recordedAt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER TOOLBAR: ROLE-SPECIFIC ONE-CLICK ACTIONS ── */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            CarePulse Unified Medical Dossier • Verified Real-Time
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Close Record
            </button>

            {/* Role: Receptionist Action */}
            {portalRole === 'receptionist' && onCheckInPatient && (
              <button
                type="button"
                onClick={() => onCheckInPatient(patient, displayedActiveAppointments[0])}
                className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Check-In / Issue Token</span>
              </button>
            )}

            {/* Role: Doctor Action */}
            {portalRole === 'doctor' && onStartConsultation && (
              <button
                type="button"
                onClick={() => {
                  onStartConsultation(patient);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Start Clinical Consultation</span>
              </button>
            )}

            {/* Role: Nurse Action */}
            {portalRole === 'nurse' && onRecordVitals && (
              <button
                type="button"
                onClick={() => {
                  onRecordVitals(patient);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <HeartPulse className="w-4 h-4" />
                <span>Record Patient Vitals</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
