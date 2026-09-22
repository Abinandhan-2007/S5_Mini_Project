import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Heart,
  Activity,
  Thermometer,
  Wind,
  FileText,
  Stethoscope,
  Pill,
  Camera,
  Sparkles,
  Award,
  AlertTriangle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { useLocalizedEntities } from '../../i18n';
import { nurseService } from '../../services/nurseService';
import { staffConsultationService } from '../../services/consultationService';
import { apiFetch } from '../../lib/apiFetch';
import type { VisitRecord } from './HistoryScreen';

interface PrescriptionItem {
  id: string;
  drugName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  category?: string;
}

const getMedicationMeta = (med: PrescriptionItem) => {
  const name = (med.drugName || '').toLowerCase();
  const cat = (med.category || '').toLowerCase();
  const freq = (med.frequency || '').toLowerCase();
  const instr = (med.instructions || '').toLowerCase();

  // Determine Category Theme - All cards unified to CarePulse Teal brand color
  let categoryLabel = med.category || 'Prescription Medicine';
  const theme = {
    accentColor: '#0B5A54',
    borderClass: '',
    badgeBg: 'bg-teal-50 text-[#0B5A54] border border-teal-200/90',
    avatarGradient: 'from-[#0B5A54] to-[#14B8A6]',
    activeSlotBg: 'bg-teal-50/80 border-teal-300 text-[#0B5A54]',
    cardGlow: 'hover:border-teal-400/60',
    alertBg: 'bg-teal-50/70 border-teal-200/60 text-teal-900',
    iconColor: 'text-[#0B5A54]',
  };

  if (cat.includes('antibacter') || cat.includes('antibiotic') || name.includes('augmentin') || name.includes('amox')) {
    categoryLabel = 'Antibacterial / Antibiotic';
  } else if (cat.includes('antipyretic') || cat.includes('analgesic') || name.includes('dolo') || name.includes('paracetamol')) {
    categoryLabel = 'Antipyretic & Analgesic';
  } else if (cat.includes('antihistamine') || cat.includes('allergy') || name.includes('montair') || name.includes('levocet')) {
    categoryLabel = 'Antihistamine / Anti-Allergic';
  } else if (cat.includes('proton') || cat.includes('antacid') || cat.includes('ppi') || name.includes('pantocid') || name.includes('panto')) {
    categoryLabel = 'Proton Pump Inhibitor (Antacid)';
  }

  // Schedule Slots
  const isSOS = freq.includes('sos') || instr.includes('sos') || freq.includes('as needed');
  const hasMorning =
    freq.includes('morning') ||
    freq.includes('bd') ||
    freq.includes('bid') ||
    freq.includes('tds') ||
    freq.includes('tid') ||
    freq.includes('breakfast') ||
    (freq.includes('od') && !freq.includes('bedtime') && !freq.includes('night'));
  const hasAfternoon =
    freq.includes('afternoon') ||
    freq.includes('lunch') ||
    freq.includes('tds') ||
    freq.includes('tid') ||
    freq.includes('3 times');
  const hasEvening = freq.includes('evening') || freq.includes('sunset') || freq.includes('qid');
  const hasNight =
    freq.includes('night') ||
    freq.includes('bedtime') ||
    freq.includes('sleep') ||
    freq.includes('bd') ||
    freq.includes('bid') ||
    freq.includes('tds') ||
    freq.includes('tid');

  return {
    categoryLabel,
    theme,
    isSOS,
    hasMorning,
    hasAfternoon,
    hasEvening,
    hasNight,
  };
};

export const VisitDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { formatDoctorName, formatSpecialty, formatHospitalName } = useLocalizedEntities();

  const user = useCarePulseStore((s) => s.user);
  const storeAppointments = useCarePulseStore((s) => s.appointments);
  const storeHistory = useCarePulseStore((s) => s.history);

  // Retrieve visit passed via navigation state if available
  const passedVisit = (location.state as { visit?: VisitRecord })?.visit;

  // Local state for fetched live vitals & consultation
  const [, setLoadingClinical] = useState(false);
  const [liveVitals, setLiveVitals] = useState<any | null>(null);
  const [liveConsultation, setLiveConsultation] = useState<any | null>(null);

  // Active Section Switch Bar ('VITALS' | 'EVALUATION' | 'PRESCRIPTIONS')
  const initialTab = (location.state as any)?.tab || 'VITALS';
  const [activeSection, setActiveSection] = useState<'VITALS' | 'EVALUATION' | 'PRESCRIPTIONS'>(initialTab);

  // Match the active visit record from live consultation, state, history store, or appointments
  const visit = useMemo<VisitRecord>(() => {
    if (liveConsultation) {
      return {
        id: liveConsultation.id || id || 'rec-consult-01',
        doctorName: liveConsultation.doctorName || 'Consulting Physician',
        doctorSpecialty: liveConsultation.doctorSpecialty || 'General Medicine',
        doctorAvatarUrl: liveConsultation.doctorPhoto || '/doctor_default.jpg',
        hospitalName: liveConsultation.hospitalName || 'CarePulse Medical Center',
        date: liveConsultation.date || '2026-08-25',
        time: liveConsultation.time || '10:30 AM',
        visitType: 'In-Person',
        status: liveConsultation.status || 'Completed',
        summaryAvailable: true,
        diagnosis: liveConsultation.diagnosis || liveConsultation.soapData?.assessment || 'Clinical Consultation Record',
        prescriptionDetails: liveConsultation.prescriptionDetails,
        ticketNumber: liveConsultation.ticketNumber || 'TKT-892',
      };
    }

    if (passedVisit && passedVisit.id === id) return passedVisit;

    const matchedHist = storeHistory.find((h) => h.id === id);
    if (matchedHist) {
      return {
        id: matchedHist.id,
        doctorName: matchedHist.doctorName || 'Consulting Physician',
        doctorSpecialty: matchedHist.specialty || 'General Medicine',
        doctorAvatarUrl: matchedHist.doctorPhoto || '/doctor_default.jpg',
        hospitalName: matchedHist.hospitalName || 'CarePulse Medical Center',
        date: matchedHist.date || '2026-08-25',
        time: '10:30 AM',
        visitType: 'In-Person',
        status: 'Completed',
        summaryAvailable: true,
        diagnosis: matchedHist.diagnosis || 'Clinical Consultation Record',
        prescriptionDetails: matchedHist.prescriptionDetails,
        ticketNumber: 'TKT-892',
      };
    }

    const matchedApt = storeAppointments.find((a) => a.id === id);
    if (matchedApt) {
      return {
        id: matchedApt.id,
        doctorName: matchedApt.doctorName || 'Doctor Specialist',
        doctorSpecialty: matchedApt.doctorSpecialty || 'General Care',
        doctorAvatarUrl: matchedApt.doctorPhoto || '/doctor_default.jpg',
        hospitalName: matchedApt.hospitalName || 'CarePulse Partner Hospital',
        date: matchedApt.date || '2026-08-25',
        time: matchedApt.timeSlot || '10:00 AM',
        visitType: matchedApt.type === 'Telehealth' ? 'Video Consult' : 'In-Person',
        status: 'Completed',
        summaryAvailable: true,
        diagnosis: (matchedApt as any).diagnosis || (matchedApt as any).healthIssue || 'General Medical Review',
        prescriptionDetails: (matchedApt as any).prescriptionDetails,
        ticketNumber: matchedApt.ticketNumber || 'TKT-412',
      };
    }

    if (passedVisit) return passedVisit;

    // Fallback visit record
    return {
      id: id || 'rec-consult-01',
      doctorName: 'Dr. Sarah Mitchell',
      doctorSpecialty: 'Internal Medicine & Critical Care',
      doctorAvatarUrl: '/doctor_default.jpg',
      hospitalName: 'CarePulse Central Multispecialty Hospital',
      date: '2026-08-24',
      time: '10:30 AM',
      visitType: 'In-Person',
      status: 'Completed',
      summaryAvailable: true,
      diagnosis: 'Acute Upper Respiratory Tract Infection & Mild Fatigue',
      prescriptionDetails: 'Paracetamol 650mg, Amoxicillin 500mg, Levocetirizine 5mg',
      ticketNumber: 'TKT-904',
    };
  }, [liveConsultation, id, passedVisit, storeHistory, storeAppointments]);

  // Extract SOAP notes from storeHistory if available
  const historyItem = useMemo(() => {
    return storeHistory.find((h) => h.id === id);
  }, [storeHistory, id]);

  // Fetch live nurse vitals & live doctor consultation linked to this visit from backend portals
  useEffect(() => {
    let isMounted = true;
    const fetchClinicalData = async () => {
      try {
        setLoadingClinical(true);
        const targetId = id || visit.id;

        // 1. Fetch live consultation details from backend API
        if (targetId) {
          try {
            const res = await apiFetch(`/consultations/detail/${encodeURIComponent(targetId)}`);
            if (res.ok) {
              const data = await res.json();
              if (isMounted && data.success && data.consultation) {
                setLiveConsultation(data.consultation);
                if (data.vitals) {
                  setLiveVitals(data.vitals);
                }
              }
            }
          } catch {
            // offline / fallback
          }
        }

        // 2. Try direct appointment vitals lookup via nurseService
        if (targetId) {
          try {
            const direct = await nurseService.getVitals(targetId);
            if (isMounted && direct && direct.bp_systolic) {
              setLiveVitals((prev: any) => ({ ...prev, ...direct }));
            }
          } catch {
            // fallback
          }
        }

        // 3. Try patient vitals history from Nurse Portal
        const targetPid = user?.id || (user as any)?.patientId;
        if (targetPid) {
          try {
            const list = await nurseService.getPatientVitalsHistory(targetPid);
            if (isMounted && Array.isArray(list) && list.length > 0) {
              const matched = list.find((v) => v.appointment_id === id || v.appointment_id === visit.id || v.id === id) || list[0];
              if (matched) {
                setLiveVitals((prev: any) => prev || matched);
              }
            }
          } catch {
            // fallback
          }
        }

        // 4. Check doctor EMR records stored locally from Doctor Portal
        try {
          const emrRecords = await staffConsultationService.getAllEMRRecords();
          const matchedEMR = emrRecords.find(
            (r) => r.id === targetId || r.patientId === user?.id || (targetId && r.id.includes(targetId))
          );
          if (isMounted && matchedEMR) {
            setLiveConsultation((prev: any) => prev || {
              id: matchedEMR.id,
              patientId: matchedEMR.patientId,
              doctorId: matchedEMR.doctorId,
              doctorName: matchedEMR.doctorName,
              doctorSpecialty: matchedEMR.doctorSpecialty,
              hospitalName: matchedEMR.hospitalName,
              date: matchedEMR.date,
              soapData: matchedEMR.soapNotes,
              prescriptions: matchedEMR.prescriptions,
              diagnosis: matchedEMR.soapNotes?.assessment || matchedEMR.chiefComplaint,
              status: 'Completed',
              ticketNumber: 'EMR-' + matchedEMR.id.slice(-4),
            });
            if (matchedEMR.vitals) {
              setLiveVitals((prev: any) => prev || matchedEMR.vitals);
            }
          }
        } catch {
          // fallback
        }

        // 5. Fallback to appointment vitals stored locally
        const aptMatch = storeAppointments.find((a) => a.id === id || a.id === visit.id);
        if (aptMatch && (aptMatch as any).vitals && isMounted) {
          setLiveVitals((prev: any) => prev || (aptMatch as any).vitals);
        }
      } catch (err) {
        console.warn('Notice fetching clinical backend data:', err);
      } finally {
        if (isMounted) setLoadingClinical(false);
      }
    };

    fetchClinicalData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, id, visit.id, storeAppointments]);

  // Format date helper
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(visit.date);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return visit.date;
  }, [visit.date]);

  // Check if real clinical evaluation data was entered in Doctor Portal
  const hasEvaluationData = useMemo(() => {
    const activeSoap = liveConsultation?.soapData || historyItem?.soapData;
    if (!activeSoap) return false;
    return Boolean(
      (activeSoap.subjective && String(activeSoap.subjective).trim().length > 0) ||
      (activeSoap.objective && String(activeSoap.objective).trim().length > 0) ||
      (activeSoap.assessment && String(activeSoap.assessment).trim().length > 0) ||
      (activeSoap.plan && String(activeSoap.plan).trim().length > 0)
    );
  }, [liveConsultation, historyItem]);

  // Doctor Portal Added Clinical Data (SOAP & Notes) - ONLY if entered
  const soapData = useMemo(() => {
    if (!hasEvaluationData) return null;
    const activeSoap = liveConsultation?.soapData || historyItem?.soapData || {};
    return {
      subjective: activeSoap.subjective || 'No chief complaint recorded.',
      objective: activeSoap.objective || 'No physical examination findings recorded.',
      assessment: activeSoap.assessment || visit.diagnosis || 'Clinical Consultation',
      plan: activeSoap.plan || 'No treatment plan recorded.',
      followUp: activeSoap.followUp || activeSoap.follow_up || 'As needed / SOS',
    };
  }, [hasEvaluationData, liveConsultation, historyItem, visit.diagnosis]);

  // Structured Prescriptions - ONLY if entered in Doctor Portal
  const prescriptionList = useMemo<PrescriptionItem[]>(() => {
    const rawList =
      liveConsultation?.prescriptions ||
      liveConsultation?.soapData?.prescriptions ||
      historyItem?.prescriptions;

    if (rawList && Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((m: any, idx: number): PrescriptionItem => ({
        id: m.id || `rx-${idx}`,
        drugName: m.drugName || m.name || m.drug_name || `Prescribed Medication ${idx + 1}`,
        genericName: m.genericName || m.generic_name,
        dosage: m.dosage || '1 Tablet',
        frequency: m.frequency || 'BD (Twice daily)',
        duration: m.duration
          ? String(m.duration).toLowerCase().includes('day')
            ? m.duration
            : `${m.duration} Days`
          : '5 Days',
        instructions: m.instructions || m.mealTiming || m.meal_timing || 'Take after meals with water',
        category: m.category || 'Prescription Medicine',
      }));
    }

    // No prescriptions if none were entered
    return [];
  }, [liveConsultation, historyItem]);

  const hasPrescriptionData = prescriptionList.length > 0;

  // Check if real vitals were entered in Nurse Portal
  const hasVitalsData = useMemo(() => {
    if (!liveVitals) return false;
    return Boolean(
      liveVitals.bp_systolic != null ||
      liveVitals.bp_diastolic != null ||
      liveVitals.heart_rate != null ||
      liveVitals.temperature != null ||
      liveVitals.spo2 != null ||
      liveVitals.respiratory_rate != null ||
      liveVitals.blood_glucose != null ||
      liveVitals.weight_kg != null ||
      liveVitals.height_cm != null
    );
  }, [liveVitals]);

  // Vitals Metrics Resolution from Nurse Portal - ONLY if entered
  const vitals = useMemo(() => {
    if (!hasVitalsData || !liveVitals) return null;

    const rawTemp = liveVitals.temperature;
    const unit = (liveVitals.temperature_unit || 'C').toUpperCase();
    const formattedTemp = rawTemp != null ? (unit === 'C' ? `${rawTemp}°C` : `${rawTemp}°F`) : '—';

    const bmiVal = liveVitals.bmi != null
      ? Number(liveVitals.bmi)
      : (liveVitals.weight_kg && liveVitals.height_cm
          ? Number((liveVitals.weight_kg / Math.pow(liveVitals.height_cm / 100, 2)).toFixed(1))
          : null);

    let bmiLabel = 'Normal Weight';
    let bmiBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (bmiVal != null) {
      if (bmiVal < 18.5) {
        bmiLabel = 'Underweight';
        bmiBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
      } else if (bmiVal <= 24.9) {
        bmiLabel = 'Healthy Weight';
        bmiBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      } else if (bmiVal <= 29.9) {
        bmiLabel = 'Overweight';
        bmiBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
      } else {
        bmiLabel = 'Obese';
        bmiBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
      }
    }

    const sys = liveVitals.bp_systolic;
    const dia = liveVitals.bp_diastolic;
    let bpStatus = 'Normal';
    let bpColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (sys != null && dia != null) {
      if (sys > 140 || dia > 90) {
        bpStatus = 'Elevated BP';
        bpColor = 'bg-rose-50 text-rose-800 border-rose-200';
      } else if (sys > 120 || dia > 80) {
        bpStatus = 'Pre-Hypertension';
        bpColor = 'bg-amber-50 text-amber-800 border-amber-200';
      }
    }

    const hr = liveVitals.heart_rate;
    let hrStatus = 'Normal Rhythm';
    let hrColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (hr != null) {
      if (hr > 100) {
        hrStatus = 'Tachycardia';
        hrColor = 'bg-rose-50 text-rose-800 border-rose-200';
      } else if (hr < 60) {
        hrStatus = 'Bradycardia';
        hrColor = 'bg-amber-50 text-amber-800 border-amber-200';
      }
    }

    const ox = liveVitals.spo2;
    let oxStatus = 'Normal';
    let oxColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (ox != null && ox < 95) {
      oxStatus = 'Low SpO2';
      oxColor = 'bg-rose-50 text-rose-800 border-rose-200';
    }

    const rawCtx = liveVitals.glucose_context || 'random';
    const ctxFormatted = rawCtx === 'post_prandial' ? 'Post-Prandial' : rawCtx.charAt(0).toUpperCase() + rawCtx.slice(1);

    return {
      bpSystolic: sys ?? '—',
      bpDiastolic: dia ?? '—',
      bpStatus,
      bpColor,
      heartRate: hr ?? '—',
      hrStatus,
      hrColor,
      spo2: ox ?? '—',
      oxStatus,
      oxColor,
      temperature: rawTemp,
      tempUnit: unit,
      formattedTemp,
      respiratoryRate: liveVitals.respiratory_rate ?? '—',
      bloodGlucose: liveVitals.blood_glucose ?? '—',
      glucoseContext: ctxFormatted,
      weightKg: liveVitals.weight_kg ?? '—',
      heightCm: liveVitals.height_cm ?? '—',
      bmi: bmiVal ?? '—',
      bmiLabel: bmiVal != null ? bmiLabel : 'Not calculated',
      bmiBadgeColor: bmiVal != null ? bmiBadgeColor : 'bg-slate-50 text-slate-600 border-slate-200',
      notes: liveVitals.notes || 'No triage clinical notes entered.',
      abnormalFlags: Array.isArray(liveVitals.abnormal_flags) ? liveVitals.abnormal_flags : [],
      nurseName: liveVitals.recorded_by_name || 'Triage Staff Nurse',
      recordedAt: liveVitals.recorded_at
        ? new Date(liveVitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Triage Check-in',
    };
  }, [liveVitals, hasVitalsData]);


  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 font-sans select-none print:bg-white print:p-0 print:pb-0">
      {/* 1. TOP HEADER & ACTIONS BAR */}
      <header className="sticky top-0 z-30 bg-transparent px-4 sm:px-6 pt-6 sm:pt-7 pb-3 print:hidden">
        <div className="max-w-4xl mx-auto relative flex items-center justify-center min-h-[44px]">
          {/* Back to History */}
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="absolute left-0 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/90 text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
            aria-label="Back to History"
            title="Back to History"
          >
            <ChevronLeft className="w-6 h-6 text-slate-800 stroke-[2.3]" />
          </button>

          {/* Center Page Title Badge */}
          <div className="text-center">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-5 py-2 rounded-full border border-teal-200/80 shadow-xs">
              Detailed Clinical View
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN CLINICAL SHEET CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* VISIT IDENTITY HERO CARD */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden space-y-5"
        >
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-bl from-teal-500/10 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Token (Left) & Completed Status (Right) */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              {visit.ticketNumber ? (
                <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  TOKEN #{visit.ticketNumber.replace(/^#/, '')}
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-slate-400">
                  TOKEN #--
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              Completed
            </span>
          </div>

          {/* Middle Row: Doctor & Hospital Profile */}
          <div className="flex items-start gap-4">
            {/* Doctor Squircle Avatar with Verified Check */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-br from-[#0B5A54]/20 via-teal-100 to-emerald-200 shadow-sm overflow-hidden border border-slate-200/90 flex items-center justify-center">
                <img
                  src={visit.doctorAvatarUrl || '/doctor_default.jpg'}
                  alt={visit.doctorName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/doctor_default.jpg';
                  }}
                  className="w-full h-full rounded-[14px] object-cover bg-white"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            {/* Doctor Details */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight font-heading">
                {formatDoctorName(visit.doctorName)}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-50 text-[#0B5A54] border border-teal-200/70 shadow-2xs">
                  {formatSpecialty(visit.doctorSpecialty)}
                </span>
                <span className="text-xs font-bold text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-600 truncate flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span className="truncate">{formatHospitalName(visit.hospitalName)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Unified Appointment Schedule Bar */}
          <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Date */}
            <div className="flex items-center gap-2 font-black text-slate-800">
              <div className="w-7 h-7 rounded-xl bg-white text-[#0B5A54] border border-slate-200/80 flex items-center justify-center shadow-2xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
              </div>
              <span>{formattedDate}</span>
            </div>

            {/* Time Slot & Modality */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono font-bold text-slate-700 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{visit.time}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200/70 font-black shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span>{visit.visitType === 'Video Consult' ? 'Video Consultation' : 'In-Person Visit'}</span>
              </span>
            </div>
          </div>
        </motion.section>

        {/* ========================================================================= */}
        {/* CLINICAL VIEW SWITCH BAR (VITALS | DOCTOR EVALUATION | PRESCRIPTION) */}
        {/* ========================================================================= */}
        <div className="bg-slate-100/95 p-1 rounded-2xl border border-slate-200/90 shadow-2xs grid grid-cols-3 gap-1 sticky top-[68px] z-20 print:hidden backdrop-blur-md">
          {/* TAB 1: VITALS */}
          <button
            type="button"
            onClick={() => setActiveSection('VITALS')}
            className={`relative py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-colors cursor-pointer select-none flex items-center justify-center ${
              activeSection === 'VITALS' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeSection === 'VITALS' && (
              <motion.div
                layoutId="activeClinicalTabPill"
                className="absolute inset-0 bg-[#0B5A54] rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>Vitals</span>
              {Boolean(vitals?.abnormalFlags && vitals.abnormalFlags.length > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
            </span>
          </button>

          {/* TAB 2: DOCTOR EVALUATION */}
          <button
            type="button"
            onClick={() => setActiveSection('EVALUATION')}
            className={`relative py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-colors cursor-pointer select-none flex items-center justify-center ${
              activeSection === 'EVALUATION' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeSection === 'EVALUATION' && (
              <motion.div
                layoutId="activeClinicalTabPill"
                className="absolute inset-0 bg-[#0B5A54] rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <Stethoscope className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="hidden sm:inline">Doctor </span>Evaluation
              </span>
            </span>
          </button>

          {/* TAB 3: PRESCRIPTION */}
          <button
            type="button"
            onClick={() => setActiveSection('PRESCRIPTIONS')}
            className={`relative py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-colors cursor-pointer select-none flex items-center justify-center ${
              activeSection === 'PRESCRIPTIONS' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeSection === 'PRESCRIPTIONS' && (
              <motion.div
                layoutId="activeClinicalTabPill"
                className="absolute inset-0 bg-[#0B5A54] rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <Pill className="w-3.5 h-3.5 shrink-0" />
              <span>Prescription</span>
            </span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* SECTION 1: VITALS DETAILS (RECORDED FROM NURSE PORTAL) */}
          {activeSection === 'VITALS' && (
            !hasVitalsData || !vitals ? (
              <motion.section
                key="vitals-empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-teal-50/80 border border-teal-100 text-[#0B5A54] flex items-center justify-center shadow-xs">
                  <Activity className="w-8 h-8 stroke-[1.8]" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    No Vitals Data Available
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                    Patient vitals have not been entered yet in the Nurse Portal for this appointment. Once the triage nurse records blood pressure, pulse rate, temperature, and other clinical vitals, they will appear here automatically.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 bg-teal-50 px-4 py-2 rounded-xl border border-teal-200/80">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Awaiting Nurse Triage Recording
                  </span>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="vitals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5"
              >
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 text-[#0B5A54] flex items-center justify-center shadow-2xs shrink-0">
                <Activity className="w-5 h-5 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    Patient Vitals & Clinical Intake
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100/80 text-[#0B5A54]">
                    Nurse Portal
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Recorded at {vitals.recordedAt} by {vitals.nurseName}
                </p>
              </div>
            </div>

            {/* Right Status Badge */}
            <div>
              {vitals.abnormalFlags.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{vitals.abnormalFlags.length} Flag{vitals.abnormalFlags.length > 1 ? 's' : ''} Noted</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>All Vitals Stable</span>
                </span>
              )}
            </div>
          </div>

          {/* Abnormal Flags Alert Box (if nurse flagged anything) */}
          {vitals.abnormalFlags.length > 0 && (
            <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 space-y-1 text-xs text-amber-900">
              <span className="font-black uppercase tracking-wider text-[11px] text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Nurse Triage Clinical Alert
              </span>
              <ul className="list-disc list-inside space-y-0.5 pl-1 font-semibold text-amber-800">
                {vitals.abnormalFlags.map((flag: string, idx: number) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Vitals 4-Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Blood Pressure */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500">Blood Pressure</span>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {vitals.bpSystolic}/{vitals.bpDiastolic}
                </span>
                <span className="text-[10.5px] font-bold text-slate-400">mmHg</span>
              </div>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${vitals.bpColor}`}>
                {vitals.bpStatus}
              </span>
            </div>

            {/* 2. Pulse / Heart Rate */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500">Pulse Rate</span>
                <Activity className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {vitals.heartRate}
                </span>
                <span className="text-[10.5px] font-bold text-slate-400">bpm</span>
              </div>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${vitals.hrColor}`}>
                {vitals.hrStatus}
              </span>
            </div>

            {/* 3. Blood Oxygen (SpO2) */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500">Oxygen (SpO2)</span>
                <Wind className="w-4 h-4 text-sky-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {vitals.spo2}
                </span>
                <span className="text-[10.5px] font-bold text-slate-400">%</span>
              </div>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${vitals.oxColor}`}>
                {vitals.oxStatus}
              </span>
            </div>

            {/* 4. Body Temperature */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500">Body Temp</span>
                <Thermometer className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {vitals.formattedTemp}
                </span>
              </div>
              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Normothermic
              </span>
            </div>
          </div>

          {/* Secondary Physical Measurements Strip */}
          <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10.5px] font-bold block uppercase tracking-wider">Respiratory Rate</span>
              <span className="font-black text-slate-800 text-sm mt-0.5 block">{vitals.respiratoryRate} breaths/min</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px] font-bold block uppercase tracking-wider">Blood Glucose</span>
              <span className="font-black text-slate-800 text-sm mt-0.5 block">{vitals.bloodGlucose} mg/dL <span className="text-xs font-bold text-slate-500 font-normal">({vitals.glucoseContext})</span></span>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px] font-bold block uppercase tracking-wider">Height & Weight</span>
              <span className="font-black text-slate-800 text-sm mt-0.5 block">{vitals.heightCm} cm • {vitals.weightKg} kg</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10.5px] font-bold block uppercase tracking-wider">BMI</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-black text-slate-800 text-sm">{vitals.bmi} kg/m²</span>
                <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${vitals.bmiBadgeColor}`}>
                  {vitals.bmiLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Nurse Triage Clinical Notes (Direct from Nurse Portal) */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                Nurse Triage Clinical Notes
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                CarePulse Triage Desk
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed italic">
              "{vitals.notes}"
            </p>
          </div>
        </motion.section>
            )
      )}

      {/* SECTION 2: DOCTOR ADDED DETAILS (DOCTOR PORTAL CLINICAL NOTES) */}
      {activeSection === 'EVALUATION' && (
        !hasEvaluationData || !soapData ? (
          <motion.section
            key="evaluation-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-teal-50/80 border border-teal-100 text-[#0B5A54] flex items-center justify-center shadow-xs">
              <Stethoscope className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                No Clinical Evaluation Available
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                Doctor consultation notes (SOAP evaluation) have not been entered yet in the Doctor Portal for this visit. When the doctor conducts the consultation and enters assessment notes, they will appear here.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 bg-teal-50 px-4 py-2 rounded-xl border border-teal-200/80">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Awaiting Doctor Consultation Notes
              </span>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="evaluation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5"
          >
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center shadow-2xs">
                <Stethoscope className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  Doctor Added Details • Clinical Evaluation
                </h2>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  Recorded in Doctor Portal by {formatDoctorName(visit.doctorName)}
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-black text-[#0B5A54] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              SOAP EMR
            </span>
          </div>

          {/* Primary Assessment / Diagnosis Banner */}
          <div className="bg-gradient-to-r from-teal-50 via-emerald-50/40 to-teal-50 rounded-2xl p-4 border border-teal-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0B5A54] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Primary Diagnosis & Assessment
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs">
                Active / Treated
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {soapData.assessment}
            </p>
          </div>

          {/* Detailed SOAP Clinical Notes Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subjective / Chief Complaint */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                1. Chief Complaint & Subjective Notes
              </span>
              <p className="text-xs font-medium text-slate-700 leading-relaxed">
                {soapData.subjective}
              </p>
            </div>

            {/* Objective / Clinical Examination */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0B5A54]" />
                2. Physical Findings & Examination (Objective)
              </span>
              <p className="text-xs font-medium text-slate-700 leading-relaxed">
                {soapData.objective}
              </p>
            </div>
          </div>

          {/* Treatment Plan & Doctor Advice */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              3. Treatment Plan & Clinical Advice
            </span>
            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              {soapData.plan}
            </p>
          </div>

          {/* Follow-up recommendation & Doctor Signature Seal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Follow-up Recommendation: <strong className="text-amber-900">{soapData.followUp}</strong></span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <Award className="w-4 h-4 text-[#0B5A54]" />
              </div>
              <div className="text-[11px]">
                <p className="font-black text-slate-800 leading-none">Digitally Signed by {formatDoctorName(visit.doctorName)}</p>
                <p className="text-slate-400 mt-0.5 font-mono">Reg No: MCI-2018-94821 • CarePulse EMR Portal</p>
              </div>
            </div>
          </div>
        </motion.section>
            )
      )}

      {/* SECTION 3: PRESCRIPTIONS */}
      {activeSection === 'PRESCRIPTIONS' && (
        !hasPrescriptionData || prescriptionList.length === 0 ? (
          <motion.section
            key="prescriptions-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-teal-50/80 border border-teal-100 text-[#0B5A54] flex items-center justify-center shadow-xs">
              <Pill className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                No Prescriptions Available
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                No medications were prescribed by the doctor in the Doctor Portal for this visit. If a prescription is prescribed during your consultation, your medications, dosage timings, and duration will appear here.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                No Active Medication Prescribed
              </span>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="prescriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6 relative overflow-hidden"
          >
          {/* Subtle medical ambient glow in background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-teal-400/5 via-emerald-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center shadow-md ring-4 ring-emerald-50 shrink-0">
                <Pill className="w-6 h-6 stroke-[2.2] animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none font-heading">
                    Prescription & Medication Regimen
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/90 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    EMR Verified
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span>{prescriptionList.length} items prescribed</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">Verified by Hospital Central Pharmacy</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-400">Rx-84920</span>
                </p>
              </div>
            </div>

            {/* Smart Lens Scan CTA Button */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/prescriptions/scan')}
                className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#0B5A54] via-[#0E7A70] to-[#14B8A6] text-white transition-all shadow-[0_4px_16px_-2px_rgba(11,90,84,0.35)] hover:shadow-lg hover:brightness-105 active:scale-95 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-6 h-6 rounded-xl bg-white/20 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                </div>
                <span className="tracking-wide">Smart Lens Scan</span>
                <span className="bg-emerald-300/30 text-emerald-100 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  AI
                </span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100/70 text-[#0B5A54] flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Medicines</p>
                <p className="text-xs sm:text-sm font-black text-slate-900">{prescriptionList.length} Active Prescriptions</p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Course Duration</p>
                <p className="text-xs sm:text-sm font-black text-slate-900">
                  {prescriptionList[0]?.duration ? `${prescriptionList[0].duration} Regimen` : 'Prescribed Course'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Regimen Status</p>
                <p className="text-xs sm:text-sm font-black text-emerald-700">
                  Active & On Schedule
                </p>
              </div>
            </div>
          </div>

          {/* PRESCRIPTION CARDS LIST (High-End Clinical Cards) */}
          <div className="space-y-4">
            {prescriptionList.map((med, index) => {
              const meta = getMedicationMeta(med);
              const instrLower = (med.instructions || '').toLowerCase();
              const freqLower = (med.frequency || '').toLowerCase();

              const activeSlots = [
                meta.hasMorning && {
                  id: 'morning',
                  label: 'Morning',
                  icon: '🌅',
                  note: instrLower.includes('before') || instrLower.includes('empty')
                    ? 'Before Food'
                    : 'After Food',
                  theme: 'bg-teal-50/70 border-teal-200/90 text-teal-950 ring-1 ring-teal-500/10',
                  border: 'border-teal-200',
                  noteColor: 'text-[#0B5A54]',
                },
                meta.hasAfternoon && {
                  id: 'afternoon',
                  label: 'Afternoon',
                  icon: '☀️',
                  note: 'After Lunch',
                  theme: 'bg-teal-50/70 border-teal-200/90 text-teal-950 ring-1 ring-teal-500/10',
                  border: 'border-teal-200',
                  noteColor: 'text-[#0B5A54]',
                },
                meta.hasNight && {
                  id: 'night',
                  label: 'Night',
                  icon: '🌙',
                  note: instrLower.includes('bedtime') || instrLower.includes('sleep') || freqLower.includes('bedtime')
                    ? 'At Bedtime'
                    : 'After Dinner',
                  theme: 'bg-teal-50/70 border-teal-200/90 text-teal-950 ring-1 ring-teal-500/10',
                  border: 'border-teal-200',
                  noteColor: 'text-[#0B5A54]',
                },
              ].filter(Boolean) as {
                id: string;
                label: string;
                icon: string;
                note: string;
                theme: string;
                border: string;
                noteColor: string;
              }[];

              return (
                <div
                  key={med.id || index}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 space-y-3.5 relative overflow-hidden ${meta.theme.cardGlow}`}
                >
                  {/* 1. TABLET NAME & HOW MANY DAYS (DURATION) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                        {med.drugName}
                      </h3>
                    </div>

                    {/* HOW MANY DAYS DURATION BADGE */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1.5 bg-[#0B5A54]/10 border border-[#14B8A6]/30 text-[#0B5A54] px-3 py-1 rounded-xl shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                        <span className="text-xs font-black tracking-tight">{med.duration}</span>
                      </div>
                      <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {med.dosage}
                      </span>
                    </div>
                  </div>

                  {/* 2. MORNING • AFTERNOON • NIGHT INTAKE SCHEDULE (ONLY ACTIVE SLOTS) */}
                  {meta.isSOS ? (
                    <div className="bg-teal-50/70 border border-teal-200/90 text-teal-950 rounded-2xl p-3 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#0B5A54] uppercase tracking-wide">Take SOS (As Needed)</span>
                          <span className="text-[10px] bg-teal-100 text-[#0B5A54] font-bold px-2 py-0.2 rounded-full border border-teal-200">Max 3x/Day</span>
                        </div>
                        <p className="text-teal-900 font-medium leading-snug">
                          Take 1 tablet only when needed for fever &gt; 100°F or acute body pain. Maintain minimum 6 hours gap between doses.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid gap-2 ${activeSlots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {activeSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-2.5 sm:p-3 rounded-2xl text-center border transition-all shadow-2xs ${slot.theme}`}
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="text-base leading-none">{slot.icon}</span>
                            <span className="text-xs font-black">{slot.label}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="inline-block text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-white text-slate-900 border border-slate-200/80 shadow-2xs">
                              {med.dosage || '1 Tab'}
                            </span>
                            <p className={`text-[10px] font-bold ${slot.noteColor}`}>
                              {slot.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
            )
      )}
    </AnimatePresence>

      </main>
    </div>
  );
};
