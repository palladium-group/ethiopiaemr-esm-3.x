import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MappedBill, PaymentStatus } from '../../../types';
import styles from './payment.scss';
import { Stack, TextInput, Button, ButtonSet, InlineLoading, Dropdown, InlineNotification } from '@carbon/react';
import {
  DefaultWorkspaceProps,
  ResponsiveWrapper,
  restBaseUrl,
  showSnackbar,
  useLayoutType,
} from '@openmrs/esm-framework';
import classNames from 'classnames';
import { Controller } from 'react-hook-form';
import { usePaymentModes } from '../../../billing.resource';
import { usePaymentForm } from './use-payment-form';
import { z } from 'zod';
import { mutate } from 'swr';
import { makePayment } from '../payments.resource';
import { createLineItemPaymentPayload, getPayableLineItemUuids } from '../utils';
import { extractErrorMessagesFromResponse } from '../../../utils';
import { useCurrencyFormatting } from '../../../helpers/currency';

type PaymentWorkspaceProps = DefaultWorkspaceProps & {
  bill: MappedBill;
};

const roundCurrency = (value: number) => parseFloat(Number(value).toFixed(2));

const PaymentWorkspace: React.FC<PaymentWorkspaceProps> = ({
  bill,
  closeWorkspace,
  promptBeforeClosing,
  closeWorkspaceWithSavedChanges,
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const isTablet = useLayoutType() === 'tablet';

  const unpaidLineItemsTotal = useMemo(
    () =>
      roundCurrency(
        (bill.lineItems ?? [])
          .filter(
            (item) => item.paymentStatus !== PaymentStatus.PAID && item.paymentStatus !== PaymentStatus.EXEMPTED,
          )
          .reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
      ),
    [bill.lineItems],
  );

  const { formMethods, paymentSchema } = usePaymentForm(
    (key, defaultValue, options) => t(key, defaultValue, options),
    unpaidLineItemsTotal,
  );

  type PaymentFormData = z.infer<typeof paymentSchema>;

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentModes();

  const {
    formState: { isSubmitting, errors, isValid },
    control,
    handleSubmit,
    watch,
  } = formMethods;

  const amountTendered = watch('amountTendered');
  const isExactUnpaidPayment =
    unpaidLineItemsTotal > 0 &&
    amountTendered !== undefined &&
    roundCurrency(Number(amountTendered)) === unpaidLineItemsTotal;

  const onSubmit = async (data: PaymentFormData) => {
    if (!data.instanceType || !isExactUnpaidPayment) {
      return;
    }

    const matchedMode =
      paymentModes.find((mode) => mode.uuid === data.instanceType?.uuid) ?? (data.instanceType as any);

    const lineItemUuids = getPayableLineItemUuids(bill.lineItems);
    const paymentPayload = createLineItemPaymentPayload({
      method: matchedMode,
      amount: data.amountTendered,
      lineItemUuids,
    });

    if (data.attributes) {
      paymentPayload.attributes = Object.entries(data.attributes)
        .filter(([, value]) => value !== undefined && String(value).trim() !== '')
        .map(([uuid, value]) => ({ attributeType: uuid, value: String(value) }));
    }

    try {
      const response = await makePayment(bill.uuid, paymentPayload);
      if (!response.ok || !response.data?.uuid) {
        throw response;
      }
      showSnackbar({
        title: t('paymentSaved', 'Payment saved'),
        kind: 'success',
        subtitle: t('paymentSavedSuccessfully', 'Payment saved successfully'),
      });
      const url = `${restBaseUrl}/cashier/bill/${bill.uuid}`;
      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
      closeWorkspaceWithSavedChanges();
    } catch (error: any) {
      showSnackbar({
        title: t('errorSavingPayment', 'Error saving payment'),
        kind: 'error',
        subtitle: extractErrorMessagesFromResponse(error?.responseBody) || error?.message,
      });
    }
  };

  const handleError = (error: any) => {
    showSnackbar({
      title: t('errorSavingPayment', 'Error generating payment'),
      kind: 'error',
      subtitle: JSON.stringify(error, null, 2),
    });
  };

  useEffect(() => {
    promptBeforeClosing(() => formMethods.formState.isDirty);
  }, [formMethods.formState.isDirty, promptBeforeClosing]);

  if (isLoadingPaymentModes) {
    return <InlineLoading status="active" iconDescription="Loading payment modes" />;
  }

  const attributeTypes = (formMethods.watch('instanceType')?.attributeTypes as Array<Record<string, string>>) || [];
  const showIncompletePayment =
    amountTendered !== undefined &&
    Number(amountTendered) > 0 &&
    roundCurrency(Number(amountTendered)) < unpaidLineItemsTotal;
  const showOverPayment =
    amountTendered !== undefined &&
    Number(amountTendered) > 0 &&
    roundCurrency(Number(amountTendered)) > unpaidLineItemsTotal;

  return (
    <form onSubmit={handleSubmit(onSubmit, handleError)} className={styles.form}>
      <div className={styles.formContainer}>
        <Stack className={styles.formStackControl} gap={7}>
          {unpaidLineItemsTotal <= 0 && (
            <InlineNotification
              title={t('noUnpaidLineItems', 'No unpaid line items')}
              subtitle={t(
                'noUnpaidLineItemsSubtitle',
                'There are no unpaid line items remaining on this bill.',
              )}
              lowContrast
              kind="info"
            />
          )}
          {showIncompletePayment && (
            <InlineNotification
              title={t('incompletePayment', 'Incomplete payment')}
              subtitle={t(
                'incompletePaymentSubtitle',
                'Please ensure all selected line items are fully paid, Total amount expected is {{selectedLineItemsAmountDue}}',
                {
                  selectedLineItemsAmountDue: formatCurrency(unpaidLineItemsTotal),
                },
              )}
              lowContrast
              kind="error"
            />
          )}
          {showOverPayment && (
            <InlineNotification
              title={t('overPayment', 'Over payment')}
              subtitle={t(
                'overPaymentSubtitle',
                'Amount paid {{totalAmountTendered}} should not be greater than amount due {{selectedLineItemsAmountDue}} for selected line items',
                {
                  totalAmountTendered: formatCurrency(Number(amountTendered)),
                  selectedLineItemsAmountDue: formatCurrency(unpaidLineItemsTotal),
                },
              )}
              lowContrast
              kind="warning"
            />
          )}
          <ResponsiveWrapper>
            <Stack gap={4}>
              <Controller
                name="instanceType"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    id="instanceType"
                    titleText={t('instanceType', 'Instance Type')}
                    label={t('selectInstanceType', 'Select instance type')}
                    items={paymentModes}
                    onChange={({ selectedItem }) => field.onChange(selectedItem)}
                    itemToString={(item) => (item ? item.name : '')}
                    invalid={!!errors.instanceType}
                    invalidText={errors.instanceType?.message}
                  />
                )}
              />
            </Stack>
          </ResponsiveWrapper>
          <ResponsiveWrapper>
            <Controller
              name="amountTendered"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  id="amountTendered"
                  labelText={t('amountTendered', 'Amount Tendered')}
                  placeholder={t('enterAmountTenderedExact', 'Enter amount tendered, required total is {{amount}}', {
                    amount: formatCurrency(unpaidLineItemsTotal),
                  })}
                  type="number"
                  step="0.01"
                  max={unpaidLineItemsTotal}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  invalid={!!errors.amountTendered}
                  invalidText={errors.amountTendered?.message}
                />
              )}
            />
          </ResponsiveWrapper>
          <ResponsiveWrapper>
            {attributeTypes.map((attributeType) => (
              <Controller
                key={attributeType.uuid}
                name={`attributes.${attributeType.uuid}`}
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    id={attributeType.uuid}
                    labelText={`${attributeType.name || 'Attribute'}${
                      attributeType.required ? t('required', ' (Required)') : ''
                    }`}
                    placeholder={attributeType.description || 'Enter value'}
                    invalid={!!errors.attributes?.[attributeType.uuid] || (attributeType.required && !field.value)}
                    invalidText={
                      errors.attributes?.[attributeType.uuid]?.message ||
                      (attributeType.required && !field.value
                        ? t('attributeValueRequired', 'Attribute value is required')
                        : '')
                    }
                  />
                )}
              />
            ))}
          </ResponsiveWrapper>
        </Stack>
      </div>
      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button style={{ maxWidth: '50%' }} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          disabled={isSubmitting || !isValid || !isExactUnpaidPayment || unpaidLineItemsTotal <= 0}
          style={{ maxWidth: '50%' }}
          kind="primary"
          type="submit">
          {isSubmitting ? (
            <span style={{ display: 'flex', justifyItems: 'center' }}>
              {t('submitting', 'Submitting...')} <InlineLoading status="active" iconDescription="Loading" />
            </span>
          ) : (
            t('saveAndClose', 'Save & close')
          )}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default PaymentWorkspace;
