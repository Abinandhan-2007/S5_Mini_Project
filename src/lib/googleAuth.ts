import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import type { User } from './types';
import { apiPost } from './apiFetch';

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
  const res = await apiPost('/auth/google', payload);

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
 * Completely sign out from Google on both native Android & Web
 * Clears cached Google accounts so next sign-in prompts the full account selection dialog.
 */
export const signOutGoogle = async (): Promise<void> => {
  // 1. Clear Web GIS
  try {
    const w = window as any;
    if (w.google?.accounts?.id) {
      w.google.accounts.id.disableAutoSelect();
    }
  } catch {}

  // 2. Clear Native Capacitor Google Auth session safely without crashing
  if (Capacitor.isNativePlatform()) {
    try {
      if (GOOGLE_CLIENT_ID) {
        GoogleAuth.initialize({
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['profile', 'email'],
        });
      }
      await GoogleAuth.signOut();
    } catch (e) {
      console.warn('Native GoogleAuth signOut safe note:', e);
    }
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

        if (Capacitor.isNativePlatform()) {
          try {
            GoogleAuth.initialize({
              clientId: GOOGLE_CLIENT_ID,
              scopes: ['profile', 'email'],
              grantOfflineAccess: true,
              forceCodeForRefreshToken: true,
            } as any);

            // Sign out of previous native Google session to force account picker
            await GoogleAuth.signOut().catch(() => {});

            const gUser = await GoogleAuth.signIn();
            clearTimeout(safetyTimer);

            if (gUser?.email) {
              let backendUser: User | null = null;
              let authToken = gUser.authentication?.idToken || `g-token-${Date.now()}`;

              try {
                const authResult = await authenticateWithBackend({
                  credential: gUser.authentication?.idToken,
                  profile: {
                    email: gUser.email,
                    name: gUser.name || gUser.givenName || gUser.email.split('@')[0],
                    picture: gUser.imageUrl || '',
                    googleId: gUser.id,
                  },
                });
                if (authResult?.user) {
                  backendUser = authResult.user;
                  authToken = authResult.token || authToken;
                }
              } catch (backendErr) {
                console.warn('Backend sync note, proceeding with native Google profile:', backendErr);
              }

              const resolvedUser: User = backendUser || {
                id: gUser.id || `usr-g-${Date.now()}`,
                fullName: gUser.name || gUser.givenName || gUser.email.split('@')[0],
                email: gUser.email,
                phone: '',
                dob: '1998-05-15',
                gender: 'Other',
                bloodGroup: 'O+',
                emergencyContact: {
                  name: 'Emergency Contact',
                  phone: '+91 98765 43210',
                  relationship: 'Primary',
                },
                avatarUrl: gUser.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
                authProvider: 'google',
              };

              onSuccess(resolvedUser, authToken);
            }
          } catch (nativeErr: any) {
            clearTimeout(safetyTimer);
            console.warn('Native Google Auth note:', nativeErr);
            setError(nativeErr?.message || 'Google Sign-in was cancelled.');
          } finally {
            setIsLoading(false);
          }
          return;
        }

        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const redirectUri = window.location.origin + '/login';
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          GOOGLE_CLIENT_ID
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;

        // Mobile browser fallback
        if (isMobileBrowser) {
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

