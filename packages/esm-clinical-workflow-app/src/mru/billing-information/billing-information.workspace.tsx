import React, { useEffect, useMemo } from 'react';
import {
  Button,
  ButtonSet,
  InlineLoading,
  ContentSwitcher,
  Dropdown,
  Switch,
  TextInput,
  Form,
  FormGroup,
} from '@carbon/react';
import {
  DefaultWorkspaceProps,
  ExtensionSlot,
  usePatient,
  OpenmrsDatePicker,
  useConfig,
  useVisit,
  showSnackbar,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, Control, FieldErrors, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  type BillingFormData,
  createBillingFormSchema,
  createBillingInformationVisitAttribute,
  updateVisitWithBillingInformation,
} from './billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import styles from './billing-information.scss';

type BillingInformationWorkspaceProps = DefaultWorkspaceProps & {
  patientUuid: string;
};

const BillingInformationWorkspace: React.FC<BillingInformationWorkspaceProps> = ({
  patientUuid,
  closeWorkspace,
  promptBeforeClosing,
  closeWorkspaceWithSavedChanges,
}) => {
  const { t } = useTranslation();
  const { patient, isLoading } = usePatient(patientUuid);
  const { activeVisit, mutate: mutateVisit } = useVisit(patientUuid);
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const billingFormSchema = useMemo(() => createBillingFormSchema(t), [t]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BillingFormData>({
    resolver: zodResolver(billingFormSchema),
    mode: 'onTouched',
    defaultValues: {
      billingType: undefined,
      creditType: '',
      name: '',
      code: '',
      id: '',
      expiryDate: '',
      zone: '',
      freeType: '',
    },
  });

  const billingType = watch('billingType');

  const onSubmit = async (data: BillingFormData) => {
    try {
      const visitAttributePayload = createBillingInformationVisitAttribute(data, billingVisitAttributeTypes);
      const response = await updateVisitWithBillingInformation(visitAttributePayload, activeVisit?.uuid);
      if (response.status === 200) {
        showSnackbar({
          title: t('updateVisitWithBillingInfo', 'Update Visit With Billing Information'),
          subtitle: t('updateVisitWithBillingInfoSuccess', 'Update Visit With Billing Information Success'),
          kind: 'success',
          isLowContrast: true,
          timeoutInMs: 5000,
        });
        mutateVisit();
        closeWorkspaceWithSavedChanges();
      }
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorUpdatingBillingInformation', 'Error updating billing information, {{error}}', {
          error: error.message,
        }),
        kind: 'error',
        isLowContrast: true,
        timeoutInMs: 5000,
      });
    }
  };

  const handleBillingTypeChange = (type: 'credit' | 'free' | 'cash') => {
    // Clear form fields to avoid carrying over values from previous billing type
    setValue('billingType', type, { shouldDirty: true });
    setValue('creditType', '', { shouldDirty: false });
    setValue('name', '', { shouldDirty: false });
    setValue('code', '', { shouldDirty: false });
    setValue('id', '', { shouldDirty: false });
    setValue('expiryDate', '', { shouldDirty: false });
    setValue('zone', '', { shouldDirty: false });
    setValue('freeType', '', { shouldDirty: false });
  };

  const getSelectedIndex = () => {
    if (billingType === 'cash') {
      return 0;
    }
    if (billingType === 'free') {
      return 1;
    }
    if (billingType === 'credit') {
      return 2;
    }
    return -1;
  };

  const handleContentSwitcherChange = ({ index }: { index: number }) => {
    const types: ('cash' | 'free' | 'credit')[] = ['cash', 'free', 'credit'];
    if (index >= 0 && index < types.length) {
      handleBillingTypeChange(types[index]);
    }
  };

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [promptBeforeClosing, isDirty]);

  if (isLoading) {
    return <InlineLoading status="active" iconDescription="Loading" description="Loading billing information..." />;
  }

  return (
    <>
      {patient && (
        <ExtensionSlot
          name="patient-header-slot"
          state={{
            patient,
            patientUuid: patientUuid,
            hideActionsOverflow: true,
          }}
        />
      )}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.billingInformationContainer}>
          <p className={styles.sectionTitle}>{t('paymentMethods', 'Payment Methods')}</p>
          <ContentSwitcher onChange={handleContentSwitcherChange} selectedIndex={getSelectedIndex()} size="md">
            <Switch name="cash" text={t('cash', 'Cash')} />
            <Switch name="free" text={t('free', 'Free')} />
            <Switch name="credit" text={t('credit', 'Credit')} />
          </ContentSwitcher>

          {billingType === 'credit' && <CreditDetails control={control} errors={errors} t={t} />}
          {billingType === 'free' && <FreeDetails control={control} errors={errors} t={t} />}
        </div>
        <ButtonSet className={styles.buttonSet}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('discard', 'Discard')}
          </Button>
          <Button disabled={!isDirty} className={styles.button} kind="primary" type="submit">
            {t('saveAndClose', 'Save & Close')}
          </Button>
        </ButtonSet>
      </Form>
    </>
  );
};

export default BillingInformationWorkspace;

type CreditDetailsProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: (key: string, defaultValue?: string) => string;
};

const CreditDetails: React.FC<CreditDetailsProps> = ({ control, errors, t }) => {
  const creditType = useWatch({
    control,
    name: 'creditType',
  });

  const creditTypeOptions = [
    {
      id: 'chbi',
      text: t('chbi', 'CHBI'),
    },
    {
      id: 'shi',
      text: t('shi', 'SHI'),
    },
    {
      id: 'creditCompanies',
      text: t('creditCompanies', 'Credit Companies'),
    },
    {
      id: 'insurance',
      text: t('insurance', 'Insurance'),
    },
  ];

  const showCreditCompanyFields = creditType === 'creditCompanies' || creditType === 'insurance';

  return (
    <FormGroup className={styles.creditDetailsContainer} legendText={t('creditDetails', 'Credit Details')}>
      <Controller
        name="creditType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="credit-type"
            invalid={!!errors.creditType}
            invalidText={errors.creditType?.message || 'invalid selection'}
            itemToString={(item) => item?.text ?? ''}
            items={creditTypeOptions}
            label="Credit"
            titleText="Credit"
            type="default"
            selectedItem={creditTypeOptions.find((item) => item.id === value) || null}
            onChange={({ selectedItem }) => onChange(selectedItem?.id || '')}
          />
        )}
      />

      {showCreditCompanyFields && (
        <FormGroup
          legendText={t('creditTypeDetails', 'Credit Type Details')}
          className={styles.creditTypeDetailsContainer}>
          <Controller
            name="id"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                id="credit-id"
                labelText={t('id', 'ID')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('enterId', 'Enter ID')}
                invalid={!!errors.id}
                invalidText={errors.id?.message}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                id="credit-name"
                labelText={t('name', 'Name')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('enterName', 'Enter name')}
                invalid={!!errors.name}
                invalidText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="code"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                id="credit-code"
                labelText={t('code', 'Code')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('enterCode', 'Enter code')}
                invalid={!!errors.code}
                invalidText={errors.code?.message}
              />
            )}
          />

          <Controller
            name="expiryDate"
            control={control}
            render={({ field: { onChange, value } }) => (
              <OpenmrsDatePicker
                id="credit-expiry-date"
                labelText={t('expiryDate', 'Expiry Date')}
                minDate={new Date()}
                value={value || ''}
                onChange={(date) => {
                  const dateValue = typeof date === 'string' ? date : date.toISOString().split('T')[0];
                  onChange(dateValue);
                }}
              />
            )}
          />
          <Controller
            name="zone"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                id="credit-zone"
                labelText={t('zone', 'Zone')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('enterZone', 'Enter zone')}
                invalid={!!errors.zone}
                invalidText={errors.zone?.message}
              />
            )}
          />
        </FormGroup>
      )}
    </FormGroup>
  );
};

type FreeDetailsProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: (key: string, defaultValue?: string) => string;
};

const FreeDetails: React.FC<FreeDetailsProps> = ({ control, errors, t }) => {
  const items = [
    {
      id: 'staff',
      text: t('staff', 'Staff'),
    },
    {
      id: '24Hours',
      text: t('24Hours', '24 Hours'),
    },
    {
      id: 'exempted',
      text: t('exempted', 'Exempted'),
    },
  ];

  return (
    <FormGroup className={styles.freeDetailsContainer} legendText={t('freeDetails', 'Free Details')}>
      <Controller
        name="freeType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="free-type"
            hideLabel={true}
            invalid={!!errors.freeType}
            invalidText={errors.freeType?.message || 'invalid selection'}
            itemToString={(item) => item?.text ?? ''}
            items={items}
            label={t('selectOption', 'Select a free type')}
            titleText={t('selectOption', 'Select a free type')}
            type="default"
            selectedItem={items.find((item) => item.id === value) || null}
            onChange={({ selectedItem }) => onChange(selectedItem?.id || '')}
          />
        )}
      />
    </FormGroup>
  );
};
