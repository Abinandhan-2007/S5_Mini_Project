import React, { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Ordered sequence for Patient App primary tabs (Home -> Hospitals -> History -> Profile)
const PATIENT_TABS = ['/home', '/hospitals', '/history', '/profile'];

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
    // 1. Explicit no-swipe attribute or class, or card drag containers
    if (
      current.hasAttribute('data-no-swipe') ||
      current.classList.contains('no-swipe') ||
      current.classList.contains('cursor-grab') ||
      current.classList.contains('cursor-grabbing') ||
      current.classList.contains('date-scroller') ||
      current.classList.contains('no-scrollbar') ||
      current.classList.contains('overflow-x-auto') ||
      current.classList.contains('overflow-x-scroll')
    ) {
      return true;
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

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    isIgnored: boolean;
  }>({ x: 0, y: 0, time: 0, isIgnored: false });

  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const handleNavigatePrevious = useCallback(() => {
    const currentPath = locationRef.current;

    // 1. Check patient main tabs sequence (Profile -> History -> Hospitals -> Home)
    const tabIndex = PATIENT_TABS.indexOf(currentPath);
    if (tabIndex > 0) {
      const prevTab = PATIENT_TABS[tabIndex - 1];
      navigate(prevTab);
      return;
    }

    // 2. Check sequential previous flow map
    if (SEQUENTIAL_PREV_FLOWS[currentPath]) {
      const target = SEQUENTIAL_PREV_FLOWS[currentPath];
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
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    // 4. Default back behavior
    if (window.history.length > 1 && currentPath !== '/home' && currentPath !== '/login') {
      navigate(-1);
    }
  }, [navigate]);

  const handleNavigateNext = useCallback(() => {
    const currentPath = locationRef.current;

    // 1. Check patient main tabs sequence (Home -> Hospitals -> History -> Profile)
    const tabIndex = PATIENT_TABS.indexOf(currentPath);
    if (tabIndex >= 0 && tabIndex < PATIENT_TABS.length - 1) {
      const nextTab = PATIENT_TABS[tabIndex + 1];
      navigate(nextTab);
      return;
    }

    // 2. Check sequential next flow map
    if (SEQUENTIAL_NEXT_FLOWS[currentPath]) {
      const target = SEQUENTIAL_NEXT_FLOWS[currentPath];
      navigate(target);
      return;
    }

    // 3. Fallback: Browser history forward if available
    try {
      window.history.forward();
    } catch {}
  }, [navigate]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current.isIgnored = true;
        return;
      }

      const touch = e.touches[0];
      const target = e.target;

      // Check if touch originated in a horizontal slider, card deck, input, or interactive area
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
          // Swiped Right -> Move to Previous Tab / Page
          handleNavigatePrevious();
        } else {
          // Swiped Left -> Move to Next Tab / Page
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

  return null;
};
