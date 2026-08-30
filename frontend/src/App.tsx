import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { useCarePulseStore } from './lib/store';
import { SplashScreen } from './components/ui/SplashScreen';
import { OfflineBanner } from './components/ui/OfflineBanner';

import { Capacitor } from '@capacitor/core';

// Helper to determine if current URL is a staff portal
const isStaffLanding = (): boolean => {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname.toLowerCase();
  const isStaffPath =
    path.startsWith('/receptionist') ||
    path.startsWith('/doctor') ||
    path.startsWith('/admin') ||
    path.startsWith('/staff');

  if (isStaffPath) return true;

  if (!Capacitor.isNativePlatform()) {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isMobileBrowser =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768);

    if (!isMobileBrowser && path === '/') return true;
  }

  return false;
};

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
    } catch (_) {}

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

/**
 * Handles in-app APK version checking on startup.
 * Non-blocking, fails silently if offline, and prompts user if server version > installed.
 */
const AppUpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);

  const runCheck = async () => {
    try {
      const info = await checkForAppUpdate();
      if (info && info.isUpdateAvailable) {
        setUpdateInfo(info);
      }
    } catch (err) {
      console.warn('[AppUpdateChecker] check error:', err);
    }
  };

  useEffect(() => {
    // Run check immediately on mount
    const timer = setTimeout(() => {
      runCheck();
    }, 400);

    // Also check when app comes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  // Show splash on patient app launch / cold start. Bypass for staff portals.
  const [showSplash, setShowSplash] = useState<boolean>(() => !isStaffLanding());
  const checkAuthSession = useCarePulseStore((s) => s.checkAuthSession);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  const handleSplashComplete = () => {
    // Finish initialization and transition into the app
    useCarePulseStore.setState({ isInitializing: false });
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <BrowserRouter>
      <NotificationNavigationListener />
      <AppUpdateChecker />
      <OfflineBanner />
      <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white w-full relative flex flex-col overflow-x-hidden">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
};

export default App;
