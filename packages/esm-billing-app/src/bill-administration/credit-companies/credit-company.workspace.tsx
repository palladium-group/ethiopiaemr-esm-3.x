import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { Button, ButtonSet, InlineLoading, Stack, TextArea, TextInput } from '@carbon/react';
import {
  type DefaultWorkspaceProps,
  OpenmrsDatePicker,
  ResponsiveWrapper,
  showSnackbar,
  useLayoutType,
} from '@openmrs/esm-framework';
import { type Organization } from '../../types';
import { unescapeHtml } from '../billable-exemption/exemption-rules.utils';
import {
  formatContractDate,
  getErrorMessage,
  mutateCreditCompanies,
  parseContractDate,
  saveCreditCompany,
} from './credit-company.resource';
import styles from './credit-company.workspace.scss';

type CreditCompanyWorkspaceProps = DefaultWorkspaceProps & {
  initialCreditCompany?: Organization;
};

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional();

const creditCompanyFormSchema = z
  .object({
    name: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(1, 'Company name is required')
      .max(255, 'Company name must be 255 characters or fewer'),
    description: optionalText(1024, 'Description'),
    phone: optionalText(50, 'Phone'),
    email: z
      .string()
      .trim()
      .max(255, 'Email must be 255 characters or fewer')
      .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address')
      .optional(),
    address: optionalText(1024, 'Address'),
    tin: optionalText(50, 'TIN'),
    contractNumber: optionalText(100, 'Contract number'),
    contractStartDate: z.date().nullable().optional(),
    contractEndDate: z.date().nullable().optional(),
  })
  .refine(
    ({ contractStartDate, contractEndDate }) =>
      !contractStartDate || !contractEndDate || contractEndDate >= contractStartDate,
    { message: 'Contract end date cannot be before the start date', path: ['contractEndDate'] },
  );

type CreditCompanyFormData = z.infer<typeof creditCompanyFormSchema>;

/** The server stores text HTML-escaped; edit the readable form so saving does not double-escape. */
const readable = (value?: string | null) => (value ? unescapeHtml(value) : '');

const CreditCompanyWorkspace: React.FC<CreditCompanyWorkspaceProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  initialCreditCompany,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const isEdit = Boolean(initialCreditCompany?.uuid);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CreditCompanyFormData>({
    resolver: zodResolver(creditCompanyFormSchema),
    mode: 'all',
    defaultValues: {
      name: readable(initialCreditCompany?.name),
      description: readable(initialCreditCompany?.description),
      phone: readable(initialCreditCompany?.phone),
      email: readable(initialCreditCompany?.email),
      address: readable(initialCreditCompany?.address),
      tin: readable(initialCreditCompany?.tin),
      contractNumber: readable(initialCreditCompany?.contractNumber),
      contractStartDate: parseContractDate(initialCreditCompany?.contractStartDate),
      contractEndDate: parseContractDate(initialCreditCompany?.contractEndDate),
    },
  });
  const contractStartDate = watch('contractStartDate');

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const onSubmit = async (data: CreditCompanyFormData) => {
    try {
      await saveCreditCompany(
        {
          name: data.name,
          description: data.description ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          tin: data.tin ?? '',
          contractNumber: data.contractNumber ?? '',
          contractStartDate: formatContractDate(data.contractStartDate),
          contractEndDate: formatContractDate(data.contractEndDate),
        },
        initialCreditCompany?.uuid,
      );
      showSnackbar({
        title: isEdit
          ? t('creditCompanyUpdated', 'Credit company updated')
          : t('creditCompanyCreated', 'Credit company added'),
        subtitle: t('creditCompanySavedSubtitle', '{{name}} is available at MRU under Credit Company', {
          name: data.name,
          interpolation: { escapeValue: false },
        }),
        kind: 'success',
        isLowContrast: true,
      });
      mutateCreditCompanies();
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('creditCompanySaveFailed', 'Could not save credit company'),
        subtitle: getErrorMessage(error),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  const textField = (
    name: 'name' | 'phone' | 'email' | 'tin' | 'contractNumber',
    id: string,
    labelText: string,
    placeholder?: string,
  ) => (
    <ResponsiveWrapper>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TextInput
            {...field}
            id={id}
            labelText={labelText}
            placeholder={placeholder}
            invalid={!!errors[name]}
            invalidText={errors[name]?.message}
          />
        )}
      />
    </ResponsiveWrapper>
  );

  const textArea = (name: 'description' | 'address', id: string, labelText: string, placeholder?: string) => (
    <ResponsiveWrapper>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TextArea
            {...field}
            id={id}
            labelText={labelText}
            placeholder={placeholder}
            rows={2}
            invalid={!!errors[name]}
            invalidText={errors[name]?.message}
          />
        )}
      />
    </ResponsiveWrapper>
  );

  const dateField = (name: 'contractStartDate' | 'contractEndDate', id: string, labelText: string, minDate?: Date) => (
    <ResponsiveWrapper>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <OpenmrsDatePicker
            id={id}
            labelText={labelText}
            value={value ?? null}
            minDate={minDate}
            onChange={(date) => onChange(date ?? null)}
            invalid={!!errors[name]}
            invalidText={errors[name]?.message}
          />
        )}
      />
    </ResponsiveWrapper>
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formContainer}>
        <Stack gap={5}>
          {textField(
            'name',
            'creditCompanyName',
            t('companyName', 'Company name'),
            t('companyNamePlaceholder', 'e.g. Ethio Telecom'),
          )}
          {textField('phone', 'creditCompanyPhone', t('phoneOptional', 'Phone (optional)'))}
          {textField('email', 'creditCompanyEmail', t('emailOptional', 'Email (optional)'))}
          {textArea('address', 'creditCompanyAddress', t('addressOptional', 'Address (optional)'))}
          {textField('tin', 'creditCompanyTin', t('tinOptional', 'TIN (optional)'))}
          {textField(
            'contractNumber',
            'creditCompanyContractNumber',
            t('contractNumberOptional', 'Contract number (optional)'),
          )}
          {dateField(
            'contractStartDate',
            'creditCompanyContractStartDate',
            t('contractStartDateOptional', 'Contract start date (optional)'),
          )}
          {dateField(
            'contractEndDate',
            'creditCompanyContractEndDate',
            t('contractEndDateOptional', 'Contract end date (optional)'),
            contractStartDate ?? undefined,
          )}
          {textArea(
            'description',
            'creditCompanyDescription',
            t('descriptionOptional', 'Description (optional)'),
            t('creditCompanyDescriptionPlaceholder', 'e.g. contact person or payment terms'),
          )}
        </Stack>
      </div>
      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} kind="primary" type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <InlineLoading description={t('saving', 'Saving…')} /> : t('saveAndClose', 'Save & Close')}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default CreditCompanyWorkspace;
