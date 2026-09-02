import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { CompleteProfileScreen, shouldPromptProfileCompletion } from '../features/auth/CompleteProfileScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { HealthAIChatScreen } from '../features/health-ai/HealthAIChatScreen';
import { EscalationNoticeScreen } from '../features/health-ai/EscalationNoticeScreen';
import { AssessmentConfirmScreen } from '../features/health-ai/AssessmentConfirmScreen';
import { FindHospitalsScreen } from '../features/hospitals/FindHospitalsScreen';
import { HospitalDetailScreen } from '../features/hospitals/HospitalDetailScreen';
import { BookAppointmentScreen } from '../features/appointments/BookAppointmentScreen';
import { AppointmentDetailScreen } from '../features/appointments/AppointmentDetailScreen';
import { MedicalHistoryScreen } from '../features/history/MedicalHistoryScreen';


import { ProfileScreen } from '../features/profile/ProfileScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { PrescriptionsScreen } from '../features/prescriptions/PrescriptionsScreen';
import { ScanMedicineScreen } from '../features/prescriptions/ScanMedicineScreen';
import { MedicineInfoLookupScreen } from '../features/prescriptions/MedicineInfoLookupScreen';




import { ReceptionistLayout } from '../portals/receptionist/ReceptionistLayout';
import { DoctorLayout } from '../portals/doctor/DoctorLayout';
import { AdminLayout } from '../portals/admin/AdminLayout';
import { StaffPortalLogin } from '../portals/shared/StaffPortalLogin';
import { PageTransition } from '../components/ui/PageTransition';
import { SystemNavigationHandler } from '../components/ui/SystemNavigationHandler';
import { useCarePulseStore } from '../lib/store';

import { Capacitor } from '@capacitor/core';

import { ProtectedPatientLayout } from '../components/ui/ProtectedPatientLayout';

// Detect if current environment should default to Staff Portal (Doctor, Admin, Receptionist)
export const isStaffDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  // 1. On native mobile app (Capacitor Android / iOS), always Patient App
  if (Capacitor.isNativePlatform()) return false;

  // 2. Explicit subdomain checks
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.startsWith('staff.') || hostname.startsWith('admin.') || hostname.startsWith('doctor.')) {
    return true;
  }

  // 3. Detect mobile browsers (Android, iPhone, iPad, small viewport mobile web)
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileBrowser =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768);

  if (isMobileBrowser) {
    return false; // Default mobile web users to Patient App
  }

  // 4. On desktop web, default to Staff Portal
  return true;
};

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useCarePulseStore((s) => s.isAuthenticated);
  const user = useCarePulseStore((s) => s.user);

  return (
    <>
      <SystemNavigationHandler />
      <Routes>
      {/* Root Route */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              isStaffDomain()
                ? '/staff/login'
                : isAuthenticated
                ? shouldPromptProfileCompletion(user)
                  ? '/complete-profile'
                  : '/home'
                : '/login'
            }
            replace
          />
        }
      />
      <Route
        path="/login"
        element={
          <PageTransition>
            <LoginScreen />
          </PageTransition>
        }
      />
      <Route
        path="/register"
        element={
          <PageTransition>
            <RegisterScreen />
          </PageTransition>
        }
      />

      {/* Centralized Protected Authenticated Patient Routes (Guarded with Biometrics & PIN) */}
      <Route element={<ProtectedPatientLayout />}>
        <Route
          path="/complete-profile"
          element={
            <PageTransition>
              <CompleteProfileScreen />
            </PageTransition>
          }
        />
        <Route
          path="/home"
          element={
            <PageTransition>
              <HomeScreen />
            </PageTransition>
          }
        />
        <Route
          path="/health-ai"
          element={
            <PageTransition>
              <HealthAIChatScreen />
            </PageTransition>
          }
        />
        <Route
          path="/escalation"
          element={
            <PageTransition>
              <EscalationNoticeScreen />
            </PageTransition>
          }
        />
        <Route
          path="/assessment-confirm"
          element={
            <PageTransition>
              <AssessmentConfirmScreen />
            </PageTransition>
          }
        />
        <Route
          path="/schedule"
          element={<Navigate to="/history" replace />}
        />
        <Route
          path="/hospitals"
          element={
            <PageTransition>
              <FindHospitalsScreen />
            </PageTransition>
          }
        />
        <Route
          path="/hospitals/:id"
          element={
            <PageTransition>
              <HospitalDetailScreen />
            </PageTransition>
          }
        />
        <Route
          path="/appointments/book/:doctorId"
          element={
            <PageTransition>
              <BookAppointmentScreen />
            </PageTransition>
          }
        />
        <Route
          path="/appointment-detail"
          element={
            <PageTransition>
              <AppointmentDetailScreen />
            </PageTransition>
          }
        />
        <Route
          path="/appointment-detail/:id"
          element={
            <PageTransition>
              <AppointmentDetailScreen />
            </PageTransition>
          }
        />
        <Route
          path="/history"
          element={
            <PageTransition>
              <MedicalHistoryScreen />
            </PageTransition>
          }
        />
        <Route
          path="/reminders"
          element={
            <PageTransition>
              <RemindersScreen />
            </PageTransition>
          }
        />
        <Route
          path="/profile"
          element={
            <PageTransition>
              <ProfileScreen />
            </PageTransition>
          }
        />
        <Route
          path="/notifications"
          element={
            <PageTransition>
              <NotificationsScreen />
            </PageTransition>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <PageTransition>
              <PrescriptionsScreen />
            </PageTransition>
          }
        />
        <Route
          path="/prescriptions/scan"
          element={
            <PageTransition>
              <ScanMedicineScreen />
            </PageTransition>
          }
        />
        <Route
          path="/medicine/info-lookup"
          element={
            <PageTransition>
              <MedicineInfoLookupScreen />
            </PageTransition>
          }
        />
        <Route
          path="/prescriptions/info-lookup"
          element={
            <PageTransition>
              <MedicineInfoLookupScreen />
            </PageTransition>
          }
        />
      </Route>

      {/* Receptionist Portal Routes */}
      <Route
        path="/receptionist"
        element={
          <PageTransition>
            <ReceptionistLayout />
          </PageTransition>
        }
      />
      <Route
        path="/receptionist/login"
        element={<Navigate to="/staff/login" replace />}
      />

      {/* Doctor Portal Routes */}
      <Route
        path="/doctor"
        element={
          <PageTransition>
            <DoctorLayout />
          </PageTransition>
        }
      />
      <Route
        path="/doctor/login"
        element={<Navigate to="/staff/login" replace />}
      />

      {/* Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <PageTransition>
            <AdminLayout />
          </PageTransition>
        }
      />
      <Route
        path="/admin/login"
        element={<Navigate to="/staff/login" replace />}
      />

      {/* Unified Staff Portal Routes */}
      <Route
        path="/staff"
        element={
          <PageTransition>
            <StaffPortalLogin />
          </PageTransition>
        }
      />
      <Route
        path="/staff/login"
        element={
          <PageTransition>
            <StaffPortalLogin />
          </PageTransition>
        }
      />
      <Route
        path="/staff-login"
        element={
          <PageTransition>
            <StaffPortalLogin />
          </PageTransition>
        }
      />

      {/* Default Catch-all */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              isStaffDomain()
                ? '/staff/login'
                : isAuthenticated
                ? '/home'
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
    </>
  );
};
