import React from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@openmrs/esm-patient-common-lib';

interface ConsultationDashboardProps {
  patient: fhir.Patient;
}

export default function ConsultationDashboard({ patient: _patient }: ConsultationDashboardProps) {
  const { t } = useTranslation();

  return (
    <EmptyState headerTitle={t('consultation', 'Consultation')} displayText={t('consultations', 'consultations')} />
  );
}
