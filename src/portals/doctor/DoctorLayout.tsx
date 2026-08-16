import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStaffStore } from '../../store/staffStore';
import { DoctorDashboard } from './DoctorDashboard';

/**
 * DoctorLayout — wraps all doctor portal routes.
 * Redirects to /doctor/login if the current staff session is not a doctor.
 */
export const DoctorLayout: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);

  if (!currentStaff || currentStaff.role !== 'doctor') {
    return <Navigate to="/doctor/login" replace />;
  }

  return <DoctorDashboard />;
};

export default DoctorLayout;
