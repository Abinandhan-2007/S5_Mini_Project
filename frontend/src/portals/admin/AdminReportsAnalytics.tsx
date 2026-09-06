import React, { useState, useRef, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  Clock,
  Activity,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  TrendingUp,
  MoreHorizontal,
  Calendar,
  X,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminReportsAnalyticsProps {
  onShowToast: (msg: string) => void;
}

type DateRangeOption = '7d' | '30d' | 'quarter' | 'custom';
type SeriesOption = 'all' | 'completed' | 'cancelled';

// KPI data keyed by date range
const kpiData: Record<DateRangeOption, { consultations: string; consultChange: string; completionRate: string; completedSlots: string; waitTime: string; waitChange: string; cancellationRate: string; cancelSlots: string }> = {
  '7d':     { consultations: '341',   consultChange: '+8.4%',  completionRate: '95.2%', completedSlots: '325 slots fulfilled',    waitTime: '11.8m', waitChange: '-1.2m', cancellationRate: '1.6%', cancelSlots: '6 slots reallocated' },
  '30d':    { consultations: '1,482', consultChange: '+14.2%', completionRate: '94.6%', completedSlots: '1,402 slots fulfilled',  waitTime: '12.4m', waitChange: '-2.1m', cancellationRate: '2.2%', cancelSlots: '32 slots reallocated' },
  'quarter':{ consultations: '4,210', consultChange: '+11.8%', completionRate: '93.9%', completedSlots: '3,953 slots fulfilled',  waitTime: '13.1m', waitChange: '-3.0m', cancellationRate: '2.8%', cancelSlots: '118 slots reallocated' },
  'custom': { consultations: '—',     consultChange: 'Custom', completionRate: '—',     completedSlots: 'Custom date range',      waitTime: '—',     waitChange: 'Custom', cancellationRate: '—',    cancelSlots: 'Custom date range' },
};

// Chart trend data keyed by date range
const trendDataByRange: Record<DateRangeOption, { all: { date: string; value: number; sub: string }[]; completed: { date: string; value: number; sub: string }[]; cancelled: { date: string; value: number; sub: string }[] }> = {
  '7d': {
    all:       [ { date: 'Mon', value: 38, sub: '36 Completed • 2 Cancelled' }, { date: 'Tue', value: 52, sub: '49 Completed • 3 Cancelled' }, { date: 'Wed', value: 61, sub: '58 Completed • 2 Cancelled' }, { date: 'Thu', value: 45, sub: '43 Completed • 2 Cancelled' }, { date: 'Fri', value: 58, sub: '55 Completed • 3 Cancelled' }, { date: 'Sat', value: 34, sub: '33 Completed • 1 Cancelled' }, { date: 'Sun', value: 21, sub: '20 Completed • 1 Cancelled' } ],
    completed: [ { date: 'Mon', value: 36, sub: '94.7% Fulfillment' }, { date: 'Tue', value: 49, sub: '94.2% Fulfillment' }, { date: 'Wed', value: 58, sub: '95.1% Fulfillment' }, { date: 'Thu', value: 43, sub: '95.6% Fulfillment' }, { date: 'Fri', value: 55, sub: '94.8% Fulfillment' }, { date: 'Sat', value: 33, sub: '97.1% Fulfillment' }, { date: 'Sun', value: 20, sub: '95.2% Fulfillment' } ],
    cancelled: [ { date: 'Mon', value: 2, sub: 'Reallocated' }, { date: 'Tue', value: 3, sub: 'Rescheduled' }, { date: 'Wed', value: 2, sub: 'Walk-in assigned' }, { date: 'Thu', value: 2, sub: 'Slot re-booked' }, { date: 'Fri', value: 3, sub: 'Patient conflict' }, { date: 'Sat', value: 1, sub: 'Slot re-booked' }, { date: 'Sun', value: 1, sub: 'Reallocated' } ],
  },
  '30d': {
    all:       [ { date: 'Aug 01', value: 42, sub: '38 Completed • 2 Cancelled' }, { date: 'Aug 05', value: 58, sub: '54 Completed • 3 Cancelled' }, { date: 'Aug 10', value: 65, sub: '61 Completed • 2 Cancelled' }, { date: 'Aug 15', value: 84, sub: '80 Completed • 3 Cancelled' }, { date: 'Aug 20', value: 76, sub: '73 Completed • 1 Cancelled' }, { date: 'Aug 25', value: 92, sub: '88 Completed • 2 Cancelled' }, { date: 'Aug 30', value: 104, sub: '99 Completed • 3 Cancelled' } ],
    completed: [ { date: 'Aug 01', value: 38, sub: '90.5% Fulfillment' }, { date: 'Aug 05', value: 54, sub: '93.1% Fulfillment' }, { date: 'Aug 10', value: 61, sub: '93.8% Fulfillment' }, { date: 'Aug 15', value: 80, sub: '95.2% Fulfillment' }, { date: 'Aug 20', value: 73, sub: '96.0% Fulfillment' }, { date: 'Aug 25', value: 88, sub: '95.6% Fulfillment' }, { date: 'Aug 30', value: 99, sub: '95.2% Fulfillment' } ],
    cancelled: [ { date: 'Aug 01', value: 2, sub: 'Reallocated' }, { date: 'Aug 05', value: 3, sub: 'Rescheduled' }, { date: 'Aug 10', value: 2, sub: 'Walk-in assigned' }, { date: 'Aug 15', value: 3, sub: 'Doctor delay' }, { date: 'Aug 20', value: 1, sub: 'Patient conflict' }, { date: 'Aug 25', value: 2, sub: 'Slot re-booked' }, { date: 'Aug 30', value: 3, sub: 'Reallocated' } ],
  },
  'quarter': {
    all:       [ { date: 'Jun W1', value: 280, sub: '268 Completed • 9 Cancelled' }, { date: 'Jun W3', value: 320, sub: '306 Completed • 11 Cancelled' }, { date: 'Jul W1', value: 370, sub: '352 Completed • 13 Cancelled' }, { date: 'Jul W3', value: 410, sub: '392 Completed • 14 Cancelled' }, { date: 'Aug W1', value: 440, sub: '420 Completed • 15 Cancelled' }, { date: 'Aug W3', value: 480, sub: '458 Completed • 16 Cancelled' }, { date: 'Sep W1', value: 520, sub: '498 Completed • 16 Cancelled' } ],
    completed: [ { date: 'Jun W1', value: 268, sub: '95.7% Fulfillment' }, { date: 'Jun W3', value: 306, sub: '95.6% Fulfillment' }, { date: 'Jul W1', value: 352, sub: '95.1% Fulfillment' }, { date: 'Jul W3', value: 392, sub: '95.6% Fulfillment' }, { date: 'Aug W1', value: 420, sub: '95.5% Fulfillment' }, { date: 'Aug W3', value: 458, sub: '95.4% Fulfillment' }, { date: 'Sep W1', value: 498, sub: '95.8% Fulfillment' } ],
    cancelled: [ { date: 'Jun W1', value: 9, sub: 'Reallocated' }, { date: 'Jun W3', value: 11, sub: 'Rescheduled' }, { date: 'Jul W1', value: 13, sub: 'Walk-in assigned' }, { date: 'Jul W3', value: 14, sub: 'Doctor delay' }, { date: 'Aug W1', value: 15, sub: 'Patient conflict' }, { date: 'Aug W3', value: 16, sub: 'Slot re-booked' }, { date: 'Sep W1', value: 16, sub: 'Reallocated' } ],
  },
  'custom': {
    all:       [ { date: 'Day 1', value: 40, sub: '38 Completed • 2 Cancelled' }, { date: 'Day 2', value: 55, sub: '52 Completed • 3 Cancelled' }, { date: 'Day 3', value: 70, sub: '67 Completed • 2 Cancelled' }, { date: 'Day 4', value: 60, sub: '57 Completed • 2 Cancelled' }, { date: 'Day 5', value: 80, sub: '76 Completed • 3 Cancelled' } ],
    completed: [ { date: 'Day 1', value: 38, sub: '95.0% Fulfillment' }, { date: 'Day 2', value: 52, sub: '94.5% Fulfillment' }, { date: 'Day 3', value: 67, sub: '95.7% Fulfillment' }, { date: 'Day 4', value: 57, sub: '95.0% Fulfillment' }, { date: 'Day 5', value: 76, sub: '95.0% Fulfillment' } ],
    cancelled: [ { date: 'Day 1', value: 2, sub: 'Reallocated' }, { date: 'Day 2', value: 3, sub: 'Rescheduled' }, { date: 'Day 3', value: 2, sub: 'Walk-in assigned' }, { date: 'Day 4', value: 2, sub: 'Slot re-booked' }, { date: 'Day 5', value: 3, sub: 'Patient conflict' } ],
  },
};

export const AdminReportsAnalytics: React.FC<AdminReportsAnalyticsProps> = ({ onShowToast }) => {
  const departments = useStaffStore((s) => s.departments);

  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const calendarRef = useRef<HTMLDivElement>(null);

  const [activeSeries, setActiveSeries] = useState<SeriesOption>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ day: string; time: string; val: number; count: number } | null>(null);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const storeDoctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);

  const activeKpi = kpiData[dateRange];

  const handleRangeClick = (range: DateRangeOption) => {
    setDateRange(range);
    if (range === 'custom') {
      setIsCalendarOpen(true);
    } else {
      setIsCalendarOpen(false);
    }
  };

  const handleApplyCustom = () => {
    setIsCalendarOpen(false);
    onShowToast(`Custom range applied: ${customFrom || 'Start'} → ${customTo || 'End'}`);
  };

  // ── Hero Appointment Volume Dataset (driven by dateRange) ──
  const trendDataMap = trendDataByRange[dateRange];

  const currentPoints = trendDataMap[activeSeries];
  const maxVal = Math.max(...currentPoints.map((p) => p.value));

  // Compute SVG smooth curve path
  const svgWidth = 650;
  const svgHeight = 220;
  const paddingX = 35;
  const paddingY = 30;

  const points = currentPoints.map((pt, index) => {
    const x = paddingX + (index / (currentPoints.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = maxVal === 0 ? 0 : pt.value / maxVal;
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y, ...pt };
  });

  const generateSvgPath = () => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = generateSvgPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  // ── Peak Hours Heatmap Dataset (7 Days x 5 Hourly Slots) ──
  const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmapHours = [
    { label: '09:00 - 11:00 AM', short: '09 - 11 AM' },
    { label: '11:00 - 01:00 PM', short: '11 - 01 PM' },
    { label: '02:00 - 04:00 PM', short: '02 - 04 PM' },
    { label: '04:00 - 06:00 PM', short: '04 - 06 PM' },
    { label: '06:00 - 08:00 PM', short: '06 - 08 PM' },
  ];

  const heatmapMatrix: Record<string, { pct: number; count: number }[]> = {
    Mon: [
      { pct: 85, count: 68 },
      { pct: 95, count: 76 },
      { pct: 70, count: 56 },
      { pct: 60, count: 48 },
      { pct: 45, count: 36 },
    ],
    Tue: [
      { pct: 90, count: 72 },
      { pct: 100, count: 80 },
      { pct: 80, count: 64 },
      { pct: 75, count: 60 },
      { pct: 50, count: 40 },
    ],
    Wed: [
      { pct: 75, count: 60 },
      { pct: 88, count: 70 },
      { pct: 65, count: 52 },
      { pct: 55, count: 44 },
      { pct: 40, count: 32 },
    ],
    Thu: [
      { pct: 92, count: 74 },
      { pct: 98, count: 78 },
      { pct: 85, count: 68 },
      { pct: 78, count: 62 },
      { pct: 55, count: 44 },
    ],
    Fri: [
      { pct: 98, count: 78 },
      { pct: 96, count: 77 },
      { pct: 88, count: 70 },
      { pct: 82, count: 66 },
      { pct: 60, count: 48 },
    ],
    Sat: [
      { pct: 60, count: 48 },
      { pct: 72, count: 58 },
      { pct: 45, count: 36 },
      { pct: 30, count: 24 },
      { pct: 20, count: 16 },
    ],
    Sun: [
      { pct: 35, count: 28 },
      { pct: 40, count: 32 },
      { pct: 25, count: 20 },
      { pct: 15, count: 12 },
      { pct: 10, count: 8 },
    ],
  };

  // ── Doctor Performance Data (Derived from real doctors and tokens) ──
  const doctorPerformance = useMemo(() => {
    if (storeDoctors && storeDoctors.length > 0) {
      return storeDoctors.map((doc, idx) => {
        const docTokens = (tokens || []).filter((t) => t.doctorId === doc.id);
        const completedCount = docTokens.filter((t) => t.status === 'Completed').length;
        const totalAppointments = docTokens.length || (idx + 1) * 8;
        const completionRate = docTokens.length > 0
          ? Number(((completedCount / docTokens.length) * 100).toFixed(1))
          : 98.0;

        return {
          id: doc.id,
          name: doc.name,
          department: doc.department || doc.specialty || 'General Medicine',
          appointments: totalAppointments,
          completionRate: completionRate,
          cancellationRate: Number((100 - completionRate).toFixed(1)),
          rating: (doc as any).rating || 4.9,
          reviewsCount: (doc as any).reviewsCount || 12,
          status: doc.isAvailable ? 'Active Duty' : 'Away',
        };
      });
    }
    return [];
  }, [storeDoctors, tokens]);

  const filteredDoctors = doctorPerformance.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(doctorSearchQuery.toLowerCase());
    const matchesDept =
      selectedDeptFilter === 'all' || doc.department.toLowerCase() === selectedDeptFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'DoctorName,Department,AppointmentsHandled,CompletionRate,CancellationRate,Rating\n' +
      doctorPerformance
        .map(
          (d) =>
            `"${d.name}","${d.department}",${d.appointments},"${d.completionRate}%","${d.cancellationRate}%",${d.rating}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `carepulse_analytics_${dateRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
    onShowToast('CSV Performance & Analytics report downloaded successfully!');
  };

  const handleExportPDF = () => {
    setIsExportModalOpen(false);
    onShowToast('Generating executive CarePulse Hospital Analytics PDF report...');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ══════════════════════════════════════════════════════════════════
          1. PAGE HEADER & RANGE FILTER CONTROLS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading tracking-tight">
              Reports & Analytics
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Executive Intelligence</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time insights into appointment volume dynamics, arrival heatmaps, and physician throughput.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Segmented Date Range Selector */}
          <div className="relative flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
            {(['7d', '30d', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleRangeClick(range)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'Quarter'}
              </button>
            ))}

            {/* Custom Date button */}
            <button
              onClick={() => handleRangeClick('custom')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === 'custom'
                  ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {dateRange === 'custom' && customFrom && customTo
                ? `${customFrom} → ${customTo}`
                : 'Custom Date'}
            </button>

            {/* Inline Calendar Picker Dropdown */}
            {isCalendarOpen && (
              <div
                ref={calendarRef}
                className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 w-72 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black text-slate-900">Custom Date Range</p>
                  <button
                    onClick={() => { setIsCalendarOpen(false); if (!customFrom || !customTo) setDateRange('30d'); }}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo || undefined}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/30 bg-slate-50 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">To</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom || undefined}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/30 bg-slate-50 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApplyCustom}
                    disabled={!customFrom || !customTo}
                    className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-[#0B5A54] hover:bg-[#084540] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Report Action */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. EXECUTIVE KPI ROW (4 STAT CARDS)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Gross Consultations */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{activeKpi.consultChange}</span>
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400">Total Consultations</p>
            <h3 className="text-3xl font-black text-slate-900 font-heading tracking-tight mt-0.5">
              {activeKpi.consultations}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Across all 6 clinical departments</p>
          </div>
        </div>

        {/* Card 2: Completion Success Rate */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Optimal
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400">Completion Success Rate</p>
            <h3 className="text-3xl font-black text-slate-900 font-heading tracking-tight mt-0.5">
              {activeKpi.completionRate}
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">{activeKpi.completedSlots}</p>
          </div>
        </div>

        {/* Card 3: Average Wait Time */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>{activeKpi.waitChange}</span>
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400">Avg. Patient Wait Time</p>
            <h3 className="text-3xl font-black text-slate-900 font-heading tracking-tight mt-0.5">
              {activeKpi.waitTime}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Target benchmark: &lt;15 mins</p>
          </div>
        </div>

        {/* Card 4: Cancellation Slot Rate */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Controlled
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400">Cancellation Slot Rate</p>
            <h3 className="text-3xl font-black text-slate-900 font-heading tracking-tight mt-0.5">
              {activeKpi.cancellationRate}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{activeKpi.cancelSlots}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. TWO-COLUMN POWER SECTION:
             LEFT: HERO APPOINTMENT VOLUME CHART (6 COLS)
             RIGHT: PEAK CLINIC HOURS HEATMAP (6 COLS)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Appointment & Volume Dynamics (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Appointment & Volume Dynamics
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Continuous volume trajectory across the active window.
              </p>
            </div>

            {/* Series Toggle Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold shadow-2xs self-start sm:self-auto">
              {(['all', 'completed', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSeries(s)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${activeSeries === s
                      ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth SVG Area Chart */}
          <div className="relative pt-2">
            {hoveredTrendIdx !== null && (
              <div
                className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs shadow-xl border border-slate-700 animate-in fade-in zoom-in-95"
                style={{
                  left: `${(hoveredTrendIdx / (currentPoints.length - 1)) * 88 + 6}%`,
                  top: '20%',
                }}
              >
                <p className="font-bold text-slate-300 text-[10px]">
                  {currentPoints[hoveredTrendIdx].date}
                </p>
                <p className="font-black text-teal-300 text-sm">
                  {currentPoints[hoveredTrendIdx].value} Appointments
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {currentPoints[hoveredTrendIdx].sub}
                </p>
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 sm:h-52 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartHeroTealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B5A54" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0B5A54" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#F8FAFC" strokeWidth="1" />
              <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="#F1F5F9" strokeWidth="1" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#E2E8F0" strokeWidth="1" />

              {/* Area Fill */}
              <path d={areaPath} fill="url(#chartHeroTealGrad)" />

              {/* Smooth Curve Line */}
              <path d={linePath} fill="none" stroke="#0B5A54" strokeWidth="3" strokeLinecap="round" />

              {/* Points */}
              {points.map((pt, i) => (
                <g
                  key={pt.date}
                  onMouseEnter={() => setHoveredTrendIdx(i)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredTrendIdx === i ? 6 : 4}
                    fill="#ffffff"
                    stroke="#0B5A54"
                    strokeWidth={hoveredTrendIdx === i ? 3 : 2}
                    className="transition-all duration-200 shadow-sm"
                  />
                </g>
              ))}
            </svg>

            {/* X-Axis */}
            <div className="flex items-center justify-between px-6 pt-2 text-[11px] font-bold text-slate-400 border-t border-slate-100">
              {currentPoints.map((pt) => (
                <span key={pt.date} className="hover:text-slate-700 transition-colors">
                  {pt.date}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Benchmarks */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Peak Day</p>
              <p className="text-xs font-black text-slate-900 mt-0.5">Tuesdays (104)</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Daily Avg</p>
              <p className="text-xs font-black text-[#0B5A54] mt-0.5">49.4 slots/day</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400">Fulfillment</p>
              <p className="text-xs font-black text-emerald-700 mt-0.5">94.6% Success</p>
            </div>
          </div>
        </div>

        {/* Right: Peak Clinic Hours Heatmap (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Peak Clinic Hours Heatmap
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Hourly appointment density matrix across weekdays & weekends.
              </p>
            </div>
            <button
              onClick={() => onShowToast('Heatmap view updated')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* 7-Day x Hourly Heatmap Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 text-left font-mono w-12">Day</th>
                  {heatmapHours.map((h) => (
                    <th key={h.label} className="py-2.5 px-1 font-bold text-[10px]">
                      {h.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {heatmapDays.map((day) => {
                  const values = heatmapMatrix[day];

                  return (
                    <tr key={day} className="group">
                      <td className="py-2 text-left font-black text-slate-800 font-mono text-xs">{day}</td>
                      {values.map((item, idx) => {
                        // 5-Tier Intensity Scale
                        let cellStyle = 'bg-slate-50 text-slate-400 border border-slate-200/50';
                        if (item.pct >= 95) {
                          cellStyle = 'bg-[#0B5A54] text-white font-black shadow-xs ring-1 ring-[#0B5A54]/30 border-[#063935]';
                        } else if (item.pct >= 80) {
                          cellStyle = 'bg-teal-700 text-white font-bold border-teal-800 shadow-2xs';
                        } else if (item.pct >= 60) {
                          cellStyle = 'bg-teal-200/90 text-teal-950 font-bold border-teal-300';
                        } else if (item.pct >= 35) {
                          cellStyle = 'bg-teal-100/80 text-teal-900 border-teal-200/80';
                        } else {
                          cellStyle = 'bg-teal-50/60 text-teal-800 border-teal-100/60';
                        }

                        return (
                          <td key={idx} className="py-1 px-1">
                            <div
                              onMouseEnter={() =>
                                setHoveredHeatCell({
                                  day,
                                  time: heatmapHours[idx].label,
                                  val: item.pct,
                                  count: item.count,
                                })
                              }
                              onMouseLeave={() => setHoveredHeatCell(null)}
                              className={`h-8 flex items-center justify-center rounded-xl text-xs font-mono transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer ${cellStyle}`}
                            >
                              <span>{item.pct}%</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Heatmap Legend & Tooltip Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-500">
            {hoveredHeatCell ? (
              <span className="text-[11px] text-[#0B5A54] font-black animate-in fade-in">
                {hoveredHeatCell.day} ({hoveredHeatCell.time}): <strong>{hoveredHeatCell.val}%</strong> ({hoveredHeatCell.count} patients)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Hover for slot queue density</span>
            )}

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-400">&lt;35%</span>
              <span className="w-3.5 h-2.5 rounded-sm bg-teal-50 border border-teal-200" />
              <span className="w-3.5 h-2.5 rounded-sm bg-teal-100" />
              <span className="w-3.5 h-2.5 rounded-sm bg-teal-200" />
              <span className="w-3.5 h-2.5 rounded-sm bg-teal-700" />
              <span className="w-3.5 h-2.5 rounded-sm bg-[#0B5A54]" />
              <span className="text-slate-900 font-bold">95%+ Peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. FULL-WIDTH DOCTOR PERFORMANCE & STAFF OVERVIEW TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Doctor Performance Overview
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Individual physician throughput, completion rates, cancellation logs, and patient satisfaction ratings.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Department Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer shadow-2xs"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Physician Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={doctorSearchQuery}
                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                placeholder="Search physician or specialty..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Clean Executive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Physician</th>
                <th className="py-3 px-4">Specialty Wing</th>
                <th className="py-3 px-4 text-center">Consultations Handled</th>
                <th className="py-3 px-4">Completion Rate</th>
                <th className="py-3 px-4 text-center">Cancellation Rate</th>
                <th className="py-3 px-4 text-right">Avg. Patient Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#0B5A54]" />
                    <p className="font-semibold">No physician performance records found</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Records will appear as consultations occur</p>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Physician Avatar & Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-xs font-heading shadow-xs">
                          {doc.name.replace('Dr. ', '').charAt(0)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{doc.status}</p>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-4 px-4">
                    <span className="text-[11px] font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
                      {doc.department}
                    </span>
                  </td>

                  {/* Appointments Handled */}
                  <td className="py-4 px-4 text-center">
                    <span className="font-black text-slate-900">{doc.appointments}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">consultations</span>
                  </td>

                  {/* Completion Rate Inline Bar */}
                  <td className="py-4 px-4">
                    <div className="space-y-1 w-40">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-[#0B5A54]">{doc.completionRate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0B5A54] h-full rounded-full"
                          style={{ width: `${doc.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Cancellation Rate */}
                  <td className="py-4 px-4 text-center">
                    <span className="text-slate-600 font-bold">{doc.cancellationRate}%</span>
                  </td>

                  {/* Rating */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-black text-slate-900 text-sm">{doc.rating}</span>
                      <span className="text-[10px] text-slate-400">({doc.reviewsCount} reviews)</span>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between text-xs font-bold text-slate-400 border-t border-slate-100">
          <span>Showing {filteredDoctors.length} of {doctorPerformance.length} physicians</span>
          <button
            onClick={() => onShowToast('All physician clinical logs active')}
            className="text-[#0B5A54] hover:underline cursor-pointer font-black"
          >
            View All Clinical Records
          </button>
        </div>
      </div>

      {/* ── Export Report Modal ── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">
                Export Executive Report
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Choose your preferred report format for the <strong>{dateRange.toUpperCase()}</strong> timeframe.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleExportCSV}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 text-left flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-[#0B5A54] flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">CSV Data Export</p>
                  <p className="text-[10px] text-slate-500 font-medium">Raw metrics & physician logs</p>
                </div>
              </button>

              <button
                onClick={handleExportPDF}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 text-left flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-[#0B5A54] flex items-center justify-center shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">Executive PDF Brief</p>
                  <p className="text-[10px] text-slate-500 font-medium">Formatted charts & KPI summaries</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsAnalytics;
