import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useCarePulseStore } from '../../lib/store';

/**
 * Handles Android Hardware System Navigation Bar & Back Swipe Gestures natively.
 * Navigates back/forward in React Router history or minimizes app on root screens.
 * Crucially blocks back navigation when AppLockModal is active to prevent security bypass.
 */
export const SystemNavigationHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBiometricEnabled = useCarePulseStore((s) => s.isBiometricEnabled);

  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const biometricRef = useRef(isBiometricEnabled);
  biometricRef.current = isBiometricEnabled;

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      const currentPath = locationRef.current;
      
      // Check if session is currently locked with Biometric/PIN security
      let isUnlocked = true;
      try {
        isUnlocked = sessionStorage.getItem('carepulse_app_unlocked') === 'true';
      } catch {}

      const isCurrentlyLocked = biometricRef.current && !isUnlocked;

      // If app is locked, DO NOT navigate back to avoid exposing underlying screen
      if (isCurrentlyLocked) {
        CapacitorApp.minimizeApp();
        return;
      }

      if (currentPath === '/home' || currentPath === '/login' || currentPath === '/') {
        // Minimize app cleanly when back is pressed on Home or Login
        CapacitorApp.minimizeApp();
      } else if (
        currentPath === '/prescriptions/scan' ||
        currentPath === '/medicine/info-lookup' ||
        currentPath === '/prescriptions/info-lookup' ||
        currentPath === '/prescriptions' ||
        currentPath.startsWith('/prescriptions/scan') ||
        currentPath.startsWith('/medicine/info-lookup') ||
        currentPath.startsWith('/prescriptions/info-lookup')
      ) {
        // Explicit user requirement: on medicine scan / lookup pages, pressing mobile back goes to Home
        navigate('/home', { replace: true });
      } else {
        // Step back in history for system back gestures / navigation bar buttons
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/home', { replace: true });
        }
      }
    });

    return () => {
      backButtonListener.then((handler) => handler.remove());
    };
  }, [navigate]);

  return null;
};

