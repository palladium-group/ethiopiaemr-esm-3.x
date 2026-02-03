import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';

import styles from './payment-points-styles.scss';
import { type PaymentPoint } from '../../types';
import { usePaymentPoints } from './payment-points.resource';
import { savePaymentPoint } from './payment-point.util';

const schema = z.object({
  cashPointName: z.string().nonempty({ message: 'Cash point name is required' }),
  description: z.string().nonempty({ message: 'Description is required' }),
});

type FormData = z.infer<typeof schema>;

type PaymentPointFormProps = {
  closeModal: () => void;
  paymentPoint?: PaymentPoint;
};
// TODO: Refactor this component to use the workspace v2 pattern
export const PaymentPointForm: React.FC<PaymentPointFormProps> = ({ closeModal, paymentPoint }) => {
  const { t } = useTranslation();
  const { mutate } = usePaymentPoints();
  const { sessionLocation } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: 'all',
    resolver: zodResolver(schema),
    defaultValues: {
      cashPointName: paymentPoint?.name ?? '',
      description: paymentPoint?.description ?? '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setIsSubmitting(true);

    try {
      const response = await savePaymentPoint({
        formData: {
          cashPointName: formData.cashPointName,
          description: formData.description,
        },
        locationUuid: sessionLocation.uuid,
        paymentPointUuid: paymentPoint?.uuid,
      });

      if (!response.ok) {
        return;
      }

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: paymentPoint
          ? t('successfullyUpdatedPaymentPoint', 'Successfully updated payment point')
          : t('successfullyCreatedPaymentPoint', 'Successfully created payment point'),
        kind: 'success',
      });

      mutate();
      closeModal();
    } catch (error) {
      console.error('Error saving payment point:', error);

      showSnackbar({
        title: t('anErrorOccurred', 'An Error Occurred'),
        subtitle:
          error instanceof Error
            ? error.message
            : t('anErrorOccurredCreatingPaymentPoint', 'An error occurred creating payment point'),
        kind: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButtonLabel = paymentPoint ? t('update', 'Update') : t('create', 'Create');
  const submitButtonLoadingLabel = paymentPoint ? t('updating', 'Updating') : t('creating', 'Creating');

  return (
    <Form>
      <ModalHeader closeModal={closeModal}>{t('createPaymentPoint', 'Create Payment Point')}</ModalHeader>
      <ModalBody>
        <Controller
          control={control}
          name="cashPointName"
          render={({ field }) => (
            <TextInput
              id="cashPointName"
              {...field}
              size="md"
              labelText={t('cashPointName', 'Cash Point Name')}
              invalid={!!errors.cashPointName}
              className={styles.cashPoint}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextInput
              {...field}
              size="md"
              labelText={t('description', 'Description')}
              invalid={!!errors.description}
              id="description"
            />
          )}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" className={styles.buttonLayout} onClick={closeModal} type="button">
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" className={styles.button} onClick={handleSubmit(onSubmit)} disabled={!isValid}>
          {isSubmitting ? <InlineLoading description={submitButtonLoadingLabel} status="active" /> : submitButtonLabel}
        </Button>
      </ModalFooter>
    </Form>
  );
};
