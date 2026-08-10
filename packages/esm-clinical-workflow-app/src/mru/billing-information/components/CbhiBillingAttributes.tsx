import React, { useMemo } from 'react';
import { FormGroup } from '@carbon/react';
import type { TFunction } from 'i18next';
import type { Control, FieldErrors } from 'react-hook-form';
import { CBHI_VISIT_ATTRIBUTE_FIELDS, type BillingFormData } from '../billing-information.resource';
import styles from '../billing-information.scss';
import { CbhiMemberSearch } from './CbhiMemberSearch';
import type { CbhiPersistFields } from '../hooks/useCbhiSearch';

type AttributeType = {
  uuid: string;
  name: string;
  description?: string;
  format?: string;
  required?: boolean;
};

type CbhiBillingAttributesProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributeTypes: Array<AttributeType>;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

const normalize = (value: string) => value?.toLowerCase().replace(/[\s_-]/g, '') ?? '';

export const CBHI_PERSIST_FIELD_MATCHERS: Array<{
  field: keyof CbhiPersistFields;
  match: (normalizedName: string) => boolean;
}> = [
  {
    field: 'cbhiId',
    match: (n) => n.includes('cbhi') && (n.includes('id') || n.includes('number')),
  },
  {
    field: 'insuredId',
    match: (n) => n.includes('insured') && n.includes('id'),
  },
  {
    field: 'accountNo',
    match: (n) => n.includes('account'),
  },
  {
    field: 'membershipType',
    match: (n) => n.includes('membership'),
  },
  {
    field: 'fullName',
    match: (n) => n.includes('fullname') || (n.includes('full') && n.includes('name')) || n === 'name',
  },
  {
    field: 'id',
    match: (n) => n === 'id' || n === 'eligibilityid' || n === 'memberid' || n === 'recordid',
  },
];

export const findCbhiAttributeType = (attributeTypes: AttributeType[], field: keyof CbhiPersistFields) => {
  const matcher = CBHI_PERSIST_FIELD_MATCHERS.find((item) => item.field === field);
  if (!matcher) {
    return undefined;
  }
  return attributeTypes.find((attr) => matcher.match(normalize(attr.name)));
};

export const CbhiBillingAttributes: React.FC<CbhiBillingAttributesProps> = ({
  t,
  attributeTypes,
  attributes,
  setValue,
}) => {
  const fieldToAttribute = useMemo(() => {
    const mapping = new Map<keyof CbhiPersistFields, AttributeType>();
    const usedUuids = new Set<string>();

    CBHI_PERSIST_FIELD_MATCHERS.forEach(({ field, match }) => {
      const attr = attributeTypes.find((a) => !usedUuids.has(a.uuid) && match(normalize(a.name)));
      if (attr) {
        mapping.set(field, attr);
        usedUuids.add(attr.uuid);
      }
    });

    return mapping;
  }, [attributeTypes]);

  const selectedMember = useMemo<CbhiPersistFields | null>(() => {
    const hasAnyValue = CBHI_VISIT_ATTRIBUTE_FIELDS.some((field) => {
      const value = attributes?.[field];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    if (!hasAnyValue) {
      return null;
    }

    return {
      id: attributes?.id ?? '',
      fullName: attributes?.fullName ?? '',
      accountNo: attributes?.accountNo ?? null,
      membershipType: attributes?.membershipType ?? null,
      cbhiId: attributes?.cbhiId ?? '',
      insuredId: attributes?.insuredId ?? null,
    };
  }, [attributes]);

  const handleMemberSelected = (member: CbhiPersistFields) => {
    const nextAttributes = { ...attributes };

    CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field) => {
      const value = member[field] ?? '';
      nextAttributes[field] = value;

      const attr = fieldToAttribute.get(field);
      if (attr) {
        nextAttributes[attr.uuid] = value;
      }
    });

    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  const handleClearSelection = () => {
    const nextAttributes = { ...attributes };

    CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field) => {
      delete nextAttributes[field];

      const attr = fieldToAttribute.get(field);
      if (attr) {
        delete nextAttributes[attr.uuid];
      }
    });

    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  return (
    <FormGroup className={styles.billingTypeAttributesContainer} legendText={t('billingDetails', 'Billing Details')}>
      <CbhiMemberSearch
        t={t}
        selectedMember={selectedMember}
        onMemberSelected={handleMemberSelected}
        onClearSelection={handleClearSelection}
      />
    </FormGroup>
  );
};
