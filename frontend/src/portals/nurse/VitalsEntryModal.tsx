// frontend/src/portals/nurse/VitalsEntryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  HeartPulse,
  Activity,
  Thermometer,
  Gauge,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Info,
  Ruler
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import type { NurseQueueItem, VitalsFormData, GlucoseContext } from '../../types/nurse';

interface VitalsEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueItem: NurseQueueItem | null;
  onSuccess: () => void;
}

export const VitalsEntryModal: React.FC<VitalsEntryModalProps> = ({
  isOpen,
  onClose,
  queueItem,
  onSuccess,
}) => {
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [bpSystolic, setBpSystolic] = useState<string>('');
  const [bpDiastolic, setBpDiastolic] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [bloodGlucose, setBloodGlucose] = useState<string>('');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('random');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with existing vitals if already recorded
  useEffect(() => {
    if (queueItem?.vitals) {
      const v = queueItem.vitals;
      setHeightCm(v.height_cm ? String(v.height_cm) : '');
      setWeightKg(v.weight_kg ? String(v.weight_kg) : '');
      setBpSystolic(v.bp_systolic ? String(v.bp_systolic) : '');
      setBpDiastolic(v.bp_diastolic ? String(v.bp_diastolic) : '');
      setHeartRate(v.heart_rate ? String(v.heart_rate) : '');
      setTemperature(v.temperature ? String(v.temperature) : '');
      setTemperatureUnit(v.temperature_unit || 'C');
      setRespiratoryRate(v.respiratory_rate ? String(v.respiratory_rate) : '');
      setSpo2(v.spo2 ? String(v.spo2) : '');
      setBloodGlucose(v.blood_glucose ? String(v.blood_glucose) : '');
      setGlucoseContext((v.glucose_context as GlucoseContext) || 'random');
      setNotes(v.notes || '');
    } else {
      setHeightCm('');
      setWeightKg('');
      setBpSystolic('');
      setBpDiastolic('');
      setHeartRate('');
      setTemperature('');
      setTemperatureUnit('C');
      setRespiratoryRate('');
      setSpo2('');
      setBloodGlucose('');
      setGlucoseContext('random');
      setNotes('');
    }
    setErrorMessage(null);
  }, [queueItem, isOpen]);

  if (!isOpen || !queueItem) return null;

  // Auto-calculated BMI computation
  const hNum = parseFloat(heightCm);
  const wNum = parseFloat(weightKg);
  let computedBmi: number | null = null;
  let bmiCategory: { label: string; color: string } | null = null;

  if (hNum > 0 && wNum > 0) {
    const hMeter = hNum / 100.0;
    computedBmi = Math.round((wNum / (hMeter * hMeter)) * 10) / 10;
    if (computedBmi < 18.5) {
      bmiCategory = { label: 'Underweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    } else if (computedBmi <= 24.9) {
      bmiCategory = { label: 'Normal Weight', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    } else if (computedBmi <= 29.9) {
      bmiCategory = { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    } else {
      bmiCategory = { label: 'Obese', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
  }

  // Realtime Abnormal Threshold Checks
  // NOTE: Reference ranges below are standard general adult reference thresholds.
  const warnings: string[] = [];
  const sys = parseInt(bpSystolic);
  const dia = parseInt(bpDiastolic);
  if (!isNaN(sys)) {
    if (sys > 140) warnings.push(`High Systolic BP: ${sys} mmHg (>140)`);
    else if (sys < 90) warnings.push(`Low Systolic BP: ${sys} mmHg (<90)`);
  }
  if (!isNaN(dia)) {
    if (dia > 90) warnings.push(`High Diastolic BP: ${dia} mmHg (>90)`);
    else if (dia < 60) warnings.push(`Low Diastolic BP: ${dia} mmHg (<60)`);
  }
  const hr = parseInt(heartRate);
  if (!isNaN(hr)) {
    if (hr > 100) warnings.push(`Tachycardia: ${hr} bpm (>100)`);
    else if (hr < 60) warnings.push(`Bradycardia: ${hr} bpm (<60)`);
  }
  const ox = parseInt(spo2);
  if (!isNaN(ox) && ox < 95) {
    warnings.push(`Low Blood Oxygen (SpO2): ${ox}% (<95%)`);
  }
  const tNum = parseFloat(temperature);
  if (!isNaN(tNum)) {
    const cT = temperatureUnit === 'F' ? (tNum - 32) * 5 / 9 : tNum;
    if (cT >= 38.0) warnings.push(`Fever: ${tNum}°${temperatureUnit}`);
    else if (cT < 35.0) warnings.push(`Hypothermia: ${tNum}°${temperatureUnit}`);
  }
  const bg = parseFloat(bloodGlucose);
  if (!isNaN(bg)) {
    if (bg < 70) warnings.push(`Hypoglycemia: ${bg} mg/dL (<70)`);
    else if (glucoseContext === 'fasting' && bg > 126) warnings.push(`High Fasting Glucose: ${bg} mg/dL (>126)`);
    else if (bg > 200) warnings.push(`High Glucose: ${bg} mg/dL (>200)`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: VitalsFormData = {
        appointment_id: queueItem.appointment_id,
        patient_id: queueItem.patient.id,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        bp_systolic: bpSystolic ? parseInt(bpSystolic) : undefined,
        bp_diastolic: bpDiastolic ? parseInt(bpDiastolic) : undefined,
        heart_rate: heartRate ? parseInt(heartRate) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        temperature_unit: temperatureUnit,
        respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
        spo2: spo2 ? parseInt(spo2) : undefined,
        blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : undefined,
        glucose_context: glucoseContext,
        notes: notes.trim() || undefined,
      };

      await nurseService.recordVitals(payload);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to save vitals record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0B5A54] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <HeartPulse className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-black font-heading tracking-tight">Record Patient Vitals</h2>
              <p className="text-xs text-teal-200/80">
                Pre-Consultation Clinical Screening &bull; Token #{queueItem.token_number || '--'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Identity Banner */}
        <div className="bg-teal-50/60 border-b border-teal-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-800 text-sm">{queueItem.patient.name}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-teal-100/80 text-teal-800 font-mono font-bold text-[11px]">
              {queueItem.patient.patient_code || 'PT-REG'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 text-[11px]">
            <span>{queueItem.patient.gender || 'Gender: --'}</span>
            <span>&bull;</span>
            <span>Blood: <strong className="text-slate-800">{queueItem.patient.blood_group || 'O+'}</strong></span>
            <span>&bull;</span>
            <span>Doctor: <strong className="text-[#0B5A54]">{queueItem.doctor.name}</strong> ({queueItem.doctor.room_number})</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Clinical Limitation Caveat Note (Requirement 2) */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Clinical Note:</strong> Abnormal screening flags use general adult reference ranges and are not adjusted for pediatric/geriatric age, pregnancy, or pre-existing chronic conditions. Attending physician confirmation required.
            </div>
          </div>

          {/* Realtime Alert Banner if any warnings triggered */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Abnormal Vitals Detected ({warnings.length}):</strong>
                <ul className="mt-1 list-disc list-inside text-[11px] space-y-0.5 font-medium">
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            {/* Height & Weight */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-[#0B5A54]" /> Anthropometry
                </span>
                {computedBmi && (
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${bmiCategory?.color}`}>
                    BMI {computedBmi} &bull; {bmiCategory?.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 172"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    max="300"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 68.5"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>
            </div>

            {/* Blood Pressure */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-600" /> Blood Pressure
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Normal: 120/80 mmHg</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Systolic (mmHg)</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Diastolic (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>
            </div>

            {/* Heart Rate & SpO2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-indigo-600" /> Pulse & Oxygen
                </span>
                <span className="text-[10px] text-slate-400 font-normal">HR 60-100, SpO2 &ge;95%</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    min="30"
                    max="220"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>
            </div>

            {/* Temperature & Respiratory */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-amber-600" /> Temperature & Resp
                </span>
                <div className="flex items-center gap-1 text-[10px] bg-slate-200/80 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('C')}
                    className={`px-1.5 py-0.5 rounded ${temperatureUnit === 'C' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'}`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('F')}
                    className={`px-1.5 py-0.5 rounded ${temperatureUnit === 'F' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'}`}
                  >
                    °F
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Temp ({temperatureUnit === 'C' ? '°C' : '°F'})</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="110"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder={temperatureUnit === 'C' ? '36.8' : '98.2'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Resp Rate (bpm)</label>
                  <input
                    type="number"
                    min="6"
                    max="60"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="16"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>
            </div>

            {/* Blood Glucose */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-red-500" /> Blood Glucose Screening
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Fasting &le;126 mg/dL &bull; Random &le;200 mg/dL</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Glucose Level (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="600"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    placeholder="e.g. 110"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Testing Context</label>
                  <select
                    value={glucoseContext}
                    onChange={(e) => setGlucoseContext(e.target.value as GlucoseContext)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                  >
                    <option value="random">Random / Casual</option>
                    <option value="fasting">Fasting (&gt;8 hrs)</option>
                    <option value="post-meal">Post-Prandial (2 hrs post-meal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nurse Notes */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] text-slate-600 font-bold">Nurse Observations / Symptoms</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Patient reports mild dizziness upon standing. Alert and oriented."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Saving Vitals...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Vitals to Consultation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
