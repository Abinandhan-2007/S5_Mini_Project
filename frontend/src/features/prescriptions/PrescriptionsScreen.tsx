import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  Building2,
  Calendar,
  Search,
  Bell,
  Plus,
  Camera,
  Utensils,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useCarePulseStore } from '../../lib/store';
import { MedicationCardStack } from '../../components/prescriptions';
import { MOCK_PRESCRIPTIONS } from '../../lib/mockApi';
import { useTranslation } from '../../i18n';

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  duration: string;
  mealTiming?: string;
}

export interface DoctorPrescriptionGroup {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  hospitalName: string;
  datePrescribed: string;
  status: 'Active' | 'Completed';
  medicines: PrescribedMedicine[];
}

export const PrescriptionsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCarePulseStore((s) => s.user);
  const storePrescriptions = useCarePulseStore((s) => s.prescriptions);
  const history = useCarePulseStore((s) => s.history);
  const syncPrescriptions = useCarePulseStore((s) => s.syncPrescriptions);
  const syncHistory = useCarePulseStore((s) => s.syncHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active'>('All');

  useEffect(() => {
    if (user?.id) {
      syncPrescriptions(user.id);
      syncHistory(user.id);
    }
  }, [user?.id, syncPrescriptions, syncHistory]);

  const effectivePrescriptions = (storePrescriptions && storePrescriptions.length > 0)
    ? storePrescriptions
    : MOCK_PRESCRIPTIONS;

  // Build dynamic prescription groups from store prescriptions & consultation history
  const dynamicGroups: DoctorPrescriptionGroup[] = React.useMemo(() => {
    const groups: DoctorPrescriptionGroup[] = [];

    // 1. Group direct prescriptions by prescriber/doctor
    if (effectivePrescriptions && effectivePrescriptions.length > 0) {
      const byDoctor: Record<string, PrescribedMedicine[]> = {};
      effectivePrescriptions.forEach((rx) => {
        const prescriber = rx.prescriber || 'Treating Physician';
        if (!byDoctor[prescriber]) byDoctor[prescriber] = [];
        byDoctor[prescriber].push({
          id: rx.id,
          name: rx.drugName,
          dosage: rx.dosage || 'As directed',
          instructions: rx.frequency || 'Follow doctor advice',
          duration: rx.totalDays ? `${rx.totalDays} Days Course` : 'Standard Course',
          mealTiming: rx.mealTiming || undefined,
        });
      });

      Object.entries(byDoctor).forEach(([doctorName, meds], idx) => {
        groups.push({
          id: `rx-grp-${idx}`,
          doctorName,
          doctorSpecialty: 'Specialist Physician',
          doctorPhoto: '/doctor_default.jpg',
          hospitalName: 'CarePulse Central Hospital',
          datePrescribed: 'Recent',
          status: 'Active',
          medicines: meds,
        });
      });
    }

    // 2. From clinical consultations with prescription details
    if (history && history.length > 0) {
      history.forEach((h, idx) => {
        if (h.prescriptionDetails && h.prescriptionDetails.length > 3) {
          groups.push({
            id: `hist-grp-${h.id || idx}`,
            doctorName: h.doctorName,
            doctorSpecialty: h.specialty,
            doctorPhoto: h.doctorPhoto || '/doctor_default.jpg',
            hospitalName: h.hospitalName,
            datePrescribed: h.date,
            status: 'Active',
            medicines: [
              {
                id: `med-${h.id || idx}`,
                name: h.prescriptionDetails,
                dosage: 'As prescribed',
                instructions: 'Follow clinical instructions',
                duration: 'Course completion',
              },
            ],
          });
        }
      });
    }

    return groups;
  }, [effectivePrescriptions, history]);

  const filteredGroups = dynamicGroups.filter((grp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      grp.doctorName.toLowerCase().includes(q) ||
      grp.datePrescribed.toLowerCase().includes(q) ||
      grp.hospitalName.toLowerCase().includes(q) ||
      grp.medicines.some((m) => m.name.toLowerCase().includes(q));

    const matchesFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Active' && grp.status === 'Active');

    return matchesQuery && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* EXECUTIVE CYAN TOP HEADER */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">{t('prescriptions.title', 'Prescription Vault')}</h1>
              <p className="text-[11px] text-teal-50 font-medium">{t('home.latestPrescriptions', 'Medications, dosages & refill schedule')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/prescriptions/scan')}
              className="px-3 py-1.5 rounded-full bg-white text-[#0B5A54] hover:bg-teal-50 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Scan Medicine with Camera"
            >
              <Camera className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span className="hidden sm:inline">{t('scanMedicine.scanAnother', 'Scan Medicine')}</span>
            </button>

            <button
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-300 ring-2 ring-[#1FA2AC]" />
            </button>
          </div>
        </div>

        {/* Search Pill Input */}
        {dynamicGroups.length > 0 && (
          <div className="mt-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medication, doctor, or condition..."
              className="w-full bg-white text-slate-800 text-xs font-semibold placeholder:text-slate-400 pl-10 pr-4 py-2.5 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all"
            />
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-5 max-w-5xl mx-auto w-full">
        {/* SCAN MEDICINE SAFETY HERO BANNER */}
        <div className="bg-gradient-to-r from-[#0B5A54] via-[#14837A] to-[#0B5A54] rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">Unsure about a loose pill or strip?</h3>
                <span className="bg-amber-300 text-teal-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                  Safety Tool
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium leading-snug">
                Scan your tablet packaging with your camera to identify correct food timing and dosage.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/prescriptions/scan')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white text-[#0B5A54] hover:bg-teal-50 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>{t('scanMedicine.scanAnother', 'Scan Medicine')}</span>
          </button>
        </div>

        {/* 1. INTERACTIVE SAMSUNG PASS CASCADING MEDICATION CARD STACK */}
        <section className="space-y-2">
          <MedicationCardStack
            prescriptions={effectivePrescriptions}
            title="DAILY DOSAGE WALLET STACK"
          />
        </section>

        {/* 2. Filter Chips Bar & Detailed Doctor Groups */}
        {dynamicGroups.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('All')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  activeFilter === 'All'
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}
              >
                All Prescriptions ({dynamicGroups.length})
              </button>
              <button
                onClick={() => setActiveFilter('Active')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  activeFilter === 'Active'
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}
              >
                Active Courses
              </button>
            </div>

            <Badge variant="tint" size="sm">
              {filteredGroups.length} {filteredGroups.length === 1 ? 'Record' : 'Records'}
            </Badge>
          </div>
        )}

        {/* EMPTY STATE */}
        {dynamicGroups.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E7EC] shadow-xs text-center space-y-5 my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-sm">
              <Pill className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5A54]" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-black text-[#111827] font-heading">
                {t('prescriptions.noPrescriptionsFound', 'No Active Prescriptions')}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                {t('prescriptions.noPrescriptionsFound', 'You have no active prescriptions or medication plans on file.')}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/hospitals')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('home.bookAppointment', 'Book Doctor')}</span>
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 text-[#475467] text-xs sm:text-sm font-bold border border-[#E4E7EC] transition-all cursor-pointer"
              >
                {t('common.back', 'Return to Home')}
              </button>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
            <p className="text-xs font-bold text-slate-700">No prescriptions match your search query.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#0B5A54] font-extrabold hover:underline"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* DYNAMIC PRESCRIPTION GROUPS */
          <div className="space-y-4">
            {filteredGroups.map((grp) => (
              <div
                key={grp.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 text-left"
              >
                {/* Header Row: Doctor Info & Prescribed Date */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={grp.doctorPhoto}
                      alt={grp.doctorName}
                      size="md"
                      className="ring-2 ring-[#E3F3F1] shadow-2xs shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm font-black text-[#111827] truncate font-heading">
                        {grp.doctorName}
                      </h4>
                      <p className="text-xs font-bold text-[#0B5A54]">{grp.doctorSpecialty}</p>
                      <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                        <span>{grp.hospitalName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider block">
                      {grp.status}
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-400 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{grp.datePrescribed}</span>
                    </span>
                  </div>
                </div>

                {/* Medicines List Stack */}
                <div className="space-y-2.5">
                  {grp.medicines.map((med) => (
                    <div
                      key={med.id}
                      className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F1F5F9] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#0B5A54] flex items-center justify-center shrink-0 shadow-2xs">
                          <Pill className="w-4 h-4 text-[#0B5A54]" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-[#111827] truncate">
                            {med.name}
                          </h5>
                          <p className="text-[11px] font-bold text-[#0B5A54]">
                            {med.dosage} • {med.instructions}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {med.mealTiming && (
                          <span className="text-[10px] font-extrabold text-[#0B5A54] bg-[#E3F3F1] border border-[#14B8A6]/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Utensils className="w-3 h-3" />
                            <span>{med.mealTiming}</span>
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          {med.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
