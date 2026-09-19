import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { useCarePulseStore } from './lib/store';
import { SplashScreen } from './components/ui/SplashScreen';
import { OfflineBanner } from './components/ui/OfflineBanner';

import { Capacitor } from '@capacitor/core';


/**
 * Handles push notification taps and deep-link routing inside React Router.
 */
const NotificationNavigationListener: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if there was a pending notification route saved during cold boot/splash
    try {
      const pendingRoute = sessionStorage.getItem('pending_notification_route');
      if (pendingRoute) {
        sessionStorage.removeItem('pending_notification_route');
        navigate(pendingRoute);
      }
    } catch (_) { }

    // 2. Listen for live notification tap events dispatched from Capacitor push listener
    const handleNotificationNav = (event: Event) => {
      const customEvent = event as CustomEvent<{ screen?: string; data?: any }>;
      const targetScreen = customEvent.detail?.screen;
      if (targetScreen) {
        navigate(targetScreen, { state: customEvent.detail?.data });
      }
    };

    window.addEventListener('carepulse:notification_navigate', handleNotificationNav);
    return () => {
      window.removeEventListener('carepulse:notification_navigate', handleNotificationNav);
    };
  }, [navigate]);

  return null;
};

import { checkForAppUpdate, type AppVersionInfo } from './lib/versionChecker';
import { UpdateAvailableModal } from './components/ui/UpdateAvailableModal';
import { registerPushNotifications } from './lib/pushNotifications';
import { initMedicationNotificationService } from './services/medicationNotificationService';
import { LanguageProvider } from './i18n';
import { TtsFallbackToast } from './components/ui/TtsFallbackToast';

/**
 * Handles live foreground-resume APK version checking when app is already running.
 */
const AppResumeUpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    // Only run update check on native Android/iOS platform (not on web browser or staff portals)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const runCheck = async () => {
      try {
        const info = await checkForAppUpdate();
        if (info && info.isUpdateAvailable) {
          setUpdateInfo(info);
        }
      } catch (err) {
        console.warn('[AppResumeUpdateChecker] check error:', err);
      }
    };

    // Check when app returns from background to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('carepulse:check_update', runCheck);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('carepulse:check_update', runCheck);
    };
  }, []);

  if (!updateInfo) return null;

  return (
    <UpdateAvailableModal
      updateInfo={updateInfo}
      onDismiss={() => setUpdateInfo(null)}
    />
  );
};

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        if (
          sessionStorage.getItem('carepulse_skip_splash') === 'true' ||
          localStorage.getItem('carepulse_skip_splash') === 'true' ||
          window.navigator.webdriver
        ) {
          return false;
        }

        // On desktop web, if user has an active session, skip splash on reload
        if (!Capacitor.isNativePlatform()) {
          const path = window.location.pathname.toLowerCase();
          const hasStaff = !!localStorage.getItem('carepulse_staff') || !!sessionStorage.getItem('carepulse_staff');
          const hasPatient = !!localStorage.getItem('carepulse_user') || localStorage.getItem('has_logged_in') === 'true';
          const isStaffRoute =
            path.startsWith('/receptionist') ||
            path.startsWith('/doctor') ||
            path.startsWith('/admin') ||
            path.startsWith('/staff') ||
            path.startsWith('/superadmin') ||
            path.startsWith('/nurse');

          if (hasStaff || hasPatient || isStaffRoute) {
            sessionStorage.setItem('carepulse_skip_splash', 'true');
            return false;
          }
        }
      } catch {}
    }
    return true;
  });
  const [startupUpdateInfo, setStartupUpdateInfo] = useState<AppVersionInfo | null>(null);
  const checkAuthSession = useCarePulseStore((s) => s.checkAuthSession);

  useEffect(() => {
    if (!showSplash) {
      useCarePulseStore.setState({ isInitializing: false });
    }
  }, [showSplash]);

  // Restore session on app mount
  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  // Automatically register device for push notifications and initialize medication eating alerts
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      registerPushNotifications().catch(() => { });
    }
    initMedicationNotificationService().catch(() => { });
  }, []);

  const handleSplashComplete = (updateInfo?: AppVersionInfo | null) => {
    try {
      sessionStorage.setItem('carepulse_skip_splash', 'true');
    } catch {}
    setShowSplash(false);
    if (updateInfo && updateInfo.isUpdateAvailable) {
      // Prompt user FIRST with update modal before mounting routes, login screen, or biometric lock
      setStartupUpdateInfo(updateInfo);
    } else {
      useCarePulseStore.setState({ isInitializing: false });
    }
  };

  const handleDismissStartupUpdate = () => {
    setStartupUpdateInfo(null);
    useCarePulseStore.setState({ isInitializing: false });
  };

  // 1. Splash Screen Phase
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // 2. Pre-Auth Update Check Phase: Render Update Available Modal FIRST if a newer APK is detected on native mobile
  if (startupUpdateInfo && Capacitor.isNativePlatform()) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <UpdateAvailableModal
          updateInfo={startupUpdateInfo}
          onDismiss={handleDismissStartupUpdate}
        />
      </div>
    );
  }

  // 3. Normal Authenticated App Flow (Biometric Lock / Session Restore / Login / Routes)
  return (
    <BrowserRouter>
      <LanguageProvider>
        <NotificationNavigationListener />
        <AppResumeUpdateChecker />
        <OfflineBanner />
        <TtsFallbackToast />
        <div className="min-h-screen min-h-[100dvh] bg-white text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white w-full relative flex flex-col items-stretch overflow-x-hidden">
          <AppRoutes />
        </div>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
