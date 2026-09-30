import React, { useState } from 'react';
import { X, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCarePulseStore } from '../../lib/store';
import { checkBackendHealth } from '../../lib/apiFetch';

export const OfflineBanner: React.FC = () => {
  const isOfflineMode = useCarePulseStore((s) => s.isOfflineMode);
  const isOfflineDismissed = useCarePulseStore((s) => s.isOfflineDismissed);
  const dismissOfflineBanner = useCarePulseStore((s) => s.dismissOfflineBanner);

  const [isChecking, setIsChecking] = useState(false);
  const [retryStatus, setRetryStatus] = useState<'idle' | 'success' | 'offline'>('idle');

  const isVisible = isOfflineMode && !isOfflineDismissed;

  const handleCheckConnection = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setRetryStatus('idle');

    try {
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        setRetryStatus('success');
      } else {
        setRetryStatus('offline');
        setTimeout(() => setRetryStatus('idle'), 3500);
      }
    } catch {
      setRetryStatus('offline');
      setTimeout(() => setRetryStatus('idle'), 3500);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          aria-label="Offline Mode Status Notice"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -24, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -24, height: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 z-[100] w-full bg-slate-900/95 backdrop-blur-md text-slate-100 border-b border-amber-500/25 shadow-md select-none overflow-hidden"
        >
          {/* Subtle warm accent line */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
            {/* Left: Status Badge & Message */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Refined Status Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px] tracking-wider uppercase shrink-0 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Offline Mode</span>
              </div>

              {/* Informative Professional Message */}
              <div className="truncate text-slate-300 font-medium">
                <span className="text-white font-semibold">Service Disconnected</span>
                <span className="hidden md:inline text-slate-400 font-normal ml-1.5">
                  — Operating in local mode. Patient records and actions are safely cached and will synchronize once reconnected.
                </span>
                <span className="md:hidden text-slate-400 font-normal ml-1">
                  — Safe local mode active
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCheckConnection}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-slate-200 hover:text-white border border-slate-700/70 transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none shadow-2xs"
                title="Check connection to server"
                aria-label="Check server connection"
              >
                {retryStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Connected</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isChecking ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                    <span className="hidden xs:inline">
                      {isChecking ? 'Checking...' : retryStatus === 'offline' ? 'Still Offline' : 'Check Connection'}
                    </span>
                    <span className="xs:hidden">
                      {isChecking ? '...' : retryStatus === 'offline' ? 'Offline' : 'Retry'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={dismissOfflineBanner}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Dismiss notice"
                aria-label="Dismiss offline banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
