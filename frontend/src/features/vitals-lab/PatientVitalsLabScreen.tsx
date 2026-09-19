import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  HeartPulse,
  Microscope,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { useCarePulseStore } from '../../lib/store';
import { nurseService } from '../../services/nurseService';

export const PatientVitalsLabScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'vitals' | 'tests'>('vitals');
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [labTestsList, setLabTestsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Default mock fallback records if user is new or no backend records yet
  const fallbackVitals = [
    {
      id: 'vit-demo-1',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '09:30 AM',
      token_number: 101,
      doctor_name: 'Dr. Abhinandhan K',
      doctor_specialty: 'General Medicine',
      hospital_name: 'KMCH Medical Center',
      bp_systolic: 120,
      bp_diastolic: 80,
      heart_rate: 72,
      temperature: 98.6,
      temperature_unit: 'F',
      spo2: 99,
      weight_kg: 65,
      height_cm: 170,
      bmi: 22.5,
      blood_glucose: 95,
      glucose_context: 'fasting',
      notes: 'Routine triage check. All vitals within normal adult thresholds.',
      recorded_by_name: 'Staff Nurse Sarah',
      abnormal_flags: [],
      recorded_at: new Date().toISOString(),
    }
  ];

  const fallbackTests = [
    {
      id: 'test-demo-1',
      test_type: 'Complete Blood Count (CBC) & Lipid Profile',
      status: 'completed',
      appointment_date: new Date().toISOString().split('T')[0],
      doctor_name: 'Dr. Abhinandhan K',
      hospital_name: 'KMCH Diagnostic Lab',
      recorded_at: new Date().toISOString(),
      recorded_by_name: 'Lab Tech Ramesh',
      file_url: '',
      free_text_result: 'All parameters normal. Hemoglobin: 14.2 g/dL, Cholesterol: 175 mg/dL.',
      structured_results: {
        'Hemoglobin (Hb)': '14.2 g/dL (Normal: 13.0 - 17.0)',
        'WBC Count': '6,500 /mcL (Normal: 4,500 - 11,000)',
        'Total Cholesterol': '175 mg/dL (Desirable: < 200)',
        'Triglycerides': '130 mg/dL (Normal: < 150)',
        'Fasting Blood Sugar': '92 mg/dL (Normal: 70 - 99)',
      }
    }
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const patientId = user?.id || 'pat-1';
      const [vitalsData, testsData] = await Promise.all([
        nurseService.getPatientVitalsHistory(patientId),
        nurseService.getPatientLabTestsHistory(patientId)
      ]);

      setVitalsList(vitalsData.length > 0 ? vitalsData : fallbackVitals);
      setLabTestsList(testsData.length > 0 ? testsData : fallbackTests);
    } catch (err) {
      console.error('Error fetching patient vitals/tests:', err);
      setVitalsList(fallbackVitals);
      setLabTestsList(fallbackTests);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Latest vitals entry for top metric cards
  const latestVitals = vitalsList[0] || fallbackVitals[0];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-28 select-none">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#0B5A54] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight font-heading">
                Hospital Vitals & Lab Test Tracking
              </h1>
              <p className="text-[11px] text-teal-200">
                Pre-consultation triage & live diagnostic results
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 disabled:opacity-50"
            title="Refresh Records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── NAVIGATION TABS ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 sticky top-[65px] z-20 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'vitals'
                ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Triage Vitals ({vitalsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'tests'
                ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Microscope className="w-4 h-4" />
            <span>Lab Tests & Reports ({labTestsList.length})</span>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* ── TAB 1: RECORDED VITALS ── */}
        {activeTab === 'vitals' && (
          <div className="space-y-6">
            {/* LATEST VITALS METRICS OVERVIEW */}
            {latestVitals && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                    Latest Recorded Vitals
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {latestVitals.appointment_date || 'Today'}
                  </span>
                </div>

                {/* Abnormal Cues Alert if present */}
                {latestVitals.abnormal_flags && latestVitals.abnormal_flags.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-3 text-rose-900 shadow-2xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-black text-rose-800">Physician Review Flagged:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {latestVitals.abnormal_flags.map((flag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-[10.5px] font-bold"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid of Vitals Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* BP Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Blood Pressure
                    </span>
                    <p className="text-xl font-black text-slate-900 font-heading">
                      {latestVitals.bp_systolic && latestVitals.bp_diastolic
                        ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`
                        : '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Ref: 90/60 - 120/80</p>
                  </div>

                  {/* Pulse Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Heart Rate / Pulse
                    </span>
                    <p className="text-xl font-black text-emerald-700 font-heading">
                      {latestVitals.heart_rate || '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">bpm</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Ref: 60 - 100 bpm</p>
                  </div>

                  {/* Temperature Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Body Temp
                    </span>
                    <p className="text-xl font-black text-amber-700 font-heading">
                      {latestVitals.temperature ? `${latestVitals.temperature}°${latestVitals.temperature_unit || 'F'}` : '--'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Ref: 97.0°F - 99.0°F</p>
                  </div>

                  {/* SpO2 Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Blood Oxygen (SpO2)
                    </span>
                    <p className="text-xl font-black text-teal-700 font-heading">
                      {latestVitals.spo2 ? `${latestVitals.spo2}%` : '--'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Normal: ≥ 95%</p>
                  </div>

                  {/* Weight & BMI Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Weight & BMI
                    </span>
                    <p className="text-xl font-black text-slate-900 font-heading">
                      {latestVitals.weight_kg ? `${latestVitals.weight_kg} kg` : '--'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      BMI: {latestVitals.bmi || '--'}
                    </p>
                  </div>

                  {/* Blood Sugar Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Blood Glucose
                    </span>
                    <p className="text-xl font-black text-slate-900 font-heading">
                      {latestVitals.blood_glucose ? `${latestVitals.blood_glucose}` : '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">mg/dL</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Context: {latestVitals.glucose_context || 'Random'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORICAL VITALS ENTRIES */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                All Hospital Check-in Vitals History
              </h3>

              {vitalsList.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
                  <HeartPulse className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Vitals History Found</p>
                  <p className="text-xs text-slate-500">
                    Your recorded vitals from nurse pre-consultations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vitalsList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                    >
                      {/* Entry Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#0B5A54]" />
                          <span className="font-bold text-slate-900">{item.hospital_name || 'KMCH Hospital'}</span>
                          {item.token_number && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                              Token #{item.token_number}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.appointment_date || 'Recent'}
                        </span>
                      </div>

                      {/* Doctor & Nurse Attribution */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                        <span>Consulting Doctor: <strong className="text-[#0B5A54]">{item.doctor_name}</strong></span>
                        <span className="text-[11px] text-slate-400">Recorded by: {item.recorded_by_name || 'Staff Nurse'}</span>
                      </div>

                      {/* Vitals Summary Pill Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        {item.bp_systolic && item.bp_diastolic && (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-bold">BP</span>
                            <span className="font-bold text-slate-900">{item.bp_systolic}/{item.bp_diastolic} mmHg</span>
                          </div>
                        )}
                        {item.heart_rate && (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-bold">Heart Rate</span>
                            <span className="font-bold text-emerald-700">{item.heart_rate} bpm</span>
                          </div>
                        )}
                        {item.temperature && (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-bold">Temperature</span>
                            <span className="font-bold text-amber-700">{item.temperature}°{item.temperature_unit || 'F'}</span>
                          </div>
                        )}
                        {item.spo2 && (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-bold">SpO2</span>
                            <span className="font-bold text-teal-700">{item.spo2}%</span>
                          </div>
                        )}
                      </div>

                      {/* Intake / Triage Notes */}
                      {item.notes && (
                        <p className="text-xs text-slate-600 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100/60 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: LAB TESTS & DIAGNOSTICS TRACKING ── */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                Diagnostic Orders & Report Tracking
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {labTestsList.length} total orders
              </span>
            </div>

            {labTestsList.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
                <Microscope className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Lab Tests Ordered</p>
                <p className="text-xs text-slate-500">
                  Lab tests ordered during hospital consultations will appear here with live tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {labTestsList.map((test) => {
                  const isExpanded = expandedTestId === test.id;
                  const isCompleted = test.status === 'completed';

                  return (
                    <div
                      key={test.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Card Header */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54] shrink-0">
                              <Microscope className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 font-heading">{test.test_type}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{test.hospital_name || 'Hospital Diagnostic Center'}</span>
                                <span>&bull;</span>
                                <span>{test.appointment_date || 'Recent'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider border shrink-0 flex items-center gap-1 ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Report Published</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>In Progress</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Status Stepper Bar */}
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10.5px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                            Tracking Status
                          </p>
                          <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-center">
                            <div className="py-1 px-2 rounded-lg bg-emerald-100 text-emerald-800">
                              1. Ordered
                            </div>
                            <div className="py-1 px-2 rounded-lg bg-emerald-100 text-emerald-800">
                              2. Sample Tested
                            </div>
                            <div className={`py-1 px-2 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                              3. Report Published
                            </div>
                          </div>
                        </div>

                        {/* Expand Results Trigger */}
                        <button
                          onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                          className="w-full mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B5A54] hover:text-[#084540] cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Test Results & Report' : 'View Test Results & Report'}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-3 text-xs">
                          {/* Structured Results */}
                          {test.structured_results && Object.keys(test.structured_results).length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10.5px]">
                                Laboratory Parameter Breakdown:
                              </h5>
                              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                                {Object.entries(test.structured_results).map(([param, val]: [string, any]) => (
                                  <div key={param} className="p-2.5 flex items-center justify-between">
                                    <span className="font-bold text-slate-700">{param}</span>
                                    <span className="font-mono font-bold text-teal-800">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Free Text Impression / Result */}
                          {test.free_text_result && (
                            <div>
                              <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10.5px] mb-1">
                                Pathologist Summary:
                              </h5>
                              <p className="bg-white p-3 rounded-xl border border-slate-200 font-medium text-slate-700 leading-relaxed">
                                {test.free_text_result}
                              </p>
                            </div>
                          )}

                          {/* Download / View Attached Report File */}
                          {test.file_url ? (
                            <div className="pt-2">
                              <a
                                href={test.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download PDF / Lab Report</span>
                              </a>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Official printed report available at hospital reception or via digital download when processed.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
