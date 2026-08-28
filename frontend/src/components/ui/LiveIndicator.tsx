import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export interface LiveIndicatorProps {
  /**
   * Timestamp of the most recent sync.
   */
  lastUpdated?: Date | null;

  /**
   * Whether a polling request is actively in-flight.
   */
  isPolling?: boolean;

  /**
   * Optional custom label, e.g. "Live", "Live Sync", "Real-time".
   * Defaults to "Live".
   */
  label?: string;

  /**
   * Whether to display "Updated Xs ago" relative timestamp.
   * Defaults to true.
   */
  showTimeAgo?: boolean;

  /**
   * Visual layout style.
   * 'pill' | 'minimal' | 'badge'
   * Defaults to 'pill'.
   */
  variant?: 'pill' | 'minimal' | 'badge';

  /**
   * Optional manual refresh handler.
   */
  onRefresh?: () => void;

  /**
   * Custom CSS class names.
   */
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  lastUpdated,
  isPolling = false,
  label = 'Live',
  showTimeAgo = true,
  variant = 'pill',
  onRefresh,
  className = '',
}) => {
  const [timeAgo, setTimeAgo] = useState<string>('Just now');

  useEffect(() => {
    if (!lastUpdated) {
      setTimeAgo('Connecting...');
      return;
    }

    const updateRelativeTime = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo('Just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes}m ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 3000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 select-none ${className}`}
        title={lastUpdated ? `Last synchronized at ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
              isPolling ? 'animate-ping' : 'animate-pulse'
            }`}
          />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>{label}</span>
        {showTimeAgo && <span className="text-[10px] text-slate-400 font-normal">({timeAgo})</span>}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs select-none ${className}`}
        title={lastUpdated ? `Last synchronized at ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>{label}</span>
        {isPolling && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600 ml-0.5" />}
      </span>
    );
  }

  // Default 'pill' variant
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/90 shadow-2xs text-[11px] text-slate-600 select-none ${className}`}
      title={lastUpdated ? `Last synchronized at ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
            isPolling ? 'animate-ping' : 'animate-pulse'
          }`}
        />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      <span className="font-bold text-slate-800 tracking-tight">{label}</span>

      {showTimeAgo && (
        <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
          {isPolling ? 'Syncing...' : timeAgo}
        </span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={isPolling}
          className="p-0.5 text-slate-400 hover:text-[#0B5A54] transition-colors rounded-full hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          title="Force refresh data"
          aria-label="Refresh now"
        >
          <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin text-[#0B5A54]' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default LiveIndicator;
