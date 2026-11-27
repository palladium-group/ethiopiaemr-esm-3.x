import React from 'react';
import { FormGroup, TextInput } from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { FieldErrors } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';
import { SHI_ATTRIBUTE_UUIDS } from '../billing-constants';
import styles from '../billing-information.scss';

const toIsoDate = (d: unknown) => (!d ? '' : typeof d === 'string' ? d : (d as Date).toISOString().split('T')[0]);

type ShiBillingAttributesProps = {
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const ShiBillingAttributes: React.FC<ShiBillingAttributesProps> = ({ errors, t, attributes, setValue }) => {
  const handleFieldChange = (uuid: string, value: string) => {
    setValue('attributes', { ...attributes, [uuid]: value }, { shouldDirty: true });
  };

  const getFieldError = (uuid: string) => {
    const error = errors.attributes?.[uuid];
    return (error as any)?.message ? String((error as any).message) : error ? String(error) : undefined;
  };

  const shiIdError = getFieldError(SHI_ATTRIBUTE_UUIDS.shiId);
  const shiExpiryDateError = getFieldError(SHI_ATTRIBUTE_UUIDS.shiExpiryDate);

  return (
    <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('shiDetails', 'SHI Details')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <TextInput
          id="shi-id"
          labelText={t('shiId', 'SHI ID *')}
          value={attributes?.[SHI_ATTRIBUTE_UUIDS.shiId] ?? ''}
          onChange={(e) => handleFieldChange(SHI_ATTRIBUTE_UUIDS.shiId, e.target.value)}
          placeholder={t('enterShiId', 'Enter SHI ID')}
          invalid={!!shiIdError}
          invalidText={shiIdError}
          required
        />
        <OpenmrsDatePicker
          id="shi-expiry-date"
          labelText={t('shiExpiryDate', 'SHI Expiry Date *')}
          value={attributes?.[SHI_ATTRIBUTE_UUIDS.shiExpiryDate] ?? ''}
          onChange={(date) => handleFieldChange(SHI_ATTRIBUTE_UUIDS.shiExpiryDate, toIsoDate(date))}
          invalid={!!shiExpiryDateError}
          invalidText={shiExpiryDateError}
        />
      </div>
    </FormGroup>
  );
};
