import React from 'react';
import { X, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCarePulseStore } from '../../lib/store';

export const OfflineBanner: React.FC = () => {
  const isOfflineMode = useCarePulseStore((s) => s.isOfflineMode);
  const isOfflineDismissed = useCarePulseStore((s) => s.isOfflineDismissed);
  const dismissOfflineBanner = useCarePulseStore((s) => s.dismissOfflineBanner);

  const isVisible = isOfflineMode && !isOfflineDismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          aria-label="Offline Mode Warning Banner"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -40, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -40, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="sticky top-0 z-[100] w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-lg border-b border-red-800/40 select-none"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="flex items-center justify-center p-1.5 rounded-lg bg-red-950/40 text-red-100 shrink-0">
                <WifiOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-pulse text-amber-200" />
              </span>
              <span className="truncate">
                <strong className="font-extrabold mr-1.5 bg-red-950/40 px-2 py-0.5 rounded text-amber-200 uppercase tracking-wide text-[11px]">Database Offline</strong>
                PostgreSQL is unreachable. Please start PostgreSQL / pgAdmin. (Offline sync is disabled)
              </span>
            </div>

            <button
              onClick={dismissOfflineBanner}
              className="p-1 rounded-lg hover:bg-black/20 active:scale-95 text-white/90 hover:text-white transition-all shrink-0 cursor-pointer"
              title="Dismiss warning"
              aria-label="Dismiss offline banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
