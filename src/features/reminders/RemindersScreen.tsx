import React, { useState } from 'react';
import { Pill, Plus, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface ReminderItem {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  timingCategory: 'Morning' | 'Afternoon' | 'Evening';
  taken: boolean;
  active: boolean;
  doctorPrescribed: string;
}

export const RemindersScreen: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([
    {
      id: 'rem-1',
      medicationName: 'Cetirizine Hydrochloride',
      dosage: '10 mg - 1 Tablet',
      time: '08:00 AM',
      timingCategory: 'Morning',
      taken: true,
      active: true,
      doctorPrescribed: 'Dr. Olivia Wilson',
    },
    {
      id: 'rem-2',
      medicationName: 'Multivitamin Complex',
      dosage: '1 Capsule',
      time: '01:30 PM',
      timingCategory: 'Afternoon',
      taken: false,
      active: true,
      doctorPrescribed: 'General Care',
    },
    {
      id: 'rem-3',
      medicationName: 'Amoxicillin 500mg',
      dosage: '500 mg - 1 Capsule',
      time: '08:30 PM',
      timingCategory: 'Evening',
      taken: false,
      active: true,
      doctorPrescribed: 'Dr. Marcus Vance',
    },
  ]);

  const toggleTaken = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, taken: !r.taken } : r))
    );
  };

  const toggleActive = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleAddCustom = () => {
    const name = prompt('Enter Medication / Prescription Name:');
    if (!name) return;
    const time = prompt('Enter Dosage Time (e.g. 09:00 PM):') || '09:00 PM';
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      medicationName: name,
      dosage: '1 Tablet',
      time: time,
      timingCategory: 'Evening',
      taken: false,
      active: true,
      doctorPrescribed: 'Self Added',
    };
    setReminders(prev => [...prev, newRem]);
  };

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative select-none">
      {/* VIBRANT CYAN TOP BAR */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] via-45% to-white pt-3 pb-6 px-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/30 shadow-xs">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div className="text-left space-y-0.5">
              <h1 className="text-base sm:text-lg font-extrabold text-white font-heading tracking-tight">Care Reminders</h1>
              <p className="text-[11px] font-semibold text-white/90">Pill Schedule & Treatment Tracker</p>
            </div>
          </div>

          <button
            onClick={handleAddCustom}
            className="p-2 rounded-xl bg-white text-[#0B5A54] hover:bg-gray-50 transition-all font-bold text-xs flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Pill</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="px-4 py-3 space-y-4 max-w-md mx-auto w-full">
        {/* Progress Card */}
        <Card padding="md" className="bg-[#0B5A54] text-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold font-heading">Today's Adherence</span>
            </div>
            <Badge variant="tint" size="sm" className="bg-white/20 text-white border-0">
              {reminders.filter(r => r.taken).length}/{reminders.length} Taken
            </Badge>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{
                width: `${(reminders.filter(r => r.taken).length / Math.max(1, reminders.length)) * 100}%`,
              }}
            />
          </div>
        </Card>

        {/* Reminders List */}
        <div className="space-y-3 text-left">
          <h2 className="text-xs font-extrabold text-gray-600 uppercase tracking-wider px-1">
            SCHEDULED DOSAGES
          </h2>

          {reminders.map((rem) => (
            <Card
              key={rem.id}
              padding="md"
              className={`border transition-all duration-150 shadow-2xs ${
                rem.taken
                  ? 'bg-emerald-50/60 border-emerald-200 opacity-90'
                  : rem.active
                  ? 'bg-[#F8FAFC] border-[#E4E7EC]'
                  : 'bg-gray-50 border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{rem.medicationName}</span>
                    <Badge variant={rem.taken ? 'success' : 'tint'} size="sm">
                      {rem.timingCategory}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-gray-600 font-medium">{rem.dosage}</p>

                  <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#0B5A54]" />
                      <span>{rem.time}</span>
                    </div>
                    <span>•</span>
                    <span>{rem.doctorPrescribed}</span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleTaken(rem.id)}
                    className={`p-2 rounded-xl transition-all shadow-2xs flex items-center justify-center ${
                      rem.taken
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-emerald-600'
                    }`}
                    title={rem.taken ? 'Mark as Not Taken' : 'Mark as Taken'}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rem.active}
                      onChange={() => toggleActive(rem.id)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0B5A54]"></div>
                  </label>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
