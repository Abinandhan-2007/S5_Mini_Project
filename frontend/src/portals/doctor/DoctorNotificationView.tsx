// src/portals/doctor/DoctorNotificationView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  CheckCheck,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  UserCheck,
  Megaphone,
  X,
  Stethoscope,
  Trash2,
  FileText,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { DoctorTab } from '../../types/doctor';
import type { ClinicalNotification, NotificationCategory } from './DoctorNotificationCenter';
import { playCallChime } from '../../services/consultationService';

interface DoctorNotificationViewProps {
  tokens: TokenQueueItem[];
  onSelectPatient: (patient: TokenQueueItem) => void;
  onNavigateTab: (tab: DoctorTab) => void;
  showToast: (msg: string) => void;
}

const SEED_NOTIFICATIONS: ClinicalNotification[] = [
  {
    id: 'view-notif-urgent-1',
    category: 'urgent',
    priority: 'urgent',
    title: 'Priority OPD Triage: Severe Chest Pain & Palpitations',
    message: 'Patient Rajesh Sharma (#TOK-001) arrived with Elevated BP 155/95 mmHg and SpO2 98%. Triaged for immediate clinical evaluation.',
    timestamp: 'Just now',
    isRead: false,
    metadata: {
      tokenNumber: '#TOK-001',
      patientName: 'Rajesh Sharma',
      vitalsPreview: 'BP 155/95 · Pulse 92 bpm · SpO2 98%',
      department: 'Cardiology Triage',
    },
  },
  {
    id: 'view-notif-queue-2',
    category: 'queue',
    priority: 'normal',
    title: 'New Patient Arrival: Ananya Verma',
    message: 'Ananya Verma (#TOK-002) checked in at front desk reception for Routine Outpatient Consultation. Currently waiting in lounge.',
    timestamp: '5m ago',
    isRead: false,
    metadata: {
      tokenNumber: '#TOK-002',
      patientName: 'Ananya Verma',
      waitTime: '5 mins waiting',
      department: 'OPD Reception Desk 1',
    },
  },
  {
    id: 'view-notif-lab-3',
    category: 'urgent',
    priority: 'high',
    title: 'Diagnostic ECG & Cardiac Biomarker Panel Ready',
    message: 'Diagnostic laboratory results published for Robert Fox. 12-Lead Electrocardiogram report is available in Longitudinal EMR archives.',
    timestamp: '22m ago',
    isRead: false,
    metadata: {
      patientName: 'Robert Fox',
      department: 'Diagnostic Biochemistry & Radiology',
    },
  },
  {
    id: 'view-notif-broadcast-4',
    category: 'broadcast',
    priority: 'normal',
    title: 'Hospital Clinical Administration Notice',
    message: 'Central Pharmacy counter updated with fresh inventory of oral cardioprotective therapeutics and antihypertensives.',
    timestamp: '1h ago',
    isRead: true,
    metadata: {
      department: 'Medical Administration',
    },
  },
  {
    id: 'view-notif-broadcast-5',
    category: 'broadcast',
    priority: 'normal',
    title: 'Shift Handover & OT Schedule Alert',
    message: 'Cardiology Operation Theater 2 sanitization completed. Emergency surgical slot reserved from 04:00 PM onwards.',
    timestamp: '2h ago',
    isRead: true,
    metadata: {
      department: 'Surgical Services',
    },
  },
];

export const DoctorNotificationView: React.FC<DoctorNotificationViewProps> = ({
  tokens,
  onSelectPatient,
  onNavigateTab,
  showToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<ClinicalNotification[]>(SEED_NOTIFICATIONS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_sound_notif') !== 'false';
  });

  // Toggle audio alerts
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('carepulse_sound_notif', String(next));
    if (next) {
      playCallChime();
      showToast('Audio chime notifications activated');
    } else {
      showToast('Audio chime notifications muted');
    }
  };

  // Sync live tokens
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;

    const liveItems: ClinicalNotification[] = tokens
      .filter((t) => t.status === 'Waiting' || t.status === 'Checked In')
      .map((t, idx) => ({
        id: `token-view-live-${t.id}-${idx}`,
        category: (t.healthIssue && t.healthIssue.toLowerCase().includes('chest') ? 'urgent' : 'queue') as 'queue' | 'urgent',
        priority: (t.healthIssue && t.healthIssue.toLowerCase().includes('chest') ? 'urgent' : 'normal') as 'normal' | 'urgent',
        title: `Waiting Lounge Patient: ${t.tokenNumber}`,
        message: `${t.patientName} (${t.type || 'In-Person'}) is registered and ready in waiting area. Clinical note: ${t.healthIssue || 'OPD Consultation'}.`,
        timestamp: t.arrivalTime || 'Today',
        isRead: false,
        token: t,
        metadata: {
          tokenNumber: t.tokenNumber,
          patientName: t.patientName,
          waitTime: t.timeSlot,
          department: 'Cabin 102 Queue',
        },
      }));

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newItems = liveItems.filter((item) => !existingIds.has(item.id));
      if (newItems.length > 0) {
        if (soundEnabled) playCallChime();
        return [...newItems, ...prev];
      }
      return prev;
    });
  }, [tokens, soundEnabled]);

  const filteredList = useMemo(() => {
    let list = notifications;
    if (activeCategory === 'queue') {
      list = list.filter((n) => n.category === 'queue');
    } else if (activeCategory === 'urgent') {
      list = list.filter((n) => n.category === 'urgent');
    } else if (activeCategory === 'broadcast') {
      list = list.filter((n) => n.category === 'broadcast' || n.category === 'lab');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.metadata?.patientName && n.metadata.patientName.toLowerCase().includes(q)) ||
          (n.metadata?.tokenNumber && n.metadata.tokenNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notifications, activeCategory, searchQuery]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const urgentCount = useMemo(
    () => notifications.filter((n) => n.category === 'urgent' || n.priority === 'urgent').length,
    [notifications]
  );
  const queueCount = useMemo(() => notifications.filter((n) => n.category === 'queue').length, [notifications]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read');
  };

  const handleClearAll = () => {
    setNotifications([]);
    showToast('All notification feed cleared');
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleItemClick = (item: ClinicalNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.token) {
      onSelectPatient(item.token);
      onNavigateTab('consultation');
      showToast(`Opened consultation for ${item.token.patientName}`);
    } else if (item.metadata?.tokenNumber) {
      const match = tokens.find((t) => t.tokenNumber === item.metadata?.tokenNumber);
      if (match) {
        onSelectPatient(match);
        onNavigateTab('consultation');
      } else {
        onNavigateTab('queue');
      }
    } else if (item.category === 'lab') {
      onNavigateTab('emr');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ══════════════════════════════════════════════════════════
          HERO BANNER & STATS CARDS
      ══════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0B5A54] to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-200 shadow-inner shrink-0">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight">
                  Clinical Notifications & Feed
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-rose-500 text-white shadow-xs">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100/90 font-medium mt-0.5">
                Real-time synchronized alert stream for Doctor Cabin 102
              </p>
            </div>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-teal-500/20 text-teal-100 border border-teal-400/40 hover:bg-teal-500/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
              title="Toggle Audio Notifications"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>{soundEnabled ? 'Audio Alert Active' : 'Audio Muted'}</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-teal-200" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 transition-all cursor-pointer"
                title="Clear All Notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-teal-200/80 font-mono">Total Feed</p>
            <p className="text-xl font-black font-heading mt-0.5">{notifications.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-emerald-200/80 font-mono">OPD Queue Alerts</p>
            <p className="text-xl font-black font-heading mt-0.5 text-emerald-300">{queueCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-rose-200/80 font-mono">Priority Triage</p>
            <p className="text-xl font-black font-heading mt-0.5 text-rose-300">{urgentCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-teal-200/80 font-mono">Stream Status</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-black text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Synchronized</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FILTER NAVIGATION BAR & SEARCH
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Category Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as NotificationCategory, label: 'All Alerts', count: notifications.length },
            { id: 'queue' as NotificationCategory, label: 'OPD Queue', count: queueCount },
            { id: 'urgent' as NotificationCategory, label: 'Urgent Triage', count: urgentCount },
            { id: 'broadcast' as NotificationCategory, label: 'Broadcasts', count: notifications.filter((n) => n.category === 'broadcast' || n.category === 'lab').length },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Filter Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, token, or clinical alert..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          NOTIFICATION FEED LIST
      ══════════════════════════════════════════════════════════ */}
      {filteredList.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54] mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              No Notifications Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No notifications matching your filter criteria. New patient check-ins and emergency triage events will appear here in real time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredList.map((item) => {
              const isUrgent = item.category === 'urgent' || item.priority === 'urgent';
              const isQueue = item.category === 'queue';
              const isLab = item.category === 'lab';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  layout
                  onClick={() => handleItemClick(item)}
                  className={`group relative p-5 rounded-3xl border transition-all cursor-pointer ${
                    !item.isRead
                      ? isUrgent
                        ? 'bg-gradient-to-r from-rose-50/90 via-white to-white border-rose-200/90 shadow-sm hover:shadow-md shadow-rose-500/10'
                        : isQueue
                        ? 'bg-gradient-to-r from-teal-50/70 via-white to-white border-teal-200 shadow-sm hover:shadow-md shadow-teal-900/5'
                        : 'bg-white border-slate-200/90 shadow-xs hover:shadow-sm'
                      : 'bg-white/80 border-slate-200/60 opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* Left Priority Indicator */}
                  {!item.isRead && (
                    <div
                      className={`absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full ${
                        isUrgent ? 'bg-rose-500 animate-pulse' : isQueue ? 'bg-[#0B5A54]' : 'bg-amber-500'
                      }`}
                    />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-700'
                            : isQueue
                            ? 'bg-teal-100 text-[#0B5A54]'
                            : isLab
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : isQueue ? (
                          <UserCheck className="w-5 h-5" />
                        ) : isLab ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Megaphone className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 font-heading">
                            {item.title}
                          </h4>
                          {isUrgent && (
                            <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              Urgent Review
                            </span>
                          )}
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0B5A54]" />
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          {item.message}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.timestamp}
                          </span>
                          {item.metadata?.department && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-semibold">{item.metadata.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side Quick Interactive Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {item.metadata?.tokenNumber && (
                        <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200 font-black text-xs font-mono">
                          {item.metadata.tokenNumber}
                        </span>
                      )}

                      <button
                        onClick={() => handleItemClick(item)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isUrgent
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                            : isQueue
                            ? 'bg-[#0B5A54] hover:bg-teal-800 text-white shadow-teal-900/15'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{isQueue ? 'Start Consultation' : isUrgent ? 'Examine Patient' : 'Open Record'}</span>
                      </button>

                      <button
                        onClick={(e) => handleDismiss(item.id, e)}
                        className="p-2 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                        title="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
