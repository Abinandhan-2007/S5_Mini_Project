import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Activity,
  HeartPulse,
  CheckCircle2,
  UserPlus,
  Flame,
  UserCheck,
  QrCode,
  Microscope,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Eye,
  X,
  Stethoscope,
  Clock,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';
import type { NurseQueueItem, LabTestRecord } from '../../types/nurse';
import { PatientQrScannerModal } from '../../components/qr/PatientQrScannerModal';
import { nurseService } from '../../services/nurseService';

interface PatientCheckInProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
  initialViewMode?: 'intake' | 'tracker';
}

export const PatientCheckIn: React.FC<PatientCheckInProps> = ({
  onShowToast,
  onOpenNewAppointment,
  initialViewMode = 'intake',
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const tokens = useStaffStore((s) => s.tokens);
  const bookings = useStaffStore((s) => s.bookings);
  const fetchBookings = useStaffStore((s) => s.fetchBookings);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const checkInAppointment = useStaffStore((s) => s.checkInAppointment);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenQueueItem | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // View Mode: 'intake' (Split Check-In Form) or 'tracker' (Full Live Vitals & Lab Board)
  const [viewMode, setViewMode] = useState<'intake' | 'tracker'>(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Live Nurse Vitals & Diagnostics Queue State
  const [trackerPatients, setTrackerPatients] = useState<NurseQueueItem[]>([]);
  const [isLoadingTracker, setIsLoadingTracker] = useState(false);
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'recorded' | 'pending' | 'abnormal' | 'labs'>('all');
  const [trackerSearch, setTrackerSearch] = useState('');

  // Inspect Modal State
  const [inspectingItem, setInspectingItem] = useState<NurseQueueItem | null>(null);
  const [inspectingLabTests, setInspectingLabTests] = useState<LabTestRecord[]>([]);
  const [isLoadingLabTests, setIsLoadingLabTests] = useState(false);

  const effectiveHospId = currentStaff?.hospital_id || currentStaff?.hospitalId;

  const loadTrackerQueue = useCallback(async () => {
    setIsLoadingTracker(true);
    try {
      const queue = await nurseService.getQueue(effectiveHospId);
      setTrackerPatients(queue);
    } catch (err) {
      console.warn('Failed to load live nurse queue in receptionist portal:', err);
    } finally {
      setIsLoadingTracker(false);
    }
  }, [effectiveHospId]);

  useEffect(() => {
    fetchBookings();
    loadTrackerQueue();
    const timer = setInterval(() => {
      loadTrackerQueue();
    }, 6000);
    return () => clearInterval(timer);
  }, [fetchBookings, loadTrackerQueue]);

  const allAvailableAppointments = useMemo(() => {
    const map = new Map<string, TokenQueueItem>();
    tokens.forEach((t) => {
      const key = String(t.id || t.appointmentId || t.ticketNumber || t.tokenNumber);
      if (key) map.set(key, t);
    });
    bookings.forEach((b) => {
      const key = String(b.id || b.appointmentId || b.ticketNumber || b.tokenNumber);
      if (key) {
        const existing = map.get(key);
        if (existing && (existing.isCheckedIn || existing.status === 'Checked In') && !b.isCheckedIn) {
          map.set(key, existing);
        } else {
          map.set(key, b);
        }
      }
    });
    return Array.from(map.values());
  }, [tokens, bookings]);

  const handlePatientQrScanned = (patientData: any) => {
    setIsQrScannerOpen(false);
    const pat = patientData.patient;
    if (!pat) return;

    // 1. Find all matching appointments for this patient
    const patientMatches = allAvailableAppointments.filter(
      (t) =>
        t.patientName.toLowerCase() === pat.fullName.toLowerCase() ||
        (pat.phone && t.patientPhone && t.patientPhone.includes(pat.phone)) ||
        (pat.patientCode && t.tokenNumber.toLowerCase().includes(pat.patientCode.toLowerCase()))
    );

    const pendingMatches = patientMatches.filter(
      (t) => !t.isCheckedIn && t.status !== 'Checked In' && t.status !== 'Completed' && t.status !== 'Cancelled'
    );

    if (pendingMatches.length === 1) {
      handleSelectPatient(pendingMatches[0]);
      onShowToast?.(`Matched active booking for ${pat.fullName} (${pendingMatches[0].timeSlot})`);
    } else if (pendingMatches.length > 1) {
      setSearchQuery(pat.fullName);
      onShowToast?.(`Patient ${pat.fullName} has ${pendingMatches.length} slots today. Select the slot to check in.`);
    } else if (patientMatches.length > 0) {
      handleSelectPatient(patientMatches[0]);
      onShowToast?.(`Loaded booking for ${pat.fullName} (${patientMatches[0].tokenNumber})`);
    } else {
      setSearchQuery(pat.fullName);
      setIntakeNotes(`Patient ${pat.fullName} (${pat.patientCode}) presented via QR code check-in.`);
      onShowToast?.(`Patient ${pat.fullName} verified via QR code.`);
    }
  };

  // Check-In & Live Clinical Tracking State
  const [triagePriority, setTriagePriority] = useState<'Normal' | 'Urgent' | 'Senior/Child'>('Normal');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedPatientLabTests, setSelectedPatientLabTests] = useState<LabTestRecord[]>([]);
  const [isLoadingSelectedLabTests, setIsLoadingSelectedLabTests] = useState(false);

  // When selected token changes, fetch any active laboratory diagnostics
  useEffect(() => {
    if (!selectedToken) {
      setSelectedPatientLabTests([]);
      return;
    }
    const apptId = selectedToken.id || selectedToken.appointmentId;
    if (apptId) {
      setIsLoadingSelectedLabTests(true);
      nurseService.getLabTests(apptId)
        .then((tests) => setSelectedPatientLabTests(tests || []))
        .catch(() => setSelectedPatientLabTests([]))
        .finally(() => setIsLoadingSelectedLabTests(false));
    }
  }, [selectedToken]);

  // Find matching scheduled tokens that are waiting
  const matchingTokens = allAvailableAppointments.filter((t) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      t.patientName.toLowerCase().includes(q) ||
      t.patientPhone.includes(q) ||
      t.tokenNumber.toLowerCase().includes(q) ||
      t.ticketNumber.toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = (token: TokenQueueItem) => {
    setSelectedToken(token);
    setIntakeNotes(token.healthIssue || '');
  };

  const handleSelectPatientFromTracker = (item: NurseQueueItem) => {
    const match = allAvailableAppointments.find(
      (t) =>
        t.id === item.appointment_id ||
        t.appointmentId === item.appointment_id ||
        (item.patient?.name && t.patientName.toLowerCase() === item.patient.name.toLowerCase())
    );

    if (match) {
      handleSelectPatient(match);
      setViewMode('intake');
      const rawTok = item.token_number ? String(item.token_number) : '';
      const displayTok = rawTok
        ? (rawTok.startsWith('#') || rawTok.startsWith('TK-') ? rawTok : `#TOK-${rawTok}`)
        : `#APT-${item.appointment_id.slice(-4)}`;
      const syntheticToken: TokenQueueItem = {
        id: item.appointment_id,
        appointmentId: item.appointment_id,
        tokenNumber: displayTok,
        ticketNumber: item.token_number ? String(item.token_number) : displayTok,
        patientId: item.patient?.id,
        patientCode: item.patient?.patient_code,
        patient_code: item.patient?.patient_code,
        patientName: item.patient?.name || 'Patient',
        patientPhone: item.patient?.phone || '',
        doctorId: item.doctor?.id || 'doc-1',
        doctorName: item.doctor?.name || 'Attending Physician',
        doctorSpecialty: item.doctor?.specialty || 'General Medicine',
        timeSlot: item.time || '10:00 AM - 11:00 AM',
        date: item.date || new Date().toISOString().split('T')[0],
        status: (item.queue_status === 'Checked In' ? 'Checked In' : 'Waiting'),
        isCheckedIn: item.queue_status === 'Checked In',
        arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        issueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'In-Person',
        healthIssue: item.chief_complaint || '',
      };
      handleSelectPatient(syntheticToken);
      setViewMode('intake');
    }
  };

  const handleInspectDetails = async (item: NurseQueueItem) => {
    setInspectingItem(item);
    setIsLoadingLabTests(true);
    try {
      const tests = await nurseService.getLabTests(item.appointment_id);
      setInspectingLabTests(tests);
    } catch (err) {
      console.warn('Failed to load lab tests for inspection:', err);
      setInspectingLabTests([]);
    } finally {
      setIsLoadingLabTests(false);
    }
  };

  const handleCompleteCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedToken) return;

    setIsCheckingIn(true);
    const targetId = selectedToken.id || selectedToken.appointmentId || selectedToken.ticketNumber;
    try {
      await checkInAppointment(targetId);
    } catch {
      await updateTokenStatus(selectedToken.id, 'Checked In');
    } finally {
      setIsCheckingIn(false);
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSelectedToken((prev) =>
      prev
        ? {
            ...prev,
            isCheckedIn: true,
            status: 'Checked In',
            checkInTime: nowStr,
            arrivalTime: prev.arrivalTime || nowStr,
          }
        : null
    );

    onShowToast?.(
      `Patient ${selectedToken.patientName} marked as checked in! Transferred to Nurse Station for triage vitals & lab tests.`
    );
    await Promise.all([loadTrackerQueue(), fetchBookings()]);
  };

  // Base checked-in patients: ONLY patients who have been checked in by reception or have vitals
  const checkedInTrackerPatients = useMemo(() => {
    const list: NurseQueueItem[] = [
      ...trackerPatients.filter(
        (item) => item.is_checked_in || item.queue_status === 'Checked In' || !!item.vitals
      )
    ];

    const existingKeys = new Set<string>();
    list.forEach((item) => {
      if (item.appointment_id) existingKeys.add(String(item.appointment_id).toLowerCase());
      if (item.token_number) existingKeys.add(String(item.token_number).replace('#', '').toLowerCase());
      if (item.patient?.name) existingKeys.add(item.patient.name.trim().toLowerCase());
    });

    // Fallback/immediate optimistic inclusion from allAvailableAppointments
    allAvailableAppointments.forEach((t) => {
      const idStr = String(t.id || t.appointmentId || '').toLowerCase();
      const ticketStr = String(t.ticketNumber || t.tokenNumber || '').replace('#', '').toLowerCase();
      const nameStr = (t.patientName || '').trim().toLowerCase();

      const isChecked = t.isCheckedIn || t.status === 'Checked In';
      const alreadyPresent =
        (idStr && existingKeys.has(idStr)) ||
        (ticketStr && existingKeys.has(ticketStr)) ||
        (nameStr && existingKeys.has(nameStr));

      if (isChecked && !alreadyPresent) {
        list.push({
          appointment_id: String(t.id || t.appointmentId || ''),
          token_number: t.ticketNumber || t.tokenNumber,
          queue_status: 'Checked In',
          is_checked_in: true,
          checked_in_at: t.checkedInAt || new Date().toISOString(),
          vitals_status: 'pending',
          date: t.date || new Date().toISOString().split('T')[0],
          time: t.timeSlot || '10:00 AM',
          appointment_type: t.type || 'In-Person',
          chief_complaint: t.healthIssue || 'Routine consultation',
          patient: {
            id: t.patientId || '',
            name: t.patientName || 'Patient',
            dob: '',
            gender: 'Not specified',
            blood_group: t.bloodGroup || '',
            phone: t.patientPhone || '',
            patient_code: t.patientCode || (t as any).patient_code || '',
          },
          doctor: {
            id: t.doctorId || '',
            name: t.doctorName || 'Attending Physician',
            specialty: t.doctorSpecialty || 'General Medicine',
            room_number: 'Cabin 101',
          },
          vitals: null,
          abnormal_flags: [],
          lab_test_count: 0,
        });
        if (idStr) existingKeys.add(idStr);
        if (ticketStr) existingKeys.add(ticketStr);
        if (nameStr) existingKeys.add(nameStr);
      }
    });

    return list;
  }, [trackerPatients, allAvailableAppointments]);

  // Filtered tracker patients
  const filteredTrackerPatients = useMemo(() => {
    return checkedInTrackerPatients.filter((item) => {
      // 1. Tab filter
      if (trackerFilter === 'recorded' && item.vitals_status === 'pending') return false;
      if (trackerFilter === 'pending' && item.vitals_status !== 'pending') return false;
      if (
        trackerFilter === 'abnormal' &&
        item.vitals_status !== 'abnormal_flagged' &&
        (!item.abnormal_flags || item.abnormal_flags.length === 0)
      )
        return false;
      if (trackerFilter === 'labs' && (!item.lab_test_count || item.lab_test_count === 0)) return false;

      // 2. Search query filter
      if (trackerSearch.trim()) {
        const q = trackerSearch.toLowerCase();
        const pName = (item.patient?.name || '').toLowerCase();
        const pPhone = (item.patient?.phone || '').toLowerCase();
        const dName = (item.doctor?.name || '').toLowerCase();
        const tok = (item.token_number ? String(item.token_number) : '').toLowerCase();
        return pName.includes(q) || pPhone.includes(q) || dName.includes(q) || tok.includes(q);
      }
      return true;
    });
  }, [checkedInTrackerPatients, trackerFilter, trackerSearch]);

  // Tracker summary statistics
  const totalQueueCount = checkedInTrackerPatients.length;
  const vitalsRecordedCount = checkedInTrackerPatients.filter((p) => p.vitals_status !== 'pending').length;
  const abnormalFlagsCount = checkedInTrackerPatients.filter(
    (p) => (p.abnormal_flags && p.abnormal_flags.length > 0) || p.vitals_status === 'abnormal_flagged'
  ).length;
  const activeLabOrdersCount = checkedInTrackerPatients.reduce((sum, p) => sum + (p.lab_test_count || 0), 0);

  // Match the currently selected patient with live nurse triage record
  const matchingTrackerItem = useMemo(() => {
    if (!selectedToken) return null;
    const targetId = String(selectedToken.id || selectedToken.appointmentId || '').toLowerCase();
    const targetTicket = String(selectedToken.ticketNumber || selectedToken.tokenNumber || '').replace('#', '').toLowerCase();
    const targetName = (selectedToken.patientName || '').toLowerCase().trim();

    return (
      checkedInTrackerPatients.find((tp) => {
        const tpId = String(tp.appointment_id || '').toLowerCase();
        const tpTicket = String(tp.token_number || '').replace('#', '').toLowerCase();
        const tpName = (tp.patient?.name || '').toLowerCase().trim();
        return (
          (targetId && tpId === targetId) ||
          (targetTicket && tpTicket === targetTicket) ||
          (targetName && tpName === targetName) ||
          (selectedToken.patientPhone && tp.patient?.phone === selectedToken.patientPhone)
        );
      }) || null
    );
  }, [selectedToken, checkedInTrackerPatients]);

  const recentlyCheckedInItems = useMemo(() => {
    return checkedInTrackerPatients.slice(0, 5);
  }, [checkedInTrackerPatients]);

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ── TOP ACTION BAR WITH VIEW MODE SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center font-bold shadow-xs">
            <HeartPulse className="w-5 h-5 text-[#0B5A54]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 font-heading flex items-center gap-2">
              <span>Patient Arrival & Vitals Tracking</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Front Desk
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Check in arriving patients and monitor nurse triage vitals & diagnostic lab tests
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('intake')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'intake'
                ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Arrival Check-In</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('tracker')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'tracker'
                ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Vitals & Lab Tracker</span>
            {vitalsRecordedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                viewMode === 'tracker' ? 'bg-teal-200 text-teal-950' : 'bg-[#0B5A54] text-white'
              }`}>
                {vitalsRecordedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 1: INTAKE & SPLIT CHECK-IN (With Live Vitals in place of empty image)
      ══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'intake' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (1 Col): Patient Search & Scheduled Arrival Selector */}
          <div className="space-y-5">
            {/* Search Box */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  Find Scheduled Patient
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQrScannerOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Scan Patient QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Scan QR</span>
                  </button>
                  {onOpenNewAppointment && (
                    <button
                      onClick={onOpenNewAppointment}
                      className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Walk-In</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search phone, name, or #TOK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              {/* Instant Search Results */}
              {searchQuery.trim() && (
                <div className="space-y-2 pt-2 border-t border-slate-100 max-h-60 overflow-y-auto">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    Search Results ({matchingTokens.length})
                  </span>
                  {matchingTokens.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No matching bookings found.</p>
                  ) : (
                    matchingTokens.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectPatient(t)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedToken?.id === t.id
                            ? 'bg-teal-50 border-[#0B5A54] ring-1 ring-[#0B5A54]'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">{t.patientName}</span>
                          <span className="font-mono text-[10px] font-black text-[#0B5A54]">
                            {t.tokenNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t.patientPhone}</p>
                        <p className="text-[10.5px] text-[#0B5A54] font-semibold mt-1">
                          {t.doctorName} • {t.timeSlot}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pending Arrival List */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  Today&apos;s Appointments
                </h3>
                <span className="text-xs font-bold text-[#0B5A54]">{allAvailableAppointments.length} Total</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 no-scrollbar">
                {allAvailableAppointments.slice(0, 10).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectPatient(t)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedToken?.id === t.id
                        ? 'bg-teal-50 border-[#0B5A54] ring-1 ring-[#0B5A54] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 truncate">{t.patientName}</span>
                        {t.patientCode && (
                          <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-mono font-bold border border-teal-200 shrink-0">
                            {t.patientCode}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-black text-[#0B5A54] shrink-0">
                        {t.tokenNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="truncate">{t.doctorName}</span>
                      <span className="font-mono">{t.timeSlot}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (2 Cols): Vitals Intake Form OR Live Vitals Tracker (Instead of empty image) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedToken ? (
              /* Selected Patient Vitals Intake Form */
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
                {/* Selected Patient Banner */}
                <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-sm font-heading shadow-xs">
                      {selectedToken.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 font-heading">
                          {selectedToken.patientName}
                        </h3>
                        <span className="px-2 py-0.5 bg-white text-[#0B5A54] font-mono text-[11px] font-black rounded-lg border border-teal-200">
                          {selectedToken.tokenNumber}
                        </span>
                        {selectedToken.patientCode && (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-mono text-[11px] font-black rounded-lg border border-teal-200">
                            {selectedToken.patientCode}
                          </span>
                        )}
                        {selectedToken.isCheckedIn || selectedToken.status === 'Checked In' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Checked In</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Awaiting Arrival</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        Phone: <span className="font-mono">{selectedToken.patientPhone}</span> • Attending:{' '}
                        <span className="text-[#0B5A54] font-bold">{selectedToken.doctorName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400 font-bold block">Appointment Time</span>
                    <span className="font-mono font-black text-slate-800">
                      {selectedToken.timeSlot}
                    </span>
                  </div>
                </div>

                {/* 1. FRONT DESK ARRIVAL & CHECK-IN (FRONT DESK ROLE) */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#0B5A54]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Front Desk Arrival & Intake
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      Step 1: Front Desk Verification
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Triage Category / Priority */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        Queue Category / Priority
                      </label>
                      <select
                        value={triagePriority}
                        onChange={(e) => setTriagePriority(e.target.value as any)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      >
                        <option value="Normal">🟢 Standard Consultation Queue</option>
                        <option value="Urgent">🔴 High Priority (Urgent Care)</option>
                        <option value="Senior/Child">🟡 Senior Citizen / Pediatric Priority</option>
                      </select>
                    </div>

                    {/* Presenting Symptoms / Arrival Reason */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 block">
                        Presenting Complaint / Arrival Reason
                      </label>
                      <input
                        type="text"
                        value={intakeNotes}
                        onChange={(e) => setIntakeNotes(e.target.value)}
                        placeholder="E.g. Fever, follow-up, routine checkup..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>
                  </div>

                  {/* Check-In Action Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
                      {!selectedToken.isCheckedIn && selectedToken.status !== 'Checked In'
                        ? '💡 Marking check-in registers patient arrival, adds to live queue, and immediately transfers patient to the Nurse Station for clinical vitals and diagnostic tests.'
                        : '✅ Patient checked in. Nurse station has been notified for vitals triage and lab diagnostics.'}
                    </p>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedToken(null)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Clear
                      </button>

                      {!selectedToken.isCheckedIn && selectedToken.status !== 'Checked In' ? (
                        <button
                          type="button"
                          disabled={isCheckingIn}
                          onClick={() => handleCompleteCheckIn()}
                          className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-300" />
                          <span>{isCheckingIn ? 'Checking In...' : 'Confirm Arrival & Check In'}</span>
                        </button>
                      ) : (
                        <span className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Checked In</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. LIVE CLINICAL VITALS & LAB DIAGNOSTICS TRACKER (MONITORED FROM NURSE STATION) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0B5A54]" />
                        Live Nurse Vitals & Diagnostic Lab Tests Tracking
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Recorded and monitored by Nursing Staff & Clinical Laboratory
                      </p>
                    </div>

                    {matchingTrackerItem && (
                      <button
                        type="button"
                        onClick={() => handleInspectDetails(matchingTrackerItem)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-black hover:bg-teal-100 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Microscope className="w-3.5 h-3.5 text-[#14B8A6]" />
                        <span>Inspect Full Dossier</span>
                      </button>
                    )}
                  </div>

                  {/* Grid: Card A (Nurse Vitals) & Card B (Lab Diagnostics) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card A: Nurse Triage Vitals Status */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      matchingTrackerItem?.vitals
                        ? matchingTrackerItem.abnormal_flags && matchingTrackerItem.abnormal_flags.length > 0
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-amber-50/30 border-amber-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <HeartPulse className={`w-4 h-4 ${
                            matchingTrackerItem?.vitals ? 'text-emerald-600' : 'text-amber-600'
                          }`} />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Nurse Triage Vitals
                          </span>
                        </div>

                        {matchingTrackerItem?.vitals ? (
                          matchingTrackerItem.abnormal_flags && matchingTrackerItem.abnormal_flags.length > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Abnormal Alert</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Vitals Recorded</span>
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Nurse Triage</span>
                          </span>
                        )}
                      </div>

                      {matchingTrackerItem?.vitals ? (
                        <div className="space-y-3">
                          {/* Readings Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">Blood Pressure</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.bp_systolic && matchingTrackerItem.vitals.bp_diastolic
                                  ? `${matchingTrackerItem.vitals.bp_systolic}/${matchingTrackerItem.vitals.bp_diastolic} mmHg`
                                  : '--'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">Heart Rate</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.heart_rate ? `${matchingTrackerItem.vitals.heart_rate} bpm` : '--'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">Temperature</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.temperature
                                  ? `${matchingTrackerItem.vitals.temperature} °${matchingTrackerItem.vitals.temperature_unit || 'F'}`
                                  : '--'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">SpO2 Oxygen</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.spo2 ? `${matchingTrackerItem.vitals.spo2} %` : '--'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">Weight / BMI</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.weight_kg ? `${matchingTrackerItem.vitals.weight_kg} kg` : '--'}
                                {matchingTrackerItem.vitals.bmi ? ` (${matchingTrackerItem.vitals.bmi.toFixed(1)})` : ''}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 block">Blood Glucose</span>
                              <span className="font-mono font-black text-slate-800 text-xs">
                                {matchingTrackerItem.vitals.blood_glucose ? `${matchingTrackerItem.vitals.blood_glucose} mg/dL` : 'Not tested'}
                              </span>
                            </div>
                          </div>

                          {/* Abnormal Flags */}
                          {matchingTrackerItem.abnormal_flags && matchingTrackerItem.abnormal_flags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {matchingTrackerItem.abnormal_flags.map((flag, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  <span>{flag}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-[10.5px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span>Recorded by: <strong className="text-slate-700">{matchingTrackerItem.vitals.recorded_by_name || 'Nurse'}</strong></span>
                            <span className="font-mono">{matchingTrackerItem.vitals.recorded_at ? new Date(matchingTrackerItem.vitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Awaiting Nurse Station Vitals
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            Patient is queued in the Nurse Portal. The triage nurse will measure and enter blood pressure, heart rate, temperature, SpO2, and weight.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card B: Diagnostic Lab Tests Status */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      selectedPatientLabTests.length > 0
                        ? 'bg-sky-50/40 border-sky-200'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Microscope className={`w-4 h-4 ${
                            selectedPatientLabTests.length > 0 ? 'text-sky-600' : 'text-slate-400'
                          }`} />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Diagnostic Lab Tests
                          </span>
                        </div>

                        {selectedPatientLabTests.length > 0 ? (
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                            <Microscope className="w-3 h-3 text-sky-600" />
                            <span>{selectedPatientLabTests.length} Tests Ordered</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] rounded-full">
                            No Tests Ordered
                          </span>
                        )}
                      </div>

                      {isLoadingSelectedLabTests ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                          <span>Checking laboratory records...</span>
                        </div>
                      ) : selectedPatientLabTests.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPatientLabTests.map((test, idx) => (
                            <div key={test.id || idx} className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-black text-slate-800 block truncate">
                                  {test.test_type}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {test.recorded_at ? new Date(test.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ordered today'}
                                </span>
                              </div>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 border ${
                                test.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : test.status === 'In Analysis'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}>
                                {test.status || 'Sample Collected'}
                              </span>
                            </div>
                          ))}

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => matchingTrackerItem && handleInspectDetails(matchingTrackerItem)}
                              className="text-[11px] font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Lab Results</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                            <Microscope className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            No Diagnostic Tests Ordered
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                            No diagnostic or laboratory tests have been assigned for this consultation. Tests will appear here once entered by the nursing team.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── LIVE PATIENT VITALS & LAB TRACKER DASHBOARD (REPLACES STATIC PLACEHOLDER) ── */
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
                {/* Tracker Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0B5A54]"></span>
                      </span>
                      <h3 className="text-base font-black text-slate-900 font-heading">
                        Live Hospital Triage & Diagnostics Board
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Real-time clinical vitals and diagnostic test tracking across checked-in patients
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadTrackerQueue()}
                      disabled={isLoadingTracker}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Refresh live triage queue"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingTracker ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('tracker')}
                      className="px-3 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                    >
                      <span>Full Tracker View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 4 Quick Stat Metric Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80">
                    <span className="text-[10px] font-black uppercase text-teal-800 font-mono block">In Queue</span>
                    <span className="text-xl font-black text-[#0B5A54] font-heading">{totalQueueCount}</span>
                    <span className="text-[10px] text-teal-700 block font-medium">Patients Today</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                    <span className="text-[10px] font-black uppercase text-emerald-800 font-mono block">Vitals Logged</span>
                    <span className="text-xl font-black text-emerald-700 font-heading">{vitalsRecordedCount}</span>
                    <span className="text-[10px] text-emerald-700 block font-medium">Triage Completed</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                    <span className="text-[10px] font-black uppercase text-rose-800 font-mono block">Abnormal Alerts</span>
                    <span className="text-xl font-black text-rose-700 font-heading">{abnormalFlagsCount}</span>
                    <span className="text-[10px] text-rose-700 block font-medium">Clinical Warnings</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80">
                    <span className="text-[10px] font-black uppercase text-purple-800 font-mono block">Lab Tests</span>
                    <span className="text-xl font-black text-purple-700 font-heading">{activeLabOrdersCount}</span>
                    <span className="text-[10px] text-purple-700 block font-medium">Diagnostic Orders</span>
                  </div>
                </div>

                {/* Live Triage Patients Stream */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                      Real-Time Patient Vitals & Lab Diagnostics
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Showing {filteredTrackerPatients.length} patient(s)
                    </span>
                  </div>

                  {filteredTrackerPatients.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No patient triage records found for today yet.</p>
                      <p className="text-[11px] text-slate-400">
                        Patients will appear here automatically when checked in or when nurses log triage vitals.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {filteredTrackerPatients.map((item) => {
                        const hasVitals = item.vitals_status !== 'pending' && item.vitals;
                        const hasAbnormal =
                          item.vitals_status === 'abnormal_flagged' ||
                          (item.abnormal_flags && item.abnormal_flags.length > 0);
                        const labCount = item.lab_test_count || 0;

                        return (
                          <div
                            key={item.appointment_id}
                            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center font-bold text-xs">
                                  {(item.patient?.name || 'P').charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-xs text-slate-900 font-heading">
                                      {item.patient?.name || 'Patient'}
                                    </span>
                                    {item.token_number && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                                        {String(item.token_number).startsWith('#') ? item.token_number : `#${item.token_number}`}
                                      </span>
                                    )}
                                    {item.patient?.patient_code && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] text-[10px] font-mono font-bold border border-teal-200">
                                        {item.patient.patient_code}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    Dr. {item.doctor?.name} • <span className="font-mono">{item.time}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {hasAbnormal ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Abnormal Vitals</span>
                                  </span>
                                ) : hasVitals ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Vitals Normal</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Triage
                                  </span>
                                )}

                                {labCount > 0 && (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                    <Microscope className="w-3 h-3 text-purple-600" />
                                    <span>{labCount} Lab Test{labCount > 1 ? 's' : ''}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Vitals Data Bar */}
                            {hasVitals && item.vitals ? (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">BP</span>
                                  <span className="font-black text-slate-800">
                                    {item.vitals.bp_systolic || '—'}/{item.vitals.bp_diastolic || '—'} mmHg
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Heart Rate</span>
                                  <span className="font-black text-slate-800">{item.vitals.heart_rate || '—'} bpm</span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">SpO2</span>
                                  <span className="font-black text-slate-800">{item.vitals.spo2 || '—'}%</span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Temp</span>
                                  <span className="font-black text-slate-800">
                                    {item.vitals.temperature || '—'}°{item.vitals.temperature_unit || 'F'}
                                  </span>
                                </div>
                              </div>
                            ) : null}

                            {/* Abnormal Warning Badges */}
                            {item.abnormal_flags && item.abnormal_flags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.abnormal_flags.map((flag, fi) => (
                                  <span
                                    key={fi}
                                    className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                    <span>{flag}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => handleInspectDetails(item)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect Vitals & Labs</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recently Checked In Summary */}
            {recentlyCheckedInItems.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Recently Checked-In Arrivals ({recentlyCheckedInItems.length})
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">Live Nurse Triage Status</span>
                </div>

                <div className="space-y-3">
                  {recentlyCheckedInItems.map((item) => (
                    <div
                      key={item.appointment_id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-teal-50 text-[#0B5A54] font-mono font-black rounded-lg border border-teal-200">
                            #{item.token_number ?? '---'}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {item.patient?.name || 'Patient'}
                          </span>
                          <span className="text-slate-400 font-medium text-[11px]">
                            • Dr. {item.doctor?.name || 'Attending'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          {item.vitals ? (
                            <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              BP: {item.vitals.bp_systolic || '---'}/{item.vitals.bp_diastolic || '---'} mmHg
                              {item.vitals.heart_rate ? ` • Pulse: ${item.vitals.heart_rate} bpm` : ''}
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Nurse Vitals Pending
                            </span>
                          )}

                          <span className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Labs: {item.lab_test_count || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <span className="text-[11px] font-bold text-slate-400">
                          {item.checked_in_at
                            ? `Checked in at ${new Date(item.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Checked in'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInspectDetails(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Track</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            VIEW 2: FULL-WIDTH LIVE PATIENT VITALS & LAB DIAGNOSTICS TRACKER
        ══════════════════════════════════════════════════════════════════ */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0B5A54]" />
                <span>Live Hospital Vitals & Diagnostic Lab Command</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitor comprehensive nurse triage recordings, vital signs thresholds, and diagnostic lab progression
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trackerSearch}
                  onChange={(e) => setTrackerSearch(e.target.value)}
                  placeholder="Filter by name, phone, doctor..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <button
                type="button"
                onClick={() => loadTrackerQueue()}
                disabled={isLoadingTracker}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingTracker ? 'animate-spin' : ''}`} />
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTrackerFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                trackerFilter === 'all'
                  ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Patients ({totalQueueCount})
            </button>
            <button
              type="button"
              onClick={() => setTrackerFilter('recorded')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                trackerFilter === 'recorded'
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Vitals Recorded ({vitalsRecordedCount})
            </button>
            <button
              type="button"
              onClick={() => setTrackerFilter('abnormal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                trackerFilter === 'abnormal'
                  ? 'bg-rose-700 text-white shadow-xs font-black'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Abnormal Flags ({abnormalFlagsCount})
            </button>
            <button
              type="button"
              onClick={() => setTrackerFilter('labs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                trackerFilter === 'labs'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Lab Orders Active ({activeLabOrdersCount})
            </button>
          </div>

          {/* Patient Cards Grid */}
          {filteredTrackerPatients.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <Activity className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-black text-slate-800">No matching patient triage records found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No patient records match the currently selected filter or search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTrackerPatients.map((item) => {
                const hasVitals = item.vitals_status !== 'pending' && item.vitals;
                const hasAbnormal =
                  item.vitals_status === 'abnormal_flagged' ||
                  (item.abnormal_flags && item.abnormal_flags.length > 0);
                const labCount = item.lab_test_count || 0;

                return (
                  <div
                    key={item.appointment_id}
                    className="p-5 rounded-3xl border border-slate-200/80 bg-white hover:border-teal-300 hover:shadow-md transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-sm font-heading shadow-xs">
                          {(item.patient?.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 font-heading">
                              {item.patient?.name || 'Patient'}
                            </h4>
                            {item.token_number && (
                              <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-[#0B5A54] text-[10px] font-mono font-black border border-teal-200">
                                #{item.token_number}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Attending: <span className="font-semibold text-slate-700">Dr. {item.doctor?.name}</span> •{' '}
                            <span className="font-mono text-slate-600">{item.time}</span>
                          </p>
                        </div>
                      </div>

                      <div>
                        {hasAbnormal ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Warning</span>
                          </span>
                        ) : hasVitals ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Normal</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vitals Data Grid */}
                    {hasVitals && item.vitals ? (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-3 gap-2.5 text-xs font-mono">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Pressure</span>
                          <span className="font-black text-slate-900">
                            {item.vitals.bp_systolic || '—'}/{item.vitals.bp_diastolic || '—'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Pulse</span>
                          <span className="font-black text-slate-900">{item.vitals.heart_rate || '—'} bpm</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">SpO2 Oxygen</span>
                          <span className="font-black text-slate-900">{item.vitals.spo2 || '—'}%</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Body Temp</span>
                          <span className="font-black text-slate-900">
                            {item.vitals.temperature || '—'}°{item.vitals.temperature_unit || 'F'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Sugar</span>
                          <span className="font-black text-slate-900">
                            {item.vitals.blood_glucose ? `${item.vitals.blood_glucose} mg/dL` : '—'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Weight / BMI</span>
                          <span className="font-black text-slate-900">
                            {item.vitals.weight_kg ? `${item.vitals.weight_kg}kg` : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-center">
                        <p className="text-xs text-amber-800 font-medium">
                          Patient is in waiting queue. Vitals not recorded by triage nurse yet.
                        </p>
                      </div>
                    )}

                    {/* Abnormal Condition Flags */}
                    {item.abnormal_flags && item.abnormal_flags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.abnormal_flags.map((flag, fi) => (
                          <span
                            key={fi}
                            className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold flex items-center gap-1"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>{flag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-500 font-medium">
                        {labCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200 flex items-center gap-1">
                            <Microscope className="w-3 h-3 text-purple-600" />
                            <span>{labCount} Lab Test Order(s)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No lab tests ordered</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectDetails(item)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inspect Vitals & Labs</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INSPECT VITALS & LAB DETAILS MODAL ── */}
      {inspectingItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setInspectingItem(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center font-bold shadow-xs">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Clinical Triage & Diagnostic Inspection
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    {inspectingItem.patient?.name || 'Patient'} • Attending: Dr. {inspectingItem.doctor?.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-left">
              {/* Triage Vitals Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clinical Vital Signs</span>
                </h4>

                {inspectingItem.vitals ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Pressure</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.bp_systolic || '—'} / {inspectingItem.vitals.bp_diastolic || '—'} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Heart Rate</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.heart_rate || '—'} bpm
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Oxygen</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.spo2 || '—'}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Body Temp</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.temperature || '—'}°{inspectingItem.vitals.temperature_unit || 'F'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Sugar</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.blood_glucose ? `${inspectingItem.vitals.blood_glucose} mg/dL` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Weight / BMI</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectingItem.vitals.weight_kg ? `${inspectingItem.vitals.weight_kg} kg` : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No vitals logged yet for this appointment.</p>
                )}

                {/* Nurse Notes */}
                {inspectingItem.vitals?.notes && (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900">
                    <span className="font-bold block mb-0.5">Triage Nurse Notes:</span>
                    <p>{inspectingItem.vitals.notes}</p>
                    {inspectingItem.vitals.recorded_by_name && (
                      <span className="text-[10px] text-teal-700 font-mono block mt-1">
                        Recorded by: {inspectingItem.vitals.recorded_by_name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Lab Diagnostic Tests Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Microscope className="w-3.5 h-3.5 text-purple-600" />
                  <span>Diagnostic Lab Orders & Results</span>
                </h4>

                {isLoadingLabTests ? (
                  <div className="p-6 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0B5A54]" />
                    <p>Loading lab diagnostics...</p>
                  </div>
                ) : inspectingLabTests.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-slate-500 font-medium">No diagnostic lab orders created for this visit yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {inspectingLabTests.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 text-xs font-heading">
                            {t.test_type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {t.status || 'In Analysis'}
                          </span>
                        </div>

                        {t.free_text_result && (
                          <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                            {t.free_text_result}
                          </p>
                        )}

                        {t.structured_results && Object.keys(t.structured_results).length > 0 && (
                          <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono">
                            {Object.entries(t.structured_results).map(([param, val]: any) => (
                              <div key={param}>
                                <span className="text-slate-400 block text-[10px]">{param}</span>
                                <span className="font-bold text-slate-800">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const itm = inspectingItem;
                  setInspectingItem(null);
                  handleSelectPatientFromTracker(itm);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Begin Arrival Check-In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PatientQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        hospitalId={currentStaff?.hospitalId || currentStaff?.hospital_id}
        hospitalName={currentStaff?.hospitalName || currentStaff?.hospital_name}
        portalRole="receptionist"
        onPatientLoaded={handlePatientQrScanned}
      />
    </div>
  );
};

export default PatientCheckIn;
