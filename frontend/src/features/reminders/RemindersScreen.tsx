import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, Clock, Sparkles, BellRing } from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useCarePulseStore } from '../../lib/store';
import {
  showInteractiveMedicationNotification,
  markDoseAsAte,
  snoozeDoseFor30Minutes,
  isDoseAlreadyTaken,
} from '../../services/medicationNotificationService';

interface ReminderItem {
  id: string;
  medId: string;
  slotId: string;
  medicationName: string;
  dosage: string;
  time: string;
  timingCategory: 'Morning' | 'Afternoon' | 'Evening';
  taken: boolean;
  active: boolean;
  doctorPrescribed: string;
}

export const RemindersScreen: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // 1. Automatically populate reminders from consultation prescriptions & default formulary
  useEffect(() => {
    const history = useCarePulseStore.getState().history || [];
    const loaded: ReminderItem[] = [];

    history.forEach((visit) => {
      const list = visit.prescriptions || visit.soapData?.prescriptions || [];
      list.forEach((rx: any, idx: number) => {
        const name = typeof rx === 'string' ? rx : rx.drug_name || rx.name || 'Prescription';
        const dosage = typeof rx === 'object' ? rx.dosage || '1 Tablet' : '1 Tablet';
        const medId = `rx-${visit.id || 'visit'}-${idx}`;
        const slotId = 'afternoon';
        loaded.push({
          id: medId,
          medId,
          slotId,
          medicationName: name,
          dosage,
          time: '01:45 PM',
          timingCategory: 'Afternoon',
          taken: isDoseAlreadyTaken(medId, slotId),
          active: true,
          doctorPrescribed: visit.doctorName || 'Dr. Specialist',
        });
      });
    });

    // Ensure default Paracetamol 650mg is always ready if no prescriptions found
    if (loaded.length === 0) {
      loaded.push({
        id: 'rx-paracetamol-650',
        medId: 'rx-paracetamol-650',
        slotId: 'afternoon',
        medicationName: 'Paracetamol 650mg',
        dosage: '1 Tab',
        time: '01:45 PM',
        timingCategory: 'Afternoon',
        taken: isDoseAlreadyTaken('rx-paracetamol-650', 'afternoon'),
        active: true,
        doctorPrescribed: 'Clinical Prescription',
      });
    }

    setReminders(loaded);
  }, []);

  // Sync state when dose is marked taken via notification prompt
  useEffect(() => {
    const handleDoseTaken = (e: Event) => {
      const custom = e as CustomEvent<{ medId: string; slotId: string; drugName?: string }>;
      if (custom.detail) {
        const drug = custom.detail.drugName?.toLowerCase() || '';
        setReminders((prev) =>
          prev.map((r) => {
            if (
              r.medId === custom.detail.medId ||
              (drug && r.medicationName.toLowerCase().includes(drug.split(' ')[0]))
            ) {
              return { ...r, taken: true };
            }
            return r;
          })
        );
      }
    };
    window.addEventListener('carepulse:dose_taken', handleDoseTaken);
    return () => window.removeEventListener('carepulse:dose_taken', handleDoseTaken);
  }, []);

  const handleMarkTaken = (rem: ReminderItem) => {
    if (rem.taken) return; // Once marked as taken, cannot be unmarked

    markDoseAsAte(rem.medId, rem.slotId, rem.medicationName);
    setReminders((prev) =>
      prev.map((r) => (r.id === rem.id ? { ...r, taken: true } : r))
    );
  };

  const handleSnooze30 = async (rem: ReminderItem) => {
    await snoozeDoseFor30Minutes({
      id: `${rem.medId}-${rem.slotId}`,
      medId: rem.medId,
      slotId: rem.slotId,
      drugName: rem.medicationName,
      dosage: rem.dosage,
      timeLabel: rem.time,
      timingCategory: rem.timingCategory,
      instructions: 'Take with warm water after food',
    }, 30);
  };

  const toggleActive = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleTriggerTestNotification = async () => {
    const activeMed = reminders.find((r) => !r.taken) || reminders[0];
    if (!activeMed) {
      alert("No medications scheduled. Add a medication to test reminders.");
      return;
    }
    await showInteractiveMedicationNotification({
      id: `${activeMed.medId}-${activeMed.slotId}`,
      medId: activeMed.medId,
      slotId: activeMed.slotId,
      drugName: activeMed.medicationName,
      dosage: activeMed.dosage,
      timeLabel: activeMed.time,
      timingCategory: `${activeMed.timingCategory} Dose`,
      instructions: 'Take after food with water',
    });
  };

  const handleAddCustom = () => {
    const name = prompt('Enter Medication / Prescription Name:');
    if (!name) return;
    const time = prompt('Enter Dosage Time (e.g. 09:00 PM):') || '09:00 PM';
    const customId = `rem-${Date.now()}`;
    const newRem: ReminderItem = {
      id: customId,
      medId: customId,
      slotId: 'evening',
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerTestNotification}
              className="p-2 px-2.5 rounded-xl bg-teal-800 text-white hover:bg-teal-900 transition-all font-bold text-xs flex items-center gap-1.5 shadow-xs"
              title="Test Tablet Eating Notification"
            >
              <BellRing className="w-3.5 h-3.5 text-teal-200 animate-pulse" />
              <span className="hidden sm:inline">Test Alert</span>
            </button>

            <button
              onClick={handleAddCustom}
              className="p-2 rounded-xl bg-white text-[#0B5A54] hover:bg-gray-50 transition-all font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Pill</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="px-4 sm:px-6 md:px-8 py-3 space-y-4 max-w-5xl mx-auto w-full">
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

          {reminders.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <Pill className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-700">No active medication reminders</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Prescriptions from your doctor will automatically appear here, or you can add pills manually.
              </p>
            </div>
          ) : (
            reminders.map((rem) => (
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMarkTaken(rem)}
                        disabled={rem.taken}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1 ${
                          rem.taken
                            ? 'bg-emerald-600 text-white cursor-default opacity-95'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 cursor-pointer active:scale-95'
                        }`}
                        title={rem.taken ? 'Completed (Already Taken)' : 'Mark as Taken'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{rem.taken ? 'Taken' : 'Take'}</span>
                      </button>

                      {!rem.taken && (
                        <button
                          onClick={() => handleSnooze30(rem)}
                          className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Snooze 30 Minutes"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>30m</span>
                        </button>
                      )}
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer mt-0.5">
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
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
