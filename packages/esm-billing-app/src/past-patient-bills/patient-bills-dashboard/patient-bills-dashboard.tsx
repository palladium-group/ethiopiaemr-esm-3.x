import React, { useState } from 'react';
import styles from './patient-bills-dashboard.scss';
import { ErrorState } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { PatientBills } from '../patient-bills.component';
import { usePatientBillsWithLineItems } from '../../billing.resource';
import PatientSearchExtension from './patient-search-extension.component';
import EmptyPatientBill from './empty-patient-bill.component';

const PatientBillsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [patientUuid, setPatientUuid] = useState<string | undefined>();
  const { bills, isLoading, error } = usePatientBillsWithLineItems(patientUuid);

  if (error) {
    return (
      <div className={`${styles.emptyStateContainer} ${styles.container}`}>
        <PatientSearchExtension setPatientUuid={setPatientUuid} />
        <ErrorState
          error={t('anErrorOccurredLoadingPatientBills', 'An error occurred loading patient bills')}
          headerTitle={t('errorLoadingPatientBills', 'Error loading patient bills')}
        />
      </div>
    );
  }

  if (!patientUuid) {
    return (
      <>
        <PatientSearchExtension setPatientUuid={setPatientUuid} />
        <EmptyPatientBill />
      </>
    );
  }

  return (
    <main className={styles.container}>
      <PatientSearchExtension setPatientUuid={setPatientUuid} />
      {/* Keyed by patient so nothing from the previously selected patient carries over to the next one. */}
      <PatientBills
        key={patientUuid}
        patientUuid={patientUuid}
        bills={bills}
        isLoading={isLoading}
        onCancel={setPatientUuid}
      />
    </main>
  );
};

export default PatientBillsScreen;
