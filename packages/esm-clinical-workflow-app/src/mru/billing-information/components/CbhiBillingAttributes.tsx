import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { TextInput, FormGroup } from '@carbon/react';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import styles from '../billing-information.scss';
import { CbhiMemberSearch } from './CbhiMemberSearch';
import { useConfig } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../../config-schema';

type CbhiBillingAttributesProps = {
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

export const CbhiBillingAttributes: React.FC<CbhiBillingAttributesProps> = ({
  control,
  errors,
  t,
  attributeTypes,
  attributes,
  setValue,
}) => {
  const { showMockData } = useConfig<ClinicalWorkflowConfig>();
  const lowerNameIncludes = (attr: { name: string }, term: string) =>
    attr.name?.toLowerCase().includes(term.toLowerCase());

  const cbhiIdAttr =
    attributeTypes.find(
      (a) => lowerNameIncludes(a, 'cbhi') && (lowerNameIncludes(a, 'id') || lowerNameIncludes(a, 'number')),
    ) || attributeTypes[0];

  const cbhiExpiryAttr =
    attributeTypes.find(
      (a) => lowerNameIncludes(a, 'expiry') || lowerNameIncludes(a, 'expiration') || lowerNameIncludes(a, 'end'),
    ) ||
    attributeTypes.find((a) => a.uuid !== cbhiIdAttr?.uuid) ||
    attributeTypes[0];

  const cbhiIdFieldName = `attributes.${cbhiIdAttr.uuid}` as const;
  const cbhiExpiryFieldName = `attributes.${cbhiExpiryAttr.uuid}` as const;

  const cbhiIdError = errors.attributes?.[cbhiIdAttr.uuid];
  const cbhiExpiryError = errors.attributes?.[cbhiExpiryAttr.uuid];

  const getErrorMessage = (fieldError: any) =>
    fieldError && typeof fieldError === 'object' && 'message' in fieldError
      ? String(fieldError.message)
      : fieldError
      ? String(fieldError)
      : undefined;

  return (
    <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('billingDetails', 'Billing Details')}>
      {showMockData && (
        <CbhiMemberSearch
          t={t}
          onMemberSelected={(cbhiId, expiryDate) => {
            setValue(cbhiIdFieldName, cbhiId, { shouldDirty: true });
            setValue(cbhiExpiryFieldName, expiryDate, { shouldDirty: true });
          }}
        />
      )}

      <Controller
        name={cbhiIdFieldName}
        control={control}
        render={({ field: { value, onChange } }) => (
          <TextInput
            id={`attribute-${cbhiIdAttr.uuid}`}
            labelText={cbhiIdAttr.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            readOnly={showMockData}
            invalid={!!cbhiIdError}
            invalidText={getErrorMessage(cbhiIdError)}
          />
        )}
      />

      <Controller
        name={cbhiExpiryFieldName}
        control={control}
        render={({ field: { value, onChange } }) => (
          <TextInput
            id={`attribute-${cbhiExpiryAttr.uuid}`}
            labelText={cbhiExpiryAttr.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            readOnly={showMockData}
            invalid={!!cbhiExpiryError}
            invalidText={getErrorMessage(cbhiExpiryError)}
          />
        )}
      />
    </FormGroup>
  );
};
