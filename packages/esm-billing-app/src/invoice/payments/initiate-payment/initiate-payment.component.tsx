import {
  Button,
  ButtonSet,
  Form,
  InlineNotification,
  Layer,
  Loading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInputSkeleton,
  TextInput,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfig } from '@openmrs/esm-framework';
import React, { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { BillingConfig } from '../../../config-schema';
import { usePatientAttributes } from '../../../hooks/usePatientAttributes';
import { useRequestStatus } from '../../../hooks/useRequestStatus';
import { initiateTelebirrPayment } from '../../../telebirr/telebirr-resource';
import { LineItem, MappedBill } from '../../../types';
import { formatKenyanPhoneNumber } from '../utils';
import styles from './initiate-payment.scss';

const initiatePaymentSchema = z.object({
  phoneNumber: z
    .string()
    .nonempty({ message: 'Phone number is required' })
    .regex(/^\d{10}$/, { message: 'Phone number must be numeric and 10 digits' }),
  billAmount: z.string().nonempty({ message: 'Amount is required' }),
});

type FormData = z.infer<typeof initiatePaymentSchema>;

export interface InitiatePaymentDialogProps {
  closeModal: () => void;
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
}

const InitiatePaymentDialog: React.FC<InitiatePaymentDialogProps> = ({ closeModal, bill, selectedLineItems }) => {
  const { t } = useTranslation();
  const { phoneNumber, isLoading: isLoadingPhoneNumber } = usePatientAttributes(bill.patientUuid);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [{ requestStatus }, pollingTrigger] = useRequestStatus(setNotification, closeModal, bill);
  const { telebirrAPIBaseUrl } = useConfig<BillingConfig>();

  const pendingAmount = bill.totalAmount - bill.tenderedAmount;
  const isWaitingForTelebirr = requestStatus === 'INITIATED';

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    mode: 'all',
    defaultValues: {
      billAmount: pendingAmount.toString(),
      phoneNumber: phoneNumber,
    },
    resolver: zodResolver(initiatePaymentSchema),
  });

  const watchedPhoneNumber = watch('phoneNumber');

  useEffect(() => {
    if (!watchedPhoneNumber && phoneNumber) {
      reset({ phoneNumber: watchedPhoneNumber });
    }
  }, [watchedPhoneNumber, setValue, phoneNumber, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const phoneNumber = formatKenyanPhoneNumber(data.phoneNumber);
    const amountBilled = data.billAmount;
    const conversationId = bill.uuid; // TODO: add proper reference number

    const payload = {
      conversationId,
      mobileNumber: phoneNumber,
      amount: amountBilled,
    };

    setIsLoading(true);
    const originatorConversationId = await initiateTelebirrPayment(payload, setNotification, telebirrAPIBaseUrl);
    // check if we have a valid originator conversation id
    if (originatorConversationId) {
      pollingTrigger({ originatorConversationId, requestStatus: 'INITIATED', amount: amountBilled });
    } else {
      setNotification({ type: 'error', message: 'Unable to initiate Telebirr payment, please try again later.' });
    }
    setIsLoading(false);
  };

  return (
    <Form>
      <ModalHeader className={styles.heading} closeModal={closeModal}>
        {t('paymentPayment', 'Bill Payment')}
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
          {isWaitingForTelebirr && (
            <section className={styles.waitingSection} aria-live="polite">
              <Loading className={styles.waitingSpinner} withOverlay={false} small />
              <p className={styles.waitingText}>
                {t('waitingForTelebirrStatus', 'Waiting for Telebirr payment confirmation via USSD...')}
              </p>
              <p className={styles.waitingHint}>
                {t('completeUssdOnPhone', 'Please complete the USSD prompt on your phone.')}
              </p>
            </section>
          )}
          {isLoadingPhoneNumber ? (
            <NumberInputSkeleton className={styles.section} />
          ) : (
            <section className={styles.section}>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                  <Layer>
                    <TextInput
                      id="phoneNumber"
                      {...field}
                      size="md"
                      labelText={t('Phone Number', 'Phone Number')}
                      placeholder={t('Phone Number', 'Phone Number')}
                      invalid={!!errors.phoneNumber}
                      invalidText={errors.phoneNumber?.message}
                      disabled={isWaitingForTelebirr}
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
                    id="billAmount"
                    {...field}
                    size="md"
                    labelText={t('billAmount', 'Bill Amount')}
                    placeholder={t('billAmount', 'Bill Amount')}
                    invalid={!!errors.billAmount}
                    invalidText={errors.billAmount?.message}
                    disabled={isWaitingForTelebirr}
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
            disabled={!isValid || isLoading || isWaitingForTelebirr}>
            {isLoading ? (
              <>
                <Loading className={styles.button_spinner} withOverlay={false} small />{' '}
                {t('processingPayment', 'Processing Payment')}
              </>
            ) : isWaitingForTelebirr ? (
              t('waiting', 'Waiting...')
            ) : (
              t('initiatePayment', 'Initiate Payment')
            )}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </Form>
  );
};

export default InitiatePaymentDialog;
