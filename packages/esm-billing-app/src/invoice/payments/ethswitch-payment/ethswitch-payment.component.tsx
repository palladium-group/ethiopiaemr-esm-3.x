import {
  Button,
  ButtonSet,
  Dropdown,
  DropdownSkeleton,
  Form,
  InlineNotification,
  Layer,
  Loading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  TextInput,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  EthSwitchPaymentError,
  submitEthSwitchPayment,
  useEthSwitchBanks,
} from '../../../ethswitch/ethswitch-resource';
import { useEthSwitchRequestStatus } from '../../../hooks/useEthSwitchRequestStatus';
import { LineItem, MappedBill, PaymentStatus } from '../../../types';
import styles from './ethswitch-payment.scss';

const ethSwitchPaymentSchema = z
  .object({
    payerName: z.string().trim().min(1, { message: 'Payer name is required' }),
    paymentMethod: z.enum(['ACCOUNT', 'QR']),
    payerDfs: z.string().min(1, { message: 'Bank is required' }),
    accountNumber: z.string().optional(),
    billAmount: z.string().nonempty({ message: 'Amount is required' }),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'ACCOUNT' && !data.accountNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Account number is required',
        path: ['accountNumber'],
      });
    }
  });

type FormData = z.infer<typeof ethSwitchPaymentSchema>;

export interface EthSwitchPaymentDialogProps {
  closeModal: () => void;
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
}

const EthSwitchPaymentDialog: React.FC<EthSwitchPaymentDialogProps> = ({ closeModal, bill, selectedLineItems }) => {
  const { t } = useTranslation();
  const { banks, isLoading: isLoadingBanks, errorMessage: banksErrorMessage } = useEthSwitchBanks();
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [merchantOrderNumber, setMerchantOrderNumber] = useState<string | null>(null);
  const [hasInitiated, setHasInitiated] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [{ requestStatus }, pollingTrigger] = useEthSwitchRequestStatus(setNotification, closeModal, bill);

  const isWaitingForPayment = requestStatus === 'INITIATED';
  const isSettlementFailed = requestStatus === 'SETTLEMENT-FAILED';
  const canRetryInitiate = Boolean(merchantOrderNumber) && !hasInitiated && !isWaitingForPayment && !isSettlementFailed;
  const pendingLineItems = selectedLineItems.filter((item) => item.paymentStatus === PaymentStatus.PENDING);
  const selectedLineItemsPendingAmount = pendingLineItems.reduce(
    (curr: number, prev) => curr + Number(prev.price * prev.quantity),
    0,
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    mode: 'all',
    defaultValues: {
      payerName: bill.patientName?.trim() ?? '',
      paymentMethod: 'ACCOUNT',
      payerDfs: '',
      accountNumber: '',
      billAmount: selectedLineItemsPendingAmount.toString(),
    },
    resolver: zodResolver(ethSwitchPaymentSchema),
  });

  const paymentMethod = watch('paymentMethod');
  const selectedPayerDfs = watch('payerDfs');
  const selectedBank = useMemo(
    () => banks.find((bank) => bank.BIC === selectedPayerDfs) ?? null,
    [banks, selectedPayerDfs],
  );

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const lineItemUuids = pendingLineItems.map((item) => item.uuid);

    if (lineItemUuids.length === 0) {
      setNotification({
        type: 'error',
        message: t('noPendingLineItems', 'No pending line items selected for payment.'),
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await submitEthSwitchPayment(
        {
          billUuid: bill.uuid,
          lineItemUuids,
          description: bill.receiptNumber ? `Bill ${bill.receiptNumber}` : undefined,
          payerName: data.payerName.trim(),
          accountNumber: data.accountNumber?.trim() || undefined,
          payerDfs: data.payerDfs,
          paymentMethod: data.paymentMethod,
        },
        merchantOrderNumber,
      );

      setMerchantOrderNumber(result.merchantOrderNumber);
      setHasInitiated(true);
      setQrCode(result.qrCode?.trim() || null);
      setNotification({
        message: t('ethSwitchPaymentInitiated', 'EthSwitch payment initiated successfully'),
        type: 'success',
      });
      pollingTrigger({
        merchantOrderNumber: result.merchantOrderNumber,
        requestStatus: 'INITIATED',
      });
    } catch (error) {
      if (error instanceof EthSwitchPaymentError && error.merchantOrderNumber) {
        setMerchantOrderNumber(error.merchantOrderNumber);
      }
      setNotification({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : t('unableToInitiateEthSwitchPayment', 'Unable to initiate EthSwitch payment, please try again later.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formDisabled = isWaitingForPayment || isSettlementFailed;

  return (
    <Form>
      <ModalHeader className={styles.heading} closeModal={closeModal}>
        {t('ethSwitchPayment', 'EthSwitch Payment')}
      </ModalHeader>
      <ModalBody>
        <div className={styles.form}>
          {notification && (
            <InlineNotification
              kind={notification.type}
              title={notification.message}
              onCloseButtonClick={() => setNotification(null)}
            />
          )}
          {banksErrorMessage && <InlineNotification kind="error" title={banksErrorMessage} hideCloseButton />}
          {isWaitingForPayment && (
            <section className={styles.waitingSection} aria-live="polite">
              {qrCode ? (
                <>
                  <img
                    className={styles.qrImage}
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/jpeg;base64,${qrCode}`}
                    alt={t('ethSwitchQrCodeAlt', 'EthSwitch payment QR code')}
                  />
                  <p className={styles.waitingText}>
                    {t('scanEthSwitchQrCode', 'Ask the patient to scan this QR code with their bank or wallet app.')}
                  </p>
                </>
              ) : (
                <>
                  <Loading className={styles.waitingSpinner} withOverlay={false} small />
                  <p className={styles.waitingText}>
                    {t('waitingForEthSwitchStatus', 'Waiting for EthSwitch payment confirmation...')}
                  </p>
                  <p className={styles.waitingHint}>
                    {t(
                      'approvePaymentOnBankApp',
                      'Please ask the patient to approve the payment in their bank or wallet app.',
                    )}
                  </p>
                </>
              )}
              {qrCode && (
                <p className={styles.waitingHint}>
                  {t('waitingForEthSwitchStatus', 'Waiting for EthSwitch payment confirmation...')}
                </p>
              )}
            </section>
          )}
          <section className={styles.section}>
            <Controller
              control={control}
              name="payerName"
              render={({ field }) => (
                <Layer>
                  <TextInput
                    id="ethswitch-payerName"
                    {...field}
                    size="md"
                    labelText={t('payerName', 'Payer name')}
                    placeholder={t('payerName', 'Payer name')}
                    invalid={!!errors.payerName}
                    invalidText={errors.payerName?.message}
                    disabled={formDisabled}
                  />
                </Layer>
              )}
            />
          </section>
          <section className={styles.section}>
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <RadioButtonGroup
                  legendText={t('paymentMethod', 'Payment method')}
                  name="ethswitch-payment-method"
                  orientation="horizontal"
                  valueSelected={field.value}
                  onChange={(value: string) => field.onChange(value)}
                  disabled={formDisabled}>
                  <RadioButton
                    id="ethswitch-payment-account"
                    labelText={t('paymentMethodAccount', 'Account')}
                    value="ACCOUNT"
                  />
                  <RadioButton id="ethswitch-payment-qr" labelText={t('paymentMethodQr', 'QR')} value="QR" />
                </RadioButtonGroup>
              )}
            />
          </section>
          <section className={styles.section}>
            {isLoadingBanks ? (
              <DropdownSkeleton />
            ) : (
              <Controller
                control={control}
                name="payerDfs"
                render={({ field }) => (
                  <Dropdown
                    id="ethswitch-bank"
                    titleText={t('bank', 'Bank')}
                    label={t('selectBank', 'Select bank')}
                    items={banks}
                    itemToString={(item) => (item ? `${item.name} (${item.BIC})` : '')}
                    selectedItem={selectedBank}
                    onChange={({ selectedItem }) => field.onChange(selectedItem?.BIC ?? '')}
                    invalid={!!errors.payerDfs}
                    invalidText={errors.payerDfs?.message}
                    disabled={formDisabled || banks.length === 0}
                  />
                )}
              />
            )}
          </section>
          {paymentMethod === 'ACCOUNT' && (
            <section className={styles.section}>
              <Controller
                control={control}
                name="accountNumber"
                render={({ field }) => (
                  <Layer>
                    <TextInput
                      id="ethswitch-accountNumber"
                      {...field}
                      size="md"
                      labelText={t('accountNumber', 'Account number')}
                      placeholder={t('accountNumber', 'Account number')}
                      invalid={!!errors.accountNumber}
                      invalidText={errors.accountNumber?.message}
                      disabled={formDisabled}
                    />
                  </Layer>
                )}
              />
            </section>
          )}
          <section className={styles.section}>
            <Controller
              control={control}
              name="billAmount"
              render={({ field }) => (
                <Layer>
                  <TextInput
                    id="ethswitch-billAmount"
                    {...field}
                    size="md"
                    labelText={t('billAmount', 'Bill Amount')}
                    placeholder={t('billAmount', 'Bill Amount')}
                    invalid={!!errors.billAmount}
                    invalidText={errors.billAmount?.message}
                    readOnly={true}
                  />
                </Layer>
              )}
            />
          </section>
        </div>
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.buttonSet}>
          <Button kind="secondary" onClick={closeModal} className={styles.button}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            className={styles.button}
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading || isWaitingForPayment || isSettlementFailed || isLoadingBanks}>
            {isLoading ? (
              <>
                <Loading className={styles.button_spinner} withOverlay={false} small />{' '}
                {t('processingPayment', 'Processing Payment')}
              </>
            ) : isWaitingForPayment ? (
              t('waiting', 'Waiting...')
            ) : canRetryInitiate ? (
              t('retryInitiatePayment', 'Retry Initiate')
            ) : (
              t('initiatePayment', 'Initiate Payment')
            )}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </Form>
  );
};

export default EthSwitchPaymentDialog;
