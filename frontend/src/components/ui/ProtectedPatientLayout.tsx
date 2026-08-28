import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useCarePulseStore } from '../../lib/store';
import { AppLockModal } from './AppLockModal';

interface ProtectedPatientLayoutProps {
  children?: React.ReactNode;
}

/**
 * Centralized security guard and layout wrapper for all authenticated Patient App routes.
 * Ensures:
 * 1. Unauthenticated users are redirected to /login.
 * 2. If biometric lock is enabled, intercepts the entire screen with AppLockModal
 *    regardless of which deep link or route (/profile, /history, /prescriptions, etc.)
 *    the user navigated to.
 */
export const ProtectedPatientLayout: React.FC<ProtectedPatientLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useCarePulseStore((s) => s.isAuthenticated);
  const isBiometricEnabled = useCarePulseStore((s) => s.isBiometricEnabled);

  const [isUnlockedThisSession, setIsUnlockedThisSession] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('carepulse_app_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Keep local state in sync if sessionStorage changes elsewhere
    const handleStorageChange = () => {
      try {
        const unlocked = sessionStorage.getItem('carepulse_app_unlocked') === 'true';
        setIsUnlockedThisSession(unlocked);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 1. Auth Guard
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Centralized Biometric & Device PIN Lock Guard
  if (isBiometricEnabled && !isUnlockedThisSession) {
    return (
      <AppLockModal
        onUnlock={() => {
          setIsUnlockedThisSession(true);
          try {
            sessionStorage.setItem('carepulse_app_unlocked', 'true');
          } catch {}
        }}
      />
    );
  }

  return <>{children || <Outlet />}</>;
};

export default ProtectedPatientLayout;
