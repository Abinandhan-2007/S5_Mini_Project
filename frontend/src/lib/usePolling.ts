import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePollingOptions {
  /**
   * Polling interval in milliseconds.
   * Defaults to 7500ms (7.5 seconds) - within the conservative 5-10s range.
   */
  interval?: number;

  /**
   * Whether polling is currently enabled.
   * Defaults to true. Set to false if unauthenticated or on inactive views.
   */
  enabled?: boolean;

  /**
   * Whether to execute an immediate fetch upon mounting or tab regain.
   * Defaults to true.
   */
  immediate?: boolean;

  /**
   * Optional callback triggered when a polling request fails.
   */
  onError?: (error: any) => void;

  /**
   * Optional callback triggered when a polling request succeeds.
   */
  onSuccess?: () => void;
}

export interface UsePollingReturn {
  /**
   * True only during the initial first fetch on mount.
   * Use this for initial spinners/skeletons.
   */
  isInitialLoading: boolean;

  /**
   * True whenever a background polling fetch is currently in-flight.
   */
  isPolling: boolean;

  /**
   * Timestamp of the most recent successful fetch.
   */
  lastUpdated: Date | null;

  /**
   * Any error thrown by the most recent fetch attempt.
   */
  error: any | null;

  /**
   * Function to manually trigger an immediate refetch.
   */
  refetch: () => Promise<void>;
}

/**
 * Reusable React hook for robust, non-overlapping background polling
 * with Page Visibility API support and automatic cleanup.
 */
export function usePolling(
  fetchFn: () => Promise<any> | void,
  options: UsePollingOptions = {}
): UsePollingReturn {
  const {
    interval = 7500,
    enabled = true,
    immediate = true,
    onError,
    onSuccess,
  } = options;

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(immediate && enabled);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<any | null>(null);

  // References to keep track of state across timer cycles without recreating effects
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const hasInitializedRef = useRef<boolean>(false);

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const executeFetch = useCallback(async () => {
    // If unmounted or already executing, prevent stacking/overlapping calls
    if (!isMountedRef.current || inFlightRef.current || !enabled) {
      return;
    }

    inFlightRef.current = true;
    setIsPolling(true);

    try {
      await fetchFnRef.current();
      if (isMountedRef.current) {
        const now = new Date();
        setLastUpdated(now);
        setError(null);
        if (onSuccessRef.current) {
          onSuccessRef.current();
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err);
        if (onErrorRef.current) {
          onErrorRef.current(err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        inFlightRef.current = false;
        setIsPolling(false);
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setIsInitialLoading(false);
        }

        // Schedule next poll only AFTER the previous request finishes,
        // and only if the document is currently visible and polling is enabled.
        if (enabled && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          clearExistingTimer();
          timerRef.current = setTimeout(() => {
            executeFetch();
          }, interval);
        }
      }
    }
  }, [enabled, interval, clearExistingTimer]);

  // Handle visibility changes (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;

      if (document.visibilityState === 'visible') {
        // Tab became visible: resume polling and execute immediate refresh
        if (enabled) {
          clearExistingTimer();
          executeFetch();
        }
      } else {
        // Tab hidden: pause polling to conserve client & server resources
        clearExistingTimer();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, executeFetch, clearExistingTimer]);

  // Main polling lifecycle effect
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      clearExistingTimer();
      setIsInitialLoading(false);
      return;
    }

    if (immediate) {
      executeFetch();
    } else {
      setIsInitialLoading(false);
      clearExistingTimer();
      timerRef.current = setTimeout(() => {
        executeFetch();
      }, interval);
    }

    return () => {
      isMountedRef.current = false;
      clearExistingTimer();
    };
  }, [enabled, interval, immediate, executeFetch, clearExistingTimer]);

  const refetch = useCallback(async () => {
    clearExistingTimer();
    await executeFetch();
  }, [clearExistingTimer, executeFetch]);

  return {
    isInitialLoading,
    isPolling,
    lastUpdated,
    error,
    refetch,
  };
}
