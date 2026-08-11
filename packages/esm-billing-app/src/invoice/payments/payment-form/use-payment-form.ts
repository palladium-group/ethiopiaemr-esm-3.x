import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const roundCurrency = (value: number) => parseFloat(Number(value).toFixed(2));

export const createPaymentSchema = (
  t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => string,
  expectedAmount: number,
) =>
  z
    .object({
      instanceType: z
        .object({
          uuid: z.string().min(1, t('instanceTypeUuidRequired', 'Instance type UUID is required')),
          name: z.string().min(1, t('instanceTypeNameRequired', 'Instance type name is required')),
          description: z.string().optional(),
          retired: z.boolean().optional(),
          retireReason: z.string().nullable().optional(),
          attributeTypes: z
            .array(
              z.object({
                uuid: z.string().optional(),
                name: z.string().optional(),
                description: z.string().optional(),
                required: z.boolean().optional(),
              }),
            )
            .optional(),
          sortOrder: z.number().nullable().optional(),
          resourceVersion: z.string().optional(),
        })
        .optional(),
      amountTendered: z
        .number({
          required_error: t('amountTenderedRequired', 'Amount tendered is required'),
          invalid_type_error: t('amountTenderedRequired', 'Amount tendered is required'),
        })
        .positive(t('amountTenderedPositive', 'Amount tendered must be positive'))
        .refine(
          (value) => expectedAmount > 0 && roundCurrency(value) === roundCurrency(expectedAmount),
          t('amountMustEqualUnpaidTotal', 'Amount tendered must equal the unpaid line items total ({{amount}})', {
            amount: roundCurrency(expectedAmount),
          }),
        ),
      attributes: z.record(z.string(), z.string()).optional(),
    })
    .refine(
      (data) => {
        if (!data.instanceType?.attributeTypes) {
          return true;
        }

        const requiredAttributeTypes = data.instanceType.attributeTypes.filter((attr) => attr.required && attr.uuid);
        const providedAttributes = data.attributes || {};

        for (const requiredAttr of requiredAttributeTypes) {
          if (!providedAttributes[requiredAttr.uuid] || providedAttributes[requiredAttr.uuid].trim() === '') {
            return false;
          }
        }

        return true;
      },
      {
        message: t('requiredAttributesMissing', 'Required attributes are missing'),
        path: ['attributes'],
      },
    );

export const usePaymentForm = (
  t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => string,
  expectedAmount: number,
) => {
  const paymentSchema = createPaymentSchema(t, expectedAmount);

  type PaymentFormData = z.infer<typeof paymentSchema>;

  const formMethods = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      instanceType: undefined,
      amountTendered: undefined,
      attributes: {},
    },
  });

  return {
    formMethods,
    paymentSchema,
  };
};
