/**
 * CarePulse Centralized API fetch helper
 *
 * Handles:
 * - Resolving the correct backend base URL (VITE_API_URL → /api → localhost:5000)
 * - Adding `ngrok-skip-browser-warning` header so Android WebView doesn't get
 *   the ngrok browser interstitial HTML page instead of JSON
 */

const ENV_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

/**
 * Returns the ordered list of base URLs to try for backend calls.
 * Priority: VITE_API_URL (ngrok) → /api (Vite proxy / Netlify redirect) → localhost
 */
export function getApiBaseUrls(): string[] {
  return [
    ...(ENV_API_URL ? [ENV_API_URL] : []),
    '/api',
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
    const url = `${base}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          ...API_HEADERS,
          ...(options.headers as Record<string, string> | undefined),
        },
      });
      clearTimeout(timeoutId);
      return res; // Return on first successful network call (any status code)
    } catch (err) {
      lastError = err;
      // Network error or timeout — try next base URL
    }
  }

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
