import React from 'react';
import { Dropdown, FormGroup } from '@carbon/react';
import type { TFunction } from 'i18next';
import type { FieldErrors } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';
import { useCreditCompanies } from '../hooks/useCreditCompanies';
import { CREDIT_COMPANY_ATTRIBUTE_UUIDS } from '../billing-constants';
import styles from '../billing-information.scss';

type CreditCompanyBillingAttributesProps = {
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  attributes: Record<string, any>;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const CreditCompanyBillingAttributes: React.FC<CreditCompanyBillingAttributesProps> = ({
  errors,
  t,
  attributes,
  setValue,
}) => {
  const { creditCompanies, isLoading } = useCreditCompanies(true);
  const selectedCompanyUuid = attributes?.[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany] ?? '';

  const selectedCompany = creditCompanies.find((c) => c.uuid === selectedCompanyUuid || c.id === selectedCompanyUuid);

  const handleSelectCompany = (company: { uuid: string; id: string; name: string } | null) => {
    const nextAttributes = { ...attributes };
    if (company) {
      nextAttributes[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany] = company.uuid;
      nextAttributes.creditCompanyId = company.id;
      nextAttributes.creditCompanyName = company.name;
    } else {
      delete nextAttributes[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany];
      delete nextAttributes.creditCompanyId;
      delete nextAttributes.creditCompanyName;
    }
    setValue('attributes', nextAttributes, { shouldDirty: true });
  };

  const fieldError = errors.attributes?.[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany];
  const errorMessage =
    fieldError && typeof fieldError === 'object' && 'message' in fieldError
      ? String(fieldError.message)
      : fieldError
      ? String(fieldError)
      : undefined;

  return (
    <FormGroup
      className={styles.billingTypeAttributesContainer}
      legendText={t('creditCompanyDetails', 'Credit Company Details')}>
      <Dropdown
        id="credit-company-select"
        titleText={t('companyName', 'Company Name *')}
        label={t('selectCompany', 'Select Company')}
        items={creditCompanies}
        itemToString={(item) => (item ? item.name : '')}
        selectedItem={selectedCompany || null}
        onChange={({ selectedItem }) => handleSelectCompany(selectedItem || null)}
        disabled={isLoading}
        invalid={!!fieldError}
        invalidText={errorMessage}
      />
    </FormGroup>
  );
};
