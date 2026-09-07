import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  AlertCircle,
  Activity,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminAuditEvent, SuperAdminHospital } from '../../types/staff';

const ACTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'HOSPITAL_CREATED', label: 'Facility Provisioned' },
  { value: 'HOSPITAL_DELETED', label: 'Facility Deprovisioned' },
  { value: 'HOSPITAL_LIFECYCLE_CHANGED', label: 'Lifecycle State Changed' },
  { value: 'ADMIN_APPOINTED', label: 'Admin Appointed' },
  { value: 'ADMIN_ACTIVATED', label: 'Admin Activated' },
  { value: 'ADMIN_DEACTIVATED', label: 'Admin Deactivated' },
  { value: 'ADMIN_DELETED', label: 'Admin Removed' },
];

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<SuperAdminAuditEvent[]>([]);
  const [hospitals, setHospitals] = useState<SuperAdminHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedHospital, setSelectedHospital] = useState('ALL');

  // Expanded rows for inspecting diffs
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const fetchAuditData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [fetchedLogs, fetchedHospitals] = await Promise.all([
        superadminService.getAuditLogs({
          action_type: selectedAction !== 'ALL' ? selectedAction : undefined,
          hospital_code: selectedHospital !== 'ALL' ? selectedHospital : undefined,
          search: searchQuery.trim() || undefined,
        }),
        superadminService.getHospitals().catch(() => []),
      ]);

      setLogs(fetchedLogs);
      if (fetchedHospitals.length > 0) {
        setHospitals(fetchedHospitals);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to fetch platform audit log records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedAction, selectedHospital]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `carepulse-platform-audit-log-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'HOSPITAL_CREATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Facility Created
          </span>
        );
      case 'HOSPITAL_DELETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Facility Deleted
          </span>
        );
      case 'HOSPITAL_LIFECYCLE_CHANGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Lifecycle Changed
          </span>
        );
      case 'ADMIN_APPOINTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Admin Appointed
          </span>
        );
      case 'ADMIN_ACTIVATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-[#0B5A54] border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            Admin Activated
          </span>
        );
      case 'ADMIN_DEACTIVATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Admin Deactivated
          </span>
        );
      case 'ADMIN_DELETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Admin Removed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {actionType}
          </span>
        );
    }
  };

  const formatIsoDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Light themed with Mission Control Telemetry */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-teal-50 text-[#0B5A54] border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0B5A54]" />
              COMPLIANCE AUDIT TRAIL
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
              IMMUTABLE RECORD
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Append-only chronological audit log of all platform governance actions, infrastructure mutations, administrator appointments, and facility state transitions across CarePulse.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => fetchAuditData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
            title="Refresh audit feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0B5A54]' : 'text-slate-500'}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={exportToJson}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B5A54] hover:bg-[#084540] text-white shadow-sm transition-colors disabled:opacity-50"
            title="Export audit logs to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Query Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, name, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Action Type */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hospital Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Facilities</option>
              {hospitals.map((h) => (
                <option key={h.hospital_code} value={h.hospital_code}>
                  {h.hospital_code} — {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-slate-400 px-2">
            Showing <strong className="text-slate-700">{logs.length}</strong> events
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error.toLowerCase().includes('token') || error.toLowerCase().includes('authentication') ? (
              <a
                href="/staff/superadmin"
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold font-mono text-[11px] transition-colors shadow-2xs"
              >
                Re-Authenticate &rarr;
              </a>
            ) : (
              <button
                onClick={() => fetchAuditData(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold font-mono text-[11px] transition-colors"
              >
                Retry Sync
              </button>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B5A54]" />
            <p className="text-xs font-mono">Loading platform audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-[#0B5A54]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Audit Events Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedAction !== 'ALL' || selectedHospital !== 'ALL'
                ? 'No recorded events match the selected search query or filters. Try clearing your search parameters.'
                : 'Platform events will be immutably recorded here whenever facilities are provisioned, administrators appointed, or lifecycle states adjusted.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-48">Timestamp (UTC)</th>
                  <th className="py-3 px-4 w-32">Actor</th>
                  <th className="py-3 px-4 w-44">Action</th>
                  <th className="py-3 px-4 w-52">Target Entity</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4 w-24 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((event, idx) => {
                  const isExpanded = expandedLogIds.has(event.id);
                  const hasStateDiff = !!(event.before_state || event.after_state || event.reason);

                  return (
                    <React.Fragment key={event.id || idx}>
                      <tr
                        onClick={() => hasStateDiff && toggleExpand(event.id)}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          hasStateDiff ? 'cursor-pointer' : ''
                        } ${isExpanded ? 'bg-teal-50/30' : ''}`}
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400">
                          {logs.length - idx}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatIsoDate(event.timestamp)}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {event.actor_code || 'SA101'}
                            </span>
                            <span className="text-slate-600 text-[11px] truncate max-w-[100px]" title={event.actor_name}>
                              {event.actor_name || 'SuperAdmin'}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(event.action_type)}
                        </td>

                        {/* Target Entity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#0B5A54] border border-teal-200">
                              {event.target_code || event.target_id || 'N/A'}
                            </span>
                            <span className="font-medium text-slate-800 truncate max-w-[140px]" title={event.target_name}>
                              {event.target_name || 'Facility'}
                            </span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 leading-relaxed font-normal">
                            {event.description}
                          </div>
                          {event.reason && (
                            <div className="mt-1 text-[11px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/70 inline-block">
                              <strong>Justification:</strong> {event.reason}
                            </div>
                          )}
                        </td>

                        {/* Expand Trigger */}
                        <td className="py-3.5 px-4 text-right">
                          {hasStateDiff ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(event.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-medium text-slate-600 hover:text-[#0B5A54] hover:bg-slate-100 transition-colors"
                            >
                              <span>{isExpanded ? 'Hide' : 'Diff'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable State Diff Viewer */}
                      {isExpanded && hasStateDiff && (
                        <tr className="bg-slate-50/90 border-y border-slate-200">
                          <td colSpan={7} className="p-4 pl-12">
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-[#0B5A54]" />
                                  Audit Telemetry & State Snapshot
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  Event ID: {event.id}
                                </span>
                              </div>

                              {event.reason && (
                                <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900">
                                  <span className="font-bold font-mono">REASON / JUSTIFICATION: </span>
                                  <span>{event.reason}</span>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                {/* Before State */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                                    Before State
                                  </div>
                                  <div className="bg-slate-900 text-slate-100 p-3 rounded-md text-[11px] overflow-x-auto max-h-48">
                                    {event.before_state ? (
                                      <pre>{JSON.stringify(event.before_state, null, 2)}</pre>
                                    ) : (
                                      <span className="text-slate-500 italic">None (Entity created)</span>
                                    )}
                                  </div>
                                </div>

                                {/* After State */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-bold text-[#0B5A54] uppercase flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    After State
                                  </div>
                                  <div className="bg-slate-900 text-slate-100 p-3 rounded-md text-[11px] overflow-x-auto max-h-48">
                                    {event.after_state ? (
                                      <pre>{JSON.stringify(event.after_state, null, 2)}</pre>
                                    ) : (
                                      <span className="text-slate-500 italic">None (Entity deprovisioned)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
