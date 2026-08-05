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
import { useCarePulseStore } from '../lib/store';

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useCarePulseStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Authenticated Routes */}
      <Route
        path="/home"
        element={isAuthenticated ? <HomeScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/health-ai"
        element={isAuthenticated ? <HealthAIChatScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/escalation"
        element={isAuthenticated ? <EscalationNoticeScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/assessment-confirm"
        element={isAuthenticated ? <AssessmentConfirmScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/hospitals"
        element={isAuthenticated ? <FindHospitalsScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/hospitals/:id"
        element={isAuthenticated ? <HospitalDetailScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/appointments/book/:doctorId"
        element={isAuthenticated ? <BookAppointmentScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/history"
        element={isAuthenticated ? <MedicalHistoryScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/reminders"
        element={isAuthenticated ? <RemindersScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <ProfileScreen /> : <Navigate to="/login" replace />}
      />

      {/* Default Catch-all */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
      />
    </Routes>
  );
};
