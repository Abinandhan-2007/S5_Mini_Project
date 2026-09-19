import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Clock,
  Trash2,
  Building2,
  Search,
  MessageSquare,
  Stethoscope,
  Ticket,
  HeartPulse,
  CornerDownRight,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { AnnouncementRecord, StaffRole } from '../../types/staff';

interface AdminAnnouncementsProps {
  onShowToast: (msg: string) => void;
}

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({ onShowToast }) => {
  const announcements = useStaffStore((s) => s.announcements);
  const staffMessages = useStaffStore((s) => s.staffMessages);
  const unreadStaffMessagesCount = useStaffStore((s) => s.unreadStaffMessagesCount);
  const departments = useStaffStore((s) => s.departments);
  const addAnnouncement = useStaffStore((s) => s.addAnnouncement);
  const deleteAnnouncement = useStaffStore((s) => s.deleteAnnouncement);
  const fetchAnnouncements = useStaffStore((s) => s.fetchAnnouncements);
  const fetchStaffMessages = useStaffStore((s) => s.fetchStaffMessages);
  const sendStaffMessage = useStaffStore((s) => s.sendStaffMessage);
  const markStaffMessageRead = useStaffStore((s) => s.markStaffMessageRead);

  // Tab State
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'messages'>('broadcasts');

  // Broadcast Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<AnnouncementRecord['audience']>('All Staff');
  const [department, setDepartment] = useState<string>('All');
  const [priority, setPriority] = useState<AnnouncementRecord['priority']>('Normal');
  const [sendOption, setSendOption] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state for sent history
  const [searchHistory, setSearchHistory] = useState('');

  // Messages Filter & Reply State
  const [msgRoleFilter, setMsgRoleFilter] = useState<string>('all');
  const [msgSearch, setMsgSearch] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isReplyingMap, setIsReplyingMap] = useState<Record<string, boolean>>({});

  // Sync with backend on component mount
  useEffect(() => {
    fetchAnnouncements(true);
    fetchStaffMessages(true);
  }, [fetchAnnouncements, fetchStaffMessages]);

  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.message.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.audience.toLowerCase().includes(searchHistory.toLowerCase())
  );

  const filteredMessages = staffMessages.filter((m) => {
    const matchesRole = msgRoleFilter === 'all' || m.senderRole === msgRoleFilter;
    const q = msgSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.subject.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      (m.senderCode && m.senderCode.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onShowToast('Please provide an announcement title and message.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addAnnouncement({
        title: title.trim(),
        message: message.trim(),
        audience,
        department: department !== 'All' ? department : undefined,
        priority,
        status: sendOption === 'scheduled' ? 'Scheduled' : 'Sent',
        scheduledFor: sendOption === 'scheduled' ? scheduleDateTime : new Date().toLocaleString(),
      });

      setTitle('');
      setMessage('');
      setScheduleDateTime('');
      setSendOption('immediate');
      onShowToast(
        sendOption === 'scheduled'
          ? 'Announcement scheduled successfully!'
          : 'Broadcast dispatched to staff network!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    await deleteAnnouncement(id);
    onShowToast(`Announcement "${annTitle}" deleted.`);
  };

  const handleSendReply = async (threadId: string, parentSubject: string) => {
    const text = (replyTextMap[threadId] || '').trim();
    if (!text) return;

    setIsReplyingMap((prev) => ({ ...prev, [threadId]: true }));
    try {
      await sendStaffMessage({
        parentId: threadId,
        subject: `Re: ${parentSubject}`,
        message: text,
        priority: 'normal',
      });
      setReplyTextMap((prev) => ({ ...prev, [threadId]: '' }));
      onShowToast('Reply sent to staff member.');
    } finally {
      setIsReplyingMap((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5 text-teal-600" />;
      case 'nurse':
        return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
      case 'receptionist':
        return <Ticket className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Tab Navigation ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Hospital Communication Hub
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
              Broadcasts & Staff Inquiries
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Dispatch priority alerts to all facility stations and review incoming inquiries from clinical and front-desk personnel.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'broadcasts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-[#0B5A54]" />
            <span>Broadcasts</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {announcements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
            <span>Staff Inquiries</span>
            {unreadStaffMessagesCount > 0 ? (
              <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold animate-pulse">
                {unreadStaffMessagesCount}
              </span>
            ) : (
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                {staffMessages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── BROADCASTS TAB ── */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Compose Broadcast Form */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#0B5A54]">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Compose Hospital Notice
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Persisted across database and delivered to active staff stations
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              {/* Title */}
              <div>
                <label className="block mb-1 text-slate-900">Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Clinic Closed for Annual Disinfection"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              {/* Target Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-900">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                  >
                    <option value="All Staff">All Hospital Staff (All Stations)</option>
                    <option value="Clinical Staff">Clinical Doctors Only</option>
                    <option value="Front Desk Reception">Front Desk Reception Desks</option>
                    <option value="Nursing Staff">Nursing & Triage Stations</option>
                    <option value="All Patients">All Patients (App Users)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-900">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                  >
                    <option value="Normal">Normal Notification</option>
                    <option value="High">High Importance</option>
                    <option value="Urgent">Urgent Emergency</option>
                  </select>
                </div>
              </div>

              {/* Specific Department Filter */}
              <div>
                <label className="block mb-1 text-slate-900">Hospital Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                >
                  <option value="All">All Hospital Wings (Global)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Body */}
              <div>
                <label className="block mb-1 text-slate-900">Announcement Content</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write detailed broadcast notice, clinical protocol revisions, or station guidance..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              {/* Dispatch Mode */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Dispatch Timing
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendOption('immediate')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      sendOption === 'immediate'
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Send Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendOption('scheduled')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      sendOption === 'scheduled'
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Schedule Later
                  </button>
                </div>

                {sendOption === 'scheduled' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{sendOption === 'scheduled' ? 'Schedule Announcement' : 'Dispatch Broadcast Now'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Sent Broadcasts & History */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Broadcast History & Delivery Log
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Real-time broadcast distribution log across staff portals
                </p>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>
            </div>

            <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1 no-scrollbar">
              {filteredAnnouncements.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">
                  No announcement records found.
                </div>
              ) : (
                filteredAnnouncements.map((ann) => {
                  const isScheduled = ann.status === 'Scheduled';
                  const isUrgent = ann.priority === 'Urgent';
                  const isHigh = ann.priority === 'High';

                  return (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isUrgent
                          ? 'bg-rose-50/40 border-rose-200'
                          : isHigh
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 font-heading">
                              {ann.title}
                            </h4>
                            {isUrgent ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                                Urgent
                              </span>
                            ) : isHigh ? (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                High Priority
                              </span>
                            ) : null}

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isScheduled
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {ann.status || 'Sent'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                            {ann.message}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDelete(ann.id, ann.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Footer Metadata */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] font-bold text-slate-500 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ann.audience}</span>
                          </span>
                          {ann.department && (
                            <span className="flex items-center gap-1 text-[#0B5A54]">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{ann.department}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ann.sentAt || 'Recently'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF INQUIRIES & TWO-WAY MESSAGES TAB ── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Staff Inquiries & Station Communication
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Direct two-way message channels from doctors, triage nurses, and front-desk receptionists
              </p>
            </div>

            {/* Role Filters & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
                <button
                  onClick={() => setMsgRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                    msgRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMsgRoleFilter('doctor')}
                  className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                    msgRoleFilter === 'doctor' ? 'bg-white text-teal-800 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  Doctors
                </button>
                <button
                  onClick={() => setMsgRoleFilter('nurse')}
                  className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                    msgRoleFilter === 'nurse' ? 'bg-white text-rose-800 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  Nurses
                </button>
                <button
                  onClick={() => setMsgRoleFilter('receptionist')}
                  className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                    msgRoleFilter === 'receptionist' ? 'bg-white text-purple-800 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  Receptionists
                </button>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder="Search inquiries..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>
            </div>
          </div>

          {/* Messages Thread List */}
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1 no-scrollbar">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-medium">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                <p>No staff inquiry messages found.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Staff queries submitted from the Doctor, Nurse, or Receptionist portals will appear here.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isUrgent = msg.priority === 'urgent';
                const isHigh = msg.priority === 'high';
                const replies = msg.replies || [];

                return (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border p-5 transition-all space-y-4 ${
                      !msg.isRead
                        ? 'bg-teal-50/20 border-teal-200 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-800">
                            {getRoleIcon(msg.senderRole)}
                            <span className="capitalize">{msg.senderRole}</span>
                          </span>

                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            {msg.senderCode || msg.senderName}
                          </span>

                          {isUrgent ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Urgent Request
                            </span>
                          ) : isHigh ? (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                              High Priority
                            </span>
                          ) : null}

                          {!msg.isRead && (
                            <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-200">
                              New / Unread
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-slate-900 font-heading pt-1">
                          {msg.subject}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {!msg.isRead && (
                          <button
                            onClick={() => markStaffMessageRead(msg.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 cursor-pointer"
                            title="Mark as Read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Mark Read</span>
                          </button>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Inquiry Content */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 leading-relaxed">
                      {msg.message}
                    </div>

                    {/* Replies Thread */}
                    {replies.length > 0 && (
                      <div className="space-y-2.5 pl-4 border-l-2 border-teal-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Conversation History ({replies.length})
                        </span>
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="p-3 rounded-xl bg-teal-50/40 border border-teal-100 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span className="text-teal-900">
                                {reply.senderRole === 'admin' ? 'Hospital Administration' : reply.senderName}
                              </span>
                              <span className="text-slate-400 font-normal">
                                {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-slate-700">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Reply Form */}
                    <div className="flex items-center gap-2 pt-2">
                      <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={replyTextMap[msg.id] || ''}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({ ...prev, [msg.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendReply(msg.id, msg.subject);
                          }
                        }}
                        placeholder={`Reply to ${msg.senderName}...`}
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                      />
                      <button
                        onClick={() => handleSendReply(msg.id, msg.subject)}
                        disabled={isReplyingMap[msg.id] || !(replyTextMap[msg.id] || '').trim()}
                        className="px-4 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
