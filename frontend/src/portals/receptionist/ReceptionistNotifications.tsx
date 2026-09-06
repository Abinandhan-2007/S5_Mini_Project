import React, { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCheck,
  Search,
  Stethoscope,
  Ticket,
  Building2,
  Send,
  X,
  Radio,
  Eye,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

export interface ReceptionistNotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'urgent' | 'queue' | 'doctor' | 'broadcast' | 'system';
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  timeAgo: string;
  isRead: boolean;
  actionTab?: string;
  actionLabel?: string;
  sender?: string;
}

interface ReceptionistNotificationsProps {
  onShowToast?: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const INITIAL_NOTIFICATIONS: ReceptionistNotificationItem[] = [];

export const ReceptionistNotifications: React.FC<ReceptionistNotificationsProps> = ({
  onShowToast,
  onNavigateTab,
}) => {
  const profile = useStaffStore((s) => s.receptionistProfile);
  const [notifications, setNotifications] = useState<ReceptionistNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesCategory =
        activeCategory === 'all'
          ? true
          : activeCategory === 'unread'
          ? !item.isRead
          : item.category === activeCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.sender?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [notifications, activeCategory, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const urgentCount = notifications.filter((n) => n.category === 'urgent' && !n.isRead).length;
  const queueCount = notifications.filter((n) => n.category === 'queue').length;
  const doctorCount = notifications.filter((n) => n.category === 'doctor').length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    onShowToast?.('✓ All notifications marked as read.');
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    onShowToast?.('Notification removed.');
  };

  const handleClearRead = () => {
    setNotifications((prev) => prev.filter((item) => !item.isRead));
    onShowToast?.('Cleared all read notifications.');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;

    const newNotif: ReceptionistNotificationItem = {
      id: `notif-${Date.now()}`,
      title: broadcastTitle,
      message: broadcastMsg,
      category: broadcastPriority === 'high' ? 'urgent' : 'broadcast',
      priority: broadcastPriority,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      isRead: false,
      sender: `${profile.name} (Desk 01)`,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setIsBroadcastModalOpen(false);
    setBroadcastTitle('');
    setBroadcastMsg('');
    onShowToast?.('📢 Front desk alert broadcasted successfully.');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'queue':
        return <Ticket className="w-4 h-4 text-purple-600" />;
      case 'doctor':
        return <Stethoscope className="w-4 h-4 text-teal-600" />;
      case 'broadcast':
        return <Radio className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'queue':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'doctor':
        return 'bg-teal-50 text-[#0B5A54] border-teal-200';
      case 'broadcast':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 text-left animate-in fade-in duration-300">
      {/* ══════════════════════════════════════════════════════════════════
          1. ACTIONS TOOLBAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          onClick={() => setIsBroadcastModalOpen(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-[#0B5A54] to-teal-800 hover:from-[#084540] hover:to-[#0B5A54] text-white font-extrabold rounded-xl text-xs shadow-md shadow-teal-900/15 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
        >
          <Send className="w-3.5 h-3.5 text-teal-200" />
          <span>+ Broadcast Alert</span>
        </button>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#0B5A54]" />
            <span>Mark All Read</span>
          </button>
        )}

        <button
          onClick={handleClearRead}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-extrabold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Read</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. METRIC SUMMARY STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => setActiveCategory('unread')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeCategory === 'unread'
              ? 'bg-teal-50/80 border-[#0B5A54] ring-2 ring-[#0B5A54]/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500">Unread Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">{unreadCount}</div>
        </div>

        <div
          onClick={() => setActiveCategory('urgent')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeCategory === 'urgent'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-600">Urgent Triage</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 mt-2">{urgentCount}</div>
        </div>

        <div
          onClick={() => setActiveCategory('doctor')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeCategory === 'doctor'
              ? 'bg-teal-50/80 border-[#0B5A54] ring-2 ring-[#0B5A54]/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#0B5A54]">Doctor Cabins</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0B5A54] mt-2">{doctorCount}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. SEARCH & CATEGORY FILTER BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Alerts', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'urgent', label: 'Urgent', count: urgentCount },
            { id: 'queue', label: 'Queue & Tokens', count: queueCount },
            { id: 'doctor', label: 'Doctor Cabins', count: doctorCount },
            { id: 'broadcast', label: 'Hospital Notices' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. NOTIFICATIONS FEED LIST
      ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No alerts matching "${searchQuery}". Try a different search term.`
                : 'All caught up! There are no alerts in this category.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleMarkAsRead(item.id)}
              className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !item.isRead
                  ? 'bg-white border-teal-200/90 shadow-sm ring-1 ring-teal-500/10'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white shadow-2xs opacity-90'
              }`}
            >
              {/* Left Unread Indicator Bar */}
              {!item.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0B5A54]" />
              )}

              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Category Icon Badge */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                    item.category === 'urgent'
                      ? 'bg-rose-50 border-rose-200'
                      : item.category === 'queue'
                      ? 'bg-purple-50 border-purple-200'
                      : item.category === 'doctor'
                      ? 'bg-teal-50 border-teal-200'
                      : item.category === 'broadcast'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {getCategoryIcon(item.category)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm font-black font-heading ${
                        !item.isRead ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {item.title}
                    </h3>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadge(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>

                    {item.priority === 'high' && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-2xs">
                        High Priority
                      </span>
                    )}

                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#0B5A54] animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-bold pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.timeAgo}</span>
                    </span>

                    {item.sender && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Source: {item.sender}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {item.actionTab && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(item.id);
                      onNavigateTab?.(item.actionTab!);
                    }}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-extrabold text-xs rounded-xl border border-teal-200 transition-colors cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span>{item.actionLabel || 'View Action'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(item.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          5. BROADCAST NEW ALERT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center shadow-2xs border border-teal-200">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Broadcast Front Desk Alert
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Send quick notice to doctors and clinical staff
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g., Cardiology Cabin 102 Queue Full"
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'Low / Info' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'high', label: 'High Priority' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setBroadcastPriority(p.id as 'high' | 'medium' | 'low')}
                      className={`py-2 px-2.5 rounded-xl font-extrabold text-[11px] border transition-all cursor-pointer text-center ${
                        broadcastPriority === p.id
                          ? p.id === 'high'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs'
                            : 'bg-teal-50 border-[#0B5A54] text-[#0B5A54] shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alert Message</label>
                <textarea
                  required
                  rows={3}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Type the announcement or notice message details..."
                  className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistNotifications;
