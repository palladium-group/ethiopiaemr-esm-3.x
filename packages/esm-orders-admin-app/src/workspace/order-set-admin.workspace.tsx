import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, ComboBox, Form, InlineLoading, Stack, TextArea, TextInput } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { type DefaultWorkspaceProps, ResponsiveWrapper, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { useDrugOrderType } from '../api/order-type.resource';
import { useOrderTemplates } from '../api/order-template.resource';
import { revalidateOrderSets, saveOrderSet } from '../api/order-set.resource';
import { orderSetOperators } from '../constants';
import OrderSetMembersField from '../order-sets/order-set-members-field.component';
import {
  emptyOrderSetFormValues,
  getErrorMessage,
  mapFormValuesToSavePayload,
  mapOrderSetToFormValues,
} from '../order-sets/order-set-form.helper';
import type { OrderSetFormValues, OrderSetListItem } from '../types';
import styles from './order-set-admin.workspace.scss';

type OrderSetAdminWorkspaceProps = DefaultWorkspaceProps & {
  orderSet?: OrderSetListItem;
};

const OrderSetAdminWorkspace: React.FC<OrderSetAdminWorkspaceProps> = ({
  orderSet,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { orderTemplates } = useOrderTemplates(true);
  const { drugOrderType, isLoading: isLoadingOrderType } = useDrugOrderType();
  const [retiredMemberUuids, setRetiredMemberUuids] = useState<Array<string>>([]);

  const defaultValues = useMemo(
    () => (orderSet ? mapOrderSetToFormValues(orderSet, orderTemplates) : emptyOrderSetFormValues),
    [orderSet, orderTemplates],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<OrderSetFormValues>({
    defaultValues,
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const selectedOperator = watch('operator');

  useEffect(() => {
    reset(orderSet ? mapOrderSetToFormValues(orderSet, orderTemplates) : emptyOrderSetFormValues);
    setRetiredMemberUuids([]);
  }, [orderSet, orderTemplates, reset]);

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const operatorItems = useMemo(
    () =>
      orderSetOperators.map((operator) => ({
        id: operator,
        text: t(`orderSetOperator${operator}`, operator),
      })),
    [t],
  );

  const onSubmit = async (values: OrderSetFormValues) => {
    if (!drugOrderType?.uuid) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: t('drugOrderTypeLoadFailed', 'Drug order type is not available.'),
        isLowContrast: true,
      });
      return;
    }

    try {
      await saveOrderSet(
        mapFormValuesToSavePayload(values, drugOrderType.uuid, orderTemplates, orderSet?.uuid, retiredMemberUuids),
      );
      await revalidateOrderSets();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: orderSet ? t('orderSetUpdated', 'Order set updated.') : t('orderSetCreated', 'Order set created.'),
        isLowContrast: true,
      });
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(error, t('orderSetSaveFailed', 'Failed to save order set.')),
        isLowContrast: true,
      });
    }
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={5}>
        <Controller
          name="name"
          control={control}
          rules={{ required: t('orderSetNameRequired', 'Order set name is required.') }}
          render={({ field }) => (
            <TextInput
              id="order-set-name"
              labelText={t('orderSetName', 'Order set name')}
              placeholder={t('orderSetNamePlaceholder', 'e.g. Hypertension starter pack')}
              required
              autoFocus
              invalid={Boolean(errors.name)}
              invalidText={errors.name?.message}
              {...field}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          rules={{ required: t('descriptionRequired', 'Description is required.') }}
          render={({ field }) => (
            <TextArea
              id="order-set-description"
              labelText={t('description', 'Description')}
              placeholder={t('orderSetDescriptionPlaceholder', 'Describe when clinicians should use this bundle')}
              required
              invalid={Boolean(errors.description)}
              invalidText={errors.description?.message}
              rows={3}
              {...field}
            />
          )}
        />

        <Controller
          name="operator"
          control={control}
          render={({ field }) => (
            <div>
              <ComboBox
                id="order-set-operator"
                titleText={t('operator', 'Operator')}
                items={operatorItems}
                itemToString={(item) => item?.text ?? ''}
                selectedItem={operatorItems.find((item) => item.id === field.value) ?? null}
                onChange={({ selectedItem }) => field.onChange(selectedItem?.id ?? 'ALL')}
              />
              <p className={styles.operatorHelper}>
                {selectedOperator === 'ALL'
                  ? t('orderSetOperatorALLHelp', 'All drugs in the bundle must be ordered together.')
                  : selectedOperator === 'ONE'
                  ? t('orderSetOperatorONEHelp', 'Exactly one drug from the bundle must be selected.')
                  : t('orderSetOperatorANYHelp', 'Any combination of drugs from the bundle may be selected.')}
              </p>
            </div>
          )}
        />

        <Controller
          name="members"
          control={control}
          rules={{
            validate: (members) =>
              members?.some((member) => member.drugUuid) ||
              t('orderSetMembersRequired', 'Add at least one drug to this order set.'),
          }}
          render={() => (
            <OrderSetMembersField
              control={control}
              onRetireMember={(memberUuid) =>
                setRetiredMemberUuids((current) => (current.includes(memberUuid) ? current : [...current, memberUuid]))
              }
              invalid={Boolean(errors.members)}
              invalidText={errors.members?.message}
            />
          )}
        />

        {isLoadingOrderType ? <InlineLoading description={t('loadingOrderTypes', 'Loading order types...')} /> : null}
      </Stack>

      <ResponsiveWrapper>
        <ButtonSet className={styles.buttonSet}>
          <Button kind="secondary" onClick={() => closeWorkspace()} size={isTablet ? 'md' : 'sm'}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            kind="primary"
            type="submit"
            disabled={isSubmitting || isLoadingOrderType}
            size={isTablet ? 'md' : 'sm'}>
            {isSubmitting ? (
              <InlineLoading description={t('saving', 'Saving...')} />
            ) : orderSet ? (
              t('saveChanges', 'Save changes')
            ) : (
              t('createOrderSet', 'Create order set')
            )}
          </Button>
        </ButtonSet>
      </ResponsiveWrapper>
    </Form>
  );
};

export default OrderSetAdminWorkspace;
