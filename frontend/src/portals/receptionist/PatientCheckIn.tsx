import React, { useState } from 'react';
import {
  Search,
  Activity,
  HeartPulse,
  Thermometer,
  Scale,
  CheckCircle2,
  UserPlus,
  Flame,
  Droplet,
  UserCheck,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';

interface PatientCheckInProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

export const PatientCheckIn: React.FC<PatientCheckInProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const tokens = useStaffStore((s) => s.tokens);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenQueueItem | null>(null);

  // Vitals State
  const [systolicBP, setSystolicBP] = useState('120');
  const [diastolicBP, setDiastolicBP] = useState('80');
  const [pulse, setPulse] = useState('74');
  const [temperature, setTemperature] = useState('98.6');
  const [spo2, setSpo2] = useState('99');
  const [weight, setWeight] = useState('68');
  const [triagePriority, setTriagePriority] = useState<'Normal' | 'Urgent' | 'Senior/Child'>('Normal');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [checkedInList, setCheckedInList] = useState<
    {
      token: TokenQueueItem;
      vitals: {
        bp: string;
        pulse: string;
        temp: string;
        spo2: string;
        weight: string;
        priority: string;
      };
      checkedInAt: string;
    }[]
  >([]);

  // Find matching scheduled tokens that are waiting
  const matchingTokens = tokens.filter((t) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      t.patientName.toLowerCase().includes(q) ||
      t.patientPhone.includes(q) ||
      t.tokenNumber.toLowerCase().includes(q) ||
      t.ticketNumber.toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = (token: TokenQueueItem) => {
    setSelectedToken(token);
    setIntakeNotes(token.healthIssue || '');
    // Autopopulate some realistic default vitals
    setSystolicBP('120');
    setDiastolicBP('80');
    setPulse('72');
    setTemperature('98.6');
    setSpo2('99');
    setWeight('65');
  };

  const handleCompleteCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newCheckedInRecord = {
      token: selectedToken,
      vitals: {
        bp: `${systolicBP}/${diastolicBP} mmHg`,
        pulse: `${pulse} bpm`,
        temp: `${temperature} °F`,
        spo2: `${spo2} %`,
        weight: `${weight} kg`,
        priority: triagePriority,
      },
      checkedInAt: nowStr,
    };

    setCheckedInList([newCheckedInRecord, ...checkedInList]);
    updateTokenStatus(selectedToken.id, 'Waiting');
    onShowToast?.(
      `Patient ${selectedToken.patientName} checked in successfully! Vitals logged for ${selectedToken.doctorName}.`
    );
    setSelectedToken(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. SEARCH & PATIENT SELECTION / VITALS CAPTURE GRID
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Patient Search & Pending Arrival Selector */}
        <div className="space-y-5">
          {/* Search Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                Find Scheduled Patient
              </h3>
              {onOpenNewAppointment && (
                <button
                  onClick={onOpenNewAppointment}
                  className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Walk-In</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search phone, name, or #TOK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            {/* Instant Search Results */}
            {searchQuery.trim() && (
              <div className="space-y-2 pt-2 border-t border-slate-100 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Search Results ({matchingTokens.length})
                </span>
                {matchingTokens.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No matching bookings found.</p>
                ) : (
                  matchingTokens.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectPatient(t)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        selectedToken?.id === t.id
                          ? 'bg-teal-50 border-[#0B5A54] ring-1 ring-[#0B5A54]'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{t.patientName}</span>
                        <span className="font-mono text-[10px] font-black text-[#0B5A54]">
                          {t.tokenNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t.patientPhone}</p>
                      <p className="text-[10.5px] text-[#0B5A54] font-semibold mt-1">
                        {t.doctorName} • {t.timeSlot}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pending Arrival List */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                Today&apos;s Appointments
              </h3>
              <span className="text-xs font-bold text-[#0B5A54]">{tokens.length} Total</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 no-scrollbar">
              {tokens.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectPatient(t)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedToken?.id === t.id
                      ? 'bg-teal-50 border-[#0B5A54] ring-1 ring-[#0B5A54] shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{t.patientName}</span>
                    <span className="font-mono text-xs font-black text-[#0B5A54]">
                      {t.tokenNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="truncate">{t.doctorName}</span>
                    <span className="font-mono">{t.timeSlot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (2 Cols): Vitals Intake Form */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
              {/* Selected Patient Banner */}
              <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-sm font-heading shadow-xs">
                    {selectedToken.patientName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 font-heading">
                        {selectedToken.patientName}
                      </h3>
                      <span className="px-2 py-0.5 bg-white text-[#0B5A54] font-mono text-[11px] font-black rounded-lg border border-teal-200">
                        {selectedToken.tokenNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Phone: <span className="font-mono">{selectedToken.patientPhone}</span> • Attending:{' '}
                      <span className="text-[#0B5A54]">{selectedToken.doctorName}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 font-bold block">Appointment Time</span>
                  <span className="font-mono font-black text-slate-800">
                    {selectedToken.timeSlot}
                  </span>
                </div>
              </div>

              {/* Vitals Form */}
              <form onSubmit={handleCompleteCheckIn} className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-[#0B5A54]" />
                    Record Patient Triage Vitals
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Immediate Clinical Triage
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {/* Blood Pressure */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      Blood Pressure (BP)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value)}
                        placeholder="120"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center font-mono"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="text"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        placeholder="80"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center font-mono"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 block text-right font-mono">mmHg</span>
                  </div>

                  {/* Heart Rate / Pulse */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      Pulse / Heart Rate
                    </label>
                    <input
                      type="text"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      placeholder="72"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <span className="text-[9px] text-slate-400 block text-right font-mono">bpm</span>
                  </div>

                  {/* Body Temperature */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                      Body Temperature
                    </label>
                    <input
                      type="text"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="98.6"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <span className="text-[9px] text-slate-400 block text-right font-mono">°F</span>
                  </div>

                  {/* SpO2 Oxygen */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-sky-500" />
                      Blood Oxygen (SpO2)
                    </label>
                    <input
                      type="text"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      placeholder="99"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <span className="text-[9px] text-slate-400 block text-right font-mono">%</span>
                  </div>

                  {/* Weight */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                      Weight
                    </label>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="68"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <span className="text-[9px] text-slate-400 block text-right font-mono">kg</span>
                  </div>

                  {/* Triage Priority */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      Triage Category
                    </label>
                    <select
                      value={triagePriority}
                      onChange={(e) => setTriagePriority(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="Normal">🟢 Standard Queue</option>
                      <option value="Urgent">🔴 High Priority (Urgent)</option>
                      <option value="Senior/Child">🟡 Senior Citizen / Child</option>
                    </select>
                  </div>
                </div>

                {/* Intake Notes */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Presenting Symptoms & Intake Notes
                  </label>
                  <textarea
                    rows={2}
                    value={intakeNotes}
                    onChange={(e) => setIntakeNotes(e.target.value)}
                    placeholder="E.g. Fever for 3 days, mild headache, elevated BP..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedToken(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Complete Arrival Check-In</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center mx-auto shadow-xs">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Select Patient to Begin Arrival Check-In
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Search by phone number or select a patient from the left column to log triage vitals and mark as checked-in.
                </p>
              </div>
            </div>
          )}

          {/* Recently Checked In Summary */}
          {checkedInList.length > 0 && (
            <div className="mt-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Recently Checked-In Arrivals ({checkedInList.length})
              </h4>

              <div className="space-y-3">
                {checkedInList.map((record, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-teal-50 text-[#0B5A54] font-mono font-black rounded-lg border border-teal-200">
                          {record.token.tokenNumber}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {record.token.patientName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                        <span>BP: {record.vitals.bp}</span>
                        <span>Pulse: {record.vitals.pulse}</span>
                        <span>Temp: {record.vitals.temp}</span>
                        <span>SpO2: {record.vitals.spo2}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-400">
                      Checked in at {record.checkedInAt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientCheckIn;
