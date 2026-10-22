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
import { type HealthIdPatient } from './health-id.resource';
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

function normalizeGender(gender?: string | null): string {
  if (!gender) {
    return '';
  }
  const g = gender.trim().toLowerCase();
  if (g.startsWith('m')) {
    return 'Male';
  }
  if (g.startsWith('f')) {
    return 'Female';
  }
  return gender;
}

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
    const mpiGender = normalizeGender(mpiPerson?.gender);
    const mpiBirthdate = mpiPerson?.birthdate;
    const mpiAddress = mpiPerson?.addresses?.[0];
    const mpiPhone = healthIdPatient.fhir.phone;
    const mpiEmail = healthIdPatient.fhir.email;
    const resolvedHealthId = healthIdPatient.fhir.healthId || searchedHealthId;

    const currentGender = normalizeGender(currentFormValues.gender);
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
        status:
          (currentFormValues.givenName || '').trim().toLowerCase() === (mpiName?.givenName || '').trim().toLowerCase()
            ? 'identical'
            : !currentFormValues.givenName
            ? 'new'
            : 'changed',
      },
      {
        fieldKey: 'middleName',
        label: t('middleNameLabel', "Father's Name (Middle Name)"),
        currentValue: currentFormValues.middleName || '—',
        healthIdValue: mpiName?.middleName || '—',
        status:
          (currentFormValues.middleName || '').trim().toLowerCase() === (mpiName?.middleName || '').trim().toLowerCase()
            ? 'identical'
            : !currentFormValues.middleName
            ? 'new'
            : 'changed',
      },
      {
        fieldKey: 'familyName',
        label: t('familyNameLabel', "Grandfather's Name (Family Name)"),
        currentValue: currentFormValues.familyName || '—',
        healthIdValue: mpiName?.familyName || '—',
        status:
          (currentFormValues.familyName || '').trim().toLowerCase() === (mpiName?.familyName || '').trim().toLowerCase()
            ? 'identical'
            : !currentFormValues.familyName
            ? 'new'
            : 'changed',
      },
      {
        fieldKey: 'gender',
        label: t('genderLabel', 'Sex'),
        currentValue: currentGender || '—',
        healthIdValue: mpiGender || '—',
        status:
          currentGender.toLowerCase() === mpiGender.toLowerCase() ? 'identical' : !currentGender ? 'new' : 'changed',
      },
      {
        fieldKey: 'birthdate',
        label: t('birthdateLabel', 'Date of Birth'),
        currentValue: formatDate(currentFormValues.birthdate),
        healthIdValue: formatDate(mpiBirthdate),
        status:
          formatDate(currentFormValues.birthdate) === formatDate(mpiBirthdate)
            ? 'identical'
            : !currentFormValues.birthdate
            ? 'new'
            : 'changed',
      },
    ];

    // Phone
    if (mpiPhone || currentPhone) {
      rows.push({
        fieldKey: 'phone',
        label: t('phoneLabel', 'Phone Number'),
        currentValue: currentPhone || '—',
        healthIdValue: mpiPhone || '—',
        status:
          (currentPhone || '').trim() === (mpiPhone || '').trim() ? 'identical' : !currentPhone ? 'new' : 'changed',
      });
    }

    // Email
    if (mpiEmail || currentEmail) {
      rows.push({
        fieldKey: 'email',
        label: t('emailLabel', 'Email Address'),
        currentValue: currentEmail || '—',
        healthIdValue: mpiEmail || '—',
        status:
          (currentEmail || '').trim().toLowerCase() === (mpiEmail || '').trim().toLowerCase()
            ? 'identical'
            : !currentEmail
            ? 'new'
            : 'changed',
      });
    }

    // Address fields
    const mpiRegion = mpiAddress?.countyDistrict || mpiAddress?.district || '';
    const currentRegion = currentAddress.countyDistrict || '';
    if (mpiRegion || currentRegion) {
      rows.push({
        fieldKey: 'addressRegion',
        label: t('regionLabel', 'Region'),
        currentValue: currentRegion || '—',
        healthIdValue: mpiRegion || '—',
        status:
          currentRegion.trim().toLowerCase() === mpiRegion.trim().toLowerCase()
            ? 'identical'
            : !currentRegion
            ? 'new'
            : 'changed',
      });
    }

    const mpiZone = mpiAddress?.stateProvince || mpiAddress?.state || '';
    const currentZone = currentAddress.stateProvince || '';
    if (mpiZone || currentZone) {
      rows.push({
        fieldKey: 'addressZone',
        label: t('zoneLabel', 'Zone'),
        currentValue: currentZone || '—',
        healthIdValue: mpiZone || '—',
        status:
          currentZone.trim().toLowerCase() === mpiZone.trim().toLowerCase()
            ? 'identical'
            : !currentZone
            ? 'new'
            : 'changed',
      });
    }

    const mpiWoreda = mpiAddress?.address4 || '';
    const currentWoreda = currentAddress.address4 || '';
    if (mpiWoreda || currentWoreda) {
      rows.push({
        fieldKey: 'addressWoreda',
        label: t('woredaLabel', 'Woreda'),
        currentValue: currentWoreda || '—',
        healthIdValue: mpiWoreda || '—',
        status:
          currentWoreda.trim().toLowerCase() === mpiWoreda.trim().toLowerCase()
            ? 'identical'
            : !currentWoreda
            ? 'new'
            : 'changed',
      });
    }

    const mpiKebele = mpiAddress?.address2 || '';
    const currentKebele = currentAddress.address2 || '';
    if (mpiKebele || currentKebele) {
      rows.push({
        fieldKey: 'addressKebele',
        label: t('kebeleLabel', 'House Number / Kebele'),
        currentValue: currentKebele || '—',
        healthIdValue: mpiKebele || '—',
        status:
          currentKebele.trim().toLowerCase() === mpiKebele.trim().toLowerCase()
            ? 'identical'
            : !currentKebele
            ? 'new'
            : 'changed',
      });
    }

    return rows;
  }, [healthIdPatient, searchedHealthId, currentFormValues, phoneAttributeTypeUuid, emailAttributeTypeUuid, t]);

  const changedCount = useMemo(() => {
    return diffRows.filter((r) => r.status === 'changed' || r.status === 'new').length;
  }, [diffRows]);

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
              {diffRows.map((row) => {
                const rowClass =
                  row.status === 'new'
                    ? styles.diffRowNew
                    : row.status === 'changed'
                    ? styles.diffRowDifferent
                    : styles.diffRowSame;

                return (
                  <TableRow key={row.fieldKey} className={rowClass}>
                    <TableCell className={styles.fieldNameCell}>
                      <strong>{row.label}</strong>
                    </TableCell>
                    <TableCell className={styles.currentValueCell}>{row.currentValue}</TableCell>
                    <TableCell className={styles.healthIdValueCell}>
                      <strong>{row.healthIdValue}</strong>
                    </TableCell>
                    <TableCell>
                      {row.status === 'changed' && (
                        <Tag type="red" size="sm">
                          {t('changed', 'Changed')}
                        </Tag>
                      )}
                      {row.status === 'new' && (
                        <Tag type="blue" size="sm">
                          {t('new', 'New')}
                        </Tag>
                      )}
                      {row.status === 'identical' && (
                        <Tag type="green" size="sm">
                          {t('identical', 'Identical')}
                        </Tag>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
