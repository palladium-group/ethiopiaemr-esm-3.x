import React, { useEffect, useMemo } from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ComboBox, FormGroup } from '@carbon/react';
import type { TFunction } from 'i18next';
import { useSession } from '@openmrs/esm-framework';
import type { BillingFormData } from '../billing-information.resource';
import { useCashPoints } from '../hooks/useCashPoints';
import styles from '../billing-information.scss';

type CashPointSelectionProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const CashPointSelection: React.FC<CashPointSelectionProps> = ({ control, errors, t, setValue }) => {
  const { cashPoints, isLoading } = useCashPoints();
  const { sessionLocation } = useSession();
  const currentLocationUuid = sessionLocation?.uuid;

  // Filter cash points by current location and create options
  const cashPointOptions = useMemo(() => {
    return cashPoints.map((cp) => ({
      id: cp.uuid,
      text: cp.name,
      cashPoint: cp,
    }));
  }, [cashPoints]);

  // Auto-select cash point matching current location
  useEffect(() => {
    if (currentLocationUuid && cashPoints.length > 0) {
      const matchingCashPoint = cashPoints.find((cp) => cp.location?.uuid === currentLocationUuid);
      if (matchingCashPoint) {
        const option = cashPointOptions.find((opt) => opt.id === matchingCashPoint.uuid);
        if (option) {
          setValue('cashPointUuid', matchingCashPoint.uuid, { shouldDirty: false });
        }
      }
    }
  }, [currentLocationUuid, cashPoints, cashPointOptions, setValue]);

  const fieldError = errors.cashPointUuid;
  const errorMessage =
    fieldError && typeof fieldError === 'object' && 'message' in fieldError
      ? String(fieldError.message)
      : fieldError
      ? String(fieldError)
      : undefined;

  return (
    <FormGroup className={styles.cashPointContainer} legendText={t('cashPoint', 'Cash Point')}>
      <Controller
        name="cashPointUuid"
        control={control}
        rules={{ required: t('cashPointRequired', 'Cash point is required') }}
        render={({ field: { onChange, value } }) => (
          <ComboBox
            id="cash-point-select"
            titleText={t('selectCashPoint', 'Select Cash Point')}
            items={cashPointOptions}
            itemToString={(item) => (item ? item.text : '')}
            onChange={({ selectedItem }) => {
              onChange(selectedItem ? selectedItem.id : null);
            }}
            selectedItem={cashPointOptions.find((opt) => opt.id === value) || null}
            placeholder={t('selectCashPointPlaceholder', 'Select a cash point')}
            disabled={isLoading || cashPointOptions.length === 0}
            invalid={!!fieldError}
            invalidText={errorMessage}
            helperText={
              cashPointOptions.length === 0
                ? t('noCashPointsAvailable', 'No cash points available')
                : currentLocationUuid
                ? t('cashPointHelperText', 'Cash point matching your current location is pre-selected')
                : undefined
            }
          />
        )}
      />
    </FormGroup>
  );
};
