import React from 'react';
import PatientBanner from '../patient-banner.component';
import EmptyState from './empty-state.component';

interface TriageContentProps {
  patientUuid: string | null;
  variantConfig: {
    formUuid: string;
    name: string;
  };
  pathSegment: string;
  onClearPatient: () => void;
}

export const TriageContent: React.FC<TriageContentProps> = ({
  patientUuid,
  variantConfig,
  pathSegment,
  onClearPatient,
}) => {
  if (!patientUuid) {
    return <EmptyState />;
  }

  return (
    <PatientBanner
      key={`${pathSegment}-${variantConfig.formUuid}`}
      patientUuid={patientUuid}
      formUuid={variantConfig.formUuid}
      formName={variantConfig.name}
      setPatientUuid={onClearPatient}
    />
  );
};
