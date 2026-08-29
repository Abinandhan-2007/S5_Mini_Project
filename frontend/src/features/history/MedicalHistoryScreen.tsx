import React, { useState, useMemo, useEffect } from 'react';
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
  Activity,
  Plus,
} from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useCarePulseStore } from '../../lib/store';

export const MedicalHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const historyItems = useCarePulseStore((s) => s.history);
  const syncHistory = useCarePulseStore((s) => s.syncHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      syncHistory(user.id);
    }
  }, [user?.id, syncHistory]);

  const filteredHistory = useMemo(() => {
    let result = (historyItems || []).filter((item) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Recent' && (item.date.includes('Jul') || item.date.includes('Aug') || item.date.includes('2026'))) ||
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
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* EXECUTIVE CYAN TOP HEADER */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">Medical History</h1>
              <p className="text-[11px] text-teal-50 font-medium">Archive of clinical visits, diagnoses & tests</p>
            </div>
          </div>

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

      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {/* Header Stats when records exist */}
        {historyItems && historyItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3 rounded-2xl border border-[#E4E7EC] shadow-2xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                  <Calendar className="w-4 h-4 text-[#0B5A54]" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">LAST CHECKUP</span>
                  <span className="text-xs font-black text-[#111827]">{historyItems[0]?.date || 'Recent'}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-[#E4E7EC] shadow-2xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-teal flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">CLINICAL RECORDS</span>
                  <span className="text-xs font-black text-[#0B5A54]">{historyItems.length} Completed</span>
                </div>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0B5A54]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor, diagnosis, medication..."
                className="w-full bg-white border border-[#E4E7EC] text-xs text-[#111827] rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs placeholder:text-[#9CA3AF]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF] hover:text-[#111827]"
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
                className="p-2 rounded-xl bg-white border border-[#E4E7EC] text-[#0B5A54] hover:bg-[#E3F3F1] transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                title="Toggle Sort Order"
              >
                <Filter className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
              </button>
            </div>

            {/* History List Cards */}
            <div className="space-y-3 pt-0.5">
              {filteredHistory.map((item) => {
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl shadow-2xs border transition-all duration-200 overflow-hidden ${
                      isExpanded ? 'border-[#0B5A54] ring-1 ring-[#0B5A54]/20' : 'border-[#E4E7EC]'
                    }`}
                  >
                    {/* Header */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-4 cursor-pointer flex justify-between items-start active:bg-[#E3F3F1]/20 transition-colors"
                    >
                      <div className="space-y-1 flex-1 pr-2">
                        <span className="text-[10px] font-black text-[#0B5A54] uppercase tracking-wider block">
                          {item.date} • {item.time}
                        </span>

                        <h3 className="text-sm font-black font-heading text-[#111827] leading-snug">
                          {item.doctorName}
                        </h3>
                        <p className="text-xs font-semibold text-[#0B5A54]">{item.specialty}</p>

                        <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                          <MapPin className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                          <span className="truncate">{item.hospitalName}</span>
                        </div>

                        <div className="pt-1.5 flex items-center gap-1.5">
                          <Badge variant="success" size="sm">{item.status}</Badge>
                          <span className="text-[9.5px] font-bold text-[#14B8A6] bg-[#E3F3F1] px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${
                            isExpanded ? 'bg-[#0B5A54] text-white rotate-180' : 'bg-slate-100 text-[#0B5A54]'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
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
                          className="border-t border-[#E4E7EC] bg-[#F8FAFC] p-4 space-y-3"
                        >
                          {/* Clinical Diagnosis */}
                          <div className="bg-white rounded-xl p-3 border border-[#E4E7EC] shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs font-bold text-[#0B5A54]">
                                <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                                <span>CLINICAL DIAGNOSIS</span>
                              </div>
                              <span className="text-[9px] font-mono font-bold text-[#9CA3AF]">ICD-10</span>
                            </div>

                            <p className="text-xs text-[#111827] leading-relaxed bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E4E7EC] font-medium">
                              {item.diagnosis}
                            </p>

                            <div className="flex items-center gap-1 text-[10px] text-[#16A34A] font-semibold">
                              <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                              <span>Clinical consultation verified by {item.doctorName}</span>
                            </div>
                          </div>

                          {/* Prescribed Medications */}
                          <div className="bg-white rounded-xl p-3 border border-[#E4E7EC] shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs font-bold text-[#0B5A54]">
                                <Pill className="w-3.5 h-3.5 text-[#14B8A6]" />
                                <span>PRESCRIBED MEDICATIONS</span>
                              </div>
                              <Badge variant="tint" size="sm">Active Rx</Badge>
                            </div>

                            <div className="bg-[#E3F3F1]/50 p-2.5 rounded-lg border border-[#14B8A6]/20">
                              <h5 className="text-xs font-bold text-[#111827]">{item.prescriptionDetails}</h5>
                              <p className="text-[10.5px] text-[#6B7280]">Take strictly as instructed by physician.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {filteredHistory.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center border border-[#E4E7EC] space-y-2">
                  <p className="text-xs font-bold text-[#6B7280]">No medical records match your search filter.</p>
                  <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveTab('All'); }}>
                    Reset Search
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E7EC] shadow-xs text-center space-y-5 my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-sm">
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5A54]" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-black text-[#111827] font-heading">
                No Medical History Records
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Your past clinical consultations, doctor diagnoses, and medical summaries will be securely archived here after your appointments.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/hospitals')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Explore Doctors & Hospitals</span>
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 text-[#475467] text-xs sm:text-sm font-bold border border-[#E4E7EC] transition-all cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
