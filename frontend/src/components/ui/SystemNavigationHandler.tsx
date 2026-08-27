import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Handles Android Hardware System Navigation Bar & Back Swipe Gestures natively.
 * Navigates back/forward in React Router history or minimizes app on root screens.
 */
export const SystemNavigationHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      const currentPath = location.pathname;

      if (currentPath === '/home' || currentPath === '/login' || currentPath === '/') {
        // Minimize app cleanly when back is pressed on Home or Login
        CapacitorApp.minimizeApp();
      } else {
        // Step back in history for system back gestures / navigation bar buttons
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/home');
        }
      }
    });

    return () => {
      backButtonListener.then((handler) => handler.remove());
    };
  }, [navigate, location.pathname]);

  return null;
};
