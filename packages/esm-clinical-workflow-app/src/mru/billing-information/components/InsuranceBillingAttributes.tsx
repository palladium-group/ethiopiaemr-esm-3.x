import React from 'react';
import { FormGroup, TextInput } from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { FieldErrors } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';
import { INSURANCE_ATTRIBUTE_UUIDS } from '../billing-constants';
import styles from '../billing-information.scss';

const toIsoDate = (d: unknown) => (!d ? '' : typeof d === 'string' ? d : (d as Date).toISOString().split('T')[0]);

type InsuranceBillingAttributesProps = {
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const InsuranceBillingAttributes: React.FC<InsuranceBillingAttributesProps> = ({
  errors,
  t,
  attributes,
  setValue,
}) => {
  const handleFieldChange = (uuid: string, value: string) => {
    setValue('attributes', { ...attributes, [uuid]: value }, { shouldDirty: true });
  };

  const getFieldError = (uuid: string) => {
    const error = errors.attributes?.[uuid];
    return (error as any)?.message ? String((error as any).message) : error ? String(error) : undefined;
  };

  const insuranceIdError = getFieldError(INSURANCE_ATTRIBUTE_UUIDS.insuranceId);
  const expiryDateError = getFieldError(INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate);
  const accidentDateError = getFieldError(INSURANCE_ATTRIBUTE_UUIDS.accidentDate);

  return (
    <FormGroup
      className={styles.billingTypeAttributesContainer}
      legendText={t('insuranceDetails', 'Insurance Details')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <TextInput
          id="insurance-id"
          labelText={t('insuranceId', 'Insurance ID *')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceId] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.insuranceId, e.target.value)}
          placeholder={t('enterInsuranceId', 'Enter Insurance ID')}
          invalid={!!insuranceIdError}
          invalidText={insuranceIdError}
          required
        />

        <TextInput
          id="insurance-name"
          labelText={t('insuranceName', 'Insurance Name')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceName] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.insuranceName, e.target.value)}
          placeholder={t('enterInsuranceName', 'Enter Insurance Name')}
        />

        <TextInput
          id="insurance-code"
          labelText={t('insuranceCode', 'Insurance Code')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceCode] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.insuranceCode, e.target.value)}
          placeholder={t('enterInsuranceCode', 'Enter Insurance Code')}
        />

        <TextInput
          id="insurance-zone"
          labelText={t('insuranceZone', 'Insurance Zone')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceZone] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.insuranceZone, e.target.value)}
          placeholder={t('enterInsuranceZone', 'Enter Insurance Zone')}
        />

        <OpenmrsDatePicker
          id="insurance-expiry-date"
          labelText={t('insuranceExpiryDate', 'Insurance Expiry Date *')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate] ?? ''}
          onChange={(date) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate, toIsoDate(date))}
          invalid={!!expiryDateError}
          invalidText={expiryDateError}
        />

        <OpenmrsDatePicker
          id="insurance-accident-date"
          labelText={t('accidentDate', 'Date of the accident *')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.accidentDate] ?? ''}
          onChange={(date) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.accidentDate, toIsoDate(date))}
          invalid={!!accidentDateError}
          invalidText={accidentDateError}
        />

        <TextInput
          id="insurance-accident-place"
          labelText={t('accidentPlace', 'Accident Place')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.accidentPlace] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.accidentPlace, e.target.value)}
          placeholder={t('enterAccidentPlace', 'Enter Accident Place')}
        />

        <TextInput
          id="insurance-police-officer-name"
          labelText={t('policeOfficerName', 'Police Officer Name')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.policeOfficerName] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.policeOfficerName, e.target.value)}
          placeholder={t('enterPoliceOfficerName', 'Enter Police Officer Name')}
        />

        <TextInput
          id="insurance-police-officer-phone"
          labelText={t('policeOfficerPhone', 'Police Officer Phone Number')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.policeOfficerPhone] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.policeOfficerPhone, e.target.value)}
          placeholder={t('enterPoliceOfficerPhone', 'Enter Police Officer Phone Number')}
        />

        <TextInput
          id="insurance-at-fault-driver-plate-no"
          labelText={t('atFaultDriverPlateNo', 'At-fault driver plate no. and code')}
          value={attributes?.[INSURANCE_ATTRIBUTE_UUIDS.atFaultDriverPlateNo] ?? ''}
          onChange={(e) => handleFieldChange(INSURANCE_ATTRIBUTE_UUIDS.atFaultDriverPlateNo, e.target.value)}
          placeholder={t('enterAtFaultDriverPlateNo', 'Enter plate no. and code')}
        />
      </div>
    </FormGroup>
  );
};
