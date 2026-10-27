import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { Button, ButtonSet, InlineLoading, Stack, TextArea, TextInput } from '@carbon/react';
import { type DefaultWorkspaceProps, ResponsiveWrapper, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { type CreditCompany } from '../../types';
import { unescapeHtml } from '../billable-exemption/exemption-rules.utils';
import { getErrorMessage, mutateCreditCompanies, saveCreditCompany } from './credit-company.resource';
import styles from './credit-company.workspace.scss';

type CreditCompanyWorkspaceProps = DefaultWorkspaceProps & {
  initialCreditCompany?: CreditCompany;
};

const creditCompanyFormSchema = z.object({
  name: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(1, 'Company name is required')
    .max(255, 'Company name must be 255 characters or fewer'),
  description: z.string().trim().max(1024, 'Description must be 1024 characters or fewer').optional(),
});

type CreditCompanyFormData = z.infer<typeof creditCompanyFormSchema>;

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
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CreditCompanyFormData>({
    resolver: zodResolver(creditCompanyFormSchema),
    mode: 'all',
    defaultValues: {
      // The server stores text HTML-escaped; edit the readable form so saving does not double-escape
      name: initialCreditCompany?.name ? unescapeHtml(initialCreditCompany.name) : '',
      description: initialCreditCompany?.description ? unescapeHtml(initialCreditCompany.description) : '',
    },
  });

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const onSubmit = async (data: CreditCompanyFormData) => {
    try {
      await saveCreditCompany({ name: data.name, description: data.description ?? '' }, initialCreditCompany?.uuid);
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

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formContainer}>
        <Stack gap={5}>
          <ResponsiveWrapper>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  id="creditCompanyName"
                  labelText={t('companyName', 'Company name')}
                  placeholder={t('companyNamePlaceholder', 'e.g. Ethio Telecom')}
                  invalid={!!errors.name}
                  invalidText={errors.name?.message}
                />
              )}
            />
          </ResponsiveWrapper>
          <ResponsiveWrapper>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  id="creditCompanyDescription"
                  labelText={t('descriptionOptional', 'Description (optional)')}
                  placeholder={t('creditCompanyDescriptionPlaceholder', 'e.g. contract reference or contact person')}
                  rows={3}
                  invalid={!!errors.description}
                  invalidText={errors.description?.message}
                />
              )}
            />
          </ResponsiveWrapper>
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
