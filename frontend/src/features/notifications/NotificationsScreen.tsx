import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ArrowLeft,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { useCarePulseStore } from '../../lib/store';
import { isUserProfileIncomplete } from '../auth/CompleteProfileScreen';

export interface NotificationItem {
  id: string;
  type: 'upcoming' | 'completed' | 'prescription' | 'system';
  category: 'Upcoming' | 'Completed';
  title: string;
  badgeText: string;
  badgeVariant: 'upcoming' | 'completed' | 'info';
  doctorName: string;
  doctorSpecialty: string;
  doctorPhotoUrl: string;
  dateTime: string;
  isRead: boolean;
  actionRoute?: string;
}

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const appointments = useCarePulseStore((s) => s.appointments);
  const prescriptions = useCarePulseStore((s) => s.prescriptions);
  const history = useCarePulseStore((s) => s.history);

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Local storage persisted read and cleared notification IDs
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`carepulse_read_notifs_${user?.id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`carepulse_cleared_notifs_${user?.id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Dynamically generate notifications strictly based on live user data
  const rawNotifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 1. Profile Completion Alert (High Priority)
    if (user && isUserProfileIncomplete(user)) {
      list.push({
        id: `notif-profile-setup-${user.id}`,
        type: 'system',
        category: 'Upcoming',
        title: 'Action Required: Complete Your Medical Profile',
        badgeText: 'Action Required',
        badgeVariant: 'upcoming',
        doctorName: 'CarePulse Medical Desk',
        doctorSpecialty: 'Account & Safety Verification',
        doctorPhotoUrl: '/doctor_default.jpg',
        dateTime: 'Action Needed',
        isRead: false,
        actionRoute: '/complete-profile',
      });
    }

    // 2. Real Upcoming Appointments
    appointments
      .filter((a) => a.status === 'Upcoming')
      .forEach((apt) => {
        list.push({
          id: `notif-apt-${apt.id}`,
          type: 'upcoming',
          category: 'Upcoming',
          title: `Consultation with ${apt.doctorName || 'Physician'}`,
          badgeText: apt.timeSlot || 'Scheduled',
          badgeVariant: 'upcoming',
          doctorName: apt.doctorName || 'Attending Physician',
          doctorSpecialty: apt.doctorSpecialty || 'General Medicine',
          doctorPhotoUrl: apt.doctorPhoto || '/doctor_default.jpg',
          dateTime: `${apt.date || 'Today'}${apt.timeSlot ? ` at ${apt.timeSlot}` : ''}`,
          isRead: false,
          actionRoute: `/appointment-detail/${apt.id}`,
        });
      });

    // 3. Real Active Prescriptions
    prescriptions.forEach((rx) => {
      list.push({
        id: `notif-rx-${rx.id}`,
        type: 'prescription',
        category: 'Upcoming',
        title: `Active Medication: ${rx.drugName} (${rx.dosage})`,
        badgeText: 'Prescription Active',
        badgeVariant: 'upcoming',
        doctorName: rx.prescriber || 'Prescribing Physician',
        doctorSpecialty: 'Pharmacy Dispensed',
        doctorPhotoUrl: '/doctor_default.jpg',
        dateTime: `${rx.frequency || 'Daily'} • ${rx.dosage || 'As prescribed'}`,
        isRead: false,
        actionRoute: '/prescriptions',
      });
    });

    // 4. Completed Appointments & Consultation History
    appointments
      .filter((a) => a.status === 'Completed')
      .forEach((apt) => {
        list.push({
          id: `notif-apt-comp-${apt.id}`,
          type: 'completed',
          category: 'Completed',
          title: `Completed Consultation with ${apt.doctorName || 'Physician'}`,
          badgeText: 'Completed',
          badgeVariant: 'completed',
          doctorName: apt.doctorName || 'Attending Physician',
          doctorSpecialty: apt.doctorSpecialty || 'General Medicine',
          doctorPhotoUrl: apt.doctorPhoto || '/doctor_default.jpg',
          dateTime: `${apt.date || 'Completed'}${apt.timeSlot ? ` • ${apt.timeSlot}` : ''}`,
          isRead: true,
          actionRoute: `/appointment-detail/${apt.id}`,
        });
      });

    history.forEach((h) => {
      const histId = `notif-hist-${h.id}`;
      if (!list.some((n) => n.id === histId)) {
        list.push({
          id: histId,
          type: 'completed',
          category: 'Completed',
          title: `Consultation Record: ${h.diagnosis || h.doctorName}`,
          badgeText: 'History Saved',
          badgeVariant: 'completed',
          doctorName: h.doctorName || 'Attending Specialist',
          doctorSpecialty: h.hospitalName || 'Clinical Consultation',
          doctorPhotoUrl: h.doctorPhoto || '/doctor_default.jpg',
          dateTime: h.date || 'Past Visit',
          isRead: true,
          actionRoute: '/history',
        });
      }
    });

    return list;
  }, [user, appointments, prescriptions, history]);

  // Filter out dismissed notifications and apply read status
  const notifications = useMemo(() => {
    return rawNotifications
      .filter((n) => !clearedIds.includes(n.id))
      .map((n) => ({
        ...n,
        isRead: n.isRead || readIds.includes(n.id),
      }));
  }, [rawNotifications, clearedIds, readIds]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem(`carepulse_read_notifs_${user?.id || 'guest'}`, JSON.stringify(updated));
    } catch {}
  };

  const handleClearAll = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...clearedIds, ...allIds]));
    setClearedIds(updated);
    try {
      localStorage.setItem(`carepulse_cleared_notifs_${user?.id || 'guest'}`, JSON.stringify(updated));
    } catch {}
  };

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem(`carepulse_read_notifs_${user?.id || 'guest'}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'upcoming') return n.category === 'Upcoming';
    if (activeTab === 'completed') return n.category === 'Completed';
    return true;
  });

  const categories: NotificationItem['category'][] = ['Upcoming', 'Completed'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* CLEAN EXECUTIVE APP HEADER */}
      <div className="bg-white border-b border-slate-200/80 pt-4 pb-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs text-left">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Back Button + Title & Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-[#0B5A54] flex items-center justify-center text-slate-800 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black font-heading text-[#111827] tracking-tight truncate">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white font-black text-[9.5px] px-2.5 py-0.5 rounded-full shadow-2xs animate-pulse shrink-0">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                CarePulse Consultations & Health Alerts
              </p>
            </div>
          </div>

          {/* Right: Read All & Clear All Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="w-8 h-8 rounded-full bg-teal-50 hover:bg-[#0B5A54] text-[#0B5A54] hover:text-white transition-all flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-all flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* SEGMENTED FILTER CHIPS BAR */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'upcoming', label: `Upcoming (${notifications.filter((n) => n.category === 'Upcoming').length})` },
            { id: 'completed', label: `Completed (${notifications.filter((n) => n.category === 'Completed').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 active:scale-95 border cursor-pointer shadow-2xs',
                activeTab === tab.id
                  ? 'bg-[#0B5A54] text-white border-[#0B5A54]'
                  : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NOTIFICATIONS FEED CONTAINER */}
      <main className="px-4 sm:px-6 md:px-8 py-5 max-w-5xl mx-auto space-y-6 w-full text-left">
        {filteredNotifications.length > 0 ? (
          categories.map((cat) => {
            const catItems = filteredNotifications.filter((n) => n.category === cat);
            if (catItems.length === 0) return null;

            const isCollapsed = collapsedSections[cat];

            return (
              <div key={cat} className="space-y-3">
                {/* Collapsible Section Header */}
                <div
                  onClick={() => toggleSection(cat)}
                  className="flex items-center justify-between py-1 px-1 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'w-2.5 h-2.5 rounded-full',
                        cat === 'Upcoming' ? 'bg-[#0B5A54]' : 'bg-emerald-500'
                      )}
                    />
                    <h2 className="text-sm sm:text-base font-extrabold font-heading text-[#111827] tracking-tight">
                      {cat} ({catItems.length})
                    </h2>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-teal-50 group-hover:text-[#0B5A54] transition-colors">
                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 transition-transform duration-300',
                        isCollapsed ? 'rotate-180' : ''
                      )}
                    />
                  </div>
                </div>

                {/* Section Items Cards */}
                {!isCollapsed && (
                  <div className="space-y-3">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          markAsRead(item.id);
                          if (item.actionRoute) navigate(item.actionRoute);
                        }}
                        className={clsx(
                          'bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border transition-all duration-300 cursor-pointer space-y-3.5 text-left group relative overflow-hidden',
                          item.isRead
                            ? 'border-slate-200/80 opacity-85 hover:opacity-100 hover:border-[#0B5A54]/40'
                            : 'border-teal-300 ring-2 ring-teal-500/15 shadow-sm hover:shadow-md hover:border-[#0B5A54]'
                        )}
                      >
                        {/* Unread Indicator Dot */}
                        {!item.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                        )}

                        {/* Top Row: Consultation Title + Status Badge */}
                        <div className="flex items-start justify-between gap-3 pr-4">
                          <h3 className="text-xs sm:text-sm font-extrabold text-[#111827] font-heading leading-tight group-hover:text-[#0B5A54] transition-colors">
                            {item.title}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={clsx(
                              'text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs',
                              item.badgeVariant === 'upcoming'
                                ? 'bg-teal-50 text-[#0B5A54] border border-[#0B5A54]/20'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            )}
                          >
                            {item.badgeText}
                          </span>
                        </div>

                        {/* Bottom Row: Doctor Profile Info (Left) + DateTime (Right) */}
                        <div className="flex items-end justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.doctorPhotoUrl}
                              alt={item.doctorName}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-[#111827] leading-tight truncate">
                                {item.doctorName}
                              </h4>
                              <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
                                {item.doctorSpecialty}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 shrink-0">
                            {item.dateTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-[#E4E7EC] rounded-3xl p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-[#0B5A54] mx-auto">
              <Bell className="w-6 h-6 text-[#0B5A54]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#111827] font-heading">
                No Notifications Found
              </h3>
              <p className="text-xs text-[#6B7280]">
                You are all caught up! When you book appointments or receive prescriptions, alerts will appear here.
              </p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="text-xs font-bold text-white bg-[#0B5A54] px-5 py-2 rounded-full shadow-2xs active:scale-95 cursor-pointer"
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

export default NotificationsScreen;
