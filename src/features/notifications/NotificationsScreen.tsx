import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Pill,
  Sparkles,
  FileText,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Trash2,
  ArrowLeft,
  CheckCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';

export interface NotificationItem {
  id: string;
  type: 'appointment' | 'medication' | 'ai' | 'lab' | 'system';
  category: 'TODAY' | 'YESTERDAY' | 'EARLIER';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionText?: string;
  actionRoute?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'appointment',
    category: 'TODAY',
    title: 'Appointment Booking Confirmed',
    message: 'Your appointment with Dr. Alex Morgan (Cardiologist) has been successfully confirmed for Today at 10:00 AM at St. Jude Heart Center.',
    time: '10m ago',
    isRead: false,
    actionText: 'View Ticket',
    actionRoute: '/appointments/book/doc-1',
  },
  {
    id: 'notif-2',
    type: 'appointment',
    category: 'TODAY',
    title: 'Upcoming Consultation Today',
    message: 'Reminder: Your in-person consultation with Dr. Sarah Jenkins (General Physician) starts at 2:30 PM.',
    time: '30m ago',
    isRead: false,
    actionText: 'View Details',
    actionRoute: '/appointments/book/doc-2',
  },
  {
    id: 'notif-3',
    type: 'appointment',
    category: 'TODAY',
    title: 'Appointment Booking Confirmed',
    message: 'Consultation booked with Dr. Michael Chen (Neurologist) for Tomorrow at 11:15 AM at City General Hospital.',
    time: '2h ago',
    isRead: false,
    actionText: 'View Ticket',
    actionRoute: '/hospitals/hosp-1',
  },
  {
    id: 'notif-4',
    type: 'appointment',
    category: 'YESTERDAY',
    title: 'Follow-up Consultation Confirmed',
    message: 'Follow-up consultation with Dr. Priya Sharma (Pediatrician) confirmed for Friday at 3:00 PM.',
    time: 'Yesterday 4:30 PM',
    isRead: true,
    actionText: 'View Details',
    actionRoute: '/history',
  },
  {
    id: 'notif-5',
    type: 'appointment',
    category: 'EARLIER',
    title: 'Upcoming Consultation Scheduled',
    message: 'Routine health checkup consultation with Dr. Robert Vance confirmed for next Monday at 9:30 AM.',
    time: '3 days ago',
    isRead: true,
    actionText: 'View Ticket',
    actionRoute: '/hospitals',
  },
];

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'appointment' | 'medication'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'appointment') return n.type === 'appointment';
    if (activeTab === 'medication') return n.type === 'medication';
    return true;
  });

  const categories: NotificationItem['category'][] = ['TODAY', 'YESTERDAY', 'EARLIER'];

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-4 h-4 text-[#0B5A54]" />;
      case 'medication':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-teal-600" />;
      case 'lab':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    }
  };

  const getBadgeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return 'bg-[#E3F3F1] text-[#0B5A54] border-[#0B5A54]/20';
      case 'medication':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ai':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'lab':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* EXECUTIVE HEADER BANNER MATCHING HOME SCREEN BG */}
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black font-heading text-white tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-100/90 font-medium">
                CarePulse Live Alerts & Medical Logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-2.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Read All</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-full bg-white/20 hover:bg-rose-600/80 backdrop-blur-md border border-white/30 text-white text-[11px] transition-all flex items-center justify-center shadow-2xs active:scale-95"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* EXECUTIVE SEGMENTED FILTER BAR */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-4 text-left">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'appointment', label: 'Appointments' },
            { id: 'medication', label: 'Medications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all shrink-0 active:scale-95 border backdrop-blur-md',
                activeTab === tab.id
                  ? 'bg-white text-[#1FA2AC] border-white shadow-xs'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NOTIFICATIONS FEED CONTAINER */}
      <main className="px-4 py-4 max-w-md mx-auto space-y-5 w-full text-left">
        {filteredNotifications.length > 0 ? (
          categories.map((cat) => {
            const catItems = filteredNotifications.filter((n) => n.category === cat);
            if (catItems.length === 0) return null;

            return (
              <div key={cat} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-black text-[#6B7280] tracking-widest uppercase">
                    {cat}
                  </span>
                  <div className="h-[1px] bg-[#E4E7EC] flex-1" />
                </div>

                <div className="space-y-2.5">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleReadStatus(item.id)}
                      className={clsx(
                        'bg-white rounded-2xl p-4 transition-all duration-200 border cursor-pointer relative space-y-3 active:scale-[0.99] group shadow-2xs hover:shadow-xs',
                        item.isRead
                          ? 'border-[#E4E7EC]'
                          : 'border-l-4 border-l-[#0B5A54] border-[#E4E7EC] bg-[#F0FDF4]/30'
                      )}
                    >
                      {/* Top Metadata Row: Icon + Title + Timestamp */}
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx(
                            'w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs',
                            getBadgeStyle(item.type)
                          )}
                        >
                          {getIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-extrabold text-[#111827] font-heading leading-tight truncate">
                              {item.title}
                            </h3>
                            <span className="text-[10px] font-bold text-[#9CA3AF] shrink-0">
                              {item.time}
                            </span>
                          </div>

                          <p className="text-xs text-[#4B5563] leading-relaxed font-medium">
                            {item.message}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions: CTA Button + Read Status */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF]">
                          {item.isRead ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Read
                            </span>
                          ) : (
                            <span className="text-[#0B5A54] font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B5A54] animate-ping" /> Unread
                            </span>
                          )}
                        </div>

                        {item.actionText && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.actionRoute) navigate(item.actionRoute);
                            }}
                            className="text-xs font-extrabold text-white bg-[#0B5A54] hover:bg-[#08423D] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                          >
                            <span>{item.actionText}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] mx-auto">
              <Bell className="w-6 h-6 text-[#0B5A54]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#111827] font-heading">
                No Notifications Found
              </h3>
              <p className="text-xs text-[#6B7280]">
                You are all caught up! Check back later for health updates.
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
