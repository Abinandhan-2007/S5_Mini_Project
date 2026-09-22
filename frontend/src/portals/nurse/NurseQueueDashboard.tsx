// frontend/src/portals/nurse/NurseQueueDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  HeartPulse,
  Microscope,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ChevronRight,
  QrCode,
  X,
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import { useStaffStore } from '../../store/staffStore';
import type { NurseQueueItem, VitalsStatus } from '../../types/nurse';
import { VitalsEntryModal } from './VitalsEntryModal';
import { TestEntryModal } from './TestEntryModal';
import { PatientQrScannerModal } from '../../components/qr/PatientQrScannerModal';
import { Patient360RecordModal } from '../../components/qr/Patient360RecordModal';

export const NurseQueueDashboard: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);

  const [queue, setQueue] = useState<NurseQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VitalsStatus>('all');

  // Modals state
  const [selectedItemForVitals, setSelectedItemForVitals] = useState<NurseQueueItem | null>(null);
  const [selectedItemForTests, setSelectedItemForTests] = useState<NurseQueueItem | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scannedPatientRecord, setScannedPatientRecord] = useState<any>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handlePatientQrLoaded = (data: any) => {
    setScannedPatientRecord(data);
    setIsDossierOpen(true);
  };

  const handleRecordVitalsFromDossier = (patientDto: any) => {
    setIsDossierOpen(false);
    const matched = queue.find(
      (q) =>
        q.patient.id === patientDto.id ||
        q.patient.name.toLowerCase() === patientDto.fullName.toLowerCase() ||
        (patientDto.patientCode && q.patient.patient_code && q.patient.patient_code.toLowerCase() === patientDto.patientCode.toLowerCase())
    );

    if (matched) {
      setSelectedItemForVitals(matched);
    } else {
      setSelectedItemForVitals({
        appointment_id: patientDto.id || `appt-${Date.now()}`,
        token_number: typeof patientDto.patientCode === 'number' ? patientDto.patientCode : 101,
        queue_status: 'waiting',
        vitals_status: 'pending',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appointment_type: 'In-Person',
        chief_complaint: patientDto.preExistingConditions || 'Triage vitals',
        patient: {
          id: patientDto.id || `pat-${Date.now()}`,
          name: patientDto.fullName,
          patient_code: patientDto.patientCode,
          gender: patientDto.gender,
          dob: patientDto.dob,
          phone: patientDto.phone,
          blood_group: patientDto.bloodGroup,
        },
        doctor: {
          id: 'doc-1',
          name: 'OPD Duty Doctor',
          specialty: 'General Medicine',
          room_number: 'Cabin 101',
        },
      });
    }
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId;
      const items = await nurseService.getQueue(hospId);
      setQueue(items);
    } catch (err) {
      console.error('Error fetching nurse queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 6 seconds
    const interval = setInterval(fetchQueue, 6000);
    return () => clearInterval(interval);
  }, [currentStaff]);

  // Filtered Queue
  const filteredQueue = queue.filter((item) => {
    // Strictly require patient to be checked in at reception
    const isCheckedIn = item.is_checked_in || item.queue_status === 'Checked In' || !!item.vitals;
    if (!isCheckedIn) return false;

    // Search query matching
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.patient.name.toLowerCase().includes(q) ||
      (item.patient.patient_code && item.patient.patient_code.toLowerCase().includes(q)) ||
      String(item.token_number || '').includes(q) ||
      item.doctor.name.toLowerCase().includes(q) ||
      (item.chief_complaint && item.chief_complaint.toLowerCase().includes(q));

    // Status filter matching
    const matchesStatus = statusFilter === 'all' || item.vitals_status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  // Summary counts
  const checkedInQueue = queue.filter((i) => i.is_checked_in || i.queue_status === 'Checked In' || !!i.vitals);
  const totalWaiting = checkedInQueue.length;
  const pendingCount = checkedInQueue.filter((i) => i.vitals_status === 'pending').length;
  const recordedCount = checkedInQueue.filter((i) => i.vitals_status === 'recorded').length;
  const flaggedCount = checkedInQueue.filter((i) => i.vitals_status === 'abnormal_flagged').length;

  return (
    <div className="space-y-6">
      {/* ── METRIC STAT CARDS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Queue Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-5 sm:p-6 rounded-xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'ring-2 ring-[#0F766E]/30 border-[#0F766E]'
              : 'border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue Total</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-1">{totalWaiting}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Checked-in today</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-[#0F766E] shrink-0">
            <Users className="w-5 h-5 text-[#0F766E]" />
          </div>
        </div>

        {/* Card 2: Pending Vitals */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`p-5 sm:p-6 rounded-xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'ring-2 ring-amber-400 border-amber-400'
              : 'border-slate-200/90 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Vitals</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-heading mt-1">{pendingCount}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Awaiting nurse triage</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Card 3: Normal Recorded */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'recorded' ? 'all' : 'recorded')}
          className={`p-5 sm:p-6 rounded-xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'recorded'
              ? 'ring-2 ring-emerald-500 border-emerald-500'
              : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Normal Recorded</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-heading mt-1">{recordedCount}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Ready for doctor review</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Card 4: Abnormal Alerts */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'abnormal_flagged' ? 'all' : 'abnormal_flagged')}
          className={`p-5 sm:p-6 rounded-xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'abnormal_flagged'
              ? 'ring-2 ring-rose-500 border-rose-500'
              : 'border-slate-200/90 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Abnormal Alerts</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-heading mt-1">{flaggedCount}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Priority physician review</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
        {/* Full-width Search Bar with 44-48px height */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, token #, patient ID, or doctor..."
            className="w-full h-11 sm:h-12 pl-10 pr-9 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Actions Row */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Segmented Control Filter Pills */}
          <div className="p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 inline-flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              All Patients ({totalWaiting})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('recorded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                statusFilter === 'recorded'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Recorded ({recordedCount})
            </button>
            <button
              onClick={() => setStatusFilter('abnormal_flagged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                statusFilter === 'abnormal_flagged'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Abnormal ({flaggedCount})
            </button>
          </div>

          {/* Scan Patient QR Accent Button */}
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="h-11 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Scan Patient Health QR Code"
          >
            <QrCode className="w-4 h-4 text-teal-100" />
            <span>Scan QR</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchQueue}
            disabled={isLoading}
            className="h-11 w-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── QUEUE PATIENT CARDS LIST ── */}
      {filteredQueue.length === 0 ? (
        <div className="py-16 sm:py-24 px-6 rounded-xl bg-white border border-slate-200/90 shadow-xs text-center flex flex-col items-center justify-center space-y-3.5">
          {/* Centered icon in a soft circular teal background */}
          <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] shadow-2xs mx-auto mb-1">
            <HeartPulse className="w-8 h-8 text-[#0F766E]" />
          </div>
          {/* Bold heading */}
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
            No Checked-in Patients in Queue
          </h3>
          {/* Muted, centered two-line description */}
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Patients checked in by the receptionist for today's consultations will automatically appear here for pre-consultation vitals recording.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredQueue.map((item) => {
            const hasVitals = item.vitals_status !== 'pending';
            const isFlagged = item.vitals_status === 'abnormal_flagged';

            return (
              <div
                key={item.appointment_id}
                className={`p-5 rounded-xl bg-white border transition-all duration-150 shadow-xs hover:shadow-sm ${
                  isFlagged
                    ? 'border-rose-300 bg-rose-50/15'
                    : hasVitals
                    ? 'border-emerald-200 bg-emerald-50/5'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Token & Patient Info */}
                  <div className="flex items-start gap-4">
                    {/* Token Badge */}
                    <div
                      className={`w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        isFlagged
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : hasVitals
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider opacity-70">Token</span>
                      <span className="text-base font-extrabold leading-none">{item.token_number || '--'}</span>
                    </div>

                    {/* Patient Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 font-heading">{item.patient.name}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                          {item.patient.patient_code || 'PT-REG'}
                        </span>

                        {/* Arrival / Check-in Badge */}
                        {item.is_checked_in || item.queue_status === 'Checked In' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#0F766E]" />
                            <span>Arrived / Checked In</span>
                          </span>
                        ) : null}

                        {/* Status Badge */}
                        {isFlagged ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Abnormal Vitals
                          </span>
                        ) : hasVitals ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3" /> Vitals Recorded
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Vitals
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs mt-1.5 font-medium">
                        <span>{item.patient.gender || 'Not specified'}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span>Blood Group: <strong className="text-slate-700">{item.patient.blood_group || 'O+'}</strong></span>
                        <span className="text-slate-300">&bull;</span>
                        <span>Doctor: <strong className="text-[#0F766E]">{item.doctor.name}</strong> ({item.doctor.room_number})</span>
                        {item.time && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span>Slot: {item.time}</span>
                          </>
                        )}
                      </div>

                      {/* Chief complaint */}
                      <p className="text-xs text-slate-600 mt-1 italic">
                        Complaint: "{item.chief_complaint}"
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {/* Diagnostic Tests Button */}
                    <button
                      onClick={() => setSelectedItemForTests(item)}
                      className="h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      <Microscope className="w-4 h-4 text-[#0F766E]" />
                      <span>Lab Tests</span>
                      {item.lab_test_count !== undefined && item.lab_test_count > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#0F766E] text-white text-[10px]">
                          {item.lab_test_count}
                        </span>
                      )}
                    </button>

                    {/* Record / Edit Vitals Button */}
                    <button
                      onClick={() => setSelectedItemForVitals(item)}
                      className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasVitals
                          ? 'bg-slate-800 hover:bg-slate-900 text-white'
                          : 'bg-[#0F766E] hover:bg-[#0d655e] text-white'
                      }`}
                    >
                      <HeartPulse className="w-4 h-4" />
                      <span>{hasVitals ? 'Update Vitals' : 'Record Vitals'}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  </div>
                </div>

                {/* Bottom Snapshot If Vitals are Recorded */}
                {hasVitals && item.vitals && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-700 font-medium">
                      {item.vitals.bp_systolic && item.vitals.bp_diastolic && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          BP: <strong>{item.vitals.bp_systolic}/{item.vitals.bp_diastolic}</strong> mmHg
                        </span>
                      )}
                      {item.vitals.heart_rate && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          HR: <strong>{item.vitals.heart_rate}</strong> bpm
                        </span>
                      )}
                      {item.vitals.spo2 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          SpO2: <strong>{item.vitals.spo2}%</strong>
                        </span>
                      )}
                      {item.vitals.temperature && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          Temp: <strong>{item.vitals.temperature}°{item.vitals.temperature_unit || 'C'}</strong>
                        </span>
                      )}
                      {item.vitals.bmi && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          BMI: <strong>{item.vitals.bmi}</strong>
                        </span>
                      )}
                      {item.vitals.blood_glucose && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-800">
                          Glucose: <strong>{item.vitals.blood_glucose}</strong> mg/dL ({item.vitals.glucose_context || 'random'})
                        </span>
                      )}
                    </div>

                    {/* Abnormal Flags Tags */}
                    {isFlagged && item.abnormal_flags && item.abnormal_flags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.abnormal_flags.map((flag, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vitals Entry Modal ── */}
      <VitalsEntryModal
        isOpen={Boolean(selectedItemForVitals)}
        onClose={() => setSelectedItemForVitals(null)}
        queueItem={selectedItemForVitals}
        onSuccess={fetchQueue}
      />

      {/* ── Diagnostic Tests Modal ── */}
      <TestEntryModal
        isOpen={Boolean(selectedItemForTests)}
        onClose={() => setSelectedItemForTests(null)}
        queueItem={selectedItemForTests}
        onSuccess={fetchQueue}
      />

      {/* ── Patient QR Scanner Modal ── */}
      <PatientQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onPatientLoaded={handlePatientQrLoaded}
      />

      {/* ── Patient 360 Comprehensive Medical Record Modal ── */}
      {scannedPatientRecord && (
        <Patient360RecordModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          data={scannedPatientRecord}
          portalRole="nurse"
          onRecordVitals={handleRecordVitalsFromDossier}
        />
      )}
    </div>
  );
};
