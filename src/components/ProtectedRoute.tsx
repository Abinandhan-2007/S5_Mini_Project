// src/components/ProtectedRoute.tsx
import React from 'react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

// TODO: Implement role-based protection guard for Admin, Receptionist, and Doctor portals
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <>{children}</>;
};

export default ProtectedRoute;
