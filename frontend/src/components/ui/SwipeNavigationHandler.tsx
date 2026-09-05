import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Ordered sequence for Patient App primary tabs
const PATIENT_TABS = ['/home', '/history', '/hospitals', '/profile'];

// Flow map for sequential flows
const SEQUENTIAL_NEXT_FLOWS: Record<string, string> = {
  '/login': '/register',
  '/health-ai': '/history',
  '/reminders': '/history',
  '/notifications': '/home',
  '/prescriptions': '/home',
};

const SEQUENTIAL_PREV_FLOWS: Record<string, string> = {
  '/register': '/login',
  '/complete-profile': '/home',
  '/profile/advanced-settings': '/profile',
  '/prescriptions/scan': '/prescriptions',
  '/medicine/info-lookup': '/prescriptions',
  '/prescriptions/info-lookup': '/prescriptions',
  '/escalation': '/health-ai',
  '/assessment-confirm': '/health-ai',
};

/**
 * Checks if a DOM element or any of its ancestors is an interactive
 * horizontal scrollable container or input element that should take precedence over page swipe gestures.
 */
const isInsideNonSwipeableElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;

  let current: HTMLElement | null = target;
  while (current && current !== document.body && current !== document.documentElement) {
    // 1. Explicit no-swipe attribute or class
    if (
      current.hasAttribute('data-no-swipe') ||
      current.classList.contains('no-swipe') ||
      current.classList.contains('date-scroller') ||
      current.classList.contains('no-scrollbar') ||
      current.classList.contains('overflow-x-auto') ||
      current.classList.contains('overflow-x-scroll')
    ) {
      // Check if it actually has horizontal overflow
      if (current.scrollWidth > current.clientWidth + 4) {
        return true;
      }
    }

    // 2. Interactive input, slider, canvas, map, or camera viewport
    const tagName = current.tagName.toLowerCase();
    if (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      tagName === 'canvas' ||
      tagName === 'video' ||
      current.getAttribute('role') === 'slider' ||
      current.getAttribute('role') === 'dialog' ||
      current.classList.contains('mapboxgl-map') ||
      current.classList.contains('leaflet-container')
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
};

export const SwipeNavigationHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [swipeIndicator, setSwipeIndicator] = useState<{
    direction: 'prev' | 'next';
    label: string;
  } | null>(null);

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    isIgnored: boolean;
  }>({ x: 0, y: 0, time: 0, isIgnored: false });

  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const showIndicator = useCallback((direction: 'prev' | 'next', label: string) => {
    setSwipeIndicator({ direction, label });
    // Light haptic feedback on mobile devices supporting Vibration API
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    const timer = setTimeout(() => {
      setSwipeIndicator(null);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigatePrevious = useCallback(() => {
    const currentPath = locationRef.current;

    // 1. Check patient main tabs sequence
    const tabIndex = PATIENT_TABS.indexOf(currentPath);
    if (tabIndex > 0) {
      const prevTab = PATIENT_TABS[tabIndex - 1];
      showIndicator('prev', `Back to ${prevTab.replace('/', '')}`);
      navigate(prevTab);
      return;
    }

    // 2. Check sequential previous flow map
    if (SEQUENTIAL_PREV_FLOWS[currentPath]) {
      const target = SEQUENTIAL_PREV_FLOWS[currentPath];
      showIndicator('prev', 'Previous');
      navigate(target);
      return;
    }

    // 3. Subpages / detail views -> History back
    if (
      currentPath.startsWith('/appointments/book') ||
      currentPath.startsWith('/appointment-detail') ||
      currentPath.startsWith('/hospitals/') ||
      currentPath.startsWith('/prescriptions') ||
      currentPath.startsWith('/medicine') ||
      currentPath.startsWith('/reminders') ||
      currentPath.startsWith('/notifications') ||
      currentPath.startsWith('/health-ai') ||
      currentPath.startsWith('/escalation') ||
      currentPath.startsWith('/assessment-confirm') ||
      currentPath.startsWith('/doctor') ||
      currentPath.startsWith('/receptionist') ||
      currentPath.startsWith('/admin')
    ) {
      showIndicator('prev', 'Previous Page');
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    // 4. Default back behavior
    if (window.history.length > 1 && currentPath !== '/home' && currentPath !== '/login') {
      showIndicator('prev', 'Previous Page');
      navigate(-1);
    }
  }, [navigate, showIndicator]);

  const handleNavigateNext = useCallback(() => {
    const currentPath = locationRef.current;

    // 1. Check patient main tabs sequence
    const tabIndex = PATIENT_TABS.indexOf(currentPath);
    if (tabIndex >= 0 && tabIndex < PATIENT_TABS.length - 1) {
      const nextTab = PATIENT_TABS[tabIndex + 1];
      showIndicator('next', `Next: ${nextTab.replace('/', '')}`);
      navigate(nextTab);
      return;
    }

    // 2. Check sequential next flow map
    if (SEQUENTIAL_NEXT_FLOWS[currentPath]) {
      const target = SEQUENTIAL_NEXT_FLOWS[currentPath];
      showIndicator('next', 'Next');
      navigate(target);
      return;
    }

    // 3. Fallback: Browser history forward if available
    try {
      showIndicator('next', 'Next Page');
      window.history.forward();
    } catch {}
  }, [navigate, showIndicator]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current.isIgnored = true;
        return;
      }

      const touch = e.touches[0];
      const target = e.target;

      // Check if touch originated in a horizontal slider, input, or interactive area
      const isIgnored = isInsideNonSwipeableElement(target);

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        isIgnored,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartRef.current.isIgnored || e.changedTouches.length !== 1) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Gesture criteria:
      // 1. Minimum horizontal distance >= 55px
      // 2. Fast enough swipe (<= 650ms)
      // 3. Dominant horizontal movement (X is at least 1.4x Y movement)
      const MIN_DISTANCE = 55;
      const MAX_TIME = 650;
      const RATIO = 1.4;

      if (absDeltaX >= MIN_DISTANCE && duration <= MAX_TIME && absDeltaX >= absDeltaY * RATIO) {
        if (deltaX > 0) {
          // Swiped Right -> Move to Last / Previous Page
          handleNavigatePrevious();
        } else {
          // Swiped Left -> Move to Next Page
          handleNavigateNext();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleNavigatePrevious, handleNavigateNext]);

  return (
    <AnimatePresence>
      {swipeIndicator && (
        <motion.div
          key="swipe-indicator"
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed top-5 inset-x-0 mx-auto z-50 pointer-events-none flex items-center justify-center"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 text-white shadow-2xl backdrop-blur-md border border-white/15 text-xs font-black uppercase tracking-wider font-heading">
            {swipeIndicator.direction === 'prev' ? (
              <ChevronLeft className="w-4 h-4 text-teal-400 animate-pulse" />
            ) : null}
            <span>{swipeIndicator.label}</span>
            {swipeIndicator.direction === 'next' ? (
              <ChevronRight className="w-4 h-4 text-teal-400 animate-pulse" />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
