import React, { useState } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Clock,
  Trash2,
  Building2,
  Search,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { AnnouncementRecord } from '../../types/staff';

interface AdminAnnouncementsProps {
  onShowToast: (msg: string) => void;
}

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({ onShowToast }) => {
  const announcements = useStaffStore((s) => s.announcements);
  const departments = useStaffStore((s) => s.departments);
  const addAnnouncement = useStaffStore((s) => s.addAnnouncement);
  const deleteAnnouncement = useStaffStore((s) => s.deleteAnnouncement);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<AnnouncementRecord['audience']>('All Patients');
  const [department, setDepartment] = useState<string>('All');
  const [priority, setPriority] = useState<AnnouncementRecord['priority']>('Normal');
  const [sendOption, setSendOption] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state for sent history
  const [searchHistory, setSearchHistory] = useState('');

  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.message.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.audience.toLowerCase().includes(searchHistory.toLowerCase())
  );

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
          : 'Announcement dispatched to recipient network!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    await deleteAnnouncement(id);
    onShowToast(`Announcement "${annTitle}" deleted.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Notifications & Announcements
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
              Hospital Broadcast Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Dispatch priority alerts, health advisories, and system notices to patients, physicians, and reception desks.
          </p>
        </div>

        <div className="flex items-center gap-2 pr-2 text-xs font-bold text-slate-500 self-start sm:self-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Push Dispatch Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Compose Broadcast Form (5 cols) ── */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#0B5A54]">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Compose New Broadcast
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Deliver alerts via CarePulse In-App + SMS
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-slate-900">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                >
                  <option value="All Patients">All Patients (App Users)</option>
                  <option value="All Staff">All Hospital Staff</option>
                  <option value="Clinical Staff">Clinical Doctors Only</option>
                  <option value="Front Desk Reception">Reception Desks</option>
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

            {/* Specific Department Filter (Optional) */}
            <div>
              <label className="block mb-1 text-slate-900">Specific Clinical Department</label>
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
                placeholder="Write detailed broadcast notice, instructions, or operational updates..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
              />
            </div>

            {/* Dispatch Mode: Immediate vs Scheduled */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Dispatch Schedule
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

        {/* ── Right Column: Sent Broadcasts & History (7 cols) ── */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Broadcast History & Delivery Log
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Track delivered, opened, and scheduled announcement reach
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
                            {ann.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                          {ann.message}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(ann.id, ann.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Footer Metadata & Stats */}
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
                          <span>{ann.sentAt}</span>
                        </span>
                      </div>

                      {!isScheduled && (
                        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-600">
                          <span>
                            Delivered: <strong className="text-slate-900">{ann.deliveredCount}</strong>
                          </span>
                          <span>
                            Read: <strong className="text-emerald-700">{ann.readCount}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
