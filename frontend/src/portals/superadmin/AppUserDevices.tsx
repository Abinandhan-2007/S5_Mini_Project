import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Search,
  RefreshCw,
  Download,
  Globe2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Trash2,
  X,
  Cpu,
  Radio,
  Server,
  AlertTriangle,
  ArrowUpCircle,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminAppDevice, SuperAdminAppDeviceStats } from '../../types/staff';

export const AppUserDevices: React.FC = () => {
  const [devices, setDevices] = useState<SuperAdminAppDevice[]>([]);
  const [stats, setStats] = useState<SuperAdminAppDeviceStats>({
    total_devices: 0,
    android_count: 0,
    ios_count: 0,
    web_count: 0,
    active_24h: 0,
    latest_version: '1.9.29',
    updated_devices_count: 0,
    outdated_devices_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [versionFilter, setVersionFilter] = useState<'ALL' | 'UPDATED' | 'OUTDATED'>('ALL');

  // Inspection Modal
  const [inspectingDevice, setInspectingDevice] = useState<SuperAdminAppDevice | null>(null);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDevices = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await superadminService.getAppDevices({
        platform: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        search: searchQuery.trim() || undefined,
      });
      setDevices(data.devices);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Failed to load patient devices:', err);
      setError(err.message || 'Failed to fetch registered devices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [selectedPlatform]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDevices();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRevoke = async (device: SuperAdminAppDevice) => {
    if (!window.confirm(`Are you sure you want to revoke the session for ${device.device_model} belonging to ${device.patient_name}?`)) {
      return;
    }
    setRevokingId(device.id);
    try {
      await superadminService.deleteAppDevice(device.id);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      setStats((prev) => ({
        ...prev,
        total_devices: Math.max(0, prev.total_devices - 1),
      }));
      setToastMessage(`Session revoked for ${device.device_model}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke device session');
    } finally {
      setRevokingId(null);
    }
  };

  const filteredDevices = devices.filter((device) => {
    if (versionFilter === 'UPDATED') {
      return device.is_up_to_date === true;
    }
    if (versionFilter === 'OUTDATED') {
      return device.is_up_to_date === false;
    }
    return true;
  });

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredDevices, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `carepulse_patient_devices_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToCsv = () => {
    const headers = ['Patient Code', 'Patient Name', 'Phone', 'Email', 'Device Model', 'Manufacturer', 'Platform', 'OS Version', 'App Version', 'Update Status', 'IP Address', 'Last Login'];
    const rows = filteredDevices.map(d => [
      `"${d.patient_code || ''}"`,
      `"${d.patient_name || ''}"`,
      `"${d.patient_phone || ''}"`,
      `"${d.patient_email || ''}"`,
      `"${d.device_model || ''}"`,
      `"${d.manufacturer || ''}"`,
      `"${d.platform || ''}"`,
      `"${d.os_version || ''}"`,
      `"${d.app_version || ''}"`,
      `"${d.is_up_to_date ? 'Updated (Latest)' : 'Outdated (Needs Update)'}"`,
      `"${d.ip_address || ''}"`,
      `"${d.last_login || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `carepulse_patient_devices_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatLastSeen = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const dt = new Date(isoString);
      const diffMs = Date.now() - dt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B5A54] to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/30 text-teal-100 border border-teal-400/30">
              TELEMETRY & SESSIONS
            </span>
            <span className="flex items-center gap-1.5 text-xs text-teal-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Patient App & Device Registry</h1>
          <p className="text-teal-100/90 text-sm mt-1 max-w-2xl">
            Real-time telemetry of phone models, operating systems, network IPs, and authenticated patient accounts actively connected to CarePulse Mobile & Web applications.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDevices(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={exportToCsv}
            disabled={devices.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0B5A54] hover:bg-teal-50 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={exportToJson}
            disabled={devices.length === 0}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Devices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Devices</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54]">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">{stats.total_devices}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Active Sessions
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Logged-in patient hardware profiles</p>
        </div>

        {/* App Version Adoption */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Update Adoption</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">v{stats.latest_version || '1.9.29'}</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200">
              Target
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ✓ {stats.updated_devices_count ?? 0} Updated
            </span>
            <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              ⚠️ {stats.outdated_devices_count ?? 0} Old
            </span>
          </div>
        </div>

        {/* Android Devices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Android Phones</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">{stats.android_count}</span>
            <span className="text-xs font-medium text-slate-500">
              {stats.total_devices > 0 ? `${Math.round((stats.android_count / stats.total_devices) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Samsung, Xiaomi, Pixel, OnePlus</p>
        </div>

        {/* iOS / Apple Devices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Apple iOS Devices</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">{stats.ios_count}</span>
            <span className="text-xs font-medium text-slate-500">
              {stats.total_devices > 0 ? `${Math.round((stats.ios_count / stats.total_devices) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">iPhone & iPad Native/Web builds</p>
        </div>

        {/* Active in last 24 hours */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active in 24h</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">{stats.active_24h}</span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              Recent Logins
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Accessed app within past 24 hours</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, phone, device, IP..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group: Platform & Version */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Version Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            {[
              { id: 'ALL', label: 'All Versions' },
              { id: 'UPDATED', label: `✓ v${stats.latest_version || '1.9.29'}`, count: stats.updated_devices_count },
              { id: 'OUTDATED', label: '⚠️ Needs Update', count: stats.outdated_devices_count },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVersionFilter(tab.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  versionFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    versionFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            {[
              { id: 'ALL', label: 'All OS' },
              { id: 'android', label: 'Android' },
              { id: 'ios', label: 'iOS' },
              { id: 'web', label: 'Web' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPlatform(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPlatform === tab.id
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Devices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 bg-teal-50 rounded-2xl text-[#0B5A54] mb-3 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Loading Patient Phone & Device Telemetry...</p>
            <p className="text-xs text-slate-400 mt-1">Querying active sessions from database</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 bg-rose-50 rounded-2xl text-rose-600 mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={() => fetchDevices(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-3xl text-slate-400 mb-3 border border-slate-100">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-heading">No Device Sessions Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedPlatform !== 'ALL' || versionFilter !== 'ALL'
                ? 'No registered devices match your active search and filter criteria.'
                : 'No patients have logged into the mobile app yet. Once a user logs in, their phone model, OS version, and network details will appear here automatically.'}
            </p>
            {(searchQuery || selectedPlatform !== 'ALL' || versionFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPlatform('ALL');
                  setVersionFilter('ALL');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-50 text-[#0B5A54] hover:bg-teal-100 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Patient Details</th>
                  <th className="py-3.5 px-4">Phone / Device Model</th>
                  <th className="py-3.5 px-4">Operating System</th>
                  <th className="py-3.5 px-4">Network & Version</th>
                  <th className="py-3.5 px-4">Push Notifications</th>
                  <th className="py-3.5 px-4">Last Login Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDevices.map((dev) => {
                  const isAndroid = dev.platform.toLowerCase().includes('android');
                  const isIos = dev.platform.toLowerCase().includes('ios');

                  return (
                    <tr
                      key={dev.id}
                      className="hover:bg-teal-50/20 transition-colors group"
                    >
                      {/* Patient Details */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs border border-teal-200 overflow-hidden">
                            {dev.patient_avatar ? (
                              <img src={dev.patient_avatar} alt={dev.patient_name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{(dev.patient_name || 'P').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                                {dev.patient_name}
                              </span>
                              {dev.patient_code && dev.patient_code !== 'N/A' && (
                                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-teal-50 text-[#0B5A54] border border-teal-200">
                                  {dev.patient_code}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {dev.patient_phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {dev.patient_phone}
                                </span>
                              )}
                              {dev.patient_email && (
                                <span className="hidden sm:flex items-center gap-1 text-slate-400 truncate max-w-[150px]" title={dev.patient_email}>
                                  <Mail className="w-3 h-3" />
                                  {dev.patient_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone / Device Model */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isAndroid
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : isIos
                              ? 'bg-sky-50 text-sky-600 border border-sky-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{dev.device_model}</div>
                            <div className="text-[11px] text-slate-400 capitalize">
                              Brand: <span className="font-medium text-slate-600">{dev.manufacturer || 'Universal'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Operating System */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isAndroid ? 'bg-emerald-500' : isIos ? 'bg-sky-500' : 'bg-slate-400'
                          }`} />
                          <span>{dev.os_version || dev.platform}</span>
                        </div>
                      </td>

                      {/* Network IP & Build / Version Status */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-700 flex items-center gap-1">
                          <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dev.ip_address || '127.0.0.1 (Local)'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {dev.is_up_to_date ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              v{dev.app_version || stats.latest_version} (Latest)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              v{dev.app_version || 'Old'} (Update Required)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* FCM Push Notifications */}
                      <td className="py-3.5 px-4">
                        {dev.has_fcm ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Web / Inactive
                          </span>
                        )}
                      </td>

                      {/* Last Login Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {formatLastSeen(dev.last_login)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dev.last_login ? new Date(dev.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingDevice(dev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B5A54] hover:bg-teal-50 transition-colors cursor-pointer"
                            title="Inspect Technical Telemetry"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(dev)}
                            disabled={revokingId === dev.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Revoke Device Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Telemetry Modal */}
      {inspectingDevice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B5A54] to-teal-800 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading">{inspectingDevice.device_model}</h3>
                  <p className="text-xs text-teal-100">Telemetry Specs for {inspectingDevice.patient_name}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingDevice(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Account Details Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0B5A54]" />
                  Authenticated User
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Full Name</span>
                    <span className="font-bold text-slate-900">{inspectingDevice.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Patient Code</span>
                    <span className="font-mono font-bold text-[#0B5A54]">{inspectingDevice.patient_code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <span className="font-mono text-slate-700">{inspectingDevice.patient_phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email</span>
                    <span className="text-slate-700 truncate block">{inspectingDevice.patient_email || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Hardware & OS Telemetry Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#0B5A54]" />
                  Device Specifications
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Manufacturer / OEM</span>
                    <span className="font-semibold text-slate-800">{inspectingDevice.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Device Model</span>
                    <span className="font-semibold text-slate-800">{inspectingDevice.device_model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Platform</span>
                    <span className="font-semibold text-slate-800 capitalize">{inspectingDevice.platform}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">OS Version</span>
                    <span className="font-semibold text-slate-800">{inspectingDevice.os_version || 'Universal'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Installed Version</span>
                    <span className="font-mono font-semibold text-slate-800">v{inspectingDevice.app_version || '1.0.0'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target APK Release</span>
                    <span className="font-mono font-semibold text-purple-700">v{inspectingDevice.latest_version || stats.latest_version || '1.9.29'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Network Client IP</span>
                    <span className="font-mono font-semibold text-slate-800">{inspectingDevice.ip_address || '127.0.0.1'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Update Status</span>
                    {inspectingDevice.is_up_to_date ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Up to date
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs v{inspectingDevice.latest_version || stats.latest_version || '1.9.29'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Unique Session UUID */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#0B5A54]" />
                  Installation & Cloud Tokens
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Installation Device ID</span>
                    <code className="text-[11px] bg-white px-2 py-1 rounded-md border border-slate-200 font-mono text-slate-700 block break-all">
                      {inspectingDevice.device_id || inspectingDevice.id}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-400 block">FCM Push Status</span>
                    <span className="font-medium text-slate-700">
                      {inspectingDevice.has_fcm ? '✅ Registered for FCM Background Push Alerts' : '⚠️ No Push Token Registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">First Recorded</span>
                    <span className="text-slate-700">
                      {inspectingDevice.created_at ? new Date(inspectingDevice.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Last Active Session</span>
                    <span className="text-slate-700 font-medium">
                      {inspectingDevice.last_login ? new Date(inspectingDevice.last_login).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectingDevice(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const dev = inspectingDevice;
                  setInspectingDevice(null);
                  handleRevoke(dev);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppUserDevices;
