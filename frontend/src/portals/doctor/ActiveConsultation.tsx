// src/portals/doctor/ActiveConsultation.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  Weight,
  FileText,
  Clock,
  Pill,
  Plus,
  Trash2,
  Save,
  Printer,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  ArrowLeft,
  Stethoscope,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { PrescriptionMedicine, SoapNotes, PatientVitals, PatientEMRRecord, TriagePriority } from '../../types/doctor';
import { staffConsultationService } from '../../services/consultationService';
import { useStaffStore } from '../../store/staffStore';

export interface ActiveConsultationProps {
  patient: TokenQueueItem | null;
  onFinishVisit: (consultationResult: {
    diagnosis: string;
    assessment: string;
    clinicalNotes: string;
    prescriptionDetails: string;
    prescriptions: string[];
    followUpDays: number;
    soapNotes: SoapNotes;
    prescriptionsList: PrescriptionMedicine[];
  }) => Promise<void>;
  onBackToDashboard: () => void;
}

const COMMON_DRUG_PRESETS = [
  { name: 'Paracetamol 650mg', dosage: '1 Tab', frequency: 'TDS (Thrice daily)', duration: '3 Days', instructions: 'Take after meals for fever/pain' },
  { name: 'Amoxicillin + Clavulanic Acid 625mg', dosage: '1 Tab', frequency: 'BD (Twice daily)', duration: '5 Days', instructions: 'Complete full course after meals' },
  { name: 'Pantoprazole 40mg', dosage: '1 Tab', frequency: 'OD (Once daily)', duration: '7 Days', instructions: 'Take empty stomach in morning' },
  { name: 'Cetirizine 10mg', dosage: '1 Tab', frequency: 'OD (Night)', duration: '5 Days', instructions: 'Take at bedtime for allergy/cold' },
  { name: 'Telmisartan 40mg', dosage: '1 Tab', frequency: 'OD (Morning)', duration: '30 Days', instructions: 'Take daily after breakfast' },
  { name: 'Metformin 500mg (SR)', dosage: '1 Tab', frequency: 'BD (Twice daily)', duration: '30 Days', instructions: 'Take with major meals' },
  { name: 'Azithromycin 500mg', dosage: '1 Tab', frequency: 'OD (Once daily)', duration: '3 Days', instructions: 'Take 1 hour before food' },
  { name: 'Ibuprofen 400mg', dosage: '1 Tab', frequency: 'BD (Twice daily)', duration: '3 Days', instructions: 'Take strictly with or after food' },
];

const QUICK_DIAGNOSES = [
  'Acute Upper Respiratory Tract Infection',
  'Stage 1 Essential Hypertension',
  'Acute Viral Gastroenteritis',
  'Type 2 Diabetes Mellitus Review',
  'Tension Headache / Cervical Strain',
  'Contact Dermatitis & Eczema',
  'Acid Peptic Disease / GERD',
  'Seasonal Allergic Rhinitis',
  'Musculoskeletal Lumbar Back Strain',
  'Routine Preventive Health Checkup',
];

export const ActiveConsultation: React.FC<ActiveConsultationProps> = ({
  patient,
  onFinishVisit,
  onBackToDashboard,
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);

  // Vitals State
  const [vitals, setVitals] = useState<PatientVitals>({
    bpSys: 120,
    bpDia: 80,
    heartRate: 74,
    temperature: 98.6,
    spo2: 99,
    weight: 68,
    recordedAt: 'Today 09:30 AM',
  });

  // SOAP Notes State
  const [soap, setSoap] = useState<SoapNotes>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  // Prescriptions List State
  const [prescriptions, setPrescriptions] = useState<PrescriptionMedicine[]>([
    {
      id: 'rx-init-1',
      drugName: 'Paracetamol 650mg',
      dosage: '1 Tab',
      frequency: 'TDS (Thrice daily)',
      duration: '3 Days',
      instructions: 'Take after food for fever/body ache',
    },
  ]);

  const [followUpDays, setFollowUpDays] = useState<number>(7);
  const [isHistoryVaultOpen, setIsHistoryVaultOpen] = useState(true);
  const [pastRecords, setPastRecords] = useState<PatientEMRRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Auto-fill initial context when patient changes
  useEffect(() => {
    if (!patient) return;

    // 1. Check for existing draft
    const draft = staffConsultationService.getDraft(patient.id);
    if (draft) {
      if (draft.soap) setSoap(draft.soap);
      if (draft.prescriptions) setPrescriptions(draft.prescriptions);
      if (draft.vitals) setVitals(draft.vitals);
      if (draft.followUpDays) setFollowUpDays(draft.followUpDays);
    } else {
      // Pre-fill subjective with health issue / intake
      setSoap({
        subjective: `Patient reports: ${patient.healthIssue || (patient as any).issue || 'Routine Consultation'}. Symptoms presented during OPD triage.`,
        objective: `Vitals recorded: BP 120/80 mmHg, Pulse 74 bpm, SpO2 99%, Temp 98.6°F. General physical examination unremarkable. S1/S2 heard, lungs clear.`,
        assessment: patient.diagnosis || patient.assessment || patient.healthIssue || '',
        plan: `Continue prescribed medication regimen. Maintain adequate hydration and rest. Follow up in ${followUpDays} days.`,
      });
    }

    // 2. Fetch past EMR history
    setIsLoadingHistory(true);
    staffConsultationService.getPatientConsultations(patient.patientName || (patient as any).name || '')
      .then((records) => {
        setPastRecords(records);
        setIsLoadingHistory(false);
      })
      .catch(() => setIsLoadingHistory(false));
  }, [patient?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add a medication row
  const handleAddMedication = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        id: `rx-${Date.now()}`,
        drugName: '',
        dosage: '1 Tab',
        frequency: 'BD (Twice daily)',
        duration: '5 Days',
        instructions: 'Take after meals',
      },
    ]);
  };

  const handleUpdateMed = (id: string, field: keyof PrescriptionMedicine, val: string) => {
    setPrescriptions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleRemoveMed = (id: string) => {
    setPrescriptions((prev) => prev.filter((m) => m.id !== id));
  };

  const handleApplyPresetDrug = (preset: typeof COMMON_DRUG_PRESETS[0]) => {
    setPrescriptions((prev) => [
      ...prev.filter((p) => p.drugName.trim() !== ''),
      {
        id: `rx-${Date.now()}`,
        drugName: preset.name,
        dosage: preset.dosage,
        frequency: preset.frequency,
        duration: preset.duration,
        instructions: preset.instructions,
      },
    ]);
    showToast(`Added ${preset.name} to prescription`);
  };

  // Save Draft
  const handleSaveDraft = () => {
    if (!patient) return;
    setIsSavingDraft(true);
    staffConsultationService.saveDraft(patient.id, {
      soap,
      prescriptions,
      vitals,
      followUpDays,
    });
    setTimeout(() => {
      setIsSavingDraft(false);
      showToast('Draft clinical notes saved securely.');
    }, 400);
  };

  // Print Prescription
  const handlePrintPrescription = () => {
    window.print();
  };

  // Finish Visit & Save to EMR
  const handleCompleteVisit = async () => {
    if (!patient) return;
    setIsFinishing(true);

    try {
      const finalAssessment = soap.assessment.trim() || patient.healthIssue || 'Clinical Consultation Completed';
      const medStrings = prescriptions
        .filter((m) => m.drugName.trim())
        .map((m) => `${m.drugName} (${m.dosage}, ${m.frequency}, ${m.duration} - ${m.instructions})`);

      const prescriptionDetails = medStrings.length > 0
        ? medStrings.join(' • ')
        : 'Standard clinical care and medical advice given.';

      // Save to longitudinal EMR archive
      await staffConsultationService.createConsultation({
        patientId: patient.patientId || patient.id,
        patientName: patient.patientName || (patient as any).name || 'Patient',
        age: patient.age || 32,
        gender: patient.bloodGroup ? 'Recorded' : 'Adult',
        bloodGroup: patient.bloodGroup || 'O+',
        phone: patient.patientPhone || '+91 98765 00000',
        doctorId: currentStaff?.id || 'doc-1',
        doctorName: currentStaff?.name || 'Dr. Olivia Wilson',
        doctorSpecialty: currentStaff?.department || 'Consultant Physician',
        hospitalName: hospitalSettings?.name || 'CarePulse Central Hospital',
        chiefComplaint: patient.healthIssue || (patient as any).issue || 'Outpatient Consultation',
        intakeNotes: `Token ${patient.tokenNumber}, Slot ${patient.timeSlot || (patient as any).slot || '10:00 AM'}`,
        triagePriority: 'Normal',
        vitals,
        soapNotes: soap,
        prescriptions,
        followUpDays,
        allergies: ['Penicillin (mild)'],
      });

      // Clear draft
      staffConsultationService.clearDraft(patient.id);

      // Trigger store callback
      await onFinishVisit({
        diagnosis: finalAssessment,
        assessment: soap.assessment,
        clinicalNotes: `SOAP Notes:\nS: ${soap.subjective}\nO: ${soap.objective}\nA: ${soap.assessment}\nP: ${soap.plan}`,
        prescriptionDetails,
        prescriptions: medStrings,
        followUpDays,
        soapNotes: soap,
        prescriptionsList: prescriptions,
      });

      showToast(`Consultation completed for ${patient.patientName || (patient as any).name || 'Patient'}`);
    } catch (err) {
      console.error('Failed to complete consultation:', err);
      showToast('Error completing consultation. Please retry.');
    } finally {
      setIsFinishing(false);
    }
  };

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0B5A54] flex items-center justify-center mb-4">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-1">No Active Patient In Cabin</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Please select a patient from the Queue or click "Call Next Patient" on the Dashboard to start a consultation.
        </p>
        <button
          onClick={onBackToDashboard}
          className="px-6 py-2.5 rounded-full bg-[#0B5A54] text-white font-bold text-xs shadow-md hover:bg-[#084843] transition-all cursor-pointer"
        >
          Return to Doctor Dashboard
        </button>
      </div>
    );
  }

  // Triage Priority Derived
  const triagePriority: TriagePriority =
    (patient.age && (patient.age < 12 || patient.age >= 65))
      ? 'Senior-Child'
      : (patient.healthIssue?.toLowerCase().includes('chest') ||
         patient.healthIssue?.toLowerCase().includes('breath') ||
         patient.healthIssue?.toLowerCase().includes('severe'))
      ? 'Urgent'
      : 'Normal';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900">
                Active Consultation Room
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                In Progress
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Token <strong className="text-slate-800 font-mono">{patient.tokenNumber}</strong> · Ticket <strong className="text-slate-800 font-mono">{patient.ticketNumber || '#CP-2026'}</strong> · Slot <span className="font-semibold">{patient.timeSlot || (patient as any).slot || '10:00 AM'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            onClick={handlePrintPrescription}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Rx</span>
          </button>
          <button
            onClick={handleCompleteVisit}
            disabled={isFinishing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{isFinishing ? 'Saving Record...' : 'Finish Visit'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Clinical Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (5 COLS) — PATIENT CONTEXT & INTAKE (READ-ONLY)
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Patient Demographics Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                  {(patient.patientName || (patient as any).name || 'P').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {patient.patientName || (patient as any).name}
                    </h2>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        triagePriority === 'Urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : triagePriority === 'Senior-Child'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                      }`}
                    >
                      {triagePriority} Priority
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                    <span>{patient.age || 32} Years</span>
                    <span>•</span>
                    <span>{patient.bloodGroup ? 'Recorded' : 'Adult'}</span>
                    <span>•</span>
                    <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                      Blood: {patient.bloodGroup || 'O+'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 font-mono font-black text-xs rounded-xl border border-amber-200 shadow-2xs">
                  {patient.tokenNumber}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{patient.ticketNumber || '#CP-2026'}</p>
              </div>
            </div>

            {/* Quick Contact & Shift Info */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Phone / Mobile</span>
                <span className="font-semibold text-slate-700">{patient.patientPhone || (patient as any).phone || '+91 98765 43210'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Consultation Type</span>
                <span className="font-semibold text-slate-700">{patient.type || 'In-Person Consultation'}</span>
              </div>
            </div>
          </div>

          {/* 2. Vitals Stat Tiles (Color-Coded Flags) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="font-extrabold text-slate-900 text-sm">Patient Intake Vitals</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{vitals.recordedAt}</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* BP */}
              <div className={`p-3 rounded-xl border ${
                vitals.bpSys > 130 || vitals.bpSys < 90
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">BP</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900 font-mono">{vitals.bpSys}/{vitals.bpDia}</span>
                  <span className="text-[9px] text-slate-400">mmHg</span>
                </div>
                {vitals.bpSys > 130 && (
                  <span className="text-[9px] text-amber-700 font-bold block mt-0.5">Pre-High</span>
                )}
              </div>

              {/* Heart Rate */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pulse</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900 font-mono">{vitals.heartRate}</span>
                  <span className="text-[9px] text-slate-400">bpm</span>
                </div>
                <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">Normal</span>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">SpO₂</span>
                  <Wind className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900 font-mono">{vitals.spo2}%</span>
                </div>
                <span className="text-[9px] text-sky-700 font-bold block mt-0.5">Optimal</span>
              </div>

              {/* Temp */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Temp</span>
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900 font-mono">{vitals.temperature}</span>
                  <span className="text-[9px] text-slate-400">°F</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Afebrile</span>
              </div>

              {/* Weight */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Weight</span>
                  <Weight className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900 font-mono">{vitals.weight}</span>
                  <span className="text-[9px] text-slate-400">kg</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium block mt-0.5">BMI 23.5</span>
              </div>

              {/* Blood Group */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Blood</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-rose-700 font-mono">{patient.bloodGroup || 'O+'}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Verified</span>
              </div>
            </div>
          </div>

          {/* 3. Chief Complaint & Receptionist Intake Quoted Card */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4.5">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-extrabold text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chief Complaint / Front Desk Intake Note</span>
            </div>
            <blockquote className="text-xs text-amber-950/90 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-amber-200/60">
              "{patient.healthIssue || (patient as any).issue || 'Patient requested general routine physician consultation.'}"
            </blockquote>
          </div>

          {/* 4. Collapsible Medical History / EMR Vault */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <button
              onClick={() => setIsHistoryVaultOpen(!isHistoryVaultOpen)}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-[#0B5A54] shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm">Medical History & EMR Vault</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] text-[10px] font-bold border border-teal-200">
                  {pastRecords.length} Past Visits
                </span>
              </div>
              {isHistoryVaultOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            <AnimatePresence>
              {isHistoryVaultOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-5 space-y-4 border-t border-slate-100"
                >
                  {/* Known Allergies Pill Strip */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Known Allergies & Contraindications</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Penicillin (Mild urticaria)', 'Sulfa drugs (Reported)', 'NSAIDs (Mild gastritis)'].map((alg, i) => (
                        <span key={i} className="text-[11px] font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                          ⚠️ {alg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Past Visits Timeline */}
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Past Visits History</p>
                    {isLoadingHistory ? (
                      <div className="py-4 text-center text-xs text-slate-400">Loading EMR archive...</div>
                    ) : pastRecords.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                        First visit on record for this patient.
                      </div>
                    ) : (
                      pastRecords.map((rec) => (
                        <div key={rec.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{rec.date}</span>
                            <span className="text-[10px] text-teal-700 font-semibold">{rec.doctorSpecialty}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-tight font-medium">
                            <strong className="text-slate-800">Diagnosis:</strong> {rec.soapNotes.assessment}
                          </p>
                          <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span>{rec.prescriptions.length} Prescriptions issued</span>
                            <span className="font-mono text-slate-400">{rec.hospitalName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (7 COLS) — CLINICAL DOCUMENTATION WORKSPACE
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* 1. SOAP Notes Editor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0B5A54]" />
                <h2 className="text-base font-black text-slate-900">Clinical SOAP Notes</h2>
              </div>
              <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Standard Clinical Record
              </span>
            </div>

            {/* Quick Diagnoses Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Diagnosis Shortcuts
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {QUICK_DIAGNOSES.map((diag) => (
                  <button
                    key={diag}
                    type="button"
                    onClick={() => setSoap((s) => ({ ...s, assessment: diag }))}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      soap.assessment === diag
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54]'
                        : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    + {diag}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 SOAP Fields */}
            <div className="space-y-3.5">
              {/* S - Subjective */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  <span className="text-[#0B5A54] font-black mr-1">S —</span>
                  Subjective (Patient Symptoms & History of Present Illness)
                </label>
                <textarea
                  rows={2}
                  value={soap.subjective}
                  onChange={(e) => setSoap((s) => ({ ...s, subjective: e.target.value }))}
                  placeholder="Patient's primary complaint, duration, severity, and aggravating/relieving factors..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all"
                />
              </div>

              {/* O - Objective */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  <span className="text-[#0B5A54] font-black mr-1">O —</span>
                  Objective (Physical Examination, Clinical Signs & Vitals)
                </label>
                <textarea
                  rows={2}
                  value={soap.objective}
                  onChange={(e) => setSoap((s) => ({ ...s, objective: e.target.value }))}
                  placeholder="General physical exam, auscultation, palpation findings, vitals summary..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all"
                />
              </div>

              {/* A - Assessment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  <span className="text-[#0B5A54] font-black mr-1">A —</span>
                  Assessment (Primary & Differential Diagnosis)
                </label>
                <input
                  type="text"
                  value={soap.assessment}
                  onChange={(e) => setSoap((s) => ({ ...s, assessment: e.target.value }))}
                  placeholder="Primary diagnosis (e.g. Acute Upper Respiratory Infection)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all"
                />
              </div>

              {/* P - Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  <span className="text-[#0B5A54] font-black mr-1">P —</span>
                  Plan (Treatment Plan, Diet/Lifestyle, Lab Orders & Follow-Up)
                </label>
                <textarea
                  rows={2}
                  value={soap.plan}
                  onChange={(e) => setSoap((s) => ({ ...s, plan: e.target.value }))}
                  placeholder="Therapeutic recommendations, patient education, dietary adjustments..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. Digital Prescription Builder */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#0B5A54]" />
                <h2 className="text-base font-black text-slate-900">Digital Prescription Builder (Rx)</h2>
              </div>
              <button
                type="button"
                onClick={handleAddMedication}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-bold text-xs flex items-center gap-1 border border-teal-200 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Common Drug Quick Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Pharmacy Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DRUG_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPresetDrug(preset)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0B5A54] border border-slate-200 transition-all cursor-pointer"
                  >
                    + {preset.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Medicine Rows */}
            <div className="space-y-3">
              {prescriptions.map((med, index) => (
                <div
                  key={med.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 relative group transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Rx #{index + 1}
                    </span>
                    {prescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(med.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Drug Name */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Drug Name</label>
                      <input
                        type="text"
                        value={med.drugName}
                        onChange={(e) => handleUpdateMed(med.id, 'drugName', e.target.value)}
                        placeholder="e.g. Paracetamol 650mg"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>

                    {/* Dosage */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleUpdateMed(med.id, 'dosage', e.target.value)}
                        placeholder="1 Tab"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Frequency</label>
                      <select
                        value={med.frequency}
                        onChange={(e) => handleUpdateMed(med.id, 'frequency', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      >
                        <option value="OD (Once daily)">OD (Once daily)</option>
                        <option value="BD (Twice daily)">BD (Twice daily)</option>
                        <option value="TDS (Thrice daily)">TDS (Thrice daily)</option>
                        <option value="QID (Four times)">QID (Four times)</option>
                        <option value="SOS (As needed)">SOS (As needed)</option>
                        <option value="HS (Bedtime)">HS (Bedtime)</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Duration</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleUpdateMed(med.id, 'duration', e.target.value)}
                        placeholder="3 Days"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="sm:col-span-12">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Instructions / Food timing</label>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => handleUpdateMed(med.id, 'instructions', e.target.value)}
                        placeholder="e.g. After meals with warm water"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Follow Up Days Selector */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Next Follow-Up Review:</label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFollowUpDays(days)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      followUpDays === days
                        ? 'bg-[#0B5A54] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Live Printable Prescription Slip Preview */}
          <div ref={printAreaRef} className="bg-white rounded-2xl border-2 border-dashed border-teal-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">CarePulse Health System</h3>
                <p className="text-[11px] text-slate-500 font-medium">Outpatient Consultation Slip · {hospitalSettings?.name || 'Central Hospital'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold text-[#0B5A54]">{currentStaff?.name || 'Dr. Olivia Wilson'}</p>
                <p className="text-[10px] text-slate-500 font-mono">Cabin ID: {currentStaff?.staff_code || 'D001101'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 text-xs py-2 bg-slate-50 p-3 rounded-xl">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Patient Name</p>
                <p className="font-extrabold text-slate-900">{patient.patientName || (patient as any).name}</p>
                <p className="text-[11px] text-slate-500">Age: {patient.age || 32}y · Blood: {patient.bloodGroup || 'O+'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Token & Date</p>
                <p className="font-mono font-bold text-slate-900">{patient.tokenNumber}</p>
                <p className="text-[11px] text-slate-500">{new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Rx Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 font-serif text-lg font-black text-[#0B5A54]">
                <span>℞</span>
                <span className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Prescription Order</span>
              </div>

              <div className="divide-y divide-slate-100">
                {prescriptions.filter((m) => m.drugName.trim()).map((m, idx) => (
                  <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{idx + 1}. {m.drugName}</p>
                      <p className="text-[11px] text-slate-500 italic">{m.instructions}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {m.dosage} · {m.frequency}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Follow-Up in {followUpDays} Days</span>
              <span className="italic font-serif">Physician Signature: ___________________</span>
            </div>
          </div>

        </div>

      </div>

      {/* Sticky Bottom Action Bar (Mobile & Desktop) */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-[#0B5A54] font-bold text-xs">
            {patient.tokenNumber.split('-')[1] || '01'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black text-slate-900 truncate">{patient.patientName || (patient as any).name}</p>
            <p className="text-[10px] text-slate-400 font-mono">Ticket {patient.ticketNumber || '#CP-2026'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            onClick={handlePrintPrescription}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print Prescription</span>
          </button>
          <button
            onClick={handleCompleteVisit}
            disabled={isFinishing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-teal-900/20 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{isFinishing ? 'Completing...' : 'Finish Visit & Close Cabin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveConsultation;
