import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Standalone SuperAdmin login page is deprecated.
 * SuperAdmin authentication is now handled directly through the unified Staff Portal (/staff/login).
 */
export const SuperAdminLogin: React.FC = () => {
  return <Navigate to="/staff/login" replace />;
};

export default SuperAdminLogin;
