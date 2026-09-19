import { Capacitor } from '@capacitor/core';
import { apiPost } from './apiFetch';

/**
 * Interface representing device specifications captured on login.
 */
export interface DeviceInfoPayload {
  patient_id?: string;
  device_id: string;
  device_model: string;
  manufacturer: string;
  platform: 'android' | 'ios' | 'web';
  os_version: string;
  app_version: string;
  fcm_token?: string;
}

/**
 * Generates or retrieves a persistent anonymous installation UUID.
 */
export function getOrCreateDeviceId(): string {
  try {
    const KEY = 'carepulse_installation_device_id';
    let id = localStorage.getItem(KEY);
    if (!id || id.trim() === '') {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'dev_fallback_' + Date.now().toString(36);
  }
}

/**
 * Parses user agent string to extract human-readable Device Model, Manufacturer, and OS version.
 */
export function parseDeviceDetails(): {
  device_model: string;
  manufacturer: string;
  platform: 'android' | 'ios' | 'web';
  os_version: string;
} {
  const capPlatform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  let manufacturer = 'Generic';
  let device_model = 'Browser Client';
  let os_version = '';

  // 1. Android Device Detection
  if (capPlatform === 'android' || /Android/i.test(ua)) {
    const androidMatch = ua.match(/Android\s+([0-9\.]+)/i);
    os_version = androidMatch ? `Android ${androidMatch[1]}` : 'Android';

    // Model extraction e.g. "Linux; Android 14; SM-S918B Build/..."
    const modelMatch = ua.match(/Android[^;]+;\s*([^;)]+)\s*(?:Build|[);])/i);
    let rawModel = modelMatch ? modelMatch[1].trim() : '';

    if (rawModel) {
      device_model = rawModel;
      const lowerModel = rawModel.toLowerCase();

      if (rawModel.startsWith('SM-') || lowerModel.includes('samsung')) {
        manufacturer = 'Samsung';
        if (!rawModel.toLowerCase().startsWith('samsung')) {
          device_model = `Samsung ${rawModel}`;
        }
      } else if (lowerModel.includes('pixel')) {
        manufacturer = 'Google';
      } else if (lowerModel.includes('redmi') || lowerModel.includes('xiaomi') || lowerModel.includes('poco') || rawModel.startsWith('220') || rawModel.startsWith('230')) {
        manufacturer = 'Xiaomi';
      } else if (lowerModel.includes('oneplus') || rawModel.startsWith('NE22') || rawModel.startsWith('CPH')) {
        manufacturer = 'OnePlus';
      } else if (lowerModel.includes('moto') || rawModel.startsWith('XT')) {
        manufacturer = 'Motorola';
      } else if (lowerModel.includes('vivo') || rawModel.startsWith('V2')) {
        manufacturer = 'Vivo';
      } else if (lowerModel.includes('oppo')) {
        manufacturer = 'Oppo';
      } else {
        manufacturer = 'Android Device';
      }
    } else {
      device_model = Capacitor.isNativePlatform() ? 'Android Smartphone' : 'Android Mobile Browser';
      manufacturer = 'Android';
    }

    return {
      device_model,
      manufacturer,
      platform: 'android',
      os_version,
    };
  }

  // 2. iOS Device Detection
  if (capPlatform === 'ios' || /iPhone|iPad|iPod/i.test(ua)) {
    manufacturer = 'Apple';
    const isPad = /iPad/i.test(ua);
    device_model = isPad ? 'Apple iPad' : 'Apple iPhone';

    const iosMatch = ua.match(/OS\s+([0-9_]+)/i);
    os_version = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';

    return {
      device_model,
      manufacturer,
      platform: 'ios',
      os_version,
    };
  }

  // 3. Desktop / Web Detection
  if (/Windows NT/i.test(ua)) {
    const winMatch = ua.match(/Windows NT\s+([0-9\.]+)/i);
    const winVer = winMatch ? winMatch[1] : '';
    os_version = winVer === '10.0' ? 'Windows 10/11' : `Windows (NT ${winVer})`;
    manufacturer = 'PC / Workstation';
    device_model = 'Windows Desktop Browser';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    const macMatch = ua.match(/Mac OS X\s+([0-9_]+)/i);
    os_version = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
    manufacturer = 'Apple';
    device_model = 'Mac Desktop Browser';
  } else if (/Linux/i.test(ua)) {
    os_version = 'Linux';
    manufacturer = 'Linux PC';
    device_model = 'Linux Desktop Browser';
  }

  return {
    device_model,
    manufacturer,
    platform: 'web',
    os_version,
  };
}

/**
 * Tracks the user's phone / device details upon login or active session and registers it on the backend.
 * Gracefully silent on errors so user experience is never blocked.
 */
export async function trackUserDevice(patientId?: string): Promise<void> {
  try {
    const pId = (patientId && patientId.trim() !== '')
      ? patientId.trim()
      : (localStorage.getItem('carepulse_user_id') || '');

    if (!pId) return;

    const deviceId = getOrCreateDeviceId();
    const details = parseDeviceDetails();
    const fcmToken = localStorage.getItem('carepulse_fcm_token') || '';

    const payload: DeviceInfoPayload = {
      patient_id: pId,
      device_id: deviceId,
      device_model: details.device_model,
      manufacturer: details.manufacturer,
      platform: details.platform,
      os_version: details.os_version,
      app_version: '1.0.4',
      fcm_token: fcmToken,
    };

    await apiPost('/patient/device-info', payload);
    console.log(`📱 Tracked login device: ${details.device_model} for patient ${pId}`);
  } catch (err) {
    console.warn('Note tracking user device info:', err);
  }
}
