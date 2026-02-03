import React from 'react';
import { Button, InlineLoading, Layer } from '@carbon/react';
import {
  ExtensionSlot,
  PageHeader,
  RegistrationPictogram,
  fetchCurrentPatient,
  launchWorkspace,
  navigate,
  useConfig,
  useVisit,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Close, Edit, Money } from '@carbon/react/icons';
import useSWR from 'swr';
import { useParams } from 'react-router-dom';

import styles from './mru.scss';
import { type ClinicalWorkflowConfig } from '../config-schema';
const MRU: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('medicalRecordUpdate', 'Medical Record Unit(MRU)')}
        illustration={<RegistrationPictogram />}
        className={styles.pageHeader}
      />
      <PatientSearch />
    </div>
  );
};

export default MRU;

const PatientSearch: React.FC = () => {
  const params = useParams<{ patientUuid: string }>();
  const { t } = useTranslation();
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = React.useState<string>(params.patientUuid || undefined);
  const { data: patient, isLoading } = useSWR(patientUuid ? ['patient', patientUuid] : null, () =>
    fetchCurrentPatient(patientUuid!),
  );
  const { activeVisit } = useVisit(patientUuid);

  // TODO: Add ability for user to edit billing information

  const hasAtLeastOneBillingInformation = activeVisit?.attributes?.some(
    (attribute) => attribute.attributeType.uuid === billingVisitAttributeTypes.paymentMethod,
  );

  const handleLaunchBillingInformationWorkspace = () => {
    launchWorkspace('billing-information-workspace', {
      patientUuid: patientUuid,
    });
  };

  const handlePatientInformationEdit = () => {
    navigate({ to: `${window.spaBase}/patient/${patientUuid}/edit` });
  };

  return (
    <div className={styles.patientSearchContainer}>
      <Layer>
        <ExtensionSlot
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => setPatientUuid(patientUuid),
            buttonProps: {
              kind: 'secondary',
            },
          }}
        />
      </Layer>
      {isLoading && <InlineLoading description={t('loading', 'Loading...')} />}
      {patient && (
        <div className={styles.patientHeaderContainer}>
          <div className={styles.patientHeaderActions}>
            <Button kind="ghost" size="md" renderIcon={Edit} onClick={handlePatientInformationEdit}>
              {t('editPatientInformation', 'Edit Patient Information')}
            </Button>
            <Button
              disabled={!activeVisit}
              kind="ghost"
              size="md"
              renderIcon={Money}
              onClick={handleLaunchBillingInformationWorkspace}>
              {hasAtLeastOneBillingInformation
                ? t('editBillingInformation', 'Edit Billing Information')
                : t('addBillingInformation', 'Add Billing Information')}
            </Button>
            <Button kind="ghost" size="md" renderIcon={Close} onClick={() => setPatientUuid(undefined)}>
              {t('close', 'Close')}
            </Button>
          </div>
          <ExtensionSlot
            name="patient-header-slot"
            state={{
              patient,
              patientUuid: patientUuid,
              hideActionsOverflow: true,
            }}
          />
        </div>
      )}
    </div>
  );
};
