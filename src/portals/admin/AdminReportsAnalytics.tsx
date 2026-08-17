import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  TrendingUp,
  PieChart,
  Stethoscope,
} from 'lucide-react';

interface AdminReportsAnalyticsProps {
  onShowToast: (msg: string) => void;
}

export const AdminReportsAnalytics: React.FC<AdminReportsAnalyticsProps> = ({ onShowToast }) => {
  const [reportPeriod, setReportPeriod] = useState<'30days' | '90days' | 'year'>('30days');

  // Workload dataset
  const doctorWorkloadData = [
    { name: 'Dr. Olivia Wilson', specialty: 'Cardiology', count: 54, completionRate: 96, revenue: 45900, barWidth: 96 },
    { name: 'Dr. Marcus Vance', specialty: 'Dermatology', count: 42, completionRate: 91, revenue: 29400, barWidth: 78 },
    { name: 'Dr. Sophia Patel', specialty: 'Pediatrics', count: 48, completionRate: 94, revenue: 43200, barWidth: 88 },
    { name: 'Dr. Ethan Reynolds', specialty: 'Neurology', count: 38, completionRate: 88, revenue: 45600, barWidth: 70 },
  ];

  // Heatmap dataset
  const peakHoursData = [
    { hour: '08:00 AM - 09:00 AM', load: 60, status: 'Normal' },
    { hour: '09:00 AM - 10:00 AM', load: 88, status: 'Peak' },
    { hour: '10:00 AM - 11:00 AM', load: 96, status: 'Max Saturation' },
    { hour: '11:00 AM - 12:00 PM', load: 84, status: 'High' },
    { hour: '02:00 PM - 03:00 PM', load: 72, status: 'Normal' },
    { hour: '03:00 PM - 04:00 PM', load: 54, status: 'Low' },
    { hour: '04:00 PM - 05:00 PM', load: 78, status: 'Normal' },
  ];

  // Monthly Patient Growth Line/Area data
  const growthTrajectory = [
    { month: 'Mar', patients: 380, height: 45 },
    { month: 'Apr', patients: 460, height: 58 },
    { month: 'May', patients: 540, height: 70 },
    { month: 'Jun', patients: 620, height: 82 },
    { month: 'Jul', patients: 710, height: 92 },
    { month: 'Aug (Current)', patients: 742, height: 100 },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Doctor,Specialty,Appointments,CompletionRate,Revenue\n' +
      doctorWorkloadData
        .map((d) => `"${d.name}","${d.specialty}",${d.count},"${d.completionRate}%","₹${d.revenue}"`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `carepulse_analytics_${reportPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV Analytics Report downloaded successfully!');
  };

  const handleExportPDF = () => {
    onShowToast('Generating and downloading executive Hospital Analytics PDF...');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Reports & Hospital Intelligence
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              Executive Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Clinical workload distribution, no-show rates, peak clinic hours heatmap, and patient volume growth.
          </p>
        </div>

        {/* Export & Date Range */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Picker */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {(['30days', '90days', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportPeriod === p
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p === '30days' ? 'Last 30 Days' : p === '90days' ? 'Last 90 Days' : 'This Year'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* ── 4 Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Consultations</span>
          <p className="text-2xl font-black text-slate-900 font-heading">182</p>
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.8% this period</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clinical No-Show Rate</span>
          <p className="text-2xl font-black text-slate-900 font-heading">4.2%</p>
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <span>-1.5% reduction</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Consult Duration</span>
          <p className="text-2xl font-black text-slate-900 font-heading">18 mins</p>
          <p className="text-xs font-bold text-slate-500">Target: 20 mins</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimated Revenue</span>
          <p className="text-2xl font-black text-[#0B5A54] font-heading">₹1,64,100</p>
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+22% vs baseline</span>
          </p>
        </div>
      </div>

      {/* ── Chart Suite: 4 Core Visualizations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Appointments per Doctor (Bar) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Appointments per Doctor
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Clinical volume and completion rate per attending physician
              </p>
            </div>
            <Stethoscope className="w-4 h-4 text-[#0B5A54]" />
          </div>

          <div className="space-y-4 pt-1">
            {doctorWorkloadData.map((doc) => (
              <div key={doc.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900 font-black">{doc.name} ({doc.specialty})</span>
                  <span className="text-[#0B5A54]">{doc.count} Visits • {doc.completionRate}% Done</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${doc.barWidth}%` }}
                    className="h-full bg-gradient-to-r from-[#0B5A54] to-teal-400 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: No-Show Rate (Donut Breakdown) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Attendance & No-Show Rate
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Patient appointment follow-through and cancellation breakdown
              </p>
            </div>
            <PieChart className="w-4 h-4 text-[#0B5A54]" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* Circular Donut Graphic */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0B5A54]"
                  strokeDasharray="91, 100"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-rose-500"
                  strokeDasharray="4.2, 100"
                  strokeDashoffset="-91"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-2xl font-black text-slate-900 font-heading">91.6%</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Attended</p>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2.5 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0B5A54]" />
                <span className="text-slate-700">Completed Visits: 91.6% (165)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-700">No-Show Rate: 4.2% (8)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-slate-700">Cancelled / Rescheduled: 4.2% (9)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Busiest Time Slots Heatmap */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Busiest Time Slots Heatmap
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Clinic waiting room saturation intensity across consultation hours
              </p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {peakHoursData.map((slot) => (
              <div
                key={slot.hour}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold"
              >
                <span className="text-slate-800">{slot.hour}</span>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${slot.load}%` }}
                      className={`h-full rounded-full ${
                        slot.load >= 90 ? 'bg-rose-500' : slot.load >= 75 ? 'bg-amber-500' : 'bg-[#0B5A54]'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    slot.load >= 90
                      ? 'bg-rose-100 text-rose-800'
                      : slot.load >= 75
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-teal-100 text-[#0B5A54]'
                  }`}>
                    {slot.load}% Load
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Patient Growth (Line / Area) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Patient Growth Trajectory
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Monthly cumulative increase in registered patient cohort
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#0B5A54]" />
          </div>

          <div className="h-56 pt-6 flex items-end justify-between gap-3 px-2">
            {growthTrajectory.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-black text-[#0B5A54] opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.patients}
                </span>
                <div className="w-full max-w-[28px] flex items-end justify-center h-36">
                  <div
                    style={{ height: `${item.height}%` }}
                    className="w-full bg-gradient-to-t from-[#0B5A54] to-teal-300 rounded-t-lg transition-all group-hover:scale-105 shadow-xs"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsAnalytics;
