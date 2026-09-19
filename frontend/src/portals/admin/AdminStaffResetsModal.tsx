import React, { useState } from 'react';
import {
  KeyRound,
  X,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  Stethoscope,
  Building2,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { adminService, type StaffPasswordReset } from '../../services/adminService';

interface AdminStaffResetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: StaffPasswordReset[];
  onRefresh: () => void;
}

export const AdminStaffResetsModal: React.FC<AdminStaffResetsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('CarePulse#2026');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSuccess, setActiveSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleResolve = async (requestId: string) => {
    setResolvingId(requestId);
    setActiveSuccess(null);
    try {
      const res = await adminService.resolveStaffPasswordReset(requestId, customPassword || 'CarePulse#2026');
      if (res.success) {
        setActiveSuccess(res.message || 'Password reset successfully!');
        await onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setResolvingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'pending' && r.status !== 'Pending') return false;
    if (filter === 'resolved' && r.status !== 'Resolved') return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.staffName || '').toLowerCase().includes(term) ||
      (r.staffEmail || '').toLowerCase().includes(term) ||
      (r.staffRole || '').toLowerCase().includes(term) ||
      (r.id || '').toLowerCase().includes(term)
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'doctor') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
          <Stethoscope className="w-2.5 h-2.5" /> Doctor
        </span>
      );
    }
    if (r === 'nurse') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
          <HeartPulse className="w-2.5 h-2.5" /> Nurse
        </span>
      );
    }
    if (r === 'receptionist') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-[#0B5A54] border border-teal-200">
          <Building2 className="w-2.5 h-2.5" /> Receptionist
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
        <UserCheck className="w-2.5 h-2.5" /> {role}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-200">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Staff Password Assistance Requests
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Verify and reset credentials for hospital clinical & administrative staff.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-[#0B5A54] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {activeSuccess && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{activeSuccess}</span>
            </div>
            <button
              onClick={() => setActiveSuccess(null)}
              className="text-emerald-500 hover:text-emerald-700 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="p-4 sm:px-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                filter === 'resolved'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({requests.filter((r) => r.status === 'Resolved').length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, email, ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
              />
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span>Default Reset:</span>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 focus:outline-none"
                title="Temporary password applied upon clicking Reset"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-700">No Password Reset Requests</p>
              <p className="text-xs text-slate-400 font-medium">
                {filter === 'pending'
                  ? 'All staff password assistance requests have been cleared and resolved.'
                  : 'No tickets match the current filter or search criteria.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'Pending';
              const isResolving = resolvingId === req.id;

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{req.id}
                        </span>
                        {getRoleBadge(req.staffRole)}
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-2.5 h-2.5" /> Action Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-heading">
                          {req.staffName}
                        </h4>
                        <span className="text-xs font-medium text-slate-500 font-mono">
                          {req.staffEmail}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                        <span>Requested: {new Date(req.createdAt).toLocaleString()}</span>
                        {req.resolvedAt && (
                          <span>
                            Resolved: {new Date(req.resolvedAt).toLocaleString()}{' '}
                            {req.resolvedBy ? `by ${req.resolvedBy}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {isPending ? (
                        <button
                          onClick={() => handleResolve(req.id)}
                          disabled={isResolving}
                          className="px-4 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isResolving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Reset & Set Temporary Password</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
                          <span className="text-[10px] font-bold text-emerald-700">Temp Pass:</span>
                          <span className="font-mono font-black text-emerald-900">
                            {req.temporaryPassword || 'CarePulse#2026'}
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(req.temporaryPassword || 'CarePulse#2026', req.id)
                            }
                            className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Copy temporary password"
                          >
                            {copiedId === req.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Resetting updates credentials in PostgreSQL and triggers a security confirmation dispatch.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
