import React, { useState } from 'react';
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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'upcoming',
    category: 'Upcoming',
    title: 'Consultation with a cardiologist',
    badgeText: '45 min',
    badgeVariant: 'upcoming',
    doctorName: 'Dr. Alex Morgan',
    doctorSpecialty: 'Cardiologist',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    dateTime: '07 Nov 2025, 20:30',
    isRead: false,
    actionRoute: '/appointments/book/doc-1',
  },
  {
    id: 'notif-2',
    type: 'upcoming',
    category: 'Upcoming',
    title: 'General Physician Checkup',
    badgeText: '2 hours',
    badgeVariant: 'upcoming',
    doctorName: 'Dr. Elena Rostova',
    doctorSpecialty: 'General Physician',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80',
    dateTime: '07 Nov 2025, 22:00',
    isRead: false,
    actionRoute: '/appointments/book/doc-2',
  },
  {
    id: 'notif-3',
    type: 'upcoming',
    category: 'Upcoming',
    title: 'Consultation with a cardiologist',
    badgeText: 'Tomorrow',
    badgeVariant: 'upcoming',
    doctorName: 'Dr. Marvin McKinney',
    doctorSpecialty: 'Cardiologist',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
    dateTime: '08 Nov 2025, 10:00',
    isRead: false,
    actionRoute: '/hospitals',
  },
  {
    id: 'notif-4',
    type: 'completed',
    category: 'Completed',
    title: 'Consultation with a cardiologist',
    badgeText: 'Completed',
    badgeVariant: 'completed',
    doctorName: 'Dr. Alex Morgan',
    doctorSpecialty: 'Cardiologist',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    dateTime: '07 Nov 2025, 20:30',
    isRead: true,
    actionRoute: '/history',
  },
  {
    id: 'notif-5',
    type: 'completed',
    category: 'Completed',
    title: 'Consultation with a cardiologist',
    badgeText: 'Completed',
    badgeVariant: 'completed',
    doctorName: 'Dr. Arlene McCoy',
    doctorSpecialty: 'Physician',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    dateTime: '07 Nov 2025, 20:30',
    isRead: true,
    actionRoute: '/history',
  },
  {
    id: 'notif-6',
    type: 'completed',
    category: 'Completed',
    title: 'Endocrine Health Follow-up',
    badgeText: 'Completed',
    badgeVariant: 'completed',
    doctorName: 'Dr. Johan Janson',
    doctorSpecialty: 'Endocrinologist',
    doctorPhotoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
    dateTime: '07 Nov 2025, 20:30',
    isRead: true,
    actionRoute: '/history',
  },
];

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-[#E3F3F1] hover:text-[#0B5A54] flex items-center justify-center text-slate-800 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
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
                className="w-8 h-8 rounded-full bg-[#E3F3F1] hover:bg-[#0B5A54] text-[#0B5A54] hover:text-white transition-all flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer"
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
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
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
                {/* Collapsible Section Header (Matching Screenshot) */}
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

                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#E3F3F1] group-hover:text-[#0B5A54] transition-colors">
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
                          toggleReadStatus(item.id);
                          if (item.actionRoute) navigate(item.actionRoute);
                        }}
                        className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 hover:border-[#0B5A54]/40 hover:shadow-md transition-all duration-300 cursor-pointer space-y-4 text-left group relative overflow-hidden"
                      >
                        {/* Top Row: Consultation Title + Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xs sm:text-sm font-extrabold text-[#111827] font-heading leading-tight group-hover:text-[#0B5A54] transition-colors">
                            {item.title}
                          </h3>

                          {/* Top Right Badge (Matching Screenshot) */}
                          <span
                            className={clsx(
                              'text-[11px] font-black px-3 py-1 rounded-full shrink-0 shadow-2xs',
                              item.badgeVariant === 'upcoming'
                                ? 'bg-[#E3F3F1] text-[#0B5A54] border border-[#0B5A54]/20'
                                : 'bg-[#DCFCE7] text-[#166534] border border-emerald-200'
                            )}
                          >
                            {item.badgeText}
                          </span>
                        </div>

                        {/* Bottom Row: Doctor Profile Info (Left) + DateTime (Right) */}
                        <div className="flex items-end justify-between gap-2 pt-1">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.doctorPhotoUrl}
                              alt={item.doctorName}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs shrink-0"
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

                          {/* Date & Time on Bottom Right */}
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-400 shrink-0">
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
              className="text-xs font-bold text-white bg-[#0B5A54] px-4 py-2 rounded-full shadow-2xs active:scale-95 cursor-pointer"
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
