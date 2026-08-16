import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export type SplashState = 'loading' | 'success' | 'error';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [splashState, setSplashState] = useState<SplashState>('loading');
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [statusText, setStatusText] = useState('Connecting to server...');
  const [isRetrying, setIsRetrying] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (splashState === 'error') {
        setSplashState('loading');
        setStatusText('Reconnecting to server...');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSplashState('error');
      setStatusText('Unable to connect. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [splashState]);

  // Loading progress bar animation (0% -> 100% in 3 seconds)
  useEffect(() => {
    if (!isOnline || splashState === 'error' || splashState === 'success') return;

    const totalDuration = 3000; // 3 seconds
    const intervalTime = 25;
    const increment = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;

        // Dynamic status text milestones
        if (next > 30 && next < 70) {
          setStatusText('Checking server authentication...');
        } else if (next >= 70 && next < 100) {
          setStatusText('Securing health data channel...');
        }

        if (next >= 100) {
          clearInterval(timer);
          setSplashState('success');
          setStatusText('Connection verified');
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOnline, splashState]);

  // Handle completion on success state
  useEffect(() => {
    if (splashState === 'success') {
      const completionTimer = setTimeout(() => {
        onComplete();
      }, 500); // Smooth fade transition into app
      return () => clearTimeout(completionTimer);
    }
  }, [splashState, onComplete]);

  // Retry Connection
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setStatusText('Verifying connection...');

    setTimeout(() => {
      const online = navigator.onLine;
      setIsOnline(online);
      setIsRetrying(false);

      if (online) {
        setSplashState('loading');
        setProgress(0);
        setStatusText('Connecting to server...');
      } else {
        setSplashState('error');
        setStatusText('Unable to connect. Please check your internet connection.');
      }
    }, 1000);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#073633] bg-gradient-to-b from-[#09423E] via-[#073633] to-[#042422] flex flex-col items-center justify-between px-6 py-10 text-white select-none overflow-hidden font-sans antialiased">
      
      {/* Top Subtle Status Pill */}
      <div className="w-full flex justify-center pt-2">
        <div className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-teal-200/70 font-semibold backdrop-blur-sm">
          CarePulse HealthTech
        </div>
      </div>

      {/* Main Centered Branding Section (Vertically Centered, Slightly Above Middle) */}
      <div className="flex flex-col items-center text-center my-auto -mt-8 space-y-7 max-w-sm w-full">
        {/* Minimal Clinical Logo */}
        <div className={`relative flex items-center justify-center transition-all duration-700 ${
          splashState === 'error' ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
        }`}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center shadow-xl">
            <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-teal-300 stroke-[1.75]" />
          </div>
          {/* Subtle Glow */}
          <div className="absolute inset-0 rounded-2xl bg-teal-400/10 blur-xl pointer-events-none" />
        </div>

        {/* Wordmark with generous letter spacing */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] font-heading text-white uppercase drop-shadow-sm">
            CarePulse
          </h1>
          <p className="text-xs text-teal-100/70 font-normal tracking-wider">
            Empathetic healthcare at your fingertips
          </p>
        </div>

        {/* Dynamic Loading / Success / Error Section */}
        <div className="w-full max-w-[260px] pt-4 space-y-3">
          {splashState === 'loading' && (
            <>
              {/* Thin Sleek Horizontal Loading Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-300 transition-all duration-75 ease-out shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>

              {/* Status Text */}
              <p className="text-[11px] font-medium text-teal-200/80 tracking-wide transition-all animate-pulse">
                {statusText}
              </p>
            </>
          )}

          {splashState === 'success' && (
            <div className="flex flex-col items-center space-y-1.5 animate-scale-up">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-semibold text-emerald-200 tracking-wide">
                {statusText}
              </p>
            </div>
          )}

          {splashState === 'error' && (
            <div className="flex flex-col items-center space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">{statusText}</span>
              </div>

              {/* Rounded Brand-Colored Retry Button */}
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full py-2.5 px-4 rounded-full bg-teal-400 text-[#073633] hover:bg-teal-300 active:scale-95 text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unobtrusive Bottom Tagline & Version */}
      <div className="w-full text-center pb-2 z-10">
        <p className="text-[10px] tracking-widest text-teal-100/40 uppercase font-light">
          CarePulse Patient Portal • v1.0.0
        </p>
      </div>
    </div>
  );
};
