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
  ChevronRight
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import { useStaffStore } from '../../store/staffStore';
import type { NurseQueueItem, VitalsStatus } from '../../types/nurse';
import { VitalsEntryModal } from './VitalsEntryModal';
import { TestEntryModal } from './TestEntryModal';

export const NurseQueueDashboard: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);

  const [queue, setQueue] = useState<NurseQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VitalsStatus>('all');

  // Modals state
  const [selectedItemForVitals, setSelectedItemForVitals] = useState<NurseQueueItem | null>(null);
  const [selectedItemForTests, setSelectedItemForTests] = useState<NurseQueueItem | null>(null);

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
    // Auto-refresh queue every 20 seconds
    const interval = setInterval(fetchQueue, 20000);
    return () => clearInterval(interval);
  }, [currentStaff]);

  // Filtered Queue
  const filteredQueue = queue.filter((item) => {
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
  const totalWaiting = queue.length;
  const pendingCount = queue.filter((i) => i.vitals_status === 'pending').length;
  const recordedCount = queue.filter((i) => i.vitals_status === 'recorded').length;
  const flaggedCount = queue.filter((i) => i.vitals_status === 'abnormal_flagged').length;

  return (
    <div className="space-y-6">
      {/* ── METRIC STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Queue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue Total</p>
            <h3 className="text-2xl font-black text-slate-800 font-heading mt-0.5">{totalWaiting}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Checked-in today</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Vitals */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'pending' ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Vitals</p>
            <h3 className="text-2xl font-black text-amber-600 font-heading mt-0.5">{pendingCount}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting nurse triage</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Normal Recorded */}
        <div
          onClick={() => setStatusFilter('recorded')}
          className={`p-4 rounded-2xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'recorded' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Normal Recorded</p>
            <h3 className="text-2xl font-black text-emerald-600 font-heading mt-0.5">{recordedCount}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ready for doctor</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Abnormal Flagged */}
        <div
          onClick={() => setStatusFilter('abnormal_flagged')}
          className={`p-4 rounded-2xl bg-white border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'abnormal_flagged' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-200 hover:border-rose-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Abnormal Alerts</p>
            <h3 className="text-2xl font-black text-rose-600 font-heading mt-0.5">{flaggedCount}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Priority physician review</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, token #, patient ID, or doctor..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#0B5A54] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Patients ({queue.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('recorded')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'recorded'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recorded ({recordedCount})
          </button>
          <button
            onClick={() => setStatusFilter('abnormal_flagged')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'abnormal_flagged'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Abnormal ({flaggedCount})
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchQueue}
          disabled={isLoading}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0B5A54]' : ''}`} />
        </button>
      </div>

      {/* ── QUEUE PATIENT CARDS LIST ── */}
      {filteredQueue.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 mx-auto flex items-center justify-center text-[#0B5A54]">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 font-heading">No Checked-in Patients in Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Patients checked in by the receptionist for today's consultations will automatically appear here for pre-consultation vitals recording.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueue.map((item) => {
            const hasVitals = item.vitals_status !== 'pending';
            const isFlagged = item.vitals_status === 'abnormal_flagged';

            return (
              <div
                key={item.appointment_id}
                className={`p-4 rounded-2xl bg-white border transition-all duration-150 shadow-xs hover:shadow-md ${
                  isFlagged
                    ? 'border-rose-300 bg-rose-50/15'
                    : hasVitals
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Token & Patient Info */}
                  <div className="flex items-start gap-3.5">
                    {/* Token Badge */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        isFlagged
                          ? 'bg-rose-100 border-rose-300 text-rose-800'
                          : hasVitals
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider">Token</span>
                      <span className="text-base font-black leading-none">{item.token_number || '--'}</span>
                    </div>

                    {/* Patient Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-heading">{item.patient.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                          {item.patient.patient_code || 'PT-REG'}
                        </span>
                        {/* Status Badge */}
                        {isFlagged ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Abnormal Vitals
                          </span>
                        ) : hasVitals ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3" /> Vitals Recorded
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Vitals
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs mt-1">
                        <span>{item.patient.gender || 'Not specified'}</span>
                        <span>&bull;</span>
                        <span>Blood Group: <strong className="text-slate-700">{item.patient.blood_group || 'O+'}</strong></span>
                        <span>&bull;</span>
                        <span>Doctor: <strong className="text-[#0B5A54]">{item.doctor.name}</strong> ({item.doctor.room_number})</span>
                        {item.time && (
                          <>
                            <span>&bull;</span>
                            <span>Slot: {item.time}</span>
                          </>
                        )}
                      </div>

                      {/* Chief complaint */}
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        Complaint: "{item.chief_complaint}"
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Diagnostic Tests Button */}
                    <button
                      onClick={() => setSelectedItemForTests(item)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      <Microscope className="w-4 h-4 text-[#0B5A54]" />
                      <span>Lab Tests</span>
                      {item.lab_test_count !== undefined && item.lab_test_count > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#0B5A54] text-white text-[10px]">
                          {item.lab_test_count}
                        </span>
                      )}
                    </button>

                    {/* Record / Edit Vitals Button */}
                    <button
                      onClick={() => setSelectedItemForVitals(item)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                        hasVitals
                          ? 'bg-slate-800 hover:bg-slate-900 text-white'
                          : 'bg-[#0B5A54] hover:bg-[#084540] text-white'
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
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-3 text-slate-700 font-semibold">
                      {item.vitals.bp_systolic && item.vitals.bp_diastolic && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
                          BP: <strong>{item.vitals.bp_systolic}/{item.vitals.bp_diastolic}</strong> mmHg
                        </span>
                      )}
                      {item.vitals.heart_rate && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
                          HR: <strong>{item.vitals.heart_rate}</strong> bpm
                        </span>
                      )}
                      {item.vitals.spo2 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
                          SpO2: <strong>{item.vitals.spo2}%</strong>
                        </span>
                      )}
                      {item.vitals.temperature && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
                          Temp: <strong>{item.vitals.temperature}°{item.vitals.temperature_unit || 'C'}</strong>
                        </span>
                      )}
                      {item.vitals.bmi && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
                          BMI: <strong>{item.vitals.bmi}</strong>
                        </span>
                      )}
                      {item.vitals.blood_glucose && (
                        <span className="px-2 py-0.5 rounded bg-slate-100">
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
                            className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold"
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
    </div>
  );
};
