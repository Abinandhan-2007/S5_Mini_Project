import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCw, WifiOff, AlertTriangle } from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { checkBackendHealth } from '../../lib/apiFetch';
import { checkForAppUpdate, type AppVersionInfo } from '../../lib/versionChecker';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface SplashScreenProps {
  onComplete: (updateInfo?: AppVersionInfo | null) => void;
}

export type SplashState = 'loading' | 'success' | 'error';
export type ErrorType = 'network' | 'server';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const isOnlineInitially = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const [splashState, setSplashState] = useState<SplashState>(() => (isOnlineInitially ? 'loading' : 'error'));
  const [errorType, setErrorType] = useState<ErrorType>(() => (isOnlineInitially ? 'server' : 'network'));
  const [progress, setProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const [statusText, setStatusText] = useState(
    () => (isOnlineInitially ? 'Checking connection...' : 'Internet is turned off. Please turn on Wi-Fi or Mobile Data.')
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('1.5.0');
  const checkAuthSession = useCarePulseStore((s) => s.checkAuthSession);

  const isCancelledRef = useRef(false);
  const detectedUpdateRef = useRef<AppVersionInfo | null>(null);

  // Smooth frame-based continuous progress interpolator (0% to 100% constant flow)
  useEffect(() => {
    let animationFrameId: number;
    const updateSmoothProgress = () => {
      setProgress((prev) => {
        const target = targetProgressRef.current;
        if (prev < target) {
          const diff = target - prev;
          const step = Math.max(0.4, diff * 0.1);
          const next = Math.min(target, prev + step);
          return next;
        }
        return prev;
      });
      animationFrameId = requestAnimationFrame(updateSmoothProgress);
    };
    animationFrameId = requestAnimationFrame(updateSmoothProgress);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.getInfo()
        .then((info) => {
          if (info?.version) {
            setAppVersion(info.version);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Real Health-Checked Loading Flow
  const startLinearLoading = useCallback(async () => {
    // 1. Check local network connectivity first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSplashState('error');
      setErrorType('network');
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
      return;
    }

    isCancelledRef.current = false;
    targetProgressRef.current = 25;
    setSplashState('loading');
    setStatusText('Connecting to CarePulse server...');

    // 2. Perform real backend health check against /api/health
    const isHealthy = await checkBackendHealth();

    if (isCancelledRef.current) return;

    if (!isHealthy) {
      // Backend is NOT running or unreachable -> BLOCK app opening
      setSplashState('error');
      setErrorType('server');
      setStatusText('Cannot connect to CarePulse server. Please make sure the backend is running.');
      return;
    }

    // 3. Backend verified online -> Concurrently check session & check for native APK update
    targetProgressRef.current = 65;
    setStatusText('Checking for updates & syncing...');

    try {
      const sessionPromise = checkAuthSession().catch(() => {});
      const updatePromise = Capacitor.isNativePlatform()
        ? Promise.race([
            checkForAppUpdate(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ])
        : Promise.resolve(null);

      const [, updateResult] = await Promise.allSettled([sessionPromise, updatePromise]);
      if (updateResult.status === 'fulfilled' && updateResult.value) {
        detectedUpdateRef.current = updateResult.value;
      }
    } catch {
      // Non-fatal if session sync or update check fails
    }

    if (isCancelledRef.current) return;

    targetProgressRef.current = 88;
    setStatusText('Fetching your data...');

    await new Promise((r) => setTimeout(r, 250));
    if (isCancelledRef.current) return;

    targetProgressRef.current = 96;
    setStatusText('Almost ready...');

    await new Promise((r) => setTimeout(r, 250));
    if (isCancelledRef.current) return;

    targetProgressRef.current = 100;
    setStatusText('Ready');

    await new Promise((r) => setTimeout(r, 350));
    if (isCancelledRef.current) return;

    setSplashState('success');
  }, [checkAuthSession]);

  // Initial startup
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSplashState('error');
      setErrorType('network');
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
      return;
    }

    startLinearLoading();
    return () => {
      isCancelledRef.current = true;
    };
  }, [startLinearLoading]);

  // Navigate to App ONLY once verified healthy and progress reaches 100%
  useEffect(() => {
    if (splashState === 'success') {
      const timer = setTimeout(() => {
        onComplete(detectedUpdateRef.current);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [splashState, onComplete]);

  // Monitor network online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      setSplashState('loading');
      setStatusText('Reconnecting to CarePulse...');
      startLinearLoading();
    };

    const handleOffline = () => {
      isCancelledRef.current = true;
      setSplashState('error');
      setErrorType('network');
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [startLinearLoading]);

  // Manual Retry Handler
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setStatusText('Testing connection...');

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTimeout(() => {
        setIsRetrying(false);
        setSplashState('error');
        setErrorType('network');
        setStatusText('Internet is still off. Please connect to the internet and tap Retry.');
      }, 400);
      return;
    }

    const isHealthy = await checkBackendHealth();
    setIsRetrying(false);

    if (isHealthy) {
      startLinearLoading();
    } else {
      setSplashState('error');
      setErrorType('server');
      setStatusText('Server is still unreachable. Please ensure the backend is started on port 5000 and tap Retry.');
    }
  }, [startLinearLoading]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col justify-between items-center px-6 py-12 text-white select-none overflow-hidden font-sans antialiased bg-[#041614]">
      {/* Ambient Background Radial Bloom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,#0B423D_0%,#052320_50%,#031210_100%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Spacer */}
      <div className="w-full h-4 z-10" />

      {/* Center Hero Unit: Logo, Brand & Linear Loading */}
      <div className="flex flex-col items-center text-center my-auto w-full max-w-sm z-10">

        {/* Animated Brand Emblem */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{
            scale: splashState === 'error' ? 0.95 : 1,
            opacity: splashState === 'error' ? 0.7 : 1
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* Outer Breathing Halo Ring */}
          <div className={`absolute -inset-4 rounded-full blur-xl transition-all duration-700 ${splashState === 'error' ? 'bg-rose-500/20' : 'bg-teal-400/20 animate-pulse'
            }`} />

          {/* Glassmorphic ECG Monitor Disc */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-white/[0.16] to-white/[0.04] border border-white/25 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
            {/* Subtle Clinical Grid */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(45,212,191,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(45,212,191,0.25)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

            {/* Edge Fade Mask */}
            <div 
              className="w-full h-full flex items-center overflow-hidden relative z-10"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '360px',
                  flexShrink: 0,
                  animation: 'ecgScroll 1.8s linear infinite',
                  filter: splashState === 'error'
                    ? 'drop-shadow(0 0 8px rgba(244,63,94,0.7))'
                    : 'drop-shadow(0 0 10px #5EEAD4) drop-shadow(0 0 18px rgba(45,212,191,0.9))',
                }}
              >
                {/* Tile A */}
                <svg
                  viewBox="0 0 180 48"
                  width="180"
                  height="48"
                  fill="none"
                  stroke={splashState === 'error' ? '#f87171' : '#5eead4'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M0 24 H18 C21 18 27 18 30 24 H36 L40 32 L46 4 L52 44 L56 24 H60 C64 16 72 16 76 24 H90 C94 18 100 18 103 24 H109 L113 32 L119 4 L125 44 L129 24 H133 C137 16 145 16 149 24 H162 C165 18 171 18 174 24 H180" />
                </svg>
                {/* Tile B */}
                <svg
                  viewBox="0 0 180 48"
                  width="180"
                  height="48"
                  fill="none"
                  stroke={splashState === 'error' ? '#f87171' : '#5eead4'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M0 24 H18 C21 18 27 18 30 24 H36 L40 32 L46 4 L52 44 L56 24 H60 C64 16 72 16 76 24 H90 C94 18 100 18 103 24 H109 L113 32 L119 4 L125 44 L129 24 H133 C137 16 145 16 149 24 H162 C165 18 171 18 174 24 H180" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Brand Titles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-1.5 mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] uppercase text-white drop-shadow-sm font-heading">
            CarePulse
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/60 font-medium tracking-wide">
            Empathetic healthcare at your fingertips
          </p>
        </motion.div>

        {/* Linear Progress Bar & Status Section */}
        <div className="w-full max-w-[280px]">
          <AnimatePresence mode="wait">
            {splashState === 'loading' && (
              <motion.div
                key="loading-linear"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Thin Sleek Linear Progress Track */}
                <div className="w-full h-1.5 rounded-full bg-white/[0.08] backdrop-blur-sm overflow-hidden p-[1px] border border-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(45,212,191,0.8)] ${progress >= 90
                        ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-green-300'
                        : 'bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-300'
                      }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>

                {/* Status Message & Monospace Percentage */}
                <div className="flex justify-between items-center text-[11px] font-medium text-teal-200/70 px-0.5">
                  <span className="truncate">{statusText}</span>
                  <span className="font-mono text-white/90 font-semibold ml-2">{Math.min(100, Math.round(progress))}%</span>
                </div>
              </motion.div>
            )}

            {splashState === 'success' && (
              <motion.div
                key="success-badge"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{statusText}</span>
              </motion.div>
            )}

            {splashState === 'error' && (
              <motion.div
                key="error-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3.5"
              >
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/30 backdrop-blur-md flex items-center gap-3 text-rose-200 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    {errorType === 'network' ? (
                      <WifiOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="text-left space-y-0.5">
                    <h4 className="font-bold text-white text-xs">
                      {errorType === 'network' ? 'Internet is Off' : 'Server Offline'}
                    </h4>
                    <p className="text-[11px] text-rose-200/90 font-medium leading-tight">{statusText}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full py-2.5 px-4 rounded-full bg-teal-400 hover:bg-teal-300 text-[#041614] active:scale-95 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(45,212,191,0.25)] transition-all cursor-pointer disabled:opacity-60"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Testing Connection...' : 'Retry Connection'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Minimal Version Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full text-center z-10"
      >
        <p className="text-[10px] tracking-[0.25em] text-teal-100/30 uppercase font-mono">
          CarePulse • v{appVersion}
        </p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
