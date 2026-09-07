// src/portals/doctor/DoctorNotificationCenter.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  CheckCheck,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  Clock,
  UserCheck,
  Activity,
  Megaphone,
  X,
  Stethoscope,
  ChevronRight,
  Trash2,
  FileText,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { DoctorTab } from '../../types/doctor';
import { playCallChime } from '../../services/consultationService';

export type NotificationCategory = 'all' | 'queue' | 'urgent' | 'broadcast';

export interface ClinicalNotification {
  id: string;
  category: 'queue' | 'urgent' | 'broadcast' | 'lab';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  token?: TokenQueueItem;
  metadata?: {
    tokenNumber?: string;
    patientName?: string;
    waitTime?: string;
    department?: string;
    vitalsPreview?: string;
  };
}

interface DoctorNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenQueueItem[];
  onSelectPatient: (patient: TokenQueueItem) => void;
  onNavigateTab: (tab: DoctorTab) => void;
  showToast: (msg: string) => void;
}

const INITIAL_NOTIFICATIONS: ClinicalNotification[] = [];

export const DoctorNotificationCenter: React.FC<DoctorNotificationCenterProps> = ({
  isOpen,
  onClose,
  tokens,
  onSelectPatient,
  onNavigateTab,
  showToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [notifications, setNotifications] = useState<ClinicalNotification[]>(INITIAL_NOTIFICATIONS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('carepulse_sound_notif') !== 'false';
  });

  // Toggle audio alerts
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('carepulse_sound_notif', String(nextState));
    if (nextState) {
      playCallChime();
      showToast('Audio chime notifications enabled');
    } else {
      showToast('Audio chime notifications muted');
    }
  };

  // Derive dynamic notifications from live queue tokens
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;

    const liveItems: ClinicalNotification[] = tokens
      .filter((t) => t.status === 'Waiting' || t.status === 'Checked In')
      .slice(0, 3)
      .map((t, idx) => ({
        id: `token-live-${t.id}-${idx}`,
        category: (t.healthIssue && t.healthIssue.toLowerCase().includes('chest') ? 'urgent' : 'queue') as 'queue' | 'urgent',
        priority: (t.healthIssue && t.healthIssue.toLowerCase().includes('chest') ? 'urgent' : 'normal') as 'normal' | 'urgent',
        title: `Patient in Waiting Lounge: ${t.tokenNumber}`,
        message: `${t.patientName} (${t.type || 'In-Person'}) is waiting for consultation. Issue: ${t.healthIssue || 'General Consultation'}.`,
        timestamp: t.arrivalTime || 'Today',
        isRead: false,
        token: t,
        metadata: {
          tokenNumber: t.tokenNumber,
          patientName: t.patientName,
          waitTime: t.timeSlot,
        },
      }));

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newAdditions = liveItems.filter((item) => !existingIds.has(item.id));
      if (newAdditions.length > 0) {
        if (soundEnabled) {
          playCallChime();
        }
        return [...newAdditions, ...prev];
      }
      return prev;
    });
  }, [tokens, soundEnabled]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    if (activeCategory === 'queue') return notifications.filter((n) => n.category === 'queue');
    if (activeCategory === 'urgent') return notifications.filter((n) => n.category === 'urgent');
    if (activeCategory === 'broadcast') return notifications.filter((n) => n.category === 'broadcast' || n.category === 'lab');
    return notifications;
  }, [notifications, activeCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: notifications.length,
      queue: notifications.filter((n) => n.category === 'queue').length,
      urgent: notifications.filter((n) => n.category === 'urgent').length,
      broadcast: notifications.filter((n) => n.category === 'broadcast' || n.category === 'lab').length,
    };
  }, [notifications]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read');
  };

  const handleClearAll = () => {
    setNotifications([]);
    showToast('All notifications cleared');
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (item: ClinicalNotification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.token) {
      onSelectPatient(item.token);
      onNavigateTab('consultation');
      onClose();
      showToast(`Started consultation for ${item.token.patientName}`);
    } else if (item.category === 'urgent' || item.category === 'queue') {
      const matchToken = tokens.find((t) => t.tokenNumber === item.metadata?.tokenNumber);
      if (matchToken) {
        onSelectPatient(matchToken);
        onNavigateTab('consultation');
      } else {
        onNavigateTab('queue');
      }
      onClose();
    } else if (item.category === 'lab') {
      onNavigateTab('emr');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />

        {/* Flyout Notification Panel */}
        <motion.aside
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200/80 flex flex-col z-50 overflow-hidden"
        >
          {/* ══════════════════════════════════════════════════════════
              HEADER BAR: Title, Controls, Sound Toggle & Mark All
          ══════════════════════════════════════════════════════════ */}
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-[#0B5A54] to-slate-900 text-white shrink-0 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner text-teal-200">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight font-heading">
                      Clinical Alerts & Feed
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white shadow-xs">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>Live OPD Stream Active</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
                title="Close Notification Center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Bar inside Header */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <button
                onClick={handleToggleSound}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-teal-500/20 text-teal-100 hover:bg-teal-500/30 border border-teal-400/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title={soundEnabled ? 'Mute Chime Alerts' : 'Enable Audio Chime'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
              </button>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 font-bold transition-all cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-white/10 transition-all cursor-pointer"
                    title="Clear All Notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SEGMENTED CATEGORY NAVIGATION BAR (Tabs)
          ══════════════════════════════════════════════════════════ */}
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 shrink-0">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
              {[
                { id: 'all' as NotificationCategory, label: 'All', count: categoryCounts.all },
                { id: 'queue' as NotificationCategory, label: 'Queue', count: categoryCounts.queue },
                { id: 'urgent' as NotificationCategory, label: 'Urgent', count: categoryCounts.urgent },
                { id: 'broadcast' as NotificationCategory, label: 'Broadcasts', count: categoryCounts.broadcast },
              ].map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-[#0B5A54] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-teal-50 text-[#0B5A54] border border-teal-200'
                            : 'bg-slate-300/60 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              NOTIFICATION FEED ITEMS
          ══════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFB]">
            {filteredNotifications.length === 0 ? (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54] shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 font-heading">
                    All Caught Up!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    No unread alerts in this category. Live events and patient check-ins will automatically populate here.
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {filteredNotifications.map((item) => {
                  const isUrgent = item.category === 'urgent' || item.priority === 'urgent';
                  const isQueue = item.category === 'queue';
                  const isLab = item.category === 'lab';

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                        !item.isRead
                          ? isUrgent
                            ? 'bg-gradient-to-br from-rose-50/90 to-white border-rose-200 shadow-sm shadow-rose-500/10'
                            : isQueue
                            ? 'bg-gradient-to-br from-teal-50/60 to-white border-teal-200/90 shadow-sm shadow-teal-900/5'
                            : 'bg-white border-slate-200/90 shadow-xs'
                          : 'bg-white/70 border-slate-200/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Left Accent Stripe for Unread Alerts */}
                      {!item.isRead && (
                        <div
                          className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                            isUrgent ? 'bg-rose-500' : isQueue ? 'bg-[#0B5A54]' : 'bg-amber-500'
                          }`}
                        />
                      )}

                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
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
                              <AlertTriangle className="w-4 h-4" />
                            ) : isQueue ? (
                              <UserCheck className="w-4 h-4" />
                            ) : isLab ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <Megaphone className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900 font-heading leading-tight">
                                {item.title}
                              </h4>
                              {isUrgent && (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
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

                        <button
                          onClick={(e) => handleDismiss(item.id, e)}
                          className="text-slate-300 hover:text-slate-500 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-10">
                        {item.message}
                      </p>

                      {/* Interactive Token / Patient Action Bar */}
                      {item.metadata && (item.metadata.tokenNumber || item.metadata.vitalsPreview) && (
                        <div className="mt-3 ml-10 p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.metadata.tokenNumber && (
                              <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200 font-black text-[10px] font-mono shrink-0">
                                {item.metadata.tokenNumber}
                              </span>
                            )}
                            {item.metadata.vitalsPreview && (
                              <span className="text-[10px] text-slate-500 font-bold truncate">
                                {item.metadata.vitalsPreview}
                              </span>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#0B5A54] group-hover:translate-x-0.5 transition-transform">
                            {isQueue ? 'Start Consult' : isUrgent ? 'Examine' : 'View'}
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════
              FOOTER: Quick Jump & Cabin Queue Shortcut
          ══════════════════════════════════════════════════════════ */}
          <div className="p-3.5 border-t border-slate-200/80 bg-white shrink-0 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onNavigateTab('queue');
                onClose();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>View Full Queue</span>
            </button>

            <button
              onClick={() => {
                onNavigateTab('consultation');
                onClose();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/15 transition-all cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-200" />
              <span>Clinical Room</span>
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
};
