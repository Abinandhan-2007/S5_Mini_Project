import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { User } from './types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
            }
          ) => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
            error_callback?: (error: any) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '328652220146-7rb9ulr62r40ue0qr3dk7fjo7ba76evb.apps.googleusercontent.com'
).trim();

/**
 * Dynamically load Google Identity Services script
 */
export const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-jssdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google SDK')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-jssdk';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
};

/**
 * Exchange Google ID token or Profile credential with backend
 */
export const authenticateWithBackend = async (payload: {
  credential?: string;
  profile?: {
    email: string;
    name: string;
    picture?: string;
    googleId?: string;
  };
}): Promise<{ success: boolean; user: User; token: string }> => {
  const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') || 'http://localhost:5000/api';
  const url = base.endsWith('/api') ? `${base}/auth/google` : `${base}/api/auth/google`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Google authentication server error' }));
    throw new Error(err.error || err.detail || `Server error (${res.status})`);
  }

  return res.json();
};

/**
 * Client-side JWT parser helper
 */
export const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Custom hook for Google Sign-In with status & error management
 */
export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (onSuccess: (user: User, token: string) => void) => {
      setIsLoading(true);
      setError(null);

      // Safety timeout to prevent infinite button loading state
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
      }, 6000);

      try {
        if (!GOOGLE_CLIENT_ID) {
          clearTimeout(safetyTimer);
          setError('Google Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
          setIsLoading(false);
          return;
        }

        const isNativeMobile = Capacitor.isNativePlatform() || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const redirectUri = window.location.origin + '/login';
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          GOOGLE_CLIENT_ID
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;

        // Mobile Android WebViews do not support GIS popups due to Google security policies. Use direct OAuth redirect.
        if (isNativeMobile) {
          window.location.href = oauthUrl;
          return;
        }

        await loadGoogleScript();

        // Desktop Web Popup Client
        if (window.google?.accounts?.oauth2) {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              clearTimeout(safetyTimer);
              if (tokenResponse?.access_token) {
                try {
                  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const gProfile = await userRes.json();
                  if (gProfile?.email) {
                    const authResult = await authenticateWithBackend({
                      profile: {
                        email: gProfile.email,
                        name: gProfile.name || gProfile.email.split('@')[0],
                        picture: gProfile.picture || '',
                        googleId: gProfile.sub,
                      },
                    });
                    if (authResult?.user) {
                      onSuccess(authResult.user, authResult.token);
                    }
                  } else {
                    throw new Error('Could not retrieve user email from Google.');
                  }
                } catch (e: any) {
                  setError(e.message || 'Failed to authenticate Google profile.');
                } finally {
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
            },
            error_callback: (err: any) => {
              clearTimeout(safetyTimer);
              console.warn('OAuth popup closed or failed, falling back to redirect:', err);
              window.location.href = oauthUrl;
            },
          });
          client.requestAccessToken();
          return;
        }

        // Redirect Fallback
        window.location.href = oauthUrl;
      } catch (err: any) {
        clearTimeout(safetyTimer);
        setError(err.message || 'Google sign-in failed.');
        setIsLoading(false);
      }
    },
    []
  );

  return { signIn, isLoading, error, setError };
};

