import { z } from 'zod';
import type { TFunction } from 'i18next';
import {
  criteriaSupportingAllItems,
  type ExemptionCriterion,
  type ExemptionItem,
  type ExemptionSection,
} from '../exemption-rules.utils';

export const createExemptionRuleSchema = (t: TFunction) =>
  z
    .object({
      section: z.enum(['services', 'commodities']),
      criterion: z.enum(['all', 'program', 'location', 'ageUnder', 'ageOver', 'visitAttribute']),
      value: z.string().optional(),
      allItems: z.boolean(),
      items: z.array(z.object({ concept: z.union([z.string(), z.number()]), description: z.string() })),
    })
    .superRefine((data, ctx) => {
      const value = data.value?.trim() ?? '';
      if (data.criterion !== 'all' && !value) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: t('exemptionValueRequired', 'This field is required'),
        });
      }
      if ((data.criterion === 'ageUnder' || data.criterion === 'ageOver') && value && !/^[1-9]\d*$/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: t('exemptionAgeInvalid', 'Enter a whole number of years greater than 0'),
        });
      }
      if (data.allItems && !criteriaSupportingAllItems.includes(data.criterion)) {
        ctx.addIssue({
          code: 'custom',
          path: ['allItems'],
          message: t('exemptionAllItemsNotAllowed', 'Choose who this applies to before exempting all items'),
        });
      }
      if (!data.allItems && data.items.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['items'],
          message: t('exemptionItemsRequired', 'Add at least one item, or exempt all items'),
        });
      }
    });

export interface ExemptionRuleFormValues {
  section: ExemptionSection;
  criterion: ExemptionCriterion;
  value?: string;
  allItems: boolean;
  items: Array<ExemptionItem>;
}
