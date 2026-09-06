import React from 'react';
import { StaffPortalLogin } from '../shared/StaffPortalLogin';

export const DoctorLogin: React.FC = () => (
  <StaffPortalLogin defaultRole="doctor" />
);

export default DoctorLogin;
