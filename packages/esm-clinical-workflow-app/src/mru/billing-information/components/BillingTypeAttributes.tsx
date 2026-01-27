import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { TextInput, FormGroup } from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import styles from '../billing-information.scss';

type BillingTypeAttributesProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributeTypes: Array<{
    uuid: string;
    name: string;
    description?: string;
    format?: string;
    required?: boolean;
  }>;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const BillingTypeAttributes: React.FC<BillingTypeAttributesProps> = ({
  control,
  errors,
  t,
  attributeTypes,
  attributes,
  setValue,
}) => {
  const renderAttributeField = (attrType: {
    uuid: string;
    name: string;
    description?: string;
    format?: string;
    required?: boolean;
  }) => {
    const fieldName = `attributes.${attrType.uuid}` as const;
    const fieldError = errors.attributes?.[attrType.uuid];
    const errorMessage =
      fieldError && typeof fieldError === 'object' && 'message' in fieldError
        ? String(fieldError.message)
        : fieldError
        ? String(fieldError)
        : undefined;

    // Determine field type based on format
    const isDateField =
      attrType.format?.toLowerCase().includes('date') || attrType.format === 'org.openmrs.util.AttributableDate';

    if (isDateField) {
      return (
        <Controller
          key={attrType.uuid}
          name={fieldName}
          control={control}
          render={({ field: { onChange, value } }) => (
            <OpenmrsDatePicker
              id={`attribute-${attrType.uuid}`}
              labelText={attrType.name}
              value={value || ''}
              onChange={(date) => {
                const dateValue = typeof date === 'string' ? date : date.toISOString().split('T')[0];
                onChange(dateValue);
                setValue(fieldName, dateValue, { shouldDirty: true });
              }}
              invalid={!!fieldError}
              invalidText={errorMessage}
            />
          )}
        />
      );
    }

    // Default to text input
    return (
      <Controller
        key={attrType.uuid}
        name={fieldName}
        control={control}
        render={({ field: { onChange, value } }) => (
          <TextInput
            id={`attribute-${attrType.uuid}`}
            labelText={attrType.name}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              setValue(fieldName, e.target.value, { shouldDirty: true });
            }}
            placeholder={attrType.description || t('enterValue', 'Enter {{name}}', { name: attrType.name })}
            invalid={!!fieldError}
            invalidText={errorMessage}
            required={attrType.required}
          />
        )}
      />
    );
  };

  return (
    <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('billingDetails', 'Billing Details')}>
      {attributeTypes.map((attrType) => renderAttributeField(attrType))}
    </FormGroup>
  );
};
