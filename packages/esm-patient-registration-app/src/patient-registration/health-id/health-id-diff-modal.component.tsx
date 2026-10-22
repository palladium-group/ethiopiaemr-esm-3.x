import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ComposedModal,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import dayjs from 'dayjs';
import { type FormValues } from '../patient-registration.types';
import { type HealthIdPatient, normalizeGender } from './health-id.resource';
import styles from './health-id.scss';

export interface HealthIdDiffModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmOverwrite: (patient: HealthIdPatient) => Promise<void> | void;
  searchedHealthId: string;
  healthIdPatient: HealthIdPatient | null;
  currentFormValues: FormValues;
  phoneAttributeTypeUuid?: string;
  emailAttributeTypeUuid?: string;
}

interface DiffRow {
  fieldKey: string;
  label: string;
  currentValue: string;
  healthIdValue: string;
  status: 'changed' | 'identical' | 'new';
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return '—';
  }
  try {
    const d = dayjs(date);
    if (!d.isValid()) {
      return String(date);
    }
    return d.format('DD-MMM-YYYY');
  } catch {
    return String(date);
  }
}

const cmpStatus = (curr?: string, mpi?: string): 'identical' | 'new' | 'changed' =>
  (curr || '').trim().toLowerCase() === (mpi || '').trim().toLowerCase() ? 'identical' : !curr ? 'new' : 'changed';

const statusTagType: Record<DiffRow['status'], 'red' | 'blue' | 'green'> = {
  changed: 'red',
  new: 'blue',
  identical: 'green',
};

const statusRowClass: Record<DiffRow['status'], string> = {
  changed: styles.diffRowDifferent,
  new: styles.diffRowNew,
  identical: styles.diffRowSame,
};

export const HealthIdDiffModal: React.FC<HealthIdDiffModalProps> = ({
  open,
  onClose,
  onConfirmOverwrite,
  searchedHealthId,
  healthIdPatient,
  currentFormValues,
  phoneAttributeTypeUuid,
  emailAttributeTypeUuid,
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!healthIdPatient || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onConfirmOverwrite(healthIdPatient);
      onClose();
    } catch (err: any) {
      setSubmitError(
        err?.responseBody?.error?.message ||
          err?.message ||
          t('overwriteFailed', 'Failed to save updated details to the database.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const diffRows: DiffRow[] = useMemo(() => {
    if (!healthIdPatient?.fhir) {
      return [];
    }

    const mpiPerson = healthIdPatient.fhir.person;
    const mpiName = mpiPerson?.names?.[0];
    const mpiGender = normalizeGender(mpiPerson?.gender, true);
    const mpiBirthdate = mpiPerson?.birthdate;
    const mpiAddress = mpiPerson?.addresses?.[0];
    const mpiPhone = healthIdPatient.fhir.phone;
    const mpiEmail = healthIdPatient.fhir.email;
    const resolvedHealthId = healthIdPatient.fhir.healthId || searchedHealthId;

    const currentGender = normalizeGender(currentFormValues.gender, true);
    const currentPhone =
      (phoneAttributeTypeUuid && currentFormValues.attributes?.[phoneAttributeTypeUuid]) ||
      currentFormValues.telephoneNumber ||
      '';
    const currentEmail = (emailAttributeTypeUuid && currentFormValues.attributes?.[emailAttributeTypeUuid]) || '';
    const currentAddress = currentFormValues.address || {};

    const rows: DiffRow[] = [
      {
        fieldKey: 'healthId',
        label: t('healthIdLabel', 'Health ID'),
        currentValue: '—',
        healthIdValue: resolvedHealthId || '—',
        status: 'new',
      },
      {
        fieldKey: 'givenName',
        label: t('givenNameLabel', 'Given Name (First Name)'),
        currentValue: currentFormValues.givenName || '—',
        healthIdValue: mpiName?.givenName || '—',
        status: cmpStatus(currentFormValues.givenName, mpiName?.givenName),
      },
      {
        fieldKey: 'middleName',
        label: t('middleNameLabel', "Father's Name (Middle Name)"),
        currentValue: currentFormValues.middleName || '—',
        healthIdValue: mpiName?.middleName || '—',
        status: cmpStatus(currentFormValues.middleName, mpiName?.middleName),
      },
      {
        fieldKey: 'familyName',
        label: t('familyNameLabel', "Grandfather's Name (Family Name)"),
        currentValue: currentFormValues.familyName || '—',
        healthIdValue: mpiName?.familyName || '—',
        status: cmpStatus(currentFormValues.familyName, mpiName?.familyName),
      },
      {
        fieldKey: 'gender',
        label: t('genderLabel', 'Sex'),
        currentValue: currentGender || '—',
        healthIdValue: mpiGender || '—',
        status: cmpStatus(currentGender, mpiGender),
      },
      {
        fieldKey: 'birthdate',
        label: t('birthdateLabel', 'Date of Birth'),
        currentValue: formatDate(currentFormValues.birthdate),
        healthIdValue: formatDate(mpiBirthdate),
        status: cmpStatus(formatDate(currentFormValues.birthdate), formatDate(mpiBirthdate)),
      },
    ];

    const pushIfPresent = (fieldKey: string, labelKey: string, defaultLabel: string, curr?: string, mpi?: string) => {
      if (curr || mpi) {
        rows.push({
          fieldKey,
          label: t(labelKey, defaultLabel),
          currentValue: curr || '—',
          healthIdValue: mpi || '—',
          status: cmpStatus(curr, mpi),
        });
      }
    };

    pushIfPresent('phone', 'phoneLabel', 'Phone Number', currentPhone, mpiPhone);
    pushIfPresent('email', 'emailLabel', 'Email Address', currentEmail, mpiEmail);
    pushIfPresent(
      'addressRegion',
      'regionLabel',
      'Region',
      currentAddress.countyDistrict,
      mpiAddress?.countyDistrict || mpiAddress?.district,
    );
    pushIfPresent(
      'addressZone',
      'zoneLabel',
      'Zone',
      currentAddress.stateProvince,
      mpiAddress?.stateProvince || mpiAddress?.state,
    );
    pushIfPresent('addressWoreda', 'woredaLabel', 'Woreda', currentAddress.address4, mpiAddress?.address4);
    pushIfPresent(
      'addressKebele',
      'kebeleLabel',
      'House Number / Kebele',
      currentAddress.address2,
      mpiAddress?.address2,
    );

    return rows;
  }, [healthIdPatient, searchedHealthId, currentFormValues, phoneAttributeTypeUuid, emailAttributeTypeUuid, t]);

  const changedCount = diffRows.filter((r) => r.status !== 'identical').length;

  if (!open || !healthIdPatient) {
    return null;
  }

  return (
    <ComposedModal
      open={open}
      onClose={onClose}
      size="lg"
      aria-label={t('healthIdDiffModalTitle', 'Review & Confirm Health ID Overwrite')}>
      <ModalHeader
        closeModal={onClose}
        title={t('healthIdDiffModalHeading', 'Health ID Found — Review & Confirm Overwrite')}
      />
      <ModalBody className={styles.modalBody}>
        <div className={styles.diffHeaderSummary}>
          <p className={styles.summaryText}>
            {t(
              'healthIdDiffIntro',
              'Patient details for Health ID "{{healthId}}" were successfully retrieved from the registry. Review the comparison below before confirming overwrite.',
              { healthId: searchedHealthId },
            )}
          </p>
          <div className={styles.summaryTags}>
            <Tag type="teal">
              {t('fieldsUpdatedCount', '{{count}} fields to update / link', { count: changedCount })}
            </Tag>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <Table aria-label={t('healthIdComparisonTable', 'Health ID Comparison Table')} size="md">
            <TableHead>
              <TableRow>
                <TableHeader>{t('field', 'Field')}</TableHeader>
                <TableHeader>{t('currentValue', 'Current EMR Value')}</TableHeader>
                <TableHeader>{t('healthIdValue', 'Health ID Registry Value')}</TableHeader>
                <TableHeader>{t('status', 'Status')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {diffRows.map((row) => (
                <TableRow key={row.fieldKey} className={statusRowClass[row.status]}>
                  <TableCell className={styles.fieldNameCell}>
                    <strong>{row.label}</strong>
                  </TableCell>
                  <TableCell className={styles.currentValueCell}>{row.currentValue}</TableCell>
                  <TableCell className={styles.healthIdValueCell}>
                    <strong>{row.healthIdValue}</strong>
                  </TableCell>
                  <TableCell>
                    <Tag type={statusTagType[row.status]} size="sm">
                      {t(row.status, row.status.charAt(0).toUpperCase() + row.status.slice(1))}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {submitError && (
          <InlineNotification
            kind="error"
            title={t('error', 'Error')}
            subtitle={submitError}
            lowContrast
            onCloseButtonClick={() => setSubmitError(null)}
            className={styles.warningNotification}
          />
        )}

        <InlineNotification
          kind="warning"
          title={t('warning', 'Notice:')}
          subtitle={t(
            'overwriteWarningMessage',
            'Overwriting will update the patient record directly with official demographic data from the Health ID registry, attach the Health ID identifier, and save these changes immediately to the database.',
          )}
          lowContrast
          hideCloseButton
          className={styles.warningNotification}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" size="lg" onClick={onClose} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          kind="primary"
          size="lg"
          disabled={isSubmitting}
          renderIcon={isSubmitting ? InlineLoading : undefined}
          onClick={handleConfirm}>
          {isSubmitting ? t('saving', 'Saving...') : t('confirmAndOverwrite', 'Confirm and Overwrite')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
