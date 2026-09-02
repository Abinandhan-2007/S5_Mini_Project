import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import type { PatientEMRRecord } from '../../types/doctor';
import { staffConsultationService } from '../../services/consultationService';

export const DoctorEMRSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<PatientEMRRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = async () => {
    setIsLoading(true);
    try {
      const all = await staffConsultationService.getAllEMRRecords();
      setRecords(all);
      if (all.length > 0 && !selectedPatientId) {
        setSelectedPatientId(all[0].patientId);
        setExpandedVisitId(all[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await staffConsultationService.searchEMR(searchQuery);
      setRecords(result);
      if (result.length > 0) {
        setSelectedPatientId(result[0].patientId);
        setExpandedVisitId(result[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Group records by unique patient
  const uniquePatients = Array.from(
    new Set(records.map((r) => r.patientId))
  ).map((pid) => {
    const patientVisits = records.filter((r) => r.patientId === pid);
    return {
      patientId: pid,
      patientName: patientVisits[0].patientName,
      age: patientVisits[0].age,
      gender: patientVisits[0].gender,
      bloodGroup: patientVisits[0].bloodGroup,
      phone: patientVisits[0].phone,
      lastVisitDate: patientVisits[0].date,
      hospitalName: patientVisits[0].hospitalName,
      visitsCount: patientVisits.length,
      visits: patientVisits,
    };
  });

  const activePatient = uniquePatients.find((p) => p.patientId === selectedPatientId) || uniquePatients[0];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Search Header ────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-[#0B5A54]" />
          <h1 className="text-lg font-black text-slate-900">EMR & Longitudinal Patient Records</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Search across the CarePulse multi-hospital clinical database by patient name, phone number, ticket, or diagnosis.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, phone number, diagnosis (e.g. Sarah, Chest, Hypertension)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Search EMR
          </button>
        </form>
      </div>

      {/* ── 2-Column Split: Patient Roster & Visit Timeline ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Patient Matches (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Patient Archive ({uniquePatients.length})
            </h2>
            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              Hospital Unified
            </span>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading EMR index...</div>
            ) : uniquePatients.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No matching patient records</div>
            ) : (
              uniquePatients.map((pat) => {
                const isSelected = pat.patientId === selectedPatientId;
                return (
                  <div
                    key={pat.patientId}
                    onClick={() => {
                      setSelectedPatientId(pat.patientId);
                      setExpandedVisitId(pat.visits[0]?.id || null);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/70 border-[#0B5A54] shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {pat.patientName}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {pat.age}y · Blood {pat.bloodGroup} · {pat.gender}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 shrink-0">
                        {pat.visitsCount} {pat.visitsCount === 1 ? 'Visit' : 'Visits'}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Last: {pat.lastVisitDate}</span>
                      <span className="font-medium text-slate-600 truncate max-w-[120px]">{pat.hospitalName}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Longitudinal Timeline & Detail View (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {activePatient ? (
            <>
              {/* Patient Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                    {activePatient.patientName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">{activePatient.patientName}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>Age: <strong>{activePatient.age}y</strong></span>
                      <span>•</span>
                      <span>Blood Group: <strong className="text-rose-700">{activePatient.bloodGroup}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong>{activePatient.phone}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const summary = `CarePulse EMR: ${activePatient.patientName} (${activePatient.age}y, ${activePatient.bloodGroup}). Total visits: ${activePatient.visitsCount}. Last diagnosis: ${activePatient.visits[0]?.soapNotes.assessment || 'N/A'}`;
                      navigator.clipboard?.writeText(summary);
                      showToast(`Copied clinical summary for ${activePatient.patientName}`);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0B5A54] rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Copy Summary</span>
                  </button>
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>EMR Verified</span>
                  </span>
                </div>
              </div>

              {/* Vertical Timeline of Visits */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Clinical Visit History Timeline ({activePatient.visits.length} Recorded Visits)
                  </h3>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activePatient.visits.map((visit) => {
                    const isExpanded = expandedVisitId === visit.id;
                    return (
                      <div key={visit.id} className="relative">
                        {/* Timeline Bullet Node */}
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[#0B5A54] border-2 border-white shadow-xs ring-2 ring-teal-100" />

                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                          {/* Visit Summary Header */}
                          <div
                            onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                            className="p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                                  {visit.date}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200">
                                  {visit.doctorSpecialty}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-semibold mt-1">
                                Diagnosis: <span className="text-[#0B5A54]">{visit.soapNotes.assessment || visit.chiefComplaint}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Attending: {visit.doctorName} · {visit.hospitalName}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">
                                {isExpanded ? 'Collapse' : 'Expand Details'}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            </div>
                          </div>

                          {/* Expanded Visit Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="p-5 border-t border-slate-100 space-y-5"
                              >
                                {/* 1. Vitals Grid Recorded at this visit */}
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Vitals at Consultation
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                      <span className="text-[10px] text-slate-400 font-semibold block">Blood Pressure</span>
                                      <span className="text-xs font-black text-slate-800 font-mono">{visit.vitals.bpSys}/{visit.vitals.bpDia} mmHg</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                      <span className="text-[10px] text-slate-400 font-semibold block">Pulse Rate</span>
                                      <span className="text-xs font-black text-slate-800 font-mono">{visit.vitals.heartRate} bpm</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                      <span className="text-[10px] text-slate-400 font-semibold block">SpO₂</span>
                                      <span className="text-xs font-black text-slate-800 font-mono">{visit.vitals.spo2}%</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                      <span className="text-[10px] text-slate-400 font-semibold block">Temperature</span>
                                      <span className="text-xs font-black text-slate-800 font-mono">{visit.vitals.temperature}°F</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                                      <span className="text-[10px] text-slate-400 font-semibold block">Weight</span>
                                      <span className="text-xs font-black text-slate-800 font-mono">{visit.vitals.weight} kg</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. SOAP Notes Grid */}
                                <div className="space-y-2.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Clinical SOAP Documentation
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                      <p className="font-extrabold text-[#0B5A54] mb-1">Subjective (Symptoms)</p>
                                      <p className="text-slate-700 leading-relaxed">{visit.soapNotes.subjective}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                      <p className="font-extrabold text-[#0B5A54] mb-1">Objective (Findings)</p>
                                      <p className="text-slate-700 leading-relaxed">{visit.soapNotes.objective}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200">
                                      <p className="font-extrabold text-teal-800 mb-1">Assessment (Diagnosis)</p>
                                      <p className="text-teal-950 font-bold leading-relaxed">{visit.soapNotes.assessment}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                      <p className="font-extrabold text-[#0B5A54] mb-1">Plan & Orders</p>
                                      <p className="text-slate-700 leading-relaxed">{visit.soapNotes.plan}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. Prescriptions Table */}
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Prescriptions Issued ({visit.prescriptions.length})
                                  </span>
                                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                                    {visit.prescriptions.map((rx) => (
                                      <div key={rx.id} className="py-2 flex items-center justify-between">
                                        <div>
                                          <p className="font-bold text-slate-900">{rx.drugName}</p>
                                          <p className="text-[11px] text-slate-500 italic">{rx.instructions}</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                            {rx.dosage} · {rx.frequency}
                                          </span>
                                          <p className="text-[10px] text-slate-400 mt-0.5">{rx.duration}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              Select a patient from the archive list to view longitudinal medical records.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorEMRSearch;
