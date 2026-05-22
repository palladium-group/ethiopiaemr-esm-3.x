import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, DataTableSkeleton, InlineLoading } from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import ConsultationList from '../consultation-list/consultation-list.component';
import { useConsultationsAwaitingReview } from '../hooks/useConsultationsAwaitingReview';
import { useConsultationsByPatient } from '../hooks/useConsultationsByPatient';
import { useLaunchConsultationForm } from '../hooks/useLaunchConsultationForm';
import styles from './consultation-list-page.scss';

interface ConsultationListPageProps {
  patient: fhir.Patient;
}

const ConsultationListPage: React.FC<ConsultationListPageProps> = ({ patient }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const headerTitle = t('consultation', 'Consultation');
  const displayText = t('consultations', 'consultations');
  const { consultations, error, isLoading, isValidating, mutateConsultations } = useConsultationsByPatient(patient.id);
  const { unreadEncounterUuids } = useConsultationsAwaitingReview(patient.id);
  const { isLaunching, launchConsultationForm } = useLaunchConsultationForm(patient.id, {
    onConsultationSaved: () => {
      mutateConsultations();
    },
  });

  const handleConsultationClick = (encounterUuid: string) => {
    navigate(encounterUuid);
  };

  const handleCreateConsultation = useCallback(() => {
    launchConsultationForm().catch((launchError) => {
      console.error('Error launching consultation form workspace:', launchError);
    });
  }, [launchConsultationForm]);

  const toolbar = (
    <div className={styles.toolbar}>
      <Button kind="primary" disabled={isLaunching} onClick={handleCreateConsultation}>
        {isLaunching ? t('loading', 'Loading...') : t('createConsultation', 'Create Consultation')}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <>
        {toolbar}
        <DataTableSkeleton role="progressbar" />
      </>
    );
  }

  if (error) {
    return (
      <>
        {toolbar}
        <ErrorState error={error} headerTitle={headerTitle} />
      </>
    );
  }

  if (!consultations?.length) {
    return (
      <>
        {toolbar}
        <EmptyState displayText={displayText} headerTitle={headerTitle} />
      </>
    );
  }

  return (
    <>
      {toolbar}
      {isValidating ? <InlineLoading description={t('loading', 'Loading...')} /> : null}
      <ConsultationList
        consultations={consultations}
        unreadEncounterUuids={unreadEncounterUuids}
        onConsultationClick={handleConsultationClick}
      />
    </>
  );
};

export default ConsultationListPage;
