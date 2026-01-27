import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { TextInput, Dropdown, FormGroup } from '@carbon/react';
import { OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';
import styles from '../billing-information.scss';

type CreditSubTypeFieldsProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  creditSubType: string;
  creditCompanies: Array<{ uuid: string; name: string }>;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const CreditSubTypeFields: React.FC<CreditSubTypeFieldsProps> = ({
  control,
  errors,
  t,
  creditSubType,
  creditCompanies,
  attributes,
  setValue,
}) => {
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();

  // Use creditTypeDetails UUID to store all credit details as a JSON object
  const creditDetailsKey = billingVisitAttributeTypes.creditTypeDetails || 'creditTypeDetails';
  const creditDetails = attributes[creditDetailsKey]
    ? typeof attributes[creditDetailsKey] === 'string'
      ? JSON.parse(attributes[creditDetailsKey])
      : attributes[creditDetailsKey]
    : {};

  const updateCreditDetails = (fieldName: string, value: any) => {
    const updatedDetails = { ...creditDetails, [fieldName]: value };
    setValue(`attributes.${creditDetailsKey}`, JSON.stringify(updatedDetails), { shouldDirty: true });
  };

  const renderField = (fieldName: string, label: string, isDate = false, isDropdown = false, items: any[] = []) => {
    const fieldValue = creditDetails[fieldName] || '';
    const creditDetailsError = errors.attributes?.[creditDetailsKey];
    const errorMessage =
      creditDetailsError && typeof creditDetailsError === 'object' && 'message' in creditDetailsError
        ? String(creditDetailsError.message)
        : creditDetailsError
        ? String(creditDetailsError)
        : undefined;

    if (isDropdown) {
      return (
        <Dropdown
          key={fieldName}
          id={`attribute-${fieldName}`}
          titleText={label}
          label={label}
          items={items}
          itemToString={(item) => (item ? (typeof item === 'string' ? item : item.name || item.uuid) : '')}
          selectedItem={
            items.find((item) => (typeof item === 'string' ? item === fieldValue : item.uuid === fieldValue)) || null
          }
          onChange={({ selectedItem }) => {
            const selectedValue = typeof selectedItem === 'string' ? selectedItem : selectedItem?.uuid || '';
            updateCreditDetails(fieldName, selectedValue);
          }}
          invalid={!!creditDetailsError}
          invalidText={errorMessage}
        />
      );
    }

    if (isDate) {
      return (
        <OpenmrsDatePicker
          key={fieldName}
          id={`attribute-${fieldName}`}
          labelText={label}
          value={fieldValue || ''}
          onChange={(date) => {
            const dateValue = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            updateCreditDetails(fieldName, dateValue);
          }}
          invalid={!!creditDetailsError}
          invalidText={errorMessage}
        />
      );
    }

    return (
      <TextInput
        key={fieldName}
        id={`attribute-${fieldName}`}
        labelText={label}
        value={fieldValue || ''}
        onChange={(e) => {
          updateCreditDetails(fieldName, e.target.value);
        }}
        placeholder={t('enterValue', 'Enter {{name}}', { name: label })}
        invalid={!!creditDetailsError}
        invalidText={errorMessage}
      />
    );
  };

  return (
    <FormGroup className={styles.creditTypeDetailsContainer} legendText={t('creditDetails', 'Credit Details')}>
      {creditSubType === 'cbhi' && (
        <>
          {renderField('cbhiId', t('cbhiId', 'CBHI ID'))}
          {renderField('cbhiExpiryDate', t('expiryDate', 'Expiry Date'), true)}
        </>
      )}
      {creditSubType === 'shi' && (
        <>
          {renderField('shiId', t('shiId', 'SHI ID'))}
          {renderField('shiExpiryDate', t('expiryDate', 'Expiry Date'), true)}
        </>
      )}
      {creditSubType === 'insurance' && (
        <>
          {renderField('insuranceName', t('insuranceName', 'Insurance Name'))}
          {renderField('insuranceId', t('insuranceId', 'Insurance ID'))}
          {renderField('insuranceCode', t('insuranceCode', 'Insurance Code'))}
          {renderField('insuranceZone', t('insuranceZone', 'Insurance Zone'))}
          {renderField('insuranceExpiryDate', t('insuranceExpiryDate', 'Insurance Expiry Date'), true)}
        </>
      )}
      {creditSubType === 'creditCompany' && (
        <>
          {renderField(
            'creditCompany',
            t('creditCompany', 'Credit Company'),
            false,
            true,
            creditCompanies.map((company) => ({ uuid: company.uuid, name: company.name })),
          )}
        </>
      )}
    </FormGroup>
  );
};
