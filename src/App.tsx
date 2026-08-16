import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { AppRoutes } from './app/routes';
import { useCarePulseStore } from './lib/store';
import { SplashScreen } from './components/ui/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Key stored in localStorage to track first launch
const SPLASH_SEEN_KEY = 'carepulse_splash_seen';

export const App: React.FC = () => {
  // On first ever launch: localStorage has no key → show splash.
  // On all subsequent opens: key exists → skip splash immediately.
  const [showSplash, setShowSplash] = useState<boolean>(
    () => !localStorage.getItem(SPLASH_SEEN_KEY)
  );
  const isInitializing = useCarePulseStore((s) => s.isInitializing);
  const checkAuthSession = useCarePulseStore((s) => s.checkAuthSession);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  const handleSplashComplete = () => {
    // Mark splash as seen permanently so it never shows again
    localStorage.setItem(SPLASH_SEEN_KEY, '1');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B5A54] flex flex-col items-center justify-center p-6 text-white text-center select-none">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl animate-pulse">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl animate-ping pointer-events-none" />
        </div>
        <h1 className="text-2xl font-black font-heading tracking-tight text-white mb-1.5">CarePulse</h1>
        <p className="text-xs text-teal-100/80 font-medium tracking-wide">Loading CarePulse...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white w-full relative flex flex-col overflow-x-hidden">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
