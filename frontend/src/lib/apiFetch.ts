/**
 * CarePulse Centralized API fetch helper
 *
 * Handles:
 * - Resolving the correct backend base URL (VITE_API_URL → /api → localhost:5000)
 * - Using native CapacitorHttp on mobile devices (Android / iOS) to bypass WebView CORS and origin limits
 * - Adding `ngrok-skip-browser-warning` header so Android WebView doesn't get
 *   the ngrok browser interstitial HTML page instead of JSON
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { useCarePulseStore } from './store';

const ENV_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

/**
 * Returns the ordered list of base URLs to try for backend calls.
 * Priority: VITE_API_URL (ngrok) → /api (Vite proxy / Netlify redirect) → localhost
 */
export function getApiBaseUrls(): string[] {
  // 1. Web Browser (Desktop / Mobile Web)
  if (!Capacitor.isNativePlatform()) {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '');

    if (isLocalhost) {
      return [
        'http://localhost:5000/api',
        '/api',
        ...(ENV_API_URL ? [ENV_API_URL] : []),
      ];
    }

    return [
      '/api',
      ...(ENV_API_URL ? [ENV_API_URL] : []),
      'http://localhost:5000/api',
    ];
  }

  // 2. Native Android / iOS Device
  return [
    ...(ENV_API_URL ? [ENV_API_URL] : []),
    'http://10.0.2.2:5000/api', // Android Emulator to host machine
    'http://localhost:5000/api',
  ];
}

/**
 * Default headers added to every API request.
 * `ngrok-skip-browser-warning` bypasses the ngrok browser interstitial
 * that would otherwise return HTML to the Android WebView instead of JSON.
 */
export const API_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

/**
 * Attempt a fetch against multiple base URLs in order.
 * Returns the first successful Response (even if status is 4xx/5xx —
 * those are valid API responses, not network errors).
 * Throws only if ALL endpoints fail with a network error.
 */
export async function apiFetch(
  path: string, // e.g. "/auth/register"
  options: RequestInit = {}
): Promise<Response> {
  const urls = getApiBaseUrls();
  let lastError: unknown;

  for (const base of urls) {
    const cleanBase = base.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
    const url = cleanBase.endsWith('/api')
      ? `${cleanBase}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`
      : `${cleanBase}/api${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Native mobile request via CapacitorHttp for true Android network isolation & fast timeouts
        const method = (options.method || 'GET').toUpperCase();
        const headers = {
          ...API_HEADERS,
          ...(options.headers as Record<string, string> | undefined),
        };

        let requestData: any = undefined;
        if (options.body && typeof options.body === 'string') {
          try {
            requestData = JSON.parse(options.body);
          } catch {
            requestData = options.body;
          }
        }

        const nativeRes = await CapacitorHttp.request({
          method,
          url,
          headers,
          data: requestData,
          connectTimeout: 8000,
          readTimeout: 8000,
        });

        if (nativeRes.status >= 200 && nativeRes.status < 600) {
          const jsonBody = typeof nativeRes.data === 'string' ? nativeRes.data : JSON.stringify(nativeRes.data);
          const responseObj = new Response(jsonBody, {
            status: nativeRes.status,
            headers: new Headers(nativeRes.headers as Record<string, string>),
          });

          // Verify that the response is NOT an HTML SPA fallback
          const contentType = responseObj.headers.get('content-type') || '';
          if (contentType.includes('text/html') && !path.endsWith('.html')) {
            throw new Error('Received HTML instead of JSON API response');
          }

          useCarePulseStore.getState().setIsOfflineMode(false);
          return responseObj;
        }

        throw new Error(`HTTP Error ${nativeRes.status}`);
      } else {
        // Generous timeout for AI inference, OCR, and medicine lookups (20s), standard for others (6s)
        const isLongRequest = path.includes('/ai') || path.includes('scan') || path.includes('lookup') || path.includes('ocr') || path.includes('/chat');
        const defaultTimeoutMs = isLongRequest ? 20000 : 12000;
        const timeoutMs = options.signal ? undefined : defaultTimeoutMs;
        const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

        const res = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal,
          headers: {
            ...API_HEADERS,
            ...(options.headers as Record<string, string> | undefined),
          },
        });
        if (timeoutId) clearTimeout(timeoutId);

        // Verify that the response is NOT an HTML SPA fallback
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html') && !path.endsWith('.html')) {
          throw new Error('Received HTML instead of JSON API response');
        }

        // Automatically clear offline fallback mode on any successful backend call
        useCarePulseStore.getState().setIsOfflineMode(false);
        return res;
      }
    } catch (err) {
      lastError = err;
      // Network error or timeout — try next base URL
    }
  }

  // All endpoints unreachable — activate offline warning banner
  useCarePulseStore.getState().setIsOfflineMode(true);
  throw lastError ?? new Error('All API endpoints unreachable');
}

/**
 * Convenience: GET request with optional extra headers
 */
export function apiGet(path: string, extraHeaders?: Record<string, string>): Promise<Response> {
  return apiFetch(path, { method: 'GET', headers: extraHeaders });
}

/**
 * Convenience: POST request with JSON body
 */
export function apiPost(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Test whether the backend server is reachable and healthy (/api/health)
 * Strictly verifies that the response is genuine JSON with healthy status.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await apiGet('/health');
    if (!res || !res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return false;
    const data = await res.json();
    return Boolean(data && (data.status === 'healthy' || data.service?.toLowerCase().includes('carepulse')));
  } catch {
    return false;
  }
}
