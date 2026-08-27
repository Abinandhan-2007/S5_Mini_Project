import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { useCarePulseStore } from './lib/store';
import { SplashScreen } from './components/ui/SplashScreen';

// Helper to determine if current URL is a staff portal
const isStaffLanding = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    hostname.includes('carepulse-s5.netlify.app') ||
    path.startsWith('/receptionist') ||
    path.startsWith('/doctor') ||
    path.startsWith('/admin') ||
    path.startsWith('/staff')
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
      <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white w-full relative flex flex-col overflow-x-hidden">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
};

export default App;
