import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { doctorService } from '../../services/doctorService';

interface DoctorLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  doctorName?: string;
  onLeaveUpdated?: () => void;
}

export const DoctorLeaveModal: React.FC<DoctorLeaveModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  onLeaveUpdated,
}) => {
  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [reasonCategory, setReasonCategory] = useState('Personal Leave');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Compute total days count
  const daysCount = React.useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const loadLeaves = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await doctorService.getMyDoctorLeaves(doctorId);
      setLeavesList(data || []);
    } catch (e) {
      console.warn('Error loading leave history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLeaves();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (daysCount <= 0) {
      setErrorMsg('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedReason = customReason.trim()
        ? `${reasonCategory}: ${customReason.trim()}`
        : reasonCategory;

      await doctorService.applyDoctorLeave({
        startDate,
        endDate,
        reason: combinedReason,
      });

      setSuccessMsg('Leave request submitted successfully. It will be reviewed by Hospital Reception.');
      setCustomReason('');
      await loadLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!window.confirm('Are you sure you want to cancel this leave application? Any frozen consultation slots will immediately become bookable again.')) {
      return;
    }

    setCancellingId(leaveId);
    setErrorMsg(null);
    try {
      await doctorService.cancelDoctorLeave(leaveId);
      setSuccessMsg('Leave application cancelled. Affected consultation slots have been un-frozen.');
      await loadLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel leave application');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B5A54] flex items-center justify-center shadow-xs border border-teal-200/80">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  Specialist Leave Application
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#0B5A54] text-[10px] font-black uppercase tracking-wider">
                  {doctorName || 'Doctor Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Apply for multi-day planned absence & track slot freezing status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Leave Application Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
                New Absence Request
              </span>
              <span className="text-xs font-black text-[#0B5A54] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {daysCount} {daysCount === 1 ? 'Day' : 'Days'} Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Start Date (From)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={getToday()}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  End Date (To)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={startDate || getToday()}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Absence Category
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                >
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Medical Emergency">Medical Emergency / Sick Leave</option>
                  <option value="Medical Conference / CME">Medical Conference / CME</option>
                  <option value="Annual Vacation">Annual Vacation</option>
                  <option value="Hospital Assignment">Off-site Clinical Assignment</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Attending Cardiology summit in Chennai"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 text-teal-900 text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
              <span>
                <strong>Approval Workflow:</strong> New leave requests are submitted as <strong>Pending</strong>.
                Consultation slots remain active until approved by hospital reception. Once approved, all slots in the window are automatically frozen.
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || daysCount <= 0}
                className="px-5 py-2.5 bg-[#0B5A54] hover:bg-teal-800 text-white text-xs font-black rounded-xl shadow-md shadow-teal-900/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Leave Request</span>
              </button>
            </div>
          </form>

          {/* Leave History Table / Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Leave Request History
              </h4>
              <button
                type="button"
                onClick={loadLeaves}
                className="text-xs text-[#0B5A54] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading leave applications...</div>
            ) : leavesList.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                No leave requests recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {leavesList.map((leave) => {
                  const status = leave.status || 'Pending';
                  const isPending = status === 'Pending';
                  const isApproved = status === 'Approved';
                  const isRejected = status === 'Rejected';

                  return (
                    <div
                      key={leave.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isApproved
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isPending
                          ? 'bg-amber-50/50 border-amber-200'
                          : isRejected
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 font-heading">
                            {leave.startDate} → {leave.endDate}
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            {leave.daysCount} {leave.daysCount === 1 ? 'day' : 'days'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">
                          {leave.reason || 'Personal Leave'}
                        </p>
                        {isApproved && (
                          <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Consultation slots for these dates are currently frozen.
                          </p>
                        )}
                        {isPending && (
                          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Awaiting receptionist approval. Slots remain bookable until approved.
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
                        {(isPending || isApproved) && (
                          <button
                            type="button"
                            disabled={cancellingId === leave.id}
                            onClick={() => handleCancelLeave(leave.id)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {cancellingId === leave.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3 text-rose-500" />
                            )}
                            <span>Cancel Leave</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
