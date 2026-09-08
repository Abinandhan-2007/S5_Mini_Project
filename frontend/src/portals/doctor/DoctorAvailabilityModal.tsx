import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  Check,
  Coffee,
  Stethoscope,
  Users,
  Activity,
  HeartPulse,
  DoorOpen,
  Sparkles,
  Radio,
  FileText,
  ShieldCheck,
  Timer,
} from 'lucide-react';

export interface DoctorAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: {
    id: string;
    name: string;
    isAvailable: boolean;
    roomNumber?: string;
    availabilityReason?: string;
    unavailableUntil?: string;
  };
  onSaveAvailability: (isAvailable: boolean, reason?: string, duration?: string) => Promise<void>;
}

interface ReasonPreset {
  id: string;
  title: string;
  subtitle: string;
  defaultDuration: string;
  icon: React.ElementType;
  badgeColor: string;
  badgeBg: string;
}

const PRESETS: ReasonPreset[] = [
  {
    id: 'icu-surgery',
    title: 'Emergency Surgery / ICU Call',
    subtitle: 'Critical patient care in OT / Trauma Bay',
    defaultDuration: '45 mins',
    icon: HeartPulse,
    badgeColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200/80',
  },
  {
    id: 'ward-rounds',
    title: 'Inpatient Ward Rounds',
    subtitle: 'Reviewing admitted floor patients',
    defaultDuration: '45 mins',
    icon: Activity,
    badgeColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200/80',
  },
  {
    id: 'dept-meeting',
    title: 'Department Clinical Meeting',
    subtitle: 'Case review & executive briefing',
    defaultDuration: '1 hour',
    icon: Users,
    badgeColor: 'text-purple-600',
    badgeBg: 'bg-purple-50 border-purple-200/80',
  },
  {
    id: 'procedure-review',
    title: 'Diagnostic / Minor Procedure',
    subtitle: 'Endoscopy, biopsy, or bedside test',
    defaultDuration: '30 mins',
    icon: Stethoscope,
    badgeColor: 'text-teal-600',
    badgeBg: 'bg-teal-50 border-teal-200/80',
  },
  {
    id: 'meal-break',
    title: 'Lunch / Clinical Break',
    subtitle: 'Physician rest & meal intermission',
    defaultDuration: '30 mins',
    icon: Coffee,
    badgeColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200/80',
  },
  {
    id: 'sanitization',
    title: 'Cabin Sanitization & Prep',
    subtitle: 'Deep cabin disinfection protocol',
    defaultDuration: '15 mins',
    icon: Sparkles,
    badgeColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200/80',
  },
];

const DURATION_OPTIONS = ['15 mins', '30 mins', '45 mins', '1 hour', '2 hours', 'End of Shift'];

export const DoctorAvailabilityModal: React.FC<DoctorAvailabilityModalProps> = ({
  isOpen,
  onClose,
  doctor,
  onSaveAvailability,
}) => {
  // Target status toggle: true = Available, false = Unavailable
  const [targetStatus, setTargetStatus] = useState<boolean>(!doctor.isAvailable);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('meal-break');
  const [customReason, setCustomReason] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('30 mins');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetStatus(doctor.isAvailable ? false : true);
      setCustomReason(doctor.availabilityReason || '');
      setSelectedDuration(doctor.unavailableUntil || '30 mins');

      const match = PRESETS.find((p) => p.title.toLowerCase() === (doctor.availabilityReason || '').toLowerCase());
      if (match) {
        setSelectedPresetId(match.id);
      } else if (!doctor.availabilityReason) {
        setSelectedPresetId('meal-break');
      } else {
        setSelectedPresetId('custom');
      }
    }
  }, [isOpen, doctor]);

  // Calculate live projected return timestamp
  const projectedReturnTime = useMemo(() => {
    if (selectedDuration === 'End of Shift') {
      return 'End of Today’s OPD Shift (05:00 PM)';
    }

    const now = new Date();
    let addMinutes = 30;
    if (selectedDuration === '15 mins') addMinutes = 15;
    else if (selectedDuration === '30 mins') addMinutes = 30;
    else if (selectedDuration === '45 mins') addMinutes = 45;
    else if (selectedDuration === '1 hour') addMinutes = 60;
    else if (selectedDuration === '2 hours') addMinutes = 120;

    now.setMinutes(now.getMinutes() + addMinutes);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }, [selectedDuration]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ReasonPreset) => {
    setSelectedPresetId(preset.id);
    setCustomReason('');
    setSelectedDuration(preset.defaultDuration);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (targetStatus) {
        // Setting to AVAILABLE
        await onSaveAvailability(true, '', '');
      } else {
        // Setting to NOT AVAILABLE
        let finalReason = customReason.trim();
        if (!finalReason) {
          const chosenPreset = PRESETS.find((p) => p.id === selectedPresetId);
          finalReason = chosenPreset ? chosenPreset.title : 'Temporarily Stepped Out';
        }
        await onSaveAvailability(false, finalReason, selectedDuration);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update availability status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[32px] border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] ring-1 ring-black/5 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL HEADER ────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200/80 font-mono">
                  {doctor.roomNumber || 'Cabin 101'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">· Dr. {doctor.name}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading mt-0.5">
                Set Cabin Availability Status
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Instantly broadcast your presence to Reception, Triage, and live patient booking queues.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. SCROLLABLE BODY ──────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Target Status Mode Switcher (Tabbed Radio Group) */}
          <div className="p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setTargetStatus(true)}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                targetStatus
                  ? 'bg-white text-emerald-950 shadow-sm border border-emerald-300 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${targetStatus ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>Active On-Duty</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetStatus(false)}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !targetStatus
                  ? 'bg-white text-rose-950 shadow-sm border border-rose-300 ring-1 ring-rose-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${!targetStatus ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>Away / Off-Duty</span>
            </button>
          </div>

          {/* Conditional Content based on Target Status */}
          {targetStatus ? (
            /* Active On-Duty Mode Info Card */
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-100/40 border border-emerald-200/90 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Resume Active OPD Consultations</h4>
                  <p className="text-xs text-emerald-800/80 font-medium">
                    Cabin will be unlocked for immediate patient intake and next-token queue calls.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 space-y-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Clears temporary absence reasons from patient app and public screens.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Notifies the front desk reception that Dr. {doctor.name} is in cabin.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Away / Off-Duty Configuration Form */
            <div className="space-y-5">
              
              {/* Presets Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Select Clinical Absence Reason
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Click to auto-fill duration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPresetId === preset.id && !customReason.trim();

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer group relative overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-br from-teal-50/90 to-emerald-50/50 border-[#0B5A54] ring-2 ring-[#0B5A54]/15 shadow-sm'
                            : 'bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-xl border shrink-0 ${preset.badgeBg} ${preset.badgeColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-[#0B5A54] transition-colors leading-tight truncate">
                              {preset.title}
                            </h4>
                          </div>
                          <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1">
                            {preset.subtitle}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="font-mono text-[9.5px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              ⏱ {preset.defaultDuration}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Specific Reason Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Or Enter Specific Custom Reason</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      if (e.target.value.trim()) setSelectedPresetId('custom');
                    }}
                    placeholder="e.g. Attending code blue in Emergency Trauma Ward..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54] focus:border-[#0B5A54] transition-all"
                  />
                  {customReason && (
                    <button
                      type="button"
                      onClick={() => setCustomReason('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Duration Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Expected Absence Duration</span>
                  </label>
                  <span className="text-[10.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Selected: {selectedDuration}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {DURATION_OPTIONS.map((dur) => {
                    const isSelected = selectedDuration === dur;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSelectedDuration(dur)}
                        className={`py-2 px-1.5 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer truncate ${
                          isSelected
                            ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {dur}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Projected Return Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center gap-3 text-xs">
                <Timer className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="font-extrabold text-amber-950 block">
                    Projected Return Time: <span className="font-mono text-amber-900">{projectedReturnTime}</span>
                  </span>
                  <p className="text-[10.5px] text-amber-800/90 font-medium mt-0.5">
                    Live return countdown badge will be shown to patients booking tokens online.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ── 3. MODAL FOOTER ────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {targetStatus ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-teal-900/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? 'Updating...' : 'Set Active & Available'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-900/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isSubmitting ? 'Broadcasting...' : `Confirm & Broadcast Absence (${selectedDuration})`}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorAvailabilityModal;
