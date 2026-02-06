import React, { useMemo } from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ComboBox, FormGroup } from '@carbon/react';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import { useBillableServices, type BillableService } from '../hooks/useBillableServices';
import styles from '../billing-information.scss';

type BillableItemsSelectionProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  selectedPaymentModeUuid?: string;
};

export const BillableItemsSelection: React.FC<BillableItemsSelectionProps> = ({
  control,
  errors,
  t,
  selectedPaymentModeUuid,
}) => {
  const { billableServices, isLoading } = useBillableServices();

  // Filter billable services based on selected payment mode
  const filteredBillableServices = useMemo(() => {
    if (!selectedPaymentModeUuid) {
      return [];
    }

    return billableServices
      .filter((service) => {
        // Only show enabled services
        if (service.serviceStatus !== 'ENABLED') {
          return false;
        }

        // Check if service has a price for the selected payment mode
        return service.servicePrices.some((price) => price.paymentMode.uuid === selectedPaymentModeUuid);
      })
      .map((service) => {
        // Find the price for the selected payment mode
        const priceForPaymentMode = service.servicePrices.find(
          (price) => price.paymentMode.uuid === selectedPaymentModeUuid,
        );

        return {
          id: service.uuid,
          text: `${service.name} - ${priceForPaymentMode?.price || 0}`,
          service: service,
          price: priceForPaymentMode,
        };
      });
  }, [billableServices, selectedPaymentModeUuid]);

  const fieldError = errors.billableItem;
  const errorMessage =
    fieldError && typeof fieldError === 'object' && 'message' in fieldError
      ? String(fieldError.message)
      : fieldError
      ? String(fieldError)
      : undefined;

  return (
    <FormGroup className={styles.billableItemsContainer} legendText={t('billableItems', 'Billable Items')}>
      <Controller
        name="billableItem"
        control={control}
        render={({ field: { onChange, value } }) => (
          <ComboBox
            id="billable-item-select"
            titleText={t('selectBillableItem', 'Select Billable Item')}
            items={filteredBillableServices}
            itemToString={(item) => (item ? item.text : '')}
            onChange={({ selectedItem }) => {
              onChange(selectedItem || null);
            }}
            selectedItem={value || null}
            placeholder={t('selectBillableItemPlaceholder', 'Select a billable item')}
            disabled={!selectedPaymentModeUuid || isLoading}
            invalid={!!fieldError}
            invalidText={errorMessage}
            helperText={
              !selectedPaymentModeUuid
                ? t('selectPaymentModeFirst', 'Please select a payment method first')
                : filteredBillableServices.length === 0
                ? t('noBillableItemsAvailable', 'No billable items available for the selected payment method')
                : undefined
            }
          />
        )}
      />
    </FormGroup>
  );
};
