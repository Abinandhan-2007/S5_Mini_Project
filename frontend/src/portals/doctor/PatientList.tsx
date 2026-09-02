// src/portals/doctor/PatientList.tsx
import React from 'react';
import { DoctorQueue, type DoctorQueueProps } from './DoctorQueue';

export const PatientList: React.FC<Partial<DoctorQueueProps>> = (props) => {
  return (
    <DoctorQueue
      queue={props.queue || []}
      onSelectPatient={props.onSelectPatient || (() => {})}
      onCallPatient={props.onCallPatient || (() => {})}
    />
  );
};

export default PatientList;
