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
  User,
  Droplet,
  ChevronRight,
  Copy,
  Check,
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

type ConsultationTab = 'soap' | 'rx' | 'summary';

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

const CATEGORIZED_DIAGNOSES = [
  { category: 'Cardiology', items: ['Stage 1 Essential Hypertension', 'Chest Tightness Evaluation', 'Mild Sinus Tachycardia'] },
  { category: 'Respiratory', items: ['Acute Upper Respiratory Infection', 'Seasonal Allergic Rhinitis', 'Bronchial Asthma Follow-Up'] },
  { category: 'Gastroenterology', items: ['Acute Viral Gastroenteritis', 'Acid Peptic Disease / GERD', 'Functional Dyspepsia'] },
  { category: 'General / Metabolic', items: ['Type 2 Diabetes Mellitus Review', 'Routine Preventive Health Checkup', 'Musculoskeletal Lumbar Strain'] },
];

export const ActiveConsultation: React.FC<ActiveConsultationProps> = ({
  patient,
  onFinishVisit,
  onBackToDashboard,
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<ConsultationTab>('soap');

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
      instructions: 'Take after meals for fever/body ache',
    },
  ]);

  const [followUpDays, setFollowUpDays] = useState<number>(7);
  const [isHistoryVaultOpen, setIsHistoryVaultOpen] = useState(true);
  const [pastRecords, setPastRecords] = useState<PatientEMRRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(180);
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Live timer for consultation session
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        subjective: `Patient reports: ${patient.healthIssue || (patient as any).issue || 'Routine Outpatient Consultation'}. Symptoms presented during OPD triage.`,
        objective: `Vitals recorded: BP 120/80 mmHg, Pulse 74 bpm, SpO2 99%, Temp 98.6°F. General physical examination unremarkable. S1/S2 heard, lungs clear.`,
        assessment: patient.diagnosis || patient.assessment || patient.healthIssue || 'General Clinical Evaluation',
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

  const handleCopyPhone = () => {
    const phone = patient?.patientPhone || (patient as any)?.phone || '+91 98765 00000';
    navigator.clipboard.writeText(phone);
    setIsCopiedPhone(true);
    showToast('Copied patient contact number');
    setTimeout(() => setIsCopiedPhone(false), 2000);
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
    }, 350);
  };

  // Print Prescription - Formal Hospital Letterhead Stationery (A4 / PDF)
  const handlePrintPrescription = () => {
    setActiveTab('summary');
    setTimeout(() => {
      const printFrame = document.createElement('iframe');
      printFrame.setAttribute('style', 'position:fixed;width:0;height:0;left:-9999px;top:-9999px;border:none;');
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const activeDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const activeTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + followUpDays);
      const followUpFormatted = nextFollowUpDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>CarePulse_Prescription_${patient?.tokenNumber || 'Token'}_${patient?.patientName || 'Patient'}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
              * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; background: #ffffff; color: #1e293b; font-size: 11px; line-height: 1.45; }
              .page-container { width: 100%; display: flex; flex-direction: column; justify-content: space-between; min-height: 96vh; }
              .hospital-letterhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 8px; }
              .brand-block h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; color: #0B5A54; letter-spacing: -0.01em; line-height: 1.15; }
              .brand-block .tagline { font-size: 10px; font-weight: 600; color: #475569; margin-top: 2px; }
              .brand-block .accreditation { font-size: 9px; font-weight: 700; color: #D97706; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
              .brand-block .contact-line { font-size: 9px; color: #64748b; margin-top: 2px; }
              .doctor-stamp-block { text-align: right; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; min-width: 220px; }
              .doctor-stamp-block h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 13.5px; font-weight: 800; color: #0B5A54; }
              .doctor-stamp-block .specialty { font-size: 10px; font-weight: 600; color: #334155; margin-top: 1px; }
              .doctor-stamp-block .credentials { font-size: 9px; color: #64748b; margin-top: 2px; font-family: ui-monospace, monospace; }
              .dual-divider { margin: 6px 0 10px 0; }
              .dual-divider .teal-line { height: 2.5px; background: #0B5A54; width: 100%; }
              .dual-divider .gold-line { height: 1.5px; background: #D97706; width: 100%; margin-top: 1.5px; }
              .patient-info-strip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr 1.5fr; gap: 6px 10px; align-items: center; }
              .info-cell .label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block; margin-bottom: 1px; }
              .info-cell .value { font-size: 11px; font-weight: 700; color: #0f172a; }
              .info-cell .token-val { font-family: ui-monospace, monospace; font-weight: 800; color: #0B5A54; background: #f0fdfa; padding: 1px 6px; border-radius: 4px; border: 1px solid #ccfbf1; display: inline-block; }
              .vitals-bar { margin-top: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; }
              .vitals-bar .v-cell { border-right: 1px solid #e2e8f0; padding: 0 4px; }
              .vitals-bar .v-cell:last-child { border-right: none; }
              .vitals-bar .v-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; display: block; }
              .vitals-bar .v-val { font-size: 11px; font-weight: 800; color: #0B5A54; font-family: ui-monospace, monospace; margin-top: 1px; }
              .callout-block { margin-top: 8px; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
              .callout-block.diagnosis { background: #f0fdfa; border-color: #99f6e4; border-left: 4px solid #0B5A54; }
              .callout-block.treatment { background: #f8fafc; border-color: #e2e8f0; border-left: 4px solid #64748B; }
              .block-title { font-family: 'Playfair Display', Georgia, serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0B5A54; margin-bottom: 2px; display: block; }
              .callout-block.treatment .block-title { color: #475569; }
              .block-content { font-size: 11px; font-weight: 600; color: #0f172a; }
              .rx-header-strip { margin-top: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; border-bottom: 1.5px solid #0B5A54; padding-bottom: 3px; }
              .rx-logo { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 900; color: #0B5A54; line-height: 1; }
              .rx-title { font-family: 'Playfair Display', Georgia, serif; font-size: 11px; font-weight: 800; color: #0B5A54; text-transform: uppercase; letter-spacing: 0.06em; }
              .rx-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
              .rx-table th { background: #f1f5f9; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; padding: 5px 8px; text-align: left; border: 1px solid #cbd5e1; }
              .rx-table td { padding: 6px 8px; font-size: 10.5px; border: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
              .rx-table tr:nth-child(even) td { background: #f8fafc; }
              .med-name { font-weight: 800; color: #0f172a; }
              .med-dosage { font-weight: 600; color: #334155; }
              .med-freq-badge { font-weight: 700; color: #0B5A54; background: #f0fdfa; padding: 1px 5px; border-radius: 4px; display: inline-block; border: 1px solid #99f6e4; font-size: 9.5px; }
              .med-duration { font-weight: 700; color: #0f172a; }
              .med-instructions { font-style: italic; color: #475569; font-size: 10px; }
              .prescription-footer { margin-top: auto; padding-top: 12px; }
              .footer-main { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1; gap: 20px; }
              .followup-panel { flex: 1; }
              .followup-panel .follow-highlight { font-size: 11px; color: #1e293b; font-weight: 700; }
              .followup-panel .follow-highlight strong { color: #0B5A54; font-weight: 800; }
              .followup-panel .advice-note { font-size: 9.5px; color: #64748b; margin-top: 2px; line-height: 1.4; }
              .signature-panel { text-align: right; min-width: 200px; }
              .signature-panel .physician-name { font-family: 'Playfair Display', Georgia, serif; font-size: 11.5px; font-weight: 800; color: #0B5A54; }
              .signature-panel .sign-line { width: 170px; margin-left: auto; border-top: 1px solid #475569; margin-top: 28px; padding-top: 3px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; }
              .legal-audit-footer { margin-top: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #94a3b8; font-family: ui-monospace, monospace; }
            </style>
          </head>
          <body>
            <div class="page-container">
              <div>
                <div class="hospital-letterhead">
                  <div class="brand-block">
                    <h1>${hospitalSettings?.name || 'CarePulse Central Hospital'}</h1>
                    <p class="tagline">Center for Advanced Medicine & Compassionate Clinical Care</p>
                    <p class="accreditation">★ NABH & ISO 9001:2015 Accredited Healthcare Institution</p>
                    <p class="contact-line">100 Health Avenue, Medical District · 24x7 Emergency: +91 (800) 247-9999 · www.carepulse-health.org</p>
                  </div>
                  <div class="doctor-stamp-block">
                    <h2>${currentStaff?.name || 'Dr. Olivia Wilson'}</h2>
                    <p class="specialty">${currentStaff?.department || 'Consultant Physician & Cardiologist'}</p>
                    <p class="credentials">Cabin 102 · Reg: ${currentStaff?.staff_code || 'MCI-84920'}</p>
                  </div>
                </div>

                <div class="dual-divider">
                  <div class="teal-line"></div>
                  <div class="gold-line"></div>
                </div>

                <div class="patient-info-strip">
                  <div class="info-cell">
                    <span class="label">Patient Name</span>
                    <span class="value">${patient?.patientName || (patient as any)?.name || 'Patient'}</span>
                  </div>
                  <div class="info-cell">
                    <span class="label">Age / Gender</span>
                    <span class="value">${patient?.age || 32} Yrs · Adult</span>
                  </div>
                  <div class="info-cell">
                    <span class="label">Blood Group</span>
                    <span class="value">${patient?.bloodGroup || 'O+'}</span>
                  </div>
                  <div class="info-cell">
                    <span class="label">Mobile No</span>
                    <span class="value" style="font-family: ui-monospace, monospace;">${patient?.patientPhone || (patient as any)?.phone || '+91 98765 00000'}</span>
                  </div>
                  <div class="info-cell" style="text-align: right;">
                    <span class="label">Token / Date</span>
                    <span class="token-val">${patient?.tokenNumber || '#TOK-001'} · ${activeDate}</span>
                  </div>
                </div>

                <div class="vitals-bar">
                  <div class="v-cell">
                    <span class="v-label">Blood Pressure</span>
                    <span class="v-val">${vitals.bpSys}/${vitals.bpDia} <small style="font-size: 8px; color: #64748b;">mmHg</small></span>
                  </div>
                  <div class="v-cell">
                    <span class="v-label">Pulse Rate</span>
                    <span class="v-val">${vitals.heartRate} <small style="font-size: 8px; color: #64748b;">bpm</small></span>
                  </div>
                  <div class="v-cell">
                    <span class="v-label">Oxygen (SpO₂)</span>
                    <span class="v-val">${vitals.spo2}%</span>
                  </div>
                  <div class="v-cell">
                    <span class="v-label">Body Temp</span>
                    <span class="v-val">${vitals.temperature}°F</span>
                  </div>
                  <div class="v-cell">
                    <span class="v-label">Weight</span>
                    <span class="v-val">${vitals.weight} <small style="font-size: 8px; color: #64748b;">kg</small></span>
                  </div>
                </div>

                <div class="callout-block diagnosis">
                  <span class="block-title">Clinical Diagnosis (Assessment)</span>
                  <div class="block-content">${soap.assessment || patient?.healthIssue || 'General Outpatient Clinical Consultation'}</div>
                </div>

                <div class="callout-block treatment">
                  <span class="block-title">Treatment Done & Clinical Procedures Performed</span>
                  <div class="block-content" style="font-weight: 500; font-size: 10.5px;">
                    ${soap.plan || 'Physical clinical examination conducted. Vital signs stabilized, cardiac rhythm evaluated, and prescribed therapeutic medication regimen initiated in cabin.'}
                  </div>
                </div>

                <div class="rx-header-strip">
                  <span class="rx-logo">℞</span>
                  <span class="rx-title">Prescription Order (Medications)</span>
                </div>

                <table class="rx-table">
                  <thead>
                    <tr>
                      <th style="width: 28px; text-align: center;">#</th>
                      <th>Medication Name & Formulation</th>
                      <th style="width: 70px;">Dosage</th>
                      <th style="width: 135px;">Frequency (Timing)</th>
                      <th style="width: 70px;">Duration</th>
                      <th>Special Instructions & Diet Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${prescriptions.filter(m => m.drugName.trim()).map((m, idx) => `
                      <tr>
                        <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                        <td class="med-name">${m.drugName}</td>
                        <td class="med-dosage">${m.dosage}</td>
                        <td><span class="med-freq-badge">${m.frequency}</span></td>
                        <td class="med-duration">${m.duration}</td>
                        <td class="med-instructions">${m.instructions || 'Take as directed'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="prescription-footer">
                <div class="footer-main">
                  <div class="followup-panel">
                    <p class="follow-highlight">Next Clinical Review: <strong>Follow-up in ${followUpDays} Days (${followUpFormatted})</strong></p>
                    <p class="advice-note">General Advice: Maintain adequate rest and hydration. In case of acute discomfort, report immediately to CarePulse Emergency Department.</p>
                  </div>
                  <div class="signature-panel">
                    <p class="physician-name">${currentStaff?.name || 'Dr. Olivia Wilson, MD'}</p>
                    <div class="sign-line">Authorized Physician Signature</div>
                  </div>
                </div>
                <div class="legal-audit-footer">
                  <span>EHR Record ID: ${patient?.ticketNumber || '#CP-4820'} · Generated at ${activeTime}, ${activeDate}</span>
                  <span>★ Valid for dispensing at any registered pharmacy under Digital Health Mission</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }, 350);
    }, 150);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm font-sans">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0B5A54] flex items-center justify-center mb-4 shadow-sm">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black font-heading text-slate-900 mb-1 tracking-tight">No Active Patient In Cabin</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Please select a patient from the Queue or click "Accept" on the Dashboard to start a consultation.
        </p>
        <button
          onClick={onBackToDashboard}
          className="px-6 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
    <div className="space-y-4 max-w-7xl mx-auto font-sans pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          1. TOP EXECUTIVE CONSOLE BAR
      ══════════════════════════════════════════════════════════════════ */}
      <header className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToDashboard}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-teal-50 border border-slate-200/80 text-slate-700 hover:text-[#0B5A54] transition-all cursor-pointer group shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight">
                Active Consultation Room
              </h1>
              
              {/* In Session Pulsing Pill */}
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>In Session</span>
              </span>

              {/* Running Timer */}
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                ⏱️ {formatTimer(sessionSeconds)}
              </span>
            </div>

            {/* Token, Ticket & Slot Meta Strip */}
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2 flex-wrap">
              <span>Token <strong className="text-slate-900 font-mono font-black">{patient.tokenNumber}</strong></span>
              <span>•</span>
              <span>Ticket <strong className="text-slate-900 font-mono">{patient.ticketNumber || '#CP-4820'}</strong></span>
              <span>•</span>
              <span>Slot <strong className="text-slate-800">{patient.timeSlot || (patient as any).slot || '09:00 AM - 10:00 AM'}</strong></span>
            </p>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePrintPrescription}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Rx</span>
          </button>

          {/* Primary Visually Distinct Finish Visit Button */}
          <button
            onClick={handleCompleteVisit}
            disabled={isFinishing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#094843] hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg shadow-teal-900/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isFinishing ? 'Saving Record...' : 'Finish Visit'}</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          2. WORKSPACE GRID: LEFT PATIENT CONTEXT (~30%) / RIGHT TABBED (~70%)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ──────────────────────────────────────────────────────────────
            LEFT COLUMN (~30% / 4 COLS) — PATIENT CONTEXT & VITALS
        ────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* 1. Patient Identity Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-teal-600 text-white flex items-center justify-center font-black font-heading text-xl shadow-xs shrink-0">
                  {(patient.patientName || (patient as any).name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-snug font-heading tracking-tight">
                    {patient.patientName || (patient as any).name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        triagePriority === 'Urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : triagePriority === 'Senior-Child'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                      }`}
                    >
                      {triagePriority} Priority
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {patient.age || 29} Years · Adult
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-900 font-mono font-bold text-xs rounded-xl border border-amber-200">
                  {patient.tokenNumber}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{patient.ticketNumber || '#CP-4820'}</p>
              </div>
            </div>

            {/* Demographics Details Strip */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Blood Group</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Droplet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="font-bold text-slate-900">{patient.bloodGroup || 'O+'} (Verified)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Consultation</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">{patient.type || 'In-Person OPD'}</span>
                </div>
              </div>

              <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Contact Mobile</span>
                  <span className="font-semibold text-slate-800 font-mono">{patient.patientPhone || (patient as any).phone || '+91 98765 43210'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Copy Phone"
                >
                  {isCopiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Compact Vitals Strip with Sparklines & Trend Status Micro-Labels */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="font-black text-slate-900 text-sm font-heading">Patient Intake Vitals</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{vitals.recordedAt}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Blood Pressure with subtle pulse wave */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">BP</span>
                  <Heart className="w-3 h-3 text-rose-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono leading-none">
                    {vitals.bpSys}/{vitals.bpDia}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-0.5">mmHg</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-emerald-700 font-bold">Optimal</span>
                  <svg className="w-6 h-2 text-emerald-500 stroke-current" fill="none" viewBox="0 0 24 8">
                    <path d="M0 4h6l2-3 3 6 2-5 2 3h9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Heart Pulse */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">Pulse</span>
                  <Activity className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono leading-none">{vitals.heartRate}</span>
                  <span className="text-[9px] text-slate-400 ml-0.5">bpm</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-emerald-700 font-bold">Regular</span>
                  <svg className="w-6 h-2 text-emerald-500 stroke-current" fill="none" viewBox="0 0 24 8">
                    <path d="M0 4h4l2-4 3 8 2-6 2 3h11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">SpO₂</span>
                  <Wind className="w-3 h-3 text-sky-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono leading-none">{vitals.spo2}%</span>
                </div>
                <span className="text-[9px] text-sky-700 font-bold">Optimal</span>
              </div>

              {/* Temperature */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">Temp</span>
                  <Thermometer className="w-3 h-3 text-amber-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono leading-none">{vitals.temperature}</span>
                  <span className="text-[9px] text-slate-400 ml-0.5">°F</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">Afebrile</span>
              </div>

              {/* Weight */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">Weight</span>
                  <Weight className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono leading-none">{vitals.weight}</span>
                  <span className="text-[9px] text-slate-400 ml-0.5">kg</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">BMI 23.5</span>
              </div>

              {/* Blood Group Tile */}
              <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-bold uppercase font-mono">Blood</span>
                  <Heart className="w-3 h-3 text-rose-500" />
                </div>
                <div className="my-0.5">
                  <span className="text-sm font-black text-rose-700 font-mono leading-none">{patient.bloodGroup || 'O+'}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">Verified</span>
              </div>
            </div>
          </div>

          {/* 3. Chief Complaint Note */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-4 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs font-heading">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Chief Complaint / Front Desk Intake Note</span>
            </div>
            <p className="text-xs text-amber-950 italic bg-white/85 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed font-medium">
              "{patient.healthIssue || (patient as any).issue || 'Routine Cardiology Checkup'}"
            </p>
          </div>

          {/* 4. Collapsible Medical History & EMR Vault with Allergy Chips */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <button
              onClick={() => setIsHistoryVaultOpen(!isHistoryVaultOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/90 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-[#0B5A54] shrink-0" />
                <h3 className="font-black text-slate-900 text-xs font-heading">Medical History & EMR Vault</h3>
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
                  className="p-4 space-y-3.5 border-t border-slate-100 text-xs"
                >
                  {/* Known Allergies with warm amber/rose warning chips */}
                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 mb-1.5 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Known Allergies & Contraindications</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Penicillin (Mild urticaria)', 'Sulfa drugs (Reported)', 'NSAIDs (Mild gastritis)'].map((alg, i) => (
                        <span key={i} className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg shadow-2xs flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{alg}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Past Visits Summary Timeline */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Past Visits History</p>
                    {isLoadingHistory ? (
                      <div className="py-3 text-center text-xs text-slate-400">Loading EMR archive...</div>
                    ) : pastRecords.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 text-center text-[11px] text-slate-400 border border-dashed border-slate-200">
                        First visit on record for this patient.
                      </div>
                    ) : (
                      pastRecords.map((rec) => (
                        <div key={rec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono">{rec.date}</span>
                            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">{rec.doctorSpecialty}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-tight">
                            <strong className="text-slate-800">Dx:</strong> {rec.soapNotes.assessment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* ──────────────────────────────────────────────────────────────
            RIGHT COLUMN (~70% / 8 COLS) — TABBED CLINICAL WORKSPACE
        ────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 3 Tabs Header Strip */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('soap')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'soap'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>SOAP Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rx')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'rx'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Prescription (Rx)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                activeTab === 'rx' ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-700'
              }`}>
                {prescriptions.filter(p => p.drugName.trim()).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'summary'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Visit Summary</span>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: SOAP NOTES (STRUCTURED ACCENT BARS & SHORTCUTS)
          ══════════════════════════════════════════════════════════ */}
          {activeTab === 'soap' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B5A54]" />
                  <h2 className="text-sm sm:text-base font-black text-slate-900 font-heading tracking-tight">Clinical SOAP Record</h2>
                </div>
                <span className="text-[10px] font-bold text-[#0B5A54] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Standard Clinical Record
                </span>
              </div>

              {/* Categorized Quick Diagnoses Shortcuts */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Quick Diagnosis Shortcuts by Specialty
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIZED_DIAGNOSES.map((cat) => (
                    <div key={cat.category} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5A54] font-mono block">
                        {cat.category}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cat.items.map((diag) => (
                          <button
                            key={diag}
                            type="button"
                            onClick={() => setSoap((s) => ({ ...s, assessment: diag }))}
                            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              soap.assessment === diag
                                ? 'bg-[#0B5A54] text-white border-[#0B5A54] font-bold shadow-2xs'
                                : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200 hover:border-teal-300'
                            }`}
                          >
                            + {diag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SOAP Fields with Distinct Color-Coded Left Accent Bars */}
              <div className="space-y-4 pt-1">
                {/* S - Subjective (Purple Left Accent Bar) */}
                <div className="border-l-4 border-purple-500 pl-3.5 space-y-1">
                  <label className="block text-xs font-bold text-slate-900">
                    <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono font-bold mr-1.5 border border-purple-200 text-[10px]">S</span>
                    Subjective (Patient Symptoms & History of Present Illness)
                  </label>
                  <textarea
                    rows={3}
                    value={soap.subjective}
                    onChange={(e) => setSoap((s) => ({ ...s, subjective: e.target.value }))}
                    placeholder="Patient reports symptoms, duration, intensity, triggers, and aggravating factors..."
                    className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                  />
                </div>

                {/* P - Plan (Emerald Left Accent Bar) */}
                <div className="border-l-4 border-emerald-600 pl-3.5 space-y-1">
                  <label className="block text-xs font-bold text-slate-900">
                    <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold mr-1.5 border border-emerald-200 text-[10px]">P</span>
                    Plan & Treatment Done (Therapeutic Regimen, Procedures, Diet/Lifestyle Advice)
                  </label>
                  <textarea
                    rows={3}
                    value={soap.plan}
                    onChange={(e) => setSoap((s) => ({ ...s, plan: e.target.value }))}
                    placeholder="Therapeutic regimen, dietary instructions, diagnostic lab investigations, follow-up..."
                    className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Bottom Hop Button to Rx Tab */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('rx')}
                  className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-bold text-xs flex items-center gap-1.5 border border-teal-200 transition-all cursor-pointer"
                >
                  <span>Proceed to Prescription (Rx)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: PRESCRIPTION (RX BUILDER & PHARMACY PRESETS)
          ══════════════════════════════════════════════════════════ */}
          {activeTab === 'rx' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#0B5A54]" />
                  <h2 className="text-sm sm:text-base font-black text-slate-900 font-heading tracking-tight">Prescription Engine (Rx)</h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              {/* Pharmacy Quick Preset Chips */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                  Quick Pharmacy Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DRUG_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPresetDrug(preset)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-[#0B5A54] border border-slate-200 hover:border-teal-300 transition-all cursor-pointer"
                    >
                      + {preset.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medication Builder Rows */}
              <div className="space-y-3">
                {prescriptions.map((med, index) => (
                  <div
                    key={med.id}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">
                        Medication #{index + 1}
                      </span>
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMed(med.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      {/* Drug Name */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">Drug Name</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">Dosage</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">Frequency</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">Duration</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">Instructions / Food Timing</label>
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

              {/* Follow Up Days Selector (Segmented Control) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-700">Next Follow-Up Review:</label>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFollowUpDays(days)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        followUpDays === days
                          ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-2xs font-extrabold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Hop Button to Summary Tab */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('soap')}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                >
                  ← Back to SOAP Notes
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-bold text-xs flex items-center gap-1.5 border border-teal-200 transition-all cursor-pointer"
                >
                  <span>Review Visit Summary & Print</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: VISIT SUMMARY & OFFICIAL CLINICAL PRESCRIPTION SLIP
          ══════════════════════════════════════════════════════════ */}
          {activeTab === 'summary' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Printable Clinical Slip Preview */}
              <div
                id="printable-consultation-slip"
                ref={printAreaRef}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 p-6 sm:p-8 space-y-5 shadow-sm font-sans"
              >
                {/* 1. Formal Hospital Letterhead Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-[#0B5A54] tracking-tight font-serif">
                      {hospitalSettings?.name || 'CarePulse Central Hospital'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600">
                      Center for Advanced Medicine & Compassionate Clinical Care
                    </p>
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-mono">
                      ★ NABH & ISO 9001:2015 Accredited Healthcare Institution
                    </p>
                    <p className="text-[10px] text-slate-500">
                      100 Health Avenue, Medical District · 24x7 Emergency: +91 (800) 247-9999 · www.carepulse-health.org
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200/80 min-w-[210px] shrink-0">
                    <h4 className="text-sm font-bold text-[#0B5A54] font-serif">
                      {currentStaff?.name || 'Dr. Olivia Wilson'}
                    </h4>
                    <p className="text-xs font-medium text-slate-700">
                      {currentStaff?.department || 'Consultant Physician & Cardiologist'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Cabin 102 · Reg: {currentStaff?.staff_code || 'MCI-84920'}
                    </p>
                  </div>
                </div>

                {/* Dual-Tone Divider (Deep Teal + Gold Hairline) */}
                <div className="space-y-0.5 my-1">
                  <div className="h-[2.5px] bg-[#0B5A54] w-full rounded-full" />
                  <div className="h-[1.5px] bg-amber-600 w-full rounded-full" />
                </div>

                {/* 2. Patient Demographics Strip (Label Over Value) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Patient Name</span>
                    <span className="font-bold text-slate-900 text-sm font-serif">{patient.patientName || (patient as any).name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Age / Gender</span>
                    <span className="font-bold text-slate-900">{patient.age || 29} Yrs · Adult</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Blood Group</span>
                    <span className="font-bold text-slate-900">{patient.bloodGroup || 'O+'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Mobile No</span>
                    <span className="font-mono text-slate-800">{patient.patientPhone || (patient as any).phone || '+91 98765 00000'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-left sm:text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Token / Date</span>
                    <span className="inline-block font-mono font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                      {patient.tokenNumber} · {new Date().toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Intake Vitals Strip */}
                <div className="p-3 bg-white rounded-xl border border-slate-300 text-xs shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono mb-2">
                    Recorded Intake Vitals
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center divide-x divide-slate-200">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Blood Pressure</span>
                      <span className="font-bold text-[#0B5A54] font-mono text-xs">{vitals.bpSys}/{vitals.bpDia} <small className="text-[9px] text-slate-400">mmHg</small></span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Pulse</span>
                      <span className="font-bold text-[#0B5A54] font-mono text-xs">{vitals.heartRate} <small className="text-[9px] text-slate-400">bpm</small></span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Oxygen (SpO₂)</span>
                      <span className="font-bold text-[#0B5A54] font-mono text-xs">{vitals.spo2}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Body Temp</span>
                      <span className="font-bold text-[#0B5A54] font-mono text-xs">{vitals.temperature}°F</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Weight</span>
                      <span className="font-bold text-[#0B5A54] font-mono text-xs">{vitals.weight} <small className="text-[9px] text-slate-400">kg</small></span>
                    </div>
                  </div>
                </div>

                {/* 3. Clinical Content Blocks */}
                {/* Diagnosis Callout (Teal Left Accent) */}
                <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200/80 border-l-4 border-l-[#0B5A54] text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-[#0B5A54] uppercase tracking-wider block font-mono">
                    Clinical Diagnosis (Assessment)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {soap.assessment || patient.healthIssue || 'General Clinical Consultation'}
                  </p>
                </div>

                {/* Treatment Done & Clinical Procedures (Gray Left Accent) */}
                <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/80 border-l-4 border-l-slate-500 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block font-mono">
                    Treatment Done & Clinical Procedures Performed
                  </span>
                  <p className="font-medium text-slate-800 text-xs leading-relaxed">
                    {soap.plan || 'Physical clinical examination conducted. Vital signs stabilized, cardiac rhythm evaluated, and prescribed therapeutic medication regimen initiated in cabin.'}
                  </p>
                </div>

                {/* 4. Prescription Table */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 border-b border-[#0B5A54] pb-1.5">
                    <span className="text-xl font-serif font-black text-[#0B5A54] leading-none">℞</span>
                    <span className="text-xs font-bold text-[#0B5A54] uppercase tracking-wider font-mono">Prescription Order (Medications)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-100/90 text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                        <tr className="divide-x divide-slate-200 border-b border-slate-200">
                          <th className="p-2 w-8 text-center">#</th>
                          <th className="p-2">Medication Name & Formulation</th>
                          <th className="p-2 w-20">Dosage</th>
                          <th className="p-2 w-32">Frequency</th>
                          <th className="p-2 w-20">Duration</th>
                          <th className="p-2">Special Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prescriptions.filter((m) => m.drugName.trim()).map((m, idx) => (
                          <tr key={m.id} className={`divide-x divide-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                            <td className="p-2 text-center font-bold text-slate-500 font-mono">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{m.drugName}</td>
                            <td className="p-2 font-semibold text-slate-700">{m.dosage}</td>
                            <td className="p-2">
                              <span className="font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                                {m.frequency}
                              </span>
                            </td>
                            <td className="p-2 font-bold text-slate-800 font-mono">{m.duration}</td>
                            <td className="p-2 text-slate-600 italic text-[11px]">{m.instructions || 'As directed'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Footer (Authentication Block) */}
                <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-800 font-bold">
                      Next Clinical Review: <span className="text-[#0B5A54] font-black">{followUpDays} Days</span>
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-md">
                      General Advice: Maintain adequate rest and hydration. In case of acute discomfort, report immediately to CarePulse Emergency Department.
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-bold text-[#0B5A54] font-serif text-xs">{currentStaff?.name || 'Dr. Olivia Wilson, MD'}</p>
                    <div className="w-44 border-t border-slate-600 mt-6 pt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      Authorized Physician Signature
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>EHR Record ID: {patient.ticketNumber || '#CP-4820'} · {new Date().toLocaleDateString('en-IN')}</span>
                  <span>★ Valid for dispensing at any registered pharmacy under Digital Health Mission</span>
                </div>
              </div>

              {/* Action Buttons for Summary */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rx')}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                >
                  ← Back to Prescription Builder
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintPrescription}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteVisit}
                    disabled={isFinishing}
                    className="px-6 py-2.5 rounded-xl bg-[#0F5C52] hover:bg-[#0B4840] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>{isFinishing ? 'Saving Record...' : 'Complete & Finish Visit'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};

export default ActiveConsultation;
