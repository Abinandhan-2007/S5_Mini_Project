import React, { useState } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  X,
  Pill,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

export interface ConsultationFormProps {
  patient: {
    id: string;
    tokenNumber: string;
    name: string;
    age?: number;
    bloodGroup?: string;
    issue?: string;
    phone?: string;
    slot?: string;
    type?: string;
    diagnosis?: string;
    assessment?: string;
    clinicalNotes?: string;
    prescriptions?: string[];
  };
  doctorName?: string;
  doctorSpecialty?: string;
  onSave: (data: {
    diagnosis: string;
    assessment: string;
    clinicalNotes: string;
    prescriptionDetails: string;
    prescriptions: string[];
    followUpDays?: number;
  }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

const QUICK_DIAGNOSES = [
  'Acute Upper Respiratory Infection',
  'Hypertension - Stage 1 Review',
  'Acute Viral Gastroenteritis',
  'Tension Headache / Migraine',
  'Contact Dermatitis & Eczema',
  'Seasonal Allergic Rhinitis',
  'Type 2 Diabetes Mellitus Follow-up',
  'Musculoskeletal Lumbar Strain',
  'Acid Peptic Disease / GERD',
  'Routine Preventive Health Check',
];

interface MedItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export const ConsultationForm: React.FC<ConsultationFormProps> = ({
  patient,
  doctorName = 'Consulting Physician',
  doctorSpecialty = 'General Medicine',
  onSave,
  onClose,
  isSaving = false,
}) => {
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || patient.assessment || patient.issue || '');
  const [clinicalNotes, setClinicalNotes] = useState(patient.clinicalNotes || '');
  const [vitalsBp, setVitalsBp] = useState('120/80');
  const [vitalsPulse, setVitalsPulse] = useState('74');
  const [vitalsSpo2, setVitalsSpo2] = useState('98%');
  const [followUpDays, setFollowUpDays] = useState<number>(7);

  const [medications, setMedications] = useState<MedItem[]>([
    {
      id: 'med-1',
      name: 'Paracetamol 650mg',
      dosage: '1 Tab',
      frequency: 'TDS (Thrice daily after meals)',
      duration: '3 Days',
    },
  ]);

  const handleAddMedication = () => {
    setMedications((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        name: '',
        dosage: '1 Tab',
        frequency: 'BD (Twice daily)',
        duration: '5 Days',
      },
    ]);
  };

  const handleUpdateMed = (id: string, field: keyof MedItem, val: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleRemoveMed = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDiagnosis = diagnosis.trim() || 'Clinical Consultation Completed';
    const medStrings = medications
      .filter((m) => m.name.trim())
      .map((m) => `${m.name} (${m.dosage}, ${m.frequency}, ${m.duration})`);

    const prescriptionDetails = medStrings.length > 0 ? medStrings.join(' • ') : 'Standard clinical care advice provided.';

    onSave({
      diagnosis: finalDiagnosis,
      assessment: finalDiagnosis,
      clinicalNotes: `Vitals: BP ${vitalsBp}, Pulse ${vitalsPulse} bpm, SpO2 ${vitalsSpo2}. Notes: ${clinicalNotes}`,
      prescriptionDetails,
      prescriptions: medStrings,
      followUpDays,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#0B5A54] to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
              <Stethoscope className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Clinical Assessment & Diagnosis</h3>
                <span className="px-2 py-0.5 rounded-md bg-teal-400/20 text-teal-100 font-mono text-[10.5px] font-extrabold border border-teal-300/30">
                  {patient.tokenNumber}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-medium">
                Dr. {doctorName.replace('Dr. ', '')} • {doctorSpecialty}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {/* Patient Card Preview */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0B5A54] text-white font-black text-xs flex items-center justify-center shadow-2xs font-heading">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{patient.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {patient.age ? `Age ${patient.age}` : 'Adult'} • {patient.bloodGroup ? `Blood ${patient.bloodGroup}` : 'Blood O+'} • {patient.type || 'In-Person'}
                </p>
              </div>
            </div>

            {patient.issue && (
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-700 block">Reported Symptom</span>
                <span className="text-xs font-bold text-slate-800">{patient.issue}</span>
              </div>
            )}
          </div>

          {/* 1. Assessment / Diagnosis Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>1. Assessment / Clinical Diagnosis *</span>
              </label>
              <span className="text-[10.5px] font-bold text-teal-700">Shown on Patient Visit History</span>
            </div>

            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Pharyngitis with Mild Bronchitis"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all shadow-2xs placeholder:text-slate-400"
            />

            {/* Quick Diagnostic Suggestions */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DIAGNOSES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiagnosis(d)}
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      diagnosis === d
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Clinical Vitals & Subjective Notes */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>2. Vitals & Clinical Examination Notes</span>
            </label>

            {/* Vitals Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block">BP (mmHg)</span>
                <input
                  type="text"
                  value={vitalsBp}
                  onChange={(e) => setVitalsBp(e.target.value)}
                  className="w-full bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block">Pulse (BPM)</span>
                <input
                  type="text"
                  value={vitalsPulse}
                  onChange={(e) => setVitalsPulse(e.target.value)}
                  className="w-full bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block">SpO2</span>
                <input
                  type="text"
                  value={vitalsSpo2}
                  onChange={(e) => setVitalsSpo2(e.target.value)}
                  className="w-full bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter clinical examination findings, chest auscultation, patient observations..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 3. Prescription & Medications Builder */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>3. Prescriptions & Dosage</span>
              </label>

              <button
                type="button"
                onClick={handleAddMedication}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B5A54] hover:text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 cursor-pointer shadow-2xs hover:bg-teal-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-2">
              {medications.map((med, idx) => (
                <div key={med.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase font-mono">Rx #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(med.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Drug Name (e.g., Amoxicillin 500mg)"
                        value={med.name}
                        onChange={(e) => handleUpdateMed(med.id, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Frequency (e.g., 1-0-1)"
                        value={med.frequency}
                        onChange={(e) => handleUpdateMed(med.id, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Duration (e.g., 5 Days)"
                        value={med.duration}
                        onChange={(e) => handleUpdateMed(med.id, 'duration', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Follow-up Period */}
          <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>4. Follow-Up Schedule</span>
            </span>

            <div className="flex items-center gap-1.5">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setFollowUpDays(days)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    followUpDays === days
                      ? 'bg-[#0B5A54] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs shadow-md shadow-teal-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Recording Details...' : 'Save & Complete Consultation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsultationForm;
