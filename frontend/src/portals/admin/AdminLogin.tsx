import React from 'react';
import { StaffPortalLogin } from '../shared/StaffPortalLogin';

export const AdminLogin: React.FC = () => (
  <StaffPortalLogin defaultRole="admin" />
);

export default AdminLogin;
