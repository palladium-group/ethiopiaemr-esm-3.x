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
  isEditMode?: boolean;
};

export const BillableItemsSelection: React.FC<BillableItemsSelectionProps> = ({
  control,
  errors,
  t,
  selectedPaymentModeUuid,
  isEditMode = false,
}) => {
  const { billableServices, isLoading } = useBillableServices();

  // Show all enabled billable services regardless of payment mode
  const filteredBillableServices = useMemo(() => {
    return billableServices
      .filter((service) => {
        // Only show enabled services
        return service.serviceStatus === 'ENABLED';
      })
      .map((service) => {
        // Find the price for the selected payment mode if available, otherwise use first price
        const priceForPaymentMode = selectedPaymentModeUuid
          ? service.servicePrices.find((price) => price.paymentMode.uuid === selectedPaymentModeUuid) ||
            service.servicePrices[0]
          : service.servicePrices[0];

        return {
          id: service.uuid,
          text: `${service.name}${priceForPaymentMode ? ` - ${priceForPaymentMode.price}` : ''}`,
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
        rules={
          !isEditMode
            ? {
                required: t('billableServiceRequired', 'Billable service is required'),
              }
            : undefined
        }
        render={({ field: { onChange, value } }) => {
          // Update selected item's price when payment mode changes
          const selectedItemWithUpdatedPrice = value
            ? filteredBillableServices.find((item) => item.id === value.id) || value
            : null;

          return (
            <ComboBox
              id="billable-item-select"
              titleText={t('selectBillableService', 'Select Billable Service')}
              items={filteredBillableServices}
              itemToString={(item) => (item ? item.text : '')}
              onChange={({ selectedItem }) => {
                onChange(selectedItem || null);
              }}
              selectedItem={selectedItemWithUpdatedPrice}
              placeholder={t('selectBillableServicePlaceholder', 'Select a billable service')}
              disabled={isEditMode || isLoading}
              invalid={!!fieldError}
              invalidText={errorMessage}
              helperText={
                filteredBillableServices.length === 0
                  ? t('noBillableItemsAvailable', 'No billable items available')
                  : undefined
              }
            />
          );
        }}
      />
    </FormGroup>
  );
};
