import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  Building2,
  Calendar,
  CheckCircle2,
  Search,
  Bell,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  duration: string;
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

const PRESCRIPTION_GROUPS: DoctorPrescriptionGroup[] = [
  {
    id: 'grp-1',
    doctorName: 'Dr. Alex Morgan',
    doctorSpecialty: 'Cardiology Specialist',
    doctorPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'St. Jude Heart & Medical Center',
    datePrescribed: 'Jul 24, 2026',
    status: 'Active',
    medicines: [
      {
        id: 'm-101',
        name: 'Lisinopril Oral',
        dosage: '10 mg',
        instructions: '1 tablet • Daily every morning',
        duration: '30 Days Course',
      },
      {
        id: 'm-102',
        name: 'Atorvastatin Calcium',
        dosage: '20 mg',
        instructions: '1 tablet • Nightly before bedtime',
        duration: '30 Days Course',
      },
      {
        id: 'm-103',
        name: 'Aspirin Low Dose',
        dosage: '81 mg',
        instructions: '1 tablet • Daily after breakfast',
        duration: '60 Days Course',
      },
    ],
  },
  {
    id: 'grp-2',
    doctorName: 'Dr. Elena Rostova',
    doctorSpecialty: 'General Medicine Specialist',
    doctorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'Metropolitan General Hospital',
    datePrescribed: 'Jul 18, 2026',
    status: 'Active',
    medicines: [
      {
        id: 'm-201',
        name: 'Amoxicillin Trihydrate',
        dosage: '500 mg',
        instructions: '1 capsule • Twice daily after meals',
        duration: '7 Days Course',
      },
      {
        id: 'm-202',
        name: 'Paracetamol Extra Strength',
        dosage: '650 mg',
        instructions: '1 tablet • Every 8 hours as needed',
        duration: '5 Days Course',
      },
    ],
  },
  {
    id: 'grp-3',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialty: 'Pulmonology Specialist',
    doctorPhoto: 'https://images.unsplash.com/photo-1594824813566-78a56276722d?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    datePrescribed: 'Jun 12, 2026',
    status: 'Active',
    medicines: [
      {
        id: 'm-301',
        name: 'Salbutamol Inhaler',
        dosage: '100 mcg',
        instructions: '2 puffs • As needed for shortness of breath',
        duration: 'Refillable',
      },
      {
        id: 'm-302',
        name: 'Montelukast Sodium',
        dosage: '10 mg',
        instructions: '1 tablet • Once daily at bedtime',
        duration: '30 Days Course',
      },
    ],
  },
];

export const PrescriptionsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active'>('All');

  const filteredGroups = PRESCRIPTION_GROUPS.filter((grp) => {
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
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-2xs"
              title="Go Back"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-white" />
            </button>
            <div className="text-left space-y-0.5">
              <h1 className="text-lg font-black font-heading text-white tracking-tight">
                Prescribed Medicines
              </h1>
              <p className="text-[11px] text-teal-100/90 font-medium">
                Grouped doctor prescription sessions
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center relative active:scale-95 shadow-2xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-400 ring-1 ring-white" />
          </button>
        </div>

        {/* SEARCH BAR (FILTER BY DOCTOR NAME, DATE, OR MEDICINE) */}
        <div className="pt-3.5">
          <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-white">
            <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Doctor Name, Date, or Medicine..."
              className="w-full bg-transparent border-none text-xs text-[#111827] font-medium px-2 py-1 focus:outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>

        {/* FILTER CHIPS (CLEAN & MINIMAL) */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-3 text-left">
          {['All', 'Active'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={clsx(
                'px-3.5 py-1 rounded-full text-[11px] font-extrabold transition-all shrink-0 active:scale-95 border backdrop-blur-md',
                activeFilter === filter
                  ? 'bg-white text-[#1FA2AC] border-white shadow-xs'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* PRESCRIPTIONS FEED CONTAINER */}
      <main className="px-4 sm:px-6 md:px-8 py-4 max-w-5xl mx-auto space-y-4 w-full text-left">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#E4E7EC] shadow-2xs hover:shadow-xs transition-all space-y-0"
            >
              {/* DOCTOR & CONSULTATION SESSION HEADER */}
              <div className="p-4 bg-[#F8FAFC] border-b border-[#E4E7EC] space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={group.doctorPhoto} size="md" hasRing className="ring-2 ring-white shadow-2xs" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-black font-heading text-[#111827]">
                          {group.doctorName}
                        </h3>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5A54]" />
                      </div>
                      <p className="text-[11px] text-[#0B5A54] font-bold">
                        {group.doctorSpecialty}
                      </p>
                    </div>
                  </div>

                  <Badge variant="tint" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {group.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-semibold pt-1 border-t border-[#E4E7EC]/60">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#14B8A6]" /> {group.hospitalName}
                  </span>
                  <span className="flex items-center gap-1 text-[#0B5A54] font-bold">
                    <Calendar className="w-3 h-3 text-[#0B5A54]" /> {group.datePrescribed}
                  </span>
                </div>
              </div>

              {/* SINGLE BOX CONTAINING ALL MEDICINES PRESCRIBED IN THIS CONSULTATION */}
              <div className="p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-[#0B5A54]" /> PRESCRIBED MEDICINES ({group.medicines.length})
                  </span>
                </div>

                <div className="divide-y divide-[#E4E7EC]/80 bg-[#F8FAFC] border border-[#E4E7EC] rounded-2xl overflow-hidden">
                  {group.medicines.map((med, index) => (
                    <div key={med.id} className="p-3 space-y-1 hover:bg-[#E3F3F1]/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E3F3F1] text-[#0B5A54] font-black text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <h4 className="text-xs font-black font-heading text-[#111827]">
                            {med.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-2 py-0.5 rounded-full">
                          {med.dosage}
                        </span>
                      </div>

                      <div className="pl-7 space-y-0.5">
                        <p className="text-[11px] text-[#4B5563] font-medium leading-relaxed">
                          {med.instructions}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] font-bold">
                          Course Duration: {med.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] mx-auto">
              <Pill className="w-6 h-6 text-[#0B5A54]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#111827] font-heading">
                No Prescriptions Found
              </h3>
              <p className="text-xs text-[#6B7280]">
                No matching doctor prescriptions found for your filter.
              </p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="text-xs font-bold text-white bg-[#0B5A54] px-4 py-2 rounded-full shadow-2xs active:scale-95"
            >
              Back to Home
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
