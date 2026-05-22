import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataTableSkeleton, InlineLoading } from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import ConsultationList from '../consultation-list/consultation-list.component';
import { useConsultationsByPatient } from '../hooks/useConsultationsByPatient';

interface ConsultationListPageProps {
  patient: fhir.Patient;
}

const ConsultationListPage: React.FC<ConsultationListPageProps> = ({ patient }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const headerTitle = t('consultation', 'Consultation');
  const displayText = t('consultations', 'consultations');
  const { consultations, error, isLoading, isValidating } = useConsultationsByPatient(patient.id);

  const handleConsultationClick = (encounterUuid: string) => {
    navigate(encounterUuid);
  };

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }

  if (!consultations?.length) {
    return <EmptyState displayText={displayText} headerTitle={headerTitle} />;
  }

  return (
    <>
      {isValidating ? <InlineLoading description={t('loading', 'Loading...')} /> : null}
      <ConsultationList consultations={consultations} onConsultationClick={handleConsultationClick} />
    </>
  );
};

export default ConsultationListPage;
