import React, { useRef } from 'react';
import { Controller, Control, FieldErrors, UseFormGetValues } from 'react-hook-form';
import { Dropdown, FormGroup } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';
import styles from '../billing-information.scss';

type CreditSubTypeSelectionProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  creditSubType?: string;
  getValues: UseFormGetValues<BillingFormData>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

const serializeCreditTypeDetails = (details: unknown): string | undefined => {
  if (details === undefined || details === null || details === '') {
    return undefined;
  }

  if (typeof details === 'string') {
    return details;
  }

  return JSON.stringify(details);
};

export const CreditSubTypeSelection: React.FC<CreditSubTypeSelectionProps> = ({
  control,
  errors,
  t,
  creditSubType,
  getValues,
  setValue,
}) => {
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const creditDetailsCacheRef = useRef<Record<string, string>>({});
  const creditSubTypeRef = useRef(creditSubType);

  creditSubTypeRef.current = creditSubType;

  const creditSubTypes = [
    { value: 'cbhi', label: 'CBHI' },
    { value: 'shi', label: 'SHI' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'creditCompany', label: 'Credit Company' },
  ];

  return (
    <FormGroup className={styles.creditDetailsContainer} legendText={t('creditType', 'Credit Type')}>
      <Controller
        name="creditSubType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="creditSubType"
            titleText={t('selectCreditType', 'Select Credit Type')}
            label={t('selectCreditType', 'Select Credit Type')}
            items={creditSubTypes}
            itemToString={(item) => (item ? item.label : '')}
            selectedItem={creditSubTypes.find((item) => item.value === value) || null}
            onChange={({ selectedItem }) => {
              const subTypeValue = selectedItem?.value;
              const previousSubType = creditSubTypeRef.current;
              const creditTypeDetailsKey = billingVisitAttributeTypes.creditTypeDetails;

              if (previousSubType && creditTypeDetailsKey) {
                const currentAttributes = getValues('attributes') || {};
                const serializedDetails = serializeCreditTypeDetails(currentAttributes[creditTypeDetailsKey]);
                if (serializedDetails) {
                  creditDetailsCacheRef.current[previousSubType] = serializedDetails;
                }
              }

              onChange(subTypeValue);
              setValue('creditSubType', subTypeValue, { shouldDirty: true });

              if (subTypeValue && billingVisitAttributeTypes.creditType) {
                setValue(`attributes.${billingVisitAttributeTypes.creditType}`, subTypeValue, { shouldDirty: true });
              }

              if (creditTypeDetailsKey) {
                const cachedDetails = subTypeValue ? creditDetailsCacheRef.current[subTypeValue] : undefined;
                setValue(`attributes.${creditTypeDetailsKey}`, cachedDetails ?? '', { shouldDirty: false });
              }
            }}
            invalid={!!errors.creditSubType}
            invalidText={errors.creditSubType?.message}
          />
        )}
      />
    </FormGroup>
  );
};
