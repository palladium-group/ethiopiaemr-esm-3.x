import {
  Button,
  InlineLoading,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { formatDatetime, launchWorkspace2, parseDate } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getOpenmrsId } from '../admitted-patients/admitted-patients.utils';
import type { InpatientRequest, WardPatient } from '../admitted-patients/ward.types';
import { getEncounterProviderNames, useVisitPrimaryDiagnoses } from './awaiting-admission.resource';
import styles from './awaiting-admission-expanded-row.scss';

interface AwaitingAdmissionExpandedRowProps {
  request: InpatientRequest;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function toWardPatient(request: InpatientRequest): WardPatient {
  return {
    patient: request.patient,
    visit: request.visit,
    bed: null,
    inpatientRequest: request,
    inpatientAdmission: null,
  };
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <StructuredListRow className={styles.structuredListRow}>
    <StructuredListCell className={styles.labelCell}>{label}</StructuredListCell>
    <StructuredListCell className={styles.valueCell}>{value}</StructuredListCell>
  </StructuredListRow>
);

const AwaitingAdmissionExpandedRow: React.FC<AwaitingAdmissionExpandedRowProps> = ({ request }) => {
  const { t } = useTranslation();
  const visitUuid = request.visit?.uuid;
  const { primaryDiagnoses, isLoading: isLoadingDiagnoses } = useVisitPrimaryDiagnoses(visitUuid);
  const { patient, dispositionEncounter, dispositionLocation } = request;
  const person = patient?.person;
  const requestedDate = dispositionEncounter?.encounterDatetime
    ? formatDatetime(parseDate(dispositionEncounter.encounterDatetime))
    : '--';

  const diagnosisValue = isLoadingDiagnoses ? (
    <InlineLoading description={t('loading', 'Loading')} />
  ) : primaryDiagnoses.length ? (
    primaryDiagnoses.join(', ')
  ) : (
    '--'
  );

  const handleAdmitPatient = () => {
    launchWorkspace2('admit-patient-form-workspace', { wardPatient: toWardPatient(request) });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.contentGrid}>
        <section>
          <div className={styles.headingContainer}>
            <p className={styles.heading}>{t('patientDemographics', 'Patient demographics')}</p>
          </div>
          <div className={styles.detailsPanel}>
            <StructuredListWrapper className={styles.structuredList}>
              <StructuredListHead />
              <StructuredListBody>
                <DetailRow label={t('name', 'Name')} value={person?.display ?? '--'} />
                <DetailRow
                  label={t('idNumber', 'ID Number')}
                  value={getOpenmrsId(patient?.identifiers ?? []) ?? '--'}
                />
                <DetailRow label={t('gender', 'Gender')} value={person?.gender ?? '--'} />
                <DetailRow label={t('age', 'Age')} value={person?.age ?? '--'} />
              </StructuredListBody>
            </StructuredListWrapper>
          </div>
        </section>

        <section>
          <div className={styles.headingContainer}>
            <p className={styles.heading}>{t('admissionRequestDetails', 'Admission request form by the doctor')}</p>
          </div>
          <div className={styles.detailsPanel}>
            <StructuredListWrapper className={styles.structuredList}>
              <StructuredListHead />
              <StructuredListBody>
                <DetailRow
                  label={t('admittingDoctor', 'Admitting doctor')}
                  value={getEncounterProviderNames(dispositionEncounter?.encounterProviders)}
                />
                <DetailRow label={t('dateRequested', 'Date requested')} value={requestedDate} />
                <DetailRow label={t('requestedWard', 'Requested ward')} value={dispositionLocation?.display ?? '--'} />
                <DetailRow label={t('diagnosis', 'Diagnosis')} value={diagnosisValue} />
              </StructuredListBody>
            </StructuredListWrapper>
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <Button kind="primary" size="md" onClick={handleAdmitPatient}>
          {t('admitPatient', 'Admit patient')}
        </Button>
      </div>
    </div>
  );
};

export default AwaitingAdmissionExpandedRow;
