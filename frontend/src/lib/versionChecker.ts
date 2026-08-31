/**
 * CarePulse In-App APK Version Checker & Native Installer Utility
 * 
 * Features:
 * - Checks against self-hosted backend version endpoint (/api/app/version)
 * - Compares against native installed app info (@capacitor/app)
 * - In-app binary streaming download with progress tracking
 * - Saves APK to native cache (@capacitor/filesystem)
 * - Triggers Android package installer directly (@capacitor-community/file-opener)
 */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { apiFetch, getApiBaseUrls } from './apiFetch';

export interface AppVersionInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  releasedAt?: string;
  installedVersion: string;
  isUpdateAvailable: boolean;
}

/**
 * Compare two semver strings (e.g. "1.2.0" vs "1.1.0").
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) =>
    (v || '')
      .replace(/^[vV]/, '')
      .trim()
      .split('.')
      .map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });

  const p1 = parse(v1);
  const p2 = parse(v2);
  const maxLen = Math.max(p1.length, p2.length, 3);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Check if a new APK version is available on the backend.
 */
export async function checkForAppUpdate(): Promise<AppVersionInfo | null> {
  // Guard: APK updates are only applicable to native mobile platforms (e.g. Android app)
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    // 1. Get installed app version
    let installedVersion = '1.0.0';
    try {
      const info = await App.getInfo();
      if (info?.version) {
        installedVersion = info.version;
      }
    } catch (appErr) {
      console.warn('[UpdateChecker] Could not read native app version:', appErr);
    }

    // 2. Fetch latest server version from backend
    let data: any = null;
    try {
      const res = await apiFetch('/app/version');
      if (res && res.ok) {
        data = await res.json();
      }
    } catch (apiErr) {
      console.warn('[UpdateChecker] Primary apiFetch failed, trying fallback endpoints:', apiErr);
    }

    // Fallback if primary apiFetch failed
    if (!data) {
      const baseUrls = getApiBaseUrls();
      for (const base of baseUrls) {
        const cleanBase = base.replace(/\/+$/, '');
        const targetUrl = cleanBase.endsWith('/api') ? `${cleanBase}/app/version` : `${cleanBase}/api/app/version`;
        try {
          const res = await fetch(targetUrl, {
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (_) {}
      }
    }

    if (!data || !data.version) {
      console.warn('[UpdateChecker] No valid version data returned from server.');
      return null;
    }

    const serverVersion = data.version || '1.0.0';
    const downloadUrl = data.download_url || '';
    const releaseNotes = data.release_notes || 'Performance improvements and bug fixes.';
    const releasedAt = data.released_at || '';

    const isUpdateAvailable = compareSemver(serverVersion, installedVersion) > 0;

    console.log(`[UpdateChecker] Installed: ${installedVersion} | Server: ${serverVersion} | Update Available: ${isUpdateAvailable}`);

    return {
      version: serverVersion,
      downloadUrl,
      releaseNotes,
      releasedAt,
      installedVersion,
      isUpdateAvailable,
    };
  } catch (err) {
    console.warn('[UpdateChecker] Version check note (fail-safe):', err);
    return null;
  }
}

/**
 * Convert ArrayBuffer to base64 string safely in chunks without stack overflow.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunking
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunkSize, len)) as unknown as number[]
    );
  }
  return btoa(binary);
}

/**
 * Download APK file within the app and launch Android package installer dialog.
 */
export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string }> {
  if (!downloadUrl) {
    return { success: false, error: 'No download URL specified' };
  }

  try {
    // Determine download URL targets (fallbacks if ngrok tunnel shifts)
    const urlsToTry: string[] = [downloadUrl];
    const candidateBases = getApiBaseUrls();
    for (const b of candidateBases) {
      const baseClean = b.replace(/\/api\/?$/, '');
      const altUrl = `${baseClean}/downloads/CarePulse_App.apk`;
      if (!urlsToTry.includes(altUrl)) {
        urlsToTry.push(altUrl);
      }
    }

    let buffer: ArrayBuffer | null = null;
    let lastErr: any = null;

    if (onProgress) onProgress(15);

    // If native Capacitor platform, try direct fetch or CapacitorHttp
    for (const targetUrl of urlsToTry) {
      try {
        if (onProgress) onProgress(30);

        // Add cache busting param
        const separator = targetUrl.includes('?') ? '&' : '?';
        const cacheBustedUrl = `${targetUrl}${separator}_t=${Date.now()}`;

        const res = await fetch(cacheBustedUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (res.ok) {
          if (onProgress) onProgress(50);
          buffer = await res.arrayBuffer();
          if (onProgress) onProgress(85);
          break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (!buffer || buffer.byteLength === 0) {
      throw new Error(lastErr?.message || 'Failed to download APK package from server.');
    }

    if (onProgress) onProgress(92);

    // Convert to base64
    const base64Data = arrayBufferToBase64(buffer);

    // Clean up any existing cached update file first
    const fileName = 'CarePulse_update.apk';
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache,
      });
    } catch (_) {}

    // Save fresh binary to native cache directory
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    if (onProgress) onProgress(100);

    // On web/browser environments: trigger browser download
    if (!Capacitor.isNativePlatform()) {
      const blob = new Blob([buffer], { type: 'application/vnd.android.package-archive' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }

    // On native Android: get native file path & launch package installer intent
    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    await FileOpener.open({
      filePath: fileUri.uri,
      contentType: 'application/vnd.android.package-archive',
    });

    return { success: true };
  } catch (err: any) {
    console.error('[UpdateChecker] APK download/install error:', err);
    return {
      success: false,
      error: err?.message || 'Download failed — check your connection and try again.',
    };
  }
}
