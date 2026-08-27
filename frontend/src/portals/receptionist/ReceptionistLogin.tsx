import React from 'react';
import { StaffPortalLogin } from '../shared/StaffPortalLogin';

export const ReceptionistLogin: React.FC = () => (
  <StaffPortalLogin defaultRole="receptionist" />
);

export default ReceptionistLogin;
