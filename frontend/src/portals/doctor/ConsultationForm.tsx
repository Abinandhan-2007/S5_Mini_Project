import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, MicOff, Sparkles, AlertTriangle, CheckCircle2,
  FileText, Plus, Trash2, Printer, X,
  AlertCircle, Info, Stethoscope, FileCheck
} from 'lucide-react';
import type {
  MedicationItem, AllergyWarning, ScribeResult
} from '../../services/consultationService';
import {
  processAmbientScribe, saveConsultation
} from '../../services/consultationService';

interface ConsultationFormProps {
  patient: {
    id: string;
    tokenNumber: string;
    name: string;
    age: number;
    gender?: string;
    issue: string;
    allergies?: string;
    ticketNumber?: string;
    slot?: string;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string;
    staffCode?: string;
  };
  onClose: () => void;
  onComplete: () => void;
}

export const ConsultationForm: React.FC<ConsultationFormProps> = ({
  patient,
  doctor,
  onClose,
  onComplete,
}) => {
  // Verbal Consent & Recording State
  const [hasConsent, setHasConsent] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Structured SOAP Fields
  const [subjective, setSubjective] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [assessment, setAssessment] = useState<string>('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<string>('');
  const [vitals, setVitals] = useState<{
    blood_pressure?: string;
    pulse?: string;
    temperature?: string;
    spo2?: string;
    weight?: string;
  }>({});
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [diagnosticTests, setDiagnosticTests] = useState<string[]>([]);
  const [dietaryAdvice, setDietaryAdvice] = useState<string>('');
  const [followUp, setFollowUp] = useState<string>('5 days');
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);
  const [newTestInput, setNewTestInput] = useState<string>('');

  // Web Speech Recognition Reference
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition notice:', err);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (!hasConsent) {
      setErrorMessage('Please confirm patient verbal consent before starting audio recording.');
      return;
    }

    setErrorMessage('');

    if (isRecording) {
      // Stop Recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsRecording(false);
    } else {
      // Start Recording
      setRecordingSeconds(0);
      setIsRecording(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Speech start warning:', e);
        }
      }
    }
  };

  // Process Transcript through AI Scribe
  const handleProcessTranscript = async () => {
    if (!transcript.trim()) {
      setErrorMessage('Please record or enter a consultation dialogue first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result: ScribeResult = await processAmbientScribe({
        transcript,
        doctorId: doctor.id,
        patientId: patient.id,
        doctorSpecialty: doctor.specialty,
        patientContext: {
          name: patient.name,
          age: patient.age,
          gender: patient.gender || 'Not specified',
          allergies: patient.allergies || '',
        },
        verbalConsentGiven: hasConsent,
      });

      // Populate interactive SOAP fields
      setSubjective(result.subjective || '');
      setObjective(result.objective || '');
      setAssessment(result.assessment || '');
      setPrimaryDiagnosis(result.primary_diagnosis || '');
      if (result.vitals) setVitals(result.vitals);
      if (result.medications) setMedications(result.medications);
      if (result.diagnostic_tests) setDiagnosticTests(result.diagnostic_tests);
      if (result.dietary_advice) setDietaryAdvice(result.dietary_advice);
      if (result.follow_up) setFollowUp(result.follow_up);
      if (result.allergy_warnings) setAllergyWarnings(result.allergy_warnings);

      setSuccessMessage('Consultation notes & prescription drafted successfully by AI Scribe.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process consultation audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Medicine Table Handlers
  const handleAddMedication = () => {
    const newMed: MedicationItem = {
      name: '',
      dosage: '',
      frequency: '1-0-1 (Twice daily)',
      timing: 'After meals',
      duration: '5 days',
      instructions: 'Take after food',
      confidence: 'high',
    };
    setMedications([...medications, newMed]);
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationItem, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Diagnostic Test Handlers
  const handleAddTest = () => {
    if (newTestInput.trim() && !diagnosticTests.includes(newTestInput.trim())) {
      setDiagnosticTests([...diagnosticTests, newTestInput.trim()]);
      setNewTestInput('');
    }
  };

  const handleRemoveTest = (testName: string) => {
    setDiagnosticTests(diagnosticTests.filter((t) => t !== testName));
  };

  // Save Consultation
  const handleSaveConsultation = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await saveConsultation({
        patient_id: patient.id,
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        doctor_specialty: doctor.specialty,
        token_number: patient.tokenNumber,
        ticket_number: patient.ticketNumber,
        diagnosis: primaryDiagnosis || assessment || 'Routine Clinical Consultation',
        symptoms: patient.issue,
        subjective_notes: subjective,
        objective_notes: objective,
        assessment_notes: assessment,
        plan_notes: `Diet: ${dietaryAdvice}\nFollow-up: ${followUp}`,
        prescriptions: medications.map((m) => ({
          medicine: m.name,
          dosage: m.dosage,
          timing: `${m.frequency} (${m.timing})`,
          duration: m.duration,
        })),
        tests_ordered: diagnosticTests,
        follow_up: followUp,
      });

      setSuccessMessage('Consultation finalized and saved to patient records.');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save consultation.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sample Dialogue Presets for Demonstration
  const loadPresetDialogue = (type: 'acute' | 'chronic' | 'allergy') => {
    if (type === 'acute') {
      setTranscript(
        'Patient: Doctor, I have had a dry cough for 4 days and a fever since yesterday. ' +
        'Doctor: Your pulse is 80 bpm, temp is 100.2 F, chest is clear. ' +
        'Prescribing Paracetamol 650mg twice daily and Azithromycin 500mg once daily for 3 days. Review in 5 days.'
      );
    } else if (type === 'chronic') {
      setTranscript(
        'Doctor: Good morning. BP is 135/85 mmHg. We will continue Metformin 500mg twice daily, ' +
        'Telmisartan 40mg daily, Atorvastatin 10mg at night, and Aspirin 75mg. Ordering an HbA1c and Lipid Profile.'
      );
    } else {
      setTranscript(
        'Patient: I have had bad ear pain and sinus congestion since Monday. ' +
        'Doctor: You have acute bacterial sinusitis. Prescribing Amoxicillin 500mg thrice daily for 5 days.'
      );
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* ── Top Header ──────────────────────────────────────────────── */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B5A54] via-[#0E7069] to-[#14B8A6] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
              <Stethoscope className="w-5 h-5 text-teal-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                  Clinical Consultation — {patient.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold text-xs border border-white/30">
                  {patient.tokenNumber}
                </span>
              </div>
              <p className="text-teal-100/80 text-xs mt-0.5 truncate">
                Age: {patient.age} &bull; Chief Complaint: {patient.issue} &bull; Attending: Dr. {doctor.name} ({doctor.specialty})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Stored Allergy Badge (if on file in database) ───────────── */}
        {patient.allergies && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-xs font-semibold text-amber-900 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Documented Allergies on File:</strong> {patient.allergies}
            </span>
          </div>
        )}

        {/* ── Main Content Scroll Area ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Verbal Consent Guard & Ambient Microphone Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B5A54]" />
                <span className="font-extrabold text-sm text-slate-900">Ambient AI Clinical Voice Scribe</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#0B5A54] text-[10px] font-bold">
                  Zero Audio Stored
                </span>
              </div>

              {/* Patient Consent Toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="rounded text-[#0B5A54] focus:ring-[#0B5A54] w-4 h-4"
                />
                <span>Patient has given verbal consent to ambient transcription</span>
              </label>
            </div>

            {/* Ambient Mic Action & Presets */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={toggleRecording}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-[#0B5A54] hover:bg-[#084540] text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? `Stop Listening (${formatTimer(recordingSeconds)})` : 'Start Ambient Scribe'}</span>
              </button>

              <button
                onClick={handleProcessTranscript}
                disabled={isProcessing || !transcript.trim()}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] hover:from-[#094843] hover:to-[#109A8B] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isProcessing ? 'Analyzing Dialogue...' : 'Generate SOAP & Prescription'}</span>
              </button>

              {/* Demo Presets */}
              <div className="sm:ml-auto flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">Try Preset:</span>
                <button
                  type="button"
                  onClick={() => loadPresetDialogue('acute')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-300 text-[11px] font-semibold text-slate-700 hover:text-teal-700 transition-colors shadow-2xs"
                >
                  Acute Infection
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetDialogue('chronic')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-300 text-[11px] font-semibold text-slate-700 hover:text-teal-700 transition-colors shadow-2xs"
                >
                  Chronic Multi-Drug
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetDialogue('allergy')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:border-amber-400 text-[11px] font-semibold text-amber-800 transition-colors shadow-2xs"
                >
                  Allergy Conflict
                </button>
              </div>
            </div>

            {/* Live Transcript Preview */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Live Speech Dialogue / Transcript Preview:
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Ambient transcription will stream here in real-time as you and the patient talk, or you can paste dialogue directly..."
                className="w-full h-20 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] resize-none font-mono"
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 2. Allergy Conflict Alert Banner */}
          {allergyWarnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>SAFETY GUARD: ALLERGY CONFLICT DETECTED</span>
              </div>
              <div className="space-y-1.5 pl-7">
                {allergyWarnings.map((w, idx) => (
                  <p key={idx} className="text-xs font-semibold text-rose-800 leading-relaxed">
                    &bull; {w.warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 3. Interactive 4-Box SOAP Clinical Editor */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0B5A54]" />
              <span>Structured SOAP Clinical Notes (Physician Editable)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* S - Subjective */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#0B5A54] uppercase tracking-wide">
                    S &bull; Subjective (History & Complaints)
                  </span>
                </div>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Patient history, symptoms, duration, and severity..."
                  className="w-full h-28 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] resize-none"
                />
              </div>

              {/* O - Objective */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-teal-700 uppercase tracking-wide">
                    O &bull; Objective (Vitals & Physical Exam)
                  </span>
                </div>
                {/* Spoken Vitals Chips */}
                {Object.keys(vitals).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {vitals.blood_pressure && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] font-bold border border-blue-200">
                        BP: {vitals.blood_pressure}
                      </span>
                    )}
                    {vitals.pulse && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono text-[11px] font-bold border border-rose-200">
                        HR: {vitals.pulse}
                      </span>
                    )}
                    {vitals.temperature && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono text-[11px] font-bold border border-amber-200">
                        Temp: {vitals.temperature}
                      </span>
                    )}
                    {vitals.spo2 && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-mono text-[11px] font-bold border border-teal-200">
                        SpO2: {vitals.spo2}
                      </span>
                    )}
                    {vitals.weight && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[11px] font-bold border border-purple-200">
                        Wt: {vitals.weight}
                      </span>
                    )}
                  </div>
                )}
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Physical examination notes, auscultation, inspection..."
                  className="w-full h-24 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] resize-none"
                />
              </div>

              {/* A - Assessment */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <span className="font-black text-xs text-indigo-700 uppercase tracking-wide">
                  A &bull; Assessment & Primary Diagnosis
                </span>
                <input
                  type="text"
                  value={primaryDiagnosis}
                  onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                  placeholder="Primary clinical diagnosis..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder="Differential impressions and clinical reasoning..."
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] resize-none"
                />
              </div>

              {/* P - Plan & Tests */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <span className="font-black text-xs text-emerald-700 uppercase tracking-wide">
                  P &bull; Plan, Dietary Advice & Follow-Up
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Diet & Lifestyle:</label>
                    <input
                      type="text"
                      value={dietaryAdvice}
                      onChange={(e) => setDietaryAdvice(e.target.value)}
                      placeholder="e.g. Low sodium, warm water"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Follow-Up Review:</label>
                    <input
                      type="text"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      placeholder="e.g. 5 days, 1 month"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>

                {/* Tests tags */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Diagnostic Tests Ordered:</label>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {diagnosticTests.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-[11px] border border-teal-200 flex items-center gap-1"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(t)}
                          className="hover:text-rose-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTestInput}
                        onChange={(e) => setNewTestInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTest())}
                        placeholder="+ Add test (e.g. ECG)"
                        className="p-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-28"
                      />
                      <button
                        type="button"
                        onClick={handleAddTest}
                        className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Calibrated Medication Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  Digital Prescription & Calibrated Confidence
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {medications.length} items
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddMedication}
                className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] text-xs font-bold border border-teal-200 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                  <tr>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Dosage</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Timing</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Confidence Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {medications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                        No medications prescribed yet. Record audio with the Scribe or click "+ Add Medicine".
                      </td>
                    </tr>
                  )}
                  {medications.map((m, idx) => {
                    const isHigh = m.confidence === 'high';
                    const isInferred = m.confidence === 'inferred';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                            placeholder="e.g. Paracetamol"
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-900"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={m.dosage}
                            onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                            placeholder="e.g. 650mg"
                            className="w-24 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={m.frequency}
                            onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                            placeholder="e.g. 1-0-1"
                            className="w-32 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={m.timing}
                            onChange={(e) => handleUpdateMedication(idx, 'timing', e.target.value)}
                            placeholder="e.g. After meals"
                            className="w-28 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={m.duration}
                            onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                            placeholder="e.g. 5 days"
                            className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          {isHigh && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Confirmed (Audio)</span>
                            </span>
                          )}
                          {isInferred && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200" title={m.confidence_reason}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Inferred (Verify)</span>
                            </span>
                          )}
                          {!isHigh && !isInferred && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Unclear Audio</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Footer ────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Attribution Note: Generated via content heuristics. Doctor must review all dosages before signing.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Prescription</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConsultation}
              disabled={isSaving}
              className="flex-1 sm:flex-none py-2 px-5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSaving ? 'Finalizing...' : 'Save & Sign Consultation'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsultationForm;
