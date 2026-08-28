import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { HealthAIChatScreen } from '../features/health-ai/HealthAIChatScreen';
import { EscalationNoticeScreen } from '../features/health-ai/EscalationNoticeScreen';
import { AssessmentConfirmScreen } from '../features/health-ai/AssessmentConfirmScreen';
import { FindHospitalsScreen } from '../features/hospitals/FindHospitalsScreen';
import { HospitalDetailScreen } from '../features/hospitals/HospitalDetailScreen';
import { BookAppointmentScreen } from '../features/appointments/BookAppointmentScreen';
import { AppointmentDetailScreen } from '../features/appointments/AppointmentDetailScreen';
import { AppointmentScheduleScreen } from '../features/appointments/AppointmentScheduleScreen';
import { MedicalHistoryScreen } from '../features/history/MedicalHistoryScreen';


import { ProfileScreen } from '../features/profile/ProfileScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { PrescriptionsScreen } from '../features/prescriptions/PrescriptionsScreen';
import { ReceptionistLayout } from '../portals/receptionist/ReceptionistLayout';
import { DoctorLayout } from '../portals/doctor/DoctorLayout';
import { AdminLayout } from '../portals/admin/AdminLayout';
import { StaffPortalLogin } from '../portals/shared/StaffPortalLogin';
import { PageTransition } from '../components/ui/PageTransition';
import { SystemNavigationHandler } from '../components/ui/SystemNavigationHandler';
import { useCarePulseStore } from '../lib/store';

import { Capacitor } from '@capacitor/core';

// Detect if current environment should default to Staff Portal (Doctor, Admin, Receptionist)
const isStaffDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  // On native mobile app (Capacitor Android / iOS), default to Patient App
  if (Capacitor.isNativePlatform()) return false;

  // On Web (Vercel, Netlify, desktop browsers, localhost web), default to Staff Portal
  return true;
};

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useCarePulseStore((s) => s.isAuthenticated);

  return (
    <>
      <SystemNavigationHandler />
      <Routes>
      {/* Root Route: Directly opens Staff Portal on Netlify deployment */}
      <Route
        path="/"
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

      {/* Authenticated Routes with Smooth Page Transitions */}
      <Route
        path="/home"
        element={
          isAuthenticated ? (
            <PageTransition>
              <HomeScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/health-ai"
        element={
          isAuthenticated ? (
            <PageTransition>
              <HealthAIChatScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/escalation"
        element={
          isAuthenticated ? (
            <PageTransition>
              <EscalationNoticeScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/assessment-confirm"
        element={
          isAuthenticated ? (
            <PageTransition>
              <AssessmentConfirmScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/schedule"
        element={
          isAuthenticated ? (
            <PageTransition>
              <AppointmentScheduleScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/hospitals"

        element={
          isAuthenticated ? (
            <PageTransition>
              <FindHospitalsScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/hospitals/:id"
        element={
          isAuthenticated ? (
            <PageTransition>
              <HospitalDetailScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/appointments/book/:doctorId"
        element={
          isAuthenticated ? (
            <PageTransition>
              <BookAppointmentScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/appointment-detail"
        element={
          isAuthenticated ? (
            <PageTransition>
              <AppointmentDetailScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/appointment-detail/:id"
        element={
          isAuthenticated ? (
            <PageTransition>
              <AppointmentDetailScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/history"
        element={
          isAuthenticated ? (
            <PageTransition>
              <MedicalHistoryScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/reminders"
        element={
          isAuthenticated ? (
            <PageTransition>
              <RemindersScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <PageTransition>
              <ProfileScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/notifications"
        element={
          isAuthenticated ? (
            <PageTransition>
              <NotificationsScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/prescriptions"
        element={
          isAuthenticated ? (
            <PageTransition>
              <PrescriptionsScreen />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

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
