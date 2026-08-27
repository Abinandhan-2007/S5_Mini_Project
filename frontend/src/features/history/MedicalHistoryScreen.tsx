import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  ChevronDown,
  FileText,
  Pill,
  Calendar,
  Sparkles,
  Filter,
  CheckCircle,
  Bell,
} from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useCarePulseStore } from '../../lib/store';

export const MedicalHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const historyItems = useCarePulseStore((s) => s.history);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>('hist-1');

  const filteredHistory = useMemo(() => {
    let result = historyItems.filter((item) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Recent' && (item.date.includes('Jul') || item.date.includes('Jun'))) ||
        (activeTab === 'Cardiology' && item.specialty.toLowerCase().includes('cardio')) ||
        (activeTab === 'General' && item.specialty.toLowerCase().includes('general'));

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.doctorName.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q) ||
        item.hospitalName.toLowerCase().includes(q) ||
        item.diagnosis.toLowerCase().includes(q) ||
        item.prescriptionDetails.toLowerCase().includes(q);

      return matchesTab && matchesQuery;
    });

    if (sortOrder === 'oldest') {
      result = [...result].reverse();
    }

    return result;
  }, [historyItems, activeTab, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-7xl mx-auto w-full">
        {/* Header with Notification Button (No TopBar) */}
        <div className="space-y-0.5 pt-1">
          <div className="flex justify-between items-center">
            <h1 className="text-base font-extrabold font-heading text-[#111827]">Medical History</h1>
            <div className="flex items-center gap-2">
              <Badge variant="tint" size="sm">
                {filteredHistory.length} Records
              </Badge>
              <button
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm shrink-0"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-[#111827]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Archive of your past consultations, diagnoses, & prescriptions.
          </p>
        </div>

        {/* Compact Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-2.5 rounded-xl border border-[#E4E7EC] shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">LAST CHECKUP</span>
              <span className="text-xs font-bold text-[#111827]">Jul 24, 2026</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#E4E7EC] shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">RECORDS</span>
              <span className="text-xs font-bold text-[#0B5A54]">{historyItems.length} Completed</span>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#0B5A54]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctor, diagnosis, medication..."
            className="w-full bg-white border border-[#E4E7EC] text-xs text-[#111827] rounded-xl pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs placeholder:text-[#9CA3AF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs font-bold text-[#9CA3AF] hover:text-[#111827]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs + Sort Switcher */}
        <div className="flex justify-between items-center pt-0.5">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Recent', 'Cardiology', 'General'].map((tab) => (
              <Chip
                key={tab}
                size="sm"
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Chip>
            ))}
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="p-1.5 rounded-lg bg-white border border-[#E4E7EC] text-[#0B5A54] hover:bg-[#E3F3F1] transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
            title="Toggle Sort Order"
          >
            <Filter className="w-3 h-3 text-[#0B5A54]" />
            <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
          </button>
        </div>

        {/* History List Cards */}
        <div className="space-y-2.5 pt-0.5">
          {filteredHistory.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-[#F8FAFC] rounded-2xl shadow-2xs border transition-all duration-200 overflow-hidden card-left-accent ${isExpanded ? 'border-[#0B5A54] ring-1 ring-[#0B5A54]/20' : 'border-[#E4E7EC]'
                  }`}
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-3 cursor-pointer flex justify-between items-start active:bg-[#E3F3F1]/20 transition-colors"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <span className="text-[10px] font-bold text-[#0B5A54] uppercase tracking-wider block">
                      {item.date} • {item.time}
                    </span>

                    <h3 className="text-xs font-bold font-heading text-[#111827] leading-snug">{item.doctorName}</h3>
                    <p className="text-[11px] font-semibold text-[#0B5A54]">{item.specialty}</p>

                    <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                      <MapPin className="w-3 h-3 text-[#0B5A54] shrink-0" />
                      <span className="truncate">{item.hospitalName}</span>
                    </div>

                    <div className="pt-1 flex items-center gap-1.5">
                      <Badge variant="success" size="sm">{item.status}</Badge>
                      <span className="text-[9px] font-bold text-[#14B8A6] bg-[#E3F3F1] px-1.5 py-0.5 rounded-pill">
                        Verified
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'bg-[#0B5A54] text-white rotate-180' : 'bg-gray-100 text-[#0B5A54]'
                        }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* ACCORDION DETAILS */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="border-t border-[#E4E7EC] bg-[#F3F5F8]/60 p-3 space-y-2.5"
                    >
                      {/* Clinical Diagnosis */}
                      <div className="bg-white rounded-xl p-2.5 border border-[#E4E7EC] shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#0B5A54]">
                            <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                            <span>CLINICAL DIAGNOSIS</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[#9CA3AF]">ICD-10</span>
                        </div>

                        <p className="text-[11px] text-[#111827] leading-relaxed bg-[#F3F5F8]/50 p-2 rounded-lg border border-[#E4E7EC]/60 font-medium">
                          {item.diagnosis}
                        </p>

                        <div className="flex items-center gap-1 text-[10px] text-[#16A34A] font-semibold">
                          <CheckCircle className="w-3 h-3 text-[#16A34A]" />
                          <span>Vitals verified & signed by {item.doctorName}</span>
                        </div>
                      </div>

                      {/* Prescribed Medications */}
                      <div className="bg-white rounded-xl p-2.5 border border-[#E4E7EC] shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#0B5A54]">
                            <Pill className="w-3.5 h-3.5 text-[#14B8A6]" />
                            <span>PRESCRIBED MEDICATIONS</span>
                          </div>
                          <Badge variant="tint" size="sm">Active Rx</Badge>
                        </div>

                        <div className="bg-[#E3F3F1]/50 p-2 rounded-lg border border-[#14B8A6]/20">
                          <h5 className="text-[11px] font-bold text-[#111827]">{item.prescriptionDetails}</h5>
                          <p className="text-[10px] text-[#6B7280]">Take strictly as instructed after meals.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="bg-white rounded-xl p-6 text-center border border-[#E4E7EC] space-y-2">
              <p className="text-xs font-bold text-[#6B7280]">No medical records found.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveTab('All'); }}>
                Reset Search
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
