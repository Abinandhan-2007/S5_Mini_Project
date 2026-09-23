import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogOut,
  Building2,
  QrCode,
  Bell,
  Megaphone,
  MessageSquare,
  Send,
  X,
  Clock,
  ArrowLeft,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { usePolling } from '../../lib/usePolling';
import { PatientQrScannerModal } from '../../components/qr/PatientQrScannerModal';
import { Patient360RecordModal } from '../../components/qr/Patient360RecordModal';
import { CarePulseLogo } from '../../components/brand/CarePulseLogo';
import { StaffChatHub } from '../../components/chat/StaffChatHub';

interface NurseLayoutProps {
  children: ReactNode;
}

export const NurseLayout: React.FC<NurseLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as 'queue' | 'notices' | 'chat') || 'queue';

  const setTab = (tab: 'queue' | 'notices' | 'chat') => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'queue') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const announcements = useStaffStore((s) => s.announcements);
  const staffMessages = useStaffStore((s) => s.staffMessages);
  const fetchAnnouncements = useStaffStore((s) => s.fetchAnnouncements);
  const fetchStaffMessages = useStaffStore((s) => s.fetchStaffMessages);
  const unreadStaffMessagesCount = useStaffStore((s) => s.unreadStaffMessagesCount);
  const sendStaffMessage = useStaffStore((s) => s.sendStaffMessage);

  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scannedPatientRecord, setScannedPatientRecord] = useState<any>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Communication & Notice Hub Tab State
  const [commsTab, setCommsTab] = useState<'broadcasts' | 'message'>('broadcasts');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSending, setIsSending] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Reset window scroll position when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentTab]);

  // Initial load
  useEffect(() => {
    if (currentStaff && currentStaff.role === 'nurse') {
      fetchAnnouncements(true);
      fetchStaffMessages(true);
    }
  }, [currentStaff, fetchAnnouncements, fetchStaffMessages]);

  // Periodic polling
  usePolling(
    async () => {
      await Promise.all([
        fetchAnnouncements(true),
        fetchStaffMessages(true),
      ]);
    },
    {
      interval: 8000,
      enabled: !!currentStaff && currentStaff.role === 'nurse',
    }
  );

  const handlePatientLoaded = (patientData: any) => {
    setScannedPatientRecord(patientData);
    setIsDossierOpen(true);
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgContent.trim()) return;

    setIsSending(true);
    try {
      await sendStaffMessage({
        subject: msgSubject.trim(),
        message: msgContent.trim(),
        priority: msgPriority,
        recipientRole: 'admin',
      });
      setMsgSubject('');
      setMsgContent('');
      setFeedbackToast('✓ Message sent to Hospital Administration.');
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-slate-800 shadow-xs border-b border-slate-200/90 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <CarePulseLogo
              variant="horizontal"
              size="md"
              theme="light"
              badge="Nurse Portal"
              subtitle="Pre-Consultation Vitals & Diagnostics"
              onClick={() => navigate('/nurse')}
            />
          </div>

          {/* Center Actions: Patient Queue, Scan QR, Notice Hub, Staff Chat */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Patient Queue Tab Button */}
            <button
              onClick={() => setTab('queue')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'queue'
                  ? 'bg-teal-50 text-[#0F766E] border border-teal-200/80 shadow-2xs font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Pre-Consultation Vitals Patient Queue"
            >
              <Users className="w-3.5 h-3.5 text-[#0F766E]" />
              <span className="hidden sm:inline">Patient Queue</span>
            </button>

            {/* Quick Action: Scan Patient QR */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-[#0F766E] font-semibold text-xs border border-slate-200 hover:border-teal-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Scan Patient Health ID QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-[#0F766E]" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>

            {/* Notice Hub Full-Page Tab Button */}
            <button
              onClick={() => setTab('notices')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer relative ${
                currentTab === 'notices'
                  ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
              title="Hospital Broadcast Directives & Staff Communications"
            >
              <Bell className={`w-3.5 h-3.5 ${currentTab === 'notices' ? 'text-white' : 'text-slate-500'}`} />
              <span className="hidden md:inline">Notice Hub</span>
              {announcements.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Live Staff Chat Full-Page Tab Button */}
            <button
              onClick={() => setTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer relative ${
                currentTab === 'chat'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs font-bold'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs'
              }`}
              title="Live Chat Messenger with Hospital Doctors, Staff & Administration"
            >
              <MessageSquare className={`w-3.5 h-3.5 ${currentTab === 'chat' ? 'text-white' : 'text-purple-600'}`} />
              <span className="hidden md:inline">Staff Chat</span>
              {unreadStaffMessagesCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-mono font-black animate-pulse shadow-xs">
                  {unreadStaffMessagesCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Staff Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Facility Name + ID Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
              <span className="font-semibold">{currentStaff?.hospitalName || currentStaff?.hospital_name || 'Hospital Facility'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-[#0F766E] font-mono font-bold">
                {currentStaff?.staff_code || currentStaff?.staffCode || 'Nurse'}
              </span>
            </div>

            {/* Thin Divider */}
            <div className="hidden lg:block h-6 w-px bg-slate-200" />

            {/* Nurse Profile */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#0F766E] border-2 border-teal-100 flex items-center justify-center font-bold text-xs text-white shadow-xs overflow-hidden shrink-0">
                {currentStaff?.avatarUrl ? (
                  <img src={currentStaff.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentStaff?.name || 'Nurse').charAt(0)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">{currentStaff?.name || 'Staff Nurse'}</div>
                <div className="text-[11px] text-slate-500 font-medium">{currentStaff?.department || 'Triage & Vitals'}</div>
              </div>
            </div>

            {/* Clear Red Text Logout Button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Sign Out of Nurse Portal"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 shadow-2xs text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (Full Screen Width) ── */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* VIEW 1: Patient Vitals Queue Dashboard */}
        {currentTab === 'queue' && children}

        {/* VIEW 2: Full-Page Notice Hub */}
        {currentTab === 'notices' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Full-Page Top Header Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTab('queue')}
                  className="group w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0F766E] border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Back to Patient Queue"
                  aria-label="Back to Patient Queue"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-[#0F766E] group-hover:-translate-x-0.5 transition-all duration-150" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                      Notice Hub & Administrative Communications
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-[10px] font-bold uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Hospital broadcast directives and direct two-way requisition line with Hospital Administration
                  </p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1 shrink-0">
                <button
                  onClick={() => setCommsTab('broadcasts')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    commsTab === 'broadcasts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Directives ({announcements.length})</span>
                </button>
                <button
                  onClick={() => setCommsTab('message')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    commsTab === 'message' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-teal-600" />
                  <span>Contact Administration</span>
                </button>
              </div>
            </div>

            {/* Feedback Toast */}
            {feedbackToast && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
                <span>{feedbackToast}</span>
                <button onClick={() => setFeedbackToast(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tab 1: Broadcasts Feed */}
            {commsTab === 'broadcasts' && (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Hospital Broadcast Notices</h3>
                    <p className="text-xs text-slate-500 font-medium">Official bulletins and clinical alerts from administration</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {announcements.length} active bulletin{announcements.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {announcements.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 font-medium">
                    <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] mx-auto mb-3">
                      <Megaphone className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-700 font-bold">No active hospital notices for this station</p>
                    <p className="text-xs text-slate-400 mt-1">Directives published by administration will appear here in real time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {announcements.map((ann) => {
                      const isUrgent = ann.priority === 'Urgent';
                      const isHigh = ann.priority === 'High';

                      return (
                        <div
                          key={ann.id}
                          className={`p-5 rounded-xl border space-y-2.5 transition-all hover:shadow-xs ${
                            isUrgent
                              ? 'bg-rose-50/50 border-rose-200'
                              : isHigh
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-slate-50/70 border-slate-200/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{ann.title}</span>
                              {isUrgent && (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                                  Urgent
                                </span>
                              )}
                              {isHigh && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                  High
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ann.sentAt || 'Recently'}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-normal leading-relaxed">
                            {ann.message}
                          </p>
                          <div className="text-[11px] text-[#0F766E] font-semibold pt-1 border-t border-slate-200/50">
                            Issued by {ann.authorName || 'Facility Administration'} • Audience: {ann.audience}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Contact Administration Form & Conversation */}
            {commsTab === 'message' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Message Composer */}
                <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Dispatch Administrative Inquiry</h3>
                    <p className="text-xs text-slate-500 font-medium">Requisition supplies, triage cabin maintenance, or shift inquiries</p>
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-4 text-xs font-semibold text-slate-700">
                    <div>
                      <label className="block mb-1.5 text-slate-900 font-bold">Subject / Requisition Title</label>
                      <input
                        type="text"
                        required
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        placeholder="e.g. Vitals monitor calibration or phlebotomy supplies needed"
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-slate-900 font-bold">Priority Level</label>
                      <select
                        value={msgPriority}
                        onChange={(e) => setMsgPriority(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent / Immediate Attention</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-slate-900 font-bold">Inquiry Details</label>
                      <textarea
                        rows={5}
                        required
                        value={msgContent}
                        onChange={(e) => setMsgContent(e.target.value)}
                        placeholder="Provide triage cabin details, patient surge notes, or equipment requisitions..."
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Dispatching...' : 'Dispatch to Administration'}</span>
                    </button>
                  </form>
                </div>

                {/* Right: Message Thread History */}
                <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4 flex flex-col">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Communication History</h3>
                      <p className="text-xs text-slate-500 font-medium">Dispatched requisitions and administration replies</p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {staffMessages.length} message{staffMessages.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[500px] pr-1">
                    {staffMessages.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 font-medium">
                        <p className="text-sm text-slate-600 font-bold">No previous messages dispatched to administration</p>
                        <p className="text-xs text-slate-400 mt-1">Use the form on the left to submit questions, issues, or requisitions.</p>
                      </div>
                    ) : (
                      staffMessages.map((m) => (
                        <div key={m.id} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-900 font-heading text-sm">{m.subject}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-slate-700 font-normal leading-relaxed">{m.message}</p>

                          {/* Replies */}
                          {m.replies && m.replies.length > 0 && (
                            <div className="pl-3.5 border-l-2 border-[#0F766E] space-y-2 mt-2 pt-1">
                              {m.replies.map((r) => (
                                <div key={r.id} className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-100 text-xs">
                                  <div className="font-bold text-[#0F766E] text-[11px]">
                                    {r.senderRole === 'admin' ? 'Hospital Administration' : r.senderName}
                                  </div>
                                  <p className="text-slate-700 mt-0.5">{r.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Full-Page Staff Live Chat */}
        {currentTab === 'chat' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTab('queue')}
                  className="group w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Back to Patient Queue"
                  aria-label="Back to Patient Queue"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-purple-700 group-hover:-translate-x-0.5 transition-all duration-150" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                      Hospital Staff & Administration Live Chat
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                      Live Messenger
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Direct instant messaging with hospital physicians, receptionists, nurses & administrators
                  </p>
                </div>
              </div>

            </div>

            {/* Full-Page Staff Chat Hub Container */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 sm:p-5 min-h-[620px]">
              <StaffChatHub
                currentRole="nurse"
                currentStaffId={currentStaff?.id || currentStaff?.staff_id}
                currentStaffName={currentStaff?.name || 'Nurse'}
                hospitalId={currentStaff?.hospital_id}
                onShowToast={(msg) => setFeedbackToast(msg)}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── QR Scanner Modal ── */}
      <PatientQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onPatientLoaded={handlePatientLoaded}
      />

      {/* ── Scanned Patient 360 Dossier Modal ── */}
      {scannedPatientRecord && (
        <Patient360RecordModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          data={scannedPatientRecord}
          portalRole="nurse"
        />
      )}

      {/* ── Logout Confirmation Warning Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    Confirm Staff Logout
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Are you sure you want to log out of the CarePulse Nurse Portal? Any unrecorded vitals or pending observations will not be saved.
                  </p>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-amber-900">Current Session: </span>
                  <span>{currentStaff?.name || 'Staff Nurse'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-100/80 font-mono font-bold text-[11px] text-amber-800">
                  {currentStaff?.staff_code || currentStaff?.staffCode || 'Nurse'}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleLogout();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Yes, Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
