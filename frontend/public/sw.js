// CarePulse Service Worker for Interactive Push & Medication Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle interactive notification action clicks ("Taken" vs "Snooze")
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  notification.close();

  if (action === 'take') {
    // User clicked "✅ Taken" directly in notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          for (const client of clientList) {
            client.postMessage({
              type: 'CAREPULSE_MED_ACTION',
              action: 'TAKE_MED',
              data,
            });
          }
        }
      })
    );
  } else if (action === 'snooze') {
    // User clicked "⏰ Snooze 30m" directly in notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          for (const client of clientList) {
            client.postMessage({
              type: 'CAREPULSE_MED_ACTION',
              action: 'SNOOZE_30',
              data,
            });
          }
        }
      })
    );
  } else {
    // User clicked notification body (not action buttons) -> focus or open reminders screen
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/reminders');
        }
      })
    );
  }
});
