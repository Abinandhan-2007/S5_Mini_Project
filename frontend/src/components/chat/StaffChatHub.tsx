import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Search,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  UserCheck,
  Building2,
  AlertTriangle,
  RefreshCw,
  CheckCheck,
  Sparkles,
  User,
  Flame,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';
import { usePolling } from '../../lib/usePolling';

export interface ChatContact {
  id: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | string;
  department?: string;
  staffCode?: string;
  avatarUrl?: string;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  hospitalId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderCode?: string;
  recipientRole?: string;
  recipientId?: string;
  subject: string;
  message: string;
  priority?: 'normal' | 'high' | 'urgent' | string;
  isRead?: boolean;
  parentId?: string | null;
  createdAt: string;
  replies?: ChatMessage[];
}

interface StaffChatHubProps {
  currentRole: 'admin' | 'doctor' | 'nurse' | 'receptionist' | string;
  currentStaffId?: string;
  currentStaffName?: string;
  hospitalId?: string;
  onShowToast?: (msg: string) => void;
  className?: string;
}

export const StaffChatHub: React.FC<StaffChatHubProps> = ({
  currentRole,
  currentStaffId,
  currentStaffName,
  hospitalId,
  onShowToast,
  className = '',
}) => {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'nurse' | 'receptionist' | 'admin'>('all');
  const [inputText, setInputText] = useState('');
  const [inputPriority, setInputPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentRole === 'admin' || currentRole === 'superadmin';

  // 1. Fetch Contacts
  const fetchContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const res = await apiFetch('/communication/staff-contacts', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const list: ChatContact[] = data.contacts || [];
        setContacts(list);
        if (!selectedContact && list.length > 0) {
          setSelectedContact(list[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load chat contacts', err);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [selectedContact]);

  // 2. Fetch Messages
  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const res = await apiFetch('/communication/messages', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.warn('Failed to load chat messages', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchContacts();
    fetchMessages();
  }, [fetchContacts, fetchMessages]);

  // Polling every 4 seconds for real-time conversation updates
  usePolling(
    async () => {
      await fetchMessages();
    },
    { interval: 4000, enabled: true }
  );

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedContact]);

  // Flatten messages and replies for display in active conversation
  const activeConversationMessages = useMemo(() => {
    const list: ChatMessage[] = [];

    // Flatten tree
    messages.forEach((root) => {
      list.push(root);
      if (root.replies && root.replies.length > 0) {
        root.replies.forEach((rep) => list.push(rep));
      }
    });

    if (!selectedContact) {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Filter messages for conversation with the selected contact
    return list
      .filter((m) => {
        const isFromContact =
          m.senderId === selectedContact.id ||
          (selectedContact.id === 'admin' && m.senderRole === 'admin') ||
          (selectedContact.staffCode && m.senderCode === selectedContact.staffCode);

        const isToContact =
          m.recipientId === selectedContact.id ||
          (selectedContact.id === 'admin' && m.recipientRole === 'admin') ||
          (m.recipientRole === selectedContact.role && (!m.recipientId || m.recipientId === selectedContact.id));

        const isFromMe =
          Boolean(currentStaffId && (m.senderId === currentStaffId || m.senderCode === currentStaffId)) ||
          (m.senderRole === currentRole);

        const isToMe =
          Boolean(currentStaffId && m.recipientId === currentStaffId) ||
          m.recipientRole === currentRole ||
          m.recipientRole === 'all';

        // 1. Direct exchange between me and selected contact
        if (isFromContact && isToMe) return true;
        if (isFromMe && isToContact) return true;

        // 2. If contact is Admin, include general admin announcements/alerts
        if (selectedContact.id === 'admin' && (m.senderRole === 'admin' || m.recipientRole === 'admin' || m.recipientRole === 'all')) {
          return true;
        }

        // 3. Automated system notifications
        if (m.senderId === 'system-admin' && (m.recipientId === currentStaffId || m.recipientRole === currentRole || m.recipientRole === 'all')) {
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedContact, currentStaffId, currentRole]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);
    try {
      const recipientRole = selectedContact?.role || 'staff';
      const recipientId = selectedContact?.id !== 'admin' ? selectedContact?.id : undefined;

      const subject = cleanText.length > 35 ? `${cleanText.substring(0, 35)}...` : cleanText;

      const res = await apiFetch('/communication/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message: cleanText,
          priority: inputPriority,
          recipientRole,
          recipientId,
          hospitalId,
        }),
      });

      if (res.ok) {
        setInputText('');
        setInputPriority('normal');
        await fetchMessages();
        scrollToBottom();
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
        if (onShowToast) onShowToast(err.detail || 'Message dispatch failed');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter contacts by tab and search
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !contactSearch ||
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.staffCode && c.staffCode.toLowerCase().includes(contactSearch.toLowerCase())) ||
        (c.department && c.department.toLowerCase().includes(contactSearch.toLowerCase()));

      const matchesRole = roleFilter === 'all' || c.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [contacts, contactSearch, roleFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ShieldCheck };
      case 'doctor':
        return { label: 'Doctor', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: Stethoscope };
      case 'nurse':
        return { label: 'Nurse', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: HeartPulse };
      case 'receptionist':
        return { label: 'Front Desk', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: UserCheck };
      default:
        return { label: 'Staff', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: User };
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-[720px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE: CONTACTS & CHANNELS
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">
                  Hospital Staff Chat Hub
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  {contacts.length} Connected Staff Members
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchContacts();
                fetchMessages();
              }}
              title="Refresh conversation"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingContacts || isLoadingMessages ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Contacts (Available to all staff) */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search staff, code, department..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition"
            />
          </div>

          {/* Role Filter Chips (Available to all staff) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold no-scrollbar">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('doctor')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                roleFilter === 'doctor'
                  ? 'bg-teal-700 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              Doctors
            </button>
            <button
              onClick={() => setRoleFilter('nurse')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                roleFilter === 'nurse'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Nurses
            </button>
            <button
              onClick={() => setRoleFilter('receptionist')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                roleFilter === 'receptionist'
                  ? 'bg-sky-700 text-white'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              Front Desk
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                roleFilter === 'admin'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Admins
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const badge = getRoleBadge(contact.role);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-white shadow-xs border border-teal-300 ring-2 ring-teal-500/10'
                      : 'hover:bg-white/80 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={contact.avatarUrl || '/doctor_default.jpg'}
                      alt={contact.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/doctor_default.jpg';
                      }}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                    />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {contact.name}
                      </h4>
                      {contact.staffCode && (
                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {contact.staffCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium truncate">
                      <span className="truncate">{contact.department || 'General'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${badge.color}`}>
                        <BadgeIcon className="w-2.5 h-2.5" />
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE: ACTIVE CONVERSATION & INPUT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-100/50">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={selectedContact?.avatarUrl || '/doctor_default.jpg'}
                alt={selectedContact?.name || 'Contact'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/doctor_default.jpg';
                }}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
              />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  {selectedContact?.name || (isAdmin ? 'Select a Staff Contact' : 'Hospital Administration')}
                </h3>
                {selectedContact && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(selectedContact.role).color}`}>
                    {getRoleBadge(selectedContact.role).label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {selectedContact?.department || 'CarePulse Health Facility'}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Secure Line
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#0B5A54] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted Staff Channel
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeConversationMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-14 h-14 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0B5A54] mb-3">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-700 mb-1">Direct Secure Line</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                No previous messages in this thread. Type below to initiate communication with {selectedContact?.name || 'Hospital Administration'}.
              </p>
            </div>
          ) : (
            activeConversationMessages.map((msg) => {
              const isMine =
                Boolean(currentStaffId && (msg.senderId === currentStaffId || msg.senderCode === currentStaffId)) ||
                Boolean(currentStaffName && msg.senderName === currentStaffName);

              const isSystemNotification =
                msg.senderId === 'system-admin' ||
                msg.subject.includes('Doctor Leave Approved') ||
                msg.subject.includes('Nurse Requisition Approved') ||
                msg.subject.includes('New Nurse Requisition');

              const isUrgent = msg.priority === 'urgent' || msg.priority === 'high';

              // Render Automated System Notifications as prominent banner cards
              if (isSystemNotification) {
                return (
                  <div
                    key={msg.id}
                    className="mx-auto max-w-xl bg-linear-to-r from-teal-900 to-[#0B5A54] text-white p-4 rounded-2xl shadow-md border border-teal-700 space-y-2 animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center justify-between text-xs font-black tracking-wide">
                      <span className="flex items-center gap-1.5 text-teal-200 uppercase text-[10px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Administrative Action Alert
                      </span>
                      <span className="text-teal-300/80 text-[10px] font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h5 className="text-sm font-black text-white">{msg.subject}</h5>
                    <p className="text-xs text-teal-50/90 leading-relaxed font-medium">{msg.message}</p>

                    <div className="pt-2 border-t border-teal-800/80 flex items-center justify-between text-[10px] text-teal-200 font-bold">
                      <span>Sender: {msg.senderName} ({msg.senderRole})</span>
                      <span className="bg-teal-800 px-2 py-0.5 rounded-full text-teal-100">Broadcast</span>
                    </div>
                  </div>
                );
              }

              // Normal Chat Bubbles
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold px-1">
                    <span>{msg.senderName}</span>
                    <span>•</span>
                    <span className="uppercase text-[9px] text-slate-500 font-black">{msg.senderRole}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-md lg:max-w-lg p-4 rounded-3xl text-xs font-medium shadow-xs leading-relaxed transition-all ${
                      isMine
                        ? 'bg-linear-to-br from-[#0B5A54] to-teal-800 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    {isUrgent && (
                      <div className={`mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isMine ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40' : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        <Flame className="w-2.5 h-2.5" />
                        Urgent Priority
                      </div>
                    )}

                    {msg.subject && msg.subject !== msg.message && (
                      <div className={`font-black text-xs mb-1 ${isMine ? 'text-teal-100' : 'text-slate-800'}`}>
                        {msg.subject}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                    {isMine && (
                      <span className="flex items-center text-teal-700">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Priority:</span>
                <button
                  type="button"
                  onClick={() => setInputPriority('normal')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                    inputPriority === 'normal'
                      ? 'bg-teal-100 text-teal-800 border border-teal-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setInputPriority('urgent')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                    inputPriority === 'urgent'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Urgent
                </button>
              </div>

              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for new line
              </span>
            </div>

            <div className="flex items-end gap-2 bg-slate-100/70 p-2 rounded-2xl border border-slate-200 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20 transition">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Type message to ${selectedContact?.name || 'Hospital Administration'}...`}
                className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden py-1 leading-relaxed"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className={`p-2.5 rounded-xl font-bold transition flex items-center justify-center shrink-0 ${
                  !inputText.trim() || isSending
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#0B5A54] hover:bg-teal-800 text-white shadow-xs active:scale-95'
                }`}
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
