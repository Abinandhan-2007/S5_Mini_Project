import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const announcements = useStaffStore((s) => s.announcements);
  const staffMessages = useStaffStore((s) => s.staffMessages);
  const fetchAnnouncements = useStaffStore((s) => s.fetchAnnouncements);
  const fetchStaffMessages = useStaffStore((s) => s.fetchStaffMessages);
  const sendStaffMessage = useStaffStore((s) => s.sendStaffMessage);

  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scannedPatientRecord, setScannedPatientRecord] = useState<any>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Communication Modal State
  const [isCommsOpen, setIsCommsOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [commsTab, setCommsTab] = useState<'broadcasts' | 'message'>('broadcasts');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSending, setIsSending] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#0B5A54] text-white shadow-md border-b border-teal-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Branding */}
          <CarePulseLogo
            variant="horizontal"
            size="md"
            theme="dark"
            badge="Nurse Portal"
            subtitle="Pre-Consultation Vitals & Diagnostics"
            onClick={() => navigate('/nurse')}
          />

          {/* Center Actions: Scan Patient QR & Hospital Badge */}
          <div className="flex items-center gap-2.5">
            {/* Quick Action: Scan Patient QR */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-400/20 hover:bg-teal-400/30 text-white font-bold text-xs border border-teal-300/40 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Scan Patient Health ID QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-200" />
              <span>Scan Patient QR</span>
            </button>

            {/* Notification & Communication Hub Button */}
            <button
              onClick={() => setIsCommsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer relative"
              title="Hospital Broadcasts & Staff Inquiries"
            >
              <Bell className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden sm:inline">Notice Hub</span>
              {announcements.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Live Staff Chat Button */}
            <button
              onClick={() => setIsChatModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 text-white font-extrabold text-xs border border-purple-300/40 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Live Chat Messenger with Hospital Doctors, Staff & Administration"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-200" />
              <span className="hidden sm:inline">Staff Chat</span>
            </button>

            {/* Center Hospital Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/15 border border-white/10 text-xs font-semibold text-teal-100">
              <Building2 className="w-3.5 h-3.5 text-teal-300" />
              <span>{currentStaff?.hospitalName || currentStaff?.hospital_name || 'Hospital Facility'}</span>
              <span className="text-white/40">•</span>
              <span className="text-[11px] text-teal-300 font-mono font-bold">
                {currentStaff?.staff_code || currentStaff?.staffCode || 'Nurse'}
              </span>
            </div>
          </div>

          {/* Right Staff Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/15">
              <div className="w-9 h-9 rounded-full bg-emerald-700/80 border-2 border-teal-300/40 flex items-center justify-center font-bold text-xs text-white shadow-sm overflow-hidden">
                {currentStaff?.avatarUrl ? (
                  <img src={currentStaff.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentStaff?.name || 'Nurse').charAt(0)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">{currentStaff?.name || 'Staff Nurse'}</div>
                <div className="text-[10px] text-teal-200/80 font-medium">{currentStaff?.department || 'Triage & Vitals'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 transition-colors border border-white/10 text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
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

      {/* ── Nurse Station Communication Hub Modal ── */}
      {isCommsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0B5A54]">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Nurse Station Communications
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hospital broadcast notices and direct line to Hospital Administration
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCommsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setCommsTab('broadcasts')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  commsTab === 'broadcasts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>Hospital Notices ({announcements.length})</span>
              </button>
              <button
                onClick={() => setCommsTab('message')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  commsTab === 'message' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Contact Administration</span>
              </button>
            </div>

            {feedbackToast && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
                {feedbackToast}
              </div>
            )}

            {/* Tab 1: Broadcasts Feed */}
            {commsTab === 'broadcasts' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-[300px]">
                {announcements.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-medium">
                    No active hospital notices for this station.
                  </div>
                ) : (
                  announcements.map((ann) => {
                    const isUrgent = ann.priority === 'Urgent';
                    const isHigh = ann.priority === 'High';

                    return (
                      <div
                        key={ann.id}
                        className={`p-4 rounded-2xl border space-y-2 ${
                          isUrgent
                            ? 'bg-rose-50/50 border-rose-200'
                            : isHigh
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{ann.title}</span>
                            {isUrgent && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.2 rounded-full border border-rose-200">
                                Urgent
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{ann.sentAt || 'Recently'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {ann.message}
                        </p>
                        <div className="text-[10px] text-teal-800 font-bold">
                          Issued by {ann.authorName || 'Facility Administration'} • Audience: {ann.audience}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Contact Administration Form & Conversation */}
            {commsTab === 'message' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar min-h-[300px]">
                <form onSubmit={handleSendMessage} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                  <div>
                    <label className="block mb-1 text-slate-900">Subject / Requisition</label>
                    <input
                      type="text"
                      required
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="e.g. Vitals monitor calibration or phlebotomy supplies needed"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-slate-900">Priority Level</label>
                      <select
                        value={msgPriority}
                        onChange={(e) => setMsgPriority(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isSending}
                        className="w-full py-2 px-4 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Admin</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-900">Inquiry Details</label>
                    <textarea
                      rows={3}
                      required
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      placeholder="Provide triage cabin details, patient surge notes, or equipment status..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                    />
                  </div>
                </form>

                {/* Conversation History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Recent Messages & Admin Responses ({staffMessages.length})
                  </h4>

                  {staffMessages.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No previous messages dispatched to administration.</p>
                  ) : (
                    staffMessages.map((m) => (
                      <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900">{m.subject}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">{m.message}</p>

                        {/* Replies */}
                        {m.replies && m.replies.length > 0 && (
                          <div className="pl-3 border-l-2 border-teal-300 space-y-1.5 mt-2">
                            {m.replies.map((r) => (
                              <div key={r.id} className="p-2 rounded-lg bg-teal-50/60 border border-teal-100 text-xs">
                                <div className="font-bold text-teal-900 text-[10px]">
                                  {r.senderRole === 'admin' ? 'Hospital Administration' : r.senderName}
                                </div>
                                <p className="text-slate-700">{r.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Live Admin Chat Modal ── */}
      {isChatModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsChatModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Hospital Staff & Administration Live Chat</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Real-time messaging with doctors, receptionists, nurses & administrators</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3">
              <StaffChatHub
                currentRole="nurse"
                currentStaffId={currentStaff?.id || currentStaff?.staff_id}
                currentStaffName={currentStaff?.name || 'Nurse'}
                hospitalId={currentStaff?.hospital_id}
                onShowToast={(msg) => setFeedbackToast(msg)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
