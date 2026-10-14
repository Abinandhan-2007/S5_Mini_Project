import React, { useState } from 'react';
import {
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AgeDosageGuide } from '../../lib/types';

interface AgeDosageLimitsCardProps {
  guide?: AgeDosageGuide | null;
  maxDailyDose?: string | null;
  drugName?: string;
  patientDob?: string;
  accentColor?: 'blue' | 'teal';
  compact?: boolean;
}

/**
 * Calculates patient's age in completed years from ISO or YYYY-MM-DD DOB string.
 */
function calculateAgeYears(dobStr?: string): number | null {
  if (!dobStr) return null;
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Maps numeric age to standard cohort key.
 */
function getCohortKeyForAge(ageYears: number): string {
  if (ageYears < 2) return 'infants';
  if (ageYears < 12) return 'children';
  if (ageYears < 18) return 'adolescents';
  if (ageYears < 65) return 'adults';
  return 'geriatric';
}

export const AgeDosageLimitsCard: React.FC<AgeDosageLimitsCardProps> = ({
  guide,
  maxDailyDose,
  drugName,
  patientDob,
  accentColor = 'blue',
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!guide || !guide.limits || guide.limits.length === 0) {
    return null;
  }

  const patientAge = calculateAgeYears(patientDob);
  const patientCohortKey = patientAge !== null ? getCohortKeyForAge(patientAge) : null;

  // Filter cohorts if a specific filter is chosen
  const displayedLimits = selectedFilter === 'all'
    ? guide.limits
    : guide.limits.filter((l) => {
        const text = l.ageGroup.toLowerCase();
        if (selectedFilter === 'infants') return text.includes('infant') || text.includes('<2') || text.includes('கைக்குழந்தை') || text.includes('ശിശു') || text.includes('शिशु');
        if (selectedFilter === 'children') return text.includes('child') || text.includes('2–11') || text.includes('2-11') || text.includes('குழந்தை') || text.includes('കുട്ടി') || text.includes('बच्चे');
        if (selectedFilter === 'adolescents') return text.includes('adolescent') || text.includes('12–17') || text.includes('12-17') || text.includes('வளரிளம்') || text.includes('കൗമാര') || text.includes('किशोर');
        if (selectedFilter === 'adults') return text.includes('adult') || text.includes('18–64') || text.includes('18-64') || text.includes('பெரியவர்') || text.includes('മുതിർന്ന') || text.includes('वयस्क');
        if (selectedFilter === 'geriatric') return text.includes('geriatric') || text.includes('65+') || text.includes('elderly') || text.includes('senior') || text.includes('முதிய') || text.includes('वरिष्ठ');
        return true;
      });

  const isTeal = accentColor === 'teal';
  const primaryBg = isTeal ? 'bg-[#0F766E]' : 'bg-[#1E3A8A]';
  const borderLight = isTeal ? 'border-teal-100' : 'border-blue-100';

  return (
    <div className={`rounded-3xl border ${isTeal ? 'border-teal-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.06)]' : 'border-blue-200/90 shadow-[0_4px_20px_rgba(30,58,138,0.06)]'} bg-white overflow-hidden text-left`}>
      {/* CARD HEADER */}
      <div className={`p-4 sm:p-5 border-b ${borderLight} bg-gradient-to-r ${isTeal ? 'from-teal-50/70 via-emerald-50/40 to-white' : 'from-blue-50/70 via-indigo-50/40 to-white'} flex items-start justify-between gap-3`}>
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl ${primaryBg} text-white flex items-center justify-center shrink-0 shadow-sm`}>
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-heading">
                Age-Based Dosage Limits & Ceilings
              </h3>
              {(maxDailyDose || guide.maxDailyDoseGeneral) && (
                <span className="text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs">
                  <AlertOctagon className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Max Ceiling: {maxDailyDose || guide.maxDailyDoseGeneral}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              Clinical safe dosing limits and maximum 24-hour daily ceilings{drugName ? ` for ${drugName}` : ''} across pediatric, adult, and geriatric age cohorts.
            </p>
          </div>
        </div>

        {/* Expand / Collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* PATIENT AGE BRACKET CALLOUT (if patient DOB is available) */}
          {patientAge !== null && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between gap-2.5 text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-[12px] truncate">
                    Patient Age: <strong>{patientAge} years old</strong>
                  </p>
                  <p className="text-[10.5px] text-emerald-800">
                    Highlighted cohort corresponds to your verified health profile.
                  </p>
                </div>
              </div>
              <span className="text-[9.5px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-2xs shrink-0">
                Active Profile
              </span>
            </div>
          )}

          {/* INTERACTIVE AGE COHORT FILTER CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Filter Cohort:</span>
            {[
              { id: 'all', label: 'All Ages' },
              { id: 'infants', label: 'Infants (<2 yrs)' },
              { id: 'children', label: 'Children (2–11 yrs)' },
              { id: 'adolescents', label: 'Adolescents (12–17 yrs)' },
              { id: 'adults', label: 'Adults (18–64 yrs)' },
              { id: 'geriatric', label: 'Geriatric (65+ yrs)' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === chip.id
                    ? `${primaryBg} text-white shadow-xs scale-102`
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* COHORTS LIST / CARDS */}
          <div className="space-y-3">
            {displayedLimits.map((item, idx) => {
              const textLower = item.ageGroup.toLowerCase();
              const isPatientCohort =
                patientCohortKey &&
                ((patientCohortKey === 'infants' && (textLower.includes('infant') || textLower.includes('<2') || textLower.includes('கைக்குழந்தை') || textLower.includes('ശിശു') || textLower.includes('शिशु'))) ||
                  (patientCohortKey === 'children' && (textLower.includes('child') || textLower.includes('2–11') || textLower.includes('2-11') || textLower.includes('குழந்தை') || textLower.includes('കുട്ടി') || textLower.includes('बच्चे'))) ||
                  (patientCohortKey === 'adolescents' && (textLower.includes('adolescent') || textLower.includes('12–17') || textLower.includes('12-17') || textLower.includes('வளரிளம்') || textLower.includes('കൗമാര') || textLower.includes('किशोर'))) ||
                  (patientCohortKey === 'adults' && (textLower.includes('adult') || textLower.includes('18–64') || textLower.includes('18-64') || textLower.includes('பெரியவர்') || textLower.includes('മുതിർന്ന') || textLower.includes('वयस्क'))) ||
                  (patientCohortKey === 'geriatric' && (textLower.includes('geriatric') || textLower.includes('65+') || textLower.includes('elderly') || textLower.includes('senior') || textLower.includes('முதிய') || textLower.includes('वरिष्ठ'))));

              const isNotRecommended = item.status === 'not_recommended';
              const isCaution = item.status === 'caution';

              let statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Standard Clinical</span>
                </span>
              );

              if (isCaution) {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Caution / Monitored</span>
                  </span>
                );
              } else if (isNotRecommended) {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-rose-600" />
                    <span>Contraindicated / Caution</span>
                  </span>
                );
              }

              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                    isPatientCohort
                      ? 'border-emerald-400 bg-emerald-50/30 shadow-xs ring-2 ring-emerald-400/20'
                      : isNotRecommended
                      ? 'border-rose-200/90 bg-rose-50/20'
                      : isCaution
                      ? 'border-amber-200/80 bg-amber-50/20'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50/80'
                  }`}
                >
                  {/* COHORT HEADER */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 mb-2.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                      <h4 className="text-xs sm:text-[13px] font-black text-slate-900 font-heading">
                        {item.ageGroup}
                      </h4>
                      {isPatientCohort && (
                        <span className="text-[9.5px] font-extrabold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                          Your Age Group
                        </span>
                      )}
                    </div>
                    <div>{statusBadge}</div>
                  </div>

                  {/* 3 TILES GRID: SINGLE DOSE, 24H CEILING, FREQUENCY */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs mb-2.5">
                    {/* Standard Single Dose */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-0.5">
                      <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                        Standard Single Dose
                      </p>
                      <p className="text-xs font-black text-slate-900 leading-snug">
                        {item.standardDose || 'As directed'}
                      </p>
                    </div>

                    {/* Max 24-Hour Daily Limit Ceiling */}
                    <div className="bg-white border border-rose-200/80 rounded-xl p-2.5 space-y-0.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase font-extrabold text-rose-600 tracking-wider flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 text-rose-500" />
                          <span>Max 24h Ceiling</span>
                        </p>
                      </div>
                      <p className="text-xs font-black text-rose-900 leading-snug">
                        {item.maxDailyLimit || 'Doctor-prescribed limit'}
                      </p>
                    </div>

                    {/* Administration Frequency */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-0.5">
                      <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Frequency</span>
                      </p>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {item.frequency || 'Follow doctor directions'}
                      </p>
                    </div>
                  </div>

                  {/* CLINICAL NOTES */}
                  {item.notes && (
                    <div className="bg-white/70 border border-slate-200/60 rounded-xl px-3 py-2 text-[11px] text-slate-600 font-medium leading-relaxed flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-slate-800">Clinical Advice:</strong> {item.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CLINICAL SAFETY WARNING BANNER */}
          {guide.clinicalSafetyWarning && (
            <div className="rounded-2xl p-3 bg-amber-50/90 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Dosage Ceiling Notice:</strong> {guide.clinicalSafetyWarning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
