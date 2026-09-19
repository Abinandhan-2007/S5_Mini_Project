import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';

export const DOSE_STORAGE_PREFIX = 'carepulse_med_dose_v3_';
const SNOOZED_DOSES_STORAGE_KEY = 'carepulse_snoozed_doses_v1';

export interface DosePromptItem {
  id: string; // unique key e.g. "rx-0-morning" or "rem-1"
  medId: string;
  slotId: string; // "morning" | "afternoon" | "evening" | "night" | "bedtime"
  drugName: string;
  dosage: string;
  timeLabel: string; // e.g. "08:00 AM"
  timingCategory: string; // e.g. "Morning Dose"
  instructions?: string; // e.g. "Take after breakfast with water"
  isSnoozed?: boolean;
}

export interface SnoozedDoseRecord {
  item: DosePromptItem;
  snoozeUntil: number; // timestamp in ms
  snoozedAt: number;
}

// Simple deterministic integer hash for notification IDs
function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 1000000 + 1000;
}

export const getTodayDateKey = () => new Date().toISOString().split('T')[0];

export const isDoseAlreadyTaken = (medId: string, slotId: string): boolean => {
  try {
    const today = getTodayDateKey();
    const raw = localStorage.getItem(`${DOSE_STORAGE_PREFIX}${medId}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.date === today && Boolean(parsed.slots && parsed.slots[slotId]);
  } catch {
    return false;
  }
};

export const getSnoozedDoses = (): Record<string, SnoozedDoseRecord> => {
  try {
    const raw = localStorage.getItem(SNOOZED_DOSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSnoozedDoses = (map: Record<string, SnoozedDoseRecord>) => {
  try {
    localStorage.setItem(SNOOZED_DOSES_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save snoozed doses:', e);
  }
};

/**
 * Marks a dose as "Taken" (ate) in the app.
 * Persists in local storage, cancels any active snooze, and broadcasts carepulse:dose_taken event.
 */
export const markDoseAsAte = (
  medId: string,
  slotId: string,
  drugName?: string
): { success: boolean; timeStr: string } => {
  const today = getTodayDateKey();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const stored = localStorage.getItem(`${DOSE_STORAGE_PREFIX}${medId}`);
    let record: { date: string; slots: Record<string, string> } = { date: today, slots: {} };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.slots) {
          record = parsed;
        }
      } catch {}
    }

    record.slots[slotId] = timeStr;
    localStorage.setItem(`${DOSE_STORAGE_PREFIX}${medId}`, JSON.stringify(record));

    // Clear any active snooze for this medication slot
    const snoozed = getSnoozedDoses();
    const promptId = `${medId}-${slotId}`;
    if (snoozed[promptId]) {
      delete snoozed[promptId];
      saveSnoozedDoses(snoozed);
    }

    // Cancel any scheduled local notification
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.cancel({ notifications: [{ id: hashStringToId(promptId) }] }).catch(() => {});
    }

    // Broadcast event across app (updates cards in real time)
    window.dispatchEvent(
      new CustomEvent('carepulse:dose_taken', {
        detail: { medId, slotId, timeStr, drugName, date: today },
      })
    );

    return { success: true, timeStr };
  } catch (e) {
    console.error('Error marking dose as taken:', e);
    return { success: false, timeStr };
  }
};

/**
 * Snoozes dose reminder for 30 minutes.
 * If user clicked "No", schedules a follow-up alert in exactly 30 minutes.
 */
export const snoozeDoseFor30Minutes = async (
  item: DosePromptItem,
  customMinutes: number = 30
): Promise<number> => {
  const snoozeUntil = Date.now() + customMinutes * 60 * 1000;
  const promptId = `${item.medId}-${item.slotId}`;

  const snoozed = getSnoozedDoses();
  snoozed[promptId] = {
    item: { ...item, isSnoozed: true },
    snoozeUntil,
    snoozedAt: Date.now(),
  };
  saveSnoozedDoses(snoozed);

  // Schedule native local notification for 30 minutes later
  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = hashStringToId(promptId);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `💊 Medicine Reminder: ${item.drugName}`,
            body: `30-minute reminder: Please take your ${item.dosage} (${item.timingCategory}). Have you taken it now?`,
            schedule: { at: new Date(snoozeUntil) },
            sound: 'default',
            actionTypeId: 'MEDICINE_INTAKE_PROMPT',
            extra: {
              medId: item.medId,
              slotId: item.slotId,
              drugName: item.drugName,
              dosage: item.dosage,
              timingCategory: item.timingCategory,
            },
          },
        ],
      });
    } catch (e) {
      console.warn('Could not schedule native local notification snooze:', e);
    }
  }

  // Broadcast snooze event
  window.dispatchEvent(
    new CustomEvent('carepulse:dose_snoozed', {
      detail: { item, snoozeUntil, minutes: customMinutes },
    })
  );

  return snoozeUntil;
};

/**
 * Immediately display a notification with interactive "Taken" and "Snooze 30 min" action buttons.
 * Supports both Native Mobile (Capacitor LocalNotifications) and Web Browser (Service Worker Notifications).
 * The prompt is presented directly inside the notification shade/banner, never as an in-app popup modal.
 */
export const showInteractiveMedicationNotification = async (item: DosePromptItem) => {
  const isEnabled = localStorage.getItem('carepulse_med_reminders_enabled') !== 'false';
  if (!isEnabled) return;

  const title = `💊 Medication Reminder: ${item.drugName}`;
  const body = `Time to take your ${item.dosage} (${item.timingCategory || 'Prescription Dose'}). Have you taken it?`;

  // 1. Native Mobile (Android / iOS via Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = hashStringToId(`prompt-${item.medId}-${item.slotId}-${Date.now() % 100000}`);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            sound: 'default',
            actionTypeId: 'MEDICINE_INTAKE_PROMPT',
            extra: {
              medId: item.medId,
              slotId: item.slotId,
              drugName: item.drugName,
              dosage: item.dosage,
              timingCategory: item.timingCategory || 'Prescription',
            },
          },
        ],
      });
      return;
    } catch (e) {
      console.warn('Could not schedule interactive local notification:', e);
    }
  }

  // 2. Web Browser Notification (Desktop / Mobile Web / PWA)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        // Use Service Worker if available to present interactive action buttons
        if ('serviceWorker' in navigator) {
          try {
            let reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
              reg = await navigator.serviceWorker.register('/sw.js');
            }
            if (reg && 'showNotification' in reg) {
              await reg.showNotification(title, {
                body,
                icon: '/favicon.png',
                badge: '/favicon.png',
                tag: `med-${item.medId}-${item.slotId}`,
                renotify: true,
                requireInteraction: true,
                actions: [
                  { action: 'take', title: '✅ Taken' },
                  { action: 'snooze', title: '⏰ Snooze 30m' },
                ],
                data: {
                  medId: item.medId,
                  slotId: item.slotId,
                  drugName: item.drugName,
                  dosage: item.dosage,
                  timingCategory: item.timingCategory,
                  item,
                },
              } as NotificationOptions);
              return;
            }
          } catch (swErr) {
            console.warn('SW notification failed, falling back to window Notification:', swErr);
          }
        }

        // Fallback for browsers without Service Worker actions: clicking notification marks dose taken
        const notif = new Notification(title, {
          body: `${body} (Click to mark taken)`,
          icon: '/favicon.png',
          tag: `med-${item.medId}-${item.slotId}`,
        });
        notif.onclick = () => {
          window.focus();
          markDoseAsAte(item.medId, item.slotId, item.drugName);
          notif.close();
        };
      }
    } catch (notifErr) {
      console.warn('Browser Notification error:', notifErr);
    }
  }
};

export const showLocalMedicationReminder = showInteractiveMedicationNotification;

/**
 * Triggers medication reminder notification directly in the system notification.
 * Asks Taken or Snooze inside the notification itself, NOT inside app as a popup modal.
 */
export const triggerIntakePrompt = (item: DosePromptItem, _force = false) => {
  showInteractiveMedicationNotification(item).catch(() => {});
};

/**
 * Initialize action types and background check timers.
 */
export const initMedicationNotificationService = async () => {
  // Register Service Worker on Web for notification action buttons ("Taken" vs "Snooze")
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
    try {
      await navigator.serviceWorker.register('/sw.js');

      // Listen for notification action clicks forwarded from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.type === 'CAREPULSE_MED_ACTION') {
          const medData = data.data || {};
          if (data.action === 'TAKE_MED' && medData.medId && medData.slotId) {
            markDoseAsAte(medData.medId, medData.slotId, medData.drugName);
          } else if (data.action === 'SNOOZE_30' && medData.medId && medData.slotId) {
            snoozeDoseFor30Minutes(
              medData.item || {
                id: `${medData.medId}-${medData.slotId}`,
                medId: medData.medId,
                slotId: medData.slotId,
                drugName: medData.drugName || 'Prescription',
                dosage: medData.dosage || '1 dose',
                timeLabel: 'Snoozed',
                timingCategory: medData.timingCategory || 'Medicine Time',
              },
              30
            );
          }
        }
      });
    } catch (swErr) {
      console.warn('Service worker registration note:', swErr);
    }
  }

  // Native Mobile Local Notification Actions
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.requestPermissions();

      // Register interactive action buttons for Android/iOS notifications:
      // "Taken" and "Snooze 30 min"
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'MEDICINE_INTAKE_PROMPT',
            actions: [
              {
                id: 'TAKE_MED',
                title: '✅ Taken',
                foreground: false,
              },
              {
                id: 'SNOOZE_30',
                title: '⏰ Snooze 30 min',
                foreground: false,
              },
            ],
          },
        ],
      });

      // Listen for action clicks directly from notification tray
      LocalNotifications.addListener('localNotificationActionPerformed', (notification: ActionPerformed) => {
        const extra = notification.notification.extra || {};
        const actionId = notification.actionId;
        const medId = extra.medId;
        const slotId = extra.slotId;
        const drugName = extra.drugName;

        if (actionId === 'TAKE_MED' && medId && slotId) {
          markDoseAsAte(medId, slotId, drugName);
        } else if (actionId === 'SNOOZE_30' && medId && slotId) {
          snoozeDoseFor30Minutes(
            {
              id: `${medId}-${slotId}`,
              medId,
              slotId,
              drugName: drugName || 'Prescription',
              dosage: extra.dosage || '1 dose',
              timeLabel: 'Snoozed',
              timingCategory: extra.timingCategory || 'Medicine Time',
            },
            30
          );
        } else if (medId && slotId) {
          // Tapped notification body -> navigate to reminders screen without opening popup modal
          window.dispatchEvent(new CustomEvent('carepulse:notification_navigate', { detail: { screen: '/reminders' } }));
        }
      });
    } catch (e) {
      console.warn('Native LocalNotifications initialization note:', e);
    }
  }

  // Start periodic check for snoozed doses & eating times (runs every 15 seconds)
  const checkInterval = setInterval(() => {
    checkSnoozedAndEatingTimes();
  }, 15000);

  // Initial check on startup
  setTimeout(() => checkSnoozedAndEatingTimes(), 2000);

  return () => clearInterval(checkInterval);
};

/**
 * Checks if any snoozed doses have reached their 30-minute mark,
 * or if any scheduled dose is due right now.
 */
export const checkSnoozedAndEatingTimes = () => {
  const now = Date.now();
  const snoozed = getSnoozedDoses();

  let hasChanges = false;

  // 1. Check snoozed doses for each tablet
  for (const [key, record] of Object.entries(snoozed)) {
    if (now >= record.snoozeUntil) {
      // Check if already taken
      if (!isDoseAlreadyTaken(record.item.medId, record.item.slotId)) {
        // Remove from snoozed list so it doesn't trigger multiple times
        delete snoozed[key];
        hasChanges = true;

        // Ask directly in notification for this tablet (NOT inside app as popup modal)
        showInteractiveMedicationNotification({
          ...record.item,
          isSnoozed: true,
        });
      } else {
        delete snoozed[key];
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    saveSnoozedDoses(snoozed);
  }
};
