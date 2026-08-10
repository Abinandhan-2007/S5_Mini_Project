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
import { MedicalHistoryScreen } from '../features/history/MedicalHistoryScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { PrescriptionsScreen } from '../features/prescriptions/PrescriptionsScreen';
import { PageTransition } from '../components/ui/PageTransition';
import { SystemNavigationHandler } from '../components/ui/SystemNavigationHandler';
import { useCarePulseStore } from '../lib/store';

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useCarePulseStore((s) => s.isAuthenticated);

  return (
    <>
      <SystemNavigationHandler />
      <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
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

      {/* Default Catch-all */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
      />
    </Routes>
    </>
  );
};
