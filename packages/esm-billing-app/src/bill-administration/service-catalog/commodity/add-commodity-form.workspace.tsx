import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonSet, Button, Stack, Toggle, InlineNotification, InlineLoading } from '@carbon/react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';

import { useLayoutType, ResponsiveWrapper, showSnackbar, restBaseUrl } from '@openmrs/esm-framework';
import styles from './commodity-form.scss';
import StockItemSearch from './stock-search.component';
import classNames from 'classnames';
import { zodResolver } from '@hookform/resolvers/zod';
import { billableFormSchema, BillableFormSchema } from '../form-schemas';
import { formatBillableServicePayloadForSubmission, mapInputToPayloadSchema } from '../form-helper';
import { createBillableService } from '../billable-service.resource';
import { handleMutate } from '../../../billable-services/utils';

type CommodityFormProps = {
  initialValues?: BillableFormSchema;
  closeWorkspace: () => void;
  closeWorkspaceWithSavedChanges?: () => void;
  promptBeforeClosing?: (testFcn: () => boolean) => void;
};

const AddCommodityForm: React.FC<CommodityFormProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  initialValues,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const formMethods = useForm<BillableFormSchema>({
    resolver: zodResolver(billableFormSchema),
    defaultValues: initialValues
      ? {
          ...mapInputToPayloadSchema(initialValues),
          serviceType: {
            uuid: initialValues.serviceType?.uuid ?? '',
            display: initialValues.serviceType?.display ?? '',
          },
        }
      : { servicePrices: [], serviceStatus: 'ENABLED' },
  });

  const {
    setValue,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isDirty, isSubmitting },
  } = formMethods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'servicePrices',
  });

  useEffect(() => {
    if (initialValues) {
      trigger();
    }
  }, [initialValues, trigger]);

  const onSubmit = async (formValues: BillableFormSchema) => {
    const payload = formatBillableServicePayloadForSubmission(formValues, initialValues?.['uuid']);
    try {
      const response = await createBillableService(payload, initialValues?.['uuid']);
      if (response.ok) {
        showSnackbar({
          title: t('commodityBillableCreated', 'Commodity created successfully'),
          subtitle: t('commodityBillableCreatedSubtitle', 'The commodity has been created successfully'),
          kind: 'success',
          isLowContrast: true,
          timeoutInMs: 5000,
        });
        handleMutate(`${restBaseUrl}/cashier/billableService?v`);
        closeWorkspaceWithSavedChanges?.();
      }
    } catch (e) {
      const errorMessage =
        e?.responseBody?.error?.message || e?.message || t('unknownError', 'An unknown error occurred');
      showSnackbar({
        title: t('commodityBillableCreationFailed', 'Commodity creation failed'),
        subtitle: t('commodityBillableCreationFailedSubtitle', 'The commodity creation failed: {{errorMessage}}', {
          errorMessage: String(errorMessage).trim(),
        }),
        kind: 'error',
        isLowContrast: true,
        timeoutInMs: 5000,
      });
    }
  };

  useEffect(() => {
    promptBeforeClosing?.(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  function flattenErrors(errors: Record<string, any>): string[] {
    const messages: string[] = [];

    Object.entries(errors).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          Object.entries(item as Record<string, { message: string }>).forEach(([subKey, subVal]) => {
            messages.push(`${key}[${index}].${subKey}: ${subVal.message}`);
          });
        });
      } else if (typeof value === 'object' && value?.message) {
        messages.push(`${key}: ${value.message}`);
      }
    });

    return messages;
  }

  const handleError = (err) => {
    const errorMessage = flattenErrors(err).join('; ');
    showSnackbar({
      title: t('serviceCreationFailed', 'Service creation failed'),
      subtitle: t('serviceCreationFailedSubtitle', 'The service creation failed: {{errorMessage}}', {
        errorMessage,
      }),
      kind: 'error',
      isLowContrast: true,
      timeoutInMs: 5000,
    });
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit, handleError)} className={styles.form}>
        <div className={styles.formContainer}>
          <Stack className={styles.formStackControl} gap={7}>
            <StockItemSearch setValue={setValue} defaultStockItem={initialValues?.name} />
            {errors.concept && (
              <InlineNotification
                kind="error"
                lowContrast={true}
                title={t('conceptMissing', 'Concept missing for {{name}}', { name: initialValues?.name })}
                subtitle={t('conceptMissingSubtitle', 'Please delete the current item and re-create the charge item')}
              />
            )}
            <ResponsiveWrapper>
              <Controller
                control={control}
                name="serviceStatus"
                render={({ field }) => (
                  <Toggle
                    labelText={t('isItemAvailable', 'Is item available?')}
                    labelA={t('no', 'NO')}
                    labelB={t('yes', 'YES')}
                    defaultToggled={field.value === 'ENABLED'}
                    id="serviceStatus"
                    onToggle={(value) => (value ? field.onChange('ENABLED') : field.onChange('DISABLED'))}
                  />
                )}
              />
            </ResponsiveWrapper>
          </Stack>
        </div>
        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button style={{ maxWidth: '50%' }} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button disabled={isSubmitting || !isDirty} style={{ maxWidth: '50%' }} kind="primary" type="submit">
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
    </FormProvider>
  );
};

export default AddCommodityForm;
