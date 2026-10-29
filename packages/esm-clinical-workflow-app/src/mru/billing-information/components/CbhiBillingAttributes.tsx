import React, { useMemo } from 'react';
import { FormGroup, TextInput } from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { FieldErrors } from 'react-hook-form';
import { CBHI_VISIT_ATTRIBUTE_FIELDS, type BillingFormData } from '../billing-information.resource';
import { CBHI_ATTRIBUTE_UUIDS } from '../billing-constants';
import styles from '../billing-information.scss';
import { CbhiMemberSearch } from './CbhiMemberSearch';
import { useCbhiManualEntrySetting } from '../hooks/useCbhiManualEntrySetting';
import type { CbhiPersistFields } from '../hooks/useCbhiSearch';

type CbhiBillingAttributesProps = {
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const CbhiBillingAttributes: React.FC<CbhiBillingAttributesProps> = ({ errors, t, attributes, setValue }) => {
  const { isManualEntryEnabled } = useCbhiManualEntrySetting();

  const selectedMember = useMemo<CbhiPersistFields | null>(() => {
    const hasAnyValue =
      Boolean(attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] || attributes?.cbhiId) ||
      Boolean(attributes?.[CBHI_ATTRIBUTE_UUIDS.fullName] || attributes?.fullName) ||
      Boolean(attributes?.[CBHI_ATTRIBUTE_UUIDS.id] || attributes?.id);

    if (!hasAnyValue) {
      return null;
    }

    return {
      id: attributes?.[CBHI_ATTRIBUTE_UUIDS.id] ?? attributes?.id ?? '',
      fullName: attributes?.[CBHI_ATTRIBUTE_UUIDS.fullName] ?? attributes?.fullName ?? '',
      accountNo: attributes?.[CBHI_ATTRIBUTE_UUIDS.accountNo] ?? attributes?.accountNo ?? null,
      membershipType: attributes?.[CBHI_ATTRIBUTE_UUIDS.membershipType] ?? attributes?.membershipType ?? null,
      cbhiId: attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] ?? attributes?.cbhiId ?? '',
      insuredId: attributes?.[CBHI_ATTRIBUTE_UUIDS.insuredId] ?? attributes?.insuredId ?? null,
    };
  }, [attributes]);

  const handleMemberSelected = (member: CbhiPersistFields) => {
    const nextAttributes = { ...attributes };

    // Set by exact attribute UUIDs
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.id] = member.id ?? '';
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.fullName] = member.fullName ?? '';
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.accountNo] = member.accountNo ?? '';
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.membershipType] = member.membershipType ?? '';
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.cbhiId] = member.cbhiId ?? '';
    nextAttributes[CBHI_ATTRIBUTE_UUIDS.insuredId] = member.insuredId ?? '';

    // Also populate friendly field keys for backwards compatibility
    CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field) => {
      nextAttributes[field] = member[field] ?? '';
    });

    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  const handleClearSelection = () => {
    const nextAttributes = { ...attributes };

    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.id];
    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.fullName];
    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.accountNo];
    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.membershipType];
    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.cbhiId];
    delete nextAttributes[CBHI_ATTRIBUTE_UUIDS.insuredId];

    CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field) => {
      delete nextAttributes[field];
    });

    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  const handleFieldChange = (uuid: string, alias: string, value: string) => {
    const nextAttributes = {
      ...attributes,
      [uuid]: value,
      [alias]: value,
    };
    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  const cbhiIdValue = attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] ?? attributes?.cbhiId ?? '';
  const expiryDateValue =
    attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate] ?? attributes?.expiryDate ?? attributes?.cbhiExpiryDate ?? '';
  const regionValue = attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiRegion] ?? attributes?.cbhiRegion ?? '';
  const zoneValue = attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiZone] ?? attributes?.cbhiZone ?? '';
  const woredaValue = attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiWoreda] ?? attributes?.cbhiWoreda ?? '';

  const cbhiIdError = errors.attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] || errors.attributes?.cbhiId;
  const cbhiIdErrorMessage =
    cbhiIdError && typeof cbhiIdError === 'object' && 'message' in cbhiIdError
      ? String(cbhiIdError.message)
      : cbhiIdError
      ? String(cbhiIdError)
      : undefined;

  const expiryDateError =
    errors.attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate] ||
    errors.attributes?.expiryDate ||
    errors.attributes?.cbhiExpiryDate;
  const expiryDateErrorMessage =
    expiryDateError && typeof expiryDateError === 'object' && 'message' in expiryDateError
      ? String(expiryDateError.message)
      : expiryDateError
      ? String(expiryDateError)
      : undefined;

  if (isManualEntryEnabled) {
    return (
      <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('cbhiDetails', 'CBHI Details')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="attribute-cbhiId"
            labelText={t('cbhiId', 'CBHI ID *')}
            value={cbhiIdValue}
            onChange={(e) => handleFieldChange(CBHI_ATTRIBUTE_UUIDS.cbhiId, 'cbhiId', e.target.value)}
            placeholder={t('enterCbhiId', 'Enter CBHI ID')}
            invalid={!!cbhiIdError}
            invalidText={cbhiIdErrorMessage}
            required
          />
          <OpenmrsDatePicker
            id="attribute-cbhiExpiryDate"
            labelText={t('expiryDate', 'Expiry Date *')}
            value={expiryDateValue}
            onChange={(date) => {
              const dateValue = typeof date === 'string' ? date : date ? date.toISOString().split('T')[0] : '';
              const nextAttributes = {
                ...attributes,
                [CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate]: dateValue,
                expiryDate: dateValue,
                cbhiExpiryDate: dateValue,
              };
              setValue('attributes', nextAttributes, { shouldDirty: true });
            }}
            invalid={!!expiryDateError}
            invalidText={expiryDateErrorMessage}
          />
          <TextInput
            id="attribute-cbhiRegion"
            labelText={t('cbhiRegion', 'CBHI Region')}
            value={regionValue}
            onChange={(e) => handleFieldChange(CBHI_ATTRIBUTE_UUIDS.cbhiRegion, 'cbhiRegion', e.target.value)}
            placeholder={t('enterCbhiRegion', 'Enter CBHI Region')}
          />
          <TextInput
            id="attribute-cbhiZone"
            labelText={t('cbhiZone', 'CBHI Zone')}
            value={zoneValue}
            onChange={(e) => handleFieldChange(CBHI_ATTRIBUTE_UUIDS.cbhiZone, 'cbhiZone', e.target.value)}
            placeholder={t('enterCbhiZone', 'Enter CBHI Zone')}
          />
          <TextInput
            id="attribute-cbhiWoreda"
            labelText={t('cbhiWoreda', 'CBHI Woreda')}
            value={woredaValue}
            onChange={(e) => handleFieldChange(CBHI_ATTRIBUTE_UUIDS.cbhiWoreda, 'cbhiWoreda', e.target.value)}
            placeholder={t('enterCbhiWoreda', 'Enter CBHI Woreda')}
          />
        </div>
      </FormGroup>
    );
  }

  return (
    <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('cbhiDetails', 'CBHI Details')}>
      <CbhiMemberSearch
        t={t}
        selectedMember={selectedMember}
        onMemberSelected={handleMemberSelected}
        onClearSelection={handleClearSelection}
      />
    </FormGroup>
  );
};
