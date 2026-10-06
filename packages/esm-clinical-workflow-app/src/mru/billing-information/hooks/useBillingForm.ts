import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { createBillingFormSchema, type BillingFormData } from '../billing-information.resource';

export const useBillingForm = (t: TFunction, billingTypes: any[], isEditMode = false, hasValidCard = false) => {
  const billingFormSchema = useMemo(
    () => createBillingFormSchema(t, billingTypes, isEditMode, hasValidCard),
    [t, billingTypes, isEditMode, hasValidCard],
  );

  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingFormSchema),
    mode: 'onTouched',
    defaultValues: {
      billingTypeUuid: undefined,
      creditSubType: undefined,
      attributes: {},
      billableItem: null,
      cashPointUuid: undefined,
    },
  });

  return form;
};
