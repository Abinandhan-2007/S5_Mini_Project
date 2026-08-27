import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCw, WifiOff } from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';

interface SplashScreenProps {
  onComplete: () => void;
}

export type SplashState = 'loading' | 'success' | 'error';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const isOnlineInitially = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const [splashState, setSplashState] = useState<SplashState>(() => (isOnlineInitially ? 'loading' : 'error'));
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(
    () => (isOnlineInitially ? 'Checking connection...' : 'Internet is turned off. Please turn on Wi-Fi or Mobile Data.')
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const checkAuthSession = useCarePulseStore((s) => s.checkAuthSession);

  const isCancelledRef = useRef(false);

  // Linear Loading Animation (0% to 100% strictly linear over 2200ms)
  const startLinearLoading = useCallback(() => {
    // 1. Immediately verify network status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSplashState('error');
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
      return () => {};
    }

    isCancelledRef.current = false;
    setProgress(0);
    setSplashState('loading');
    setStatusText('Checking connection...');

    // Trigger backend session check in parallel
    checkAuthSession().catch(() => null);

    const totalDuration = 2200; // 2.2 seconds total duration
    const intervalTime = 16; // ~60fps smooth linear updates
    const increment = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      if (isCancelledRef.current) {
        clearInterval(timer);
        return;
      }

      // Check if network dropped mid-loading
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        clearInterval(timer);
        setSplashState('error');
        setStatusText('Internet connection lost. Please reconnect to continue.');
        return;
      }

      setProgress((prev) => {
        const next = prev + increment;

        // Linear status text milestones
        if (next >= 0 && next < 30) {
          setStatusText('Checking connection...');
        } else if (next >= 30 && next < 70) {
          setStatusText('Connecting to server...');
        } else if (next >= 70 && next < 95) {
          setStatusText('Fetching your data...');
        } else if (next >= 95 && next < 100) {
          setStatusText('Almost ready...');
        }

        if (next >= 100) {
          clearInterval(timer);
          setSplashState('success');
          setStatusText('Ready');
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [checkAuthSession]);

  // Initial startup
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSplashState('error');
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
      return;
    }

    const cleanup = startLinearLoading();
    return () => {
      isCancelledRef.current = true;
      if (cleanup) cleanup();
    };
  }, [startLinearLoading]);

  // Navigate to App once linear progress hits 100%
  useEffect(() => {
    if (splashState === 'success') {
      const timer = setTimeout(() => {
        onComplete();
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
      setStatusText('Internet is turned off. Please turn on Wi-Fi or Mobile Data.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [startLinearLoading]);

  // Manual Retry
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setStatusText('Testing connection...');

    setTimeout(() => {
      setIsRetrying(false);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        startLinearLoading();
      } else {
        setSplashState('error');
        setStatusText('Internet is still off. Please connect to the internet and tap Retry.');
      }
    }, 600);
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
            opacity: splashState === 'error' ? 0.6 : 1
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* Outer Breathing Halo Ring */}
          <div className={`absolute -inset-4 rounded-full blur-xl transition-all duration-700 ${splashState === 'error' ? 'bg-rose-500/15' : 'bg-teal-400/20 animate-pulse'
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
              {/*
                TRUE SEAMLESS CSS LOOP:
                - One tile = 180px wide containing exactly 3 heartbeat cycles
                - We render 2 tiles side by side = 360px total
                - CSS keyframes scrolls translateX(0) → translateX(-180px) = exactly 1 tile width
                - At -180px the visual is identical to 0px → zero visible jump, ever
              */}
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
                {/* Tile B (identical copy — when A scrolls out, B is already in place) */}
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
                    className={`h-full rounded-full transition-all duration-75 ease-linear shadow-[0_0_12px_rgba(45,212,191,0.8)] ${progress >= 90
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
                    <WifiOff className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-left space-y-0.5">
                    <h4 className="font-bold text-white text-xs">Internet is Off</h4>
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
                  <span>{isRetrying ? 'Checking Connection...' : 'Retry Connection'}</span>
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
          CarePulse • v1.0.0
        </p>
      </motion.div>
    </div>
  );
};
