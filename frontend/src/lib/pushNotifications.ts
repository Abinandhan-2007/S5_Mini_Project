import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { apiFetch } from './apiFetch';

let isPushInitialized = false;

/**
 * Register native device for Firebase Cloud Messaging (FCM) push notifications.
 * Automatically called on patient login and session restoration.
 * Gracefully handles web browser and permission denial scenarios without blocking user experience.
 */
export async function registerPushNotifications(patientId: string): Promise<void> {
  if (!patientId || patientId.trim() === '') {
    return;
  }

  // Only run native push registration on Android / iOS devices
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission was not granted:', permStatus.receive);
      return;
    }

    // Create high-importance notification channel for Android 8.0+ (Oreo+)
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'carepulse_alerts',
          name: 'CarePulse Health Alerts',
          description: 'High-priority appointment reminders, cancellations, and medication alerts',
          importance: 5, // High: Heads-up banner & sound
          visibility: 1, // Public
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#0B5A54',
        });
      } catch (channelErr) {
        console.warn('Notification channel creation note:', channelErr);
      }
    }

    // Register with FCM/APNs
    await PushNotifications.register();

    if (!isPushInitialized) {
      isPushInitialized = true;

      // Successfully received device FCM token
      await PushNotifications.addListener('registration', async (token: Token) => {
        try {
          await apiFetch('/patient/device-token', {
            method: 'POST',
            body: JSON.stringify({
              patient_id: patientId,
              fcm_token: token.value,
              platform: Capacitor.getPlatform() || 'android',
            }),
          });
          console.log('✅ FCM Device Token registered successfully for patient:', patientId);
        } catch (err) {
          console.warn('Failed to send device token to backend:', err);
        }
      });

      // Handle FCM registration error
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('FCM registration error:', error);
      });

      // Foreground push notification received
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received in foreground:', notification);
      });

      // Notification action / tap performed
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('🔔 Push notification action performed:', action);
        const data = action?.notification?.data || {};
        
        let targetScreen = '/history';
        if (data.screen) {
          targetScreen = data.screen;
        } else if (data.url && typeof data.url === 'string' && data.url.startsWith('/')) {
          targetScreen = data.url;
        } else if (data.type === 'appointment_cancelled' || data.type === 'appointment_reminder' || data.type === 'medication_reminder') {
          targetScreen = '/history';
        }

        // Cache route for cold starts or splash transition
        try {
          sessionStorage.setItem('pending_notification_route', targetScreen);
        } catch (_) {}

        // Dispatch immediate in-app navigation event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('carepulse:notification_navigate', {
              detail: { screen: targetScreen, data }
            })
          );
        }
      });
    }
  } catch (error) {
    console.warn('Push notification initialization note:', error);
  }
}
