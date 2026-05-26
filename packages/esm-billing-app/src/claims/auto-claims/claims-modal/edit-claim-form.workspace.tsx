import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  ButtonSet,
  Dropdown,
  Form,
  FormGroup,
  InlineLoading,
  NumberInput,
  Stack,
  TextArea,
  TextInput,
} from '@carbon/react';
import { type DefaultWorkspaceProps, showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';

import { type AutoClaimItem, type ClaimEditPayload, updateClaim, AUTO_CLAIMS_SWR_KEY } from '../auto-claims.resource';
import styles from './claim-edit-workspace.scss';

const SERVICE_TYPES = ['OPD', 'IPD', 'EM'];

const schema = z.object({
  visitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .or(z.literal('')),
  cbhiId: z.string(),
  shiId: z.string(),
  woreda: z.string(),
  employerOrganization: z.string(),
  serviceType: z.string(),
  diagnosisCode: z
    .string()
    .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'Enter a valid ICD-10 code (e.g. J18.9)')
    .or(z.literal('')),
  diagnosisName: z.string(),
  labOrders: z.string(),
  imagingOrders: z.string(),
  procedureOrders: z.string(),
  medicineOrders: z.string(),
  consultationCost: z.coerce.number().min(0),
  labCost: z.coerce.number().min(0),
  imagingCost: z.coerce.number().min(0),
  procedureCost: z.coerce.number().min(0),
  medicineCost: z.coerce.number().min(0),
  foodBedCost: z.coerce.number().min(0),
  otherCost: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface EditClaimFormWorkspaceProps extends DefaultWorkspaceProps {
  claim: AutoClaimItem;
}

const EditClaimForm: React.FC<EditClaimFormWorkspaceProps> = ({
  claim,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(claim),
  });

  useEffect(() => {
    reset(buildDefaults(claim));
  }, [claim.uuid, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const costFields = watch([
    'consultationCost',
    'labCost',
    'imagingCost',
    'procedureCost',
    'medicineCost',
    'foodBedCost',
    'otherCost',
  ]);

  const computedTotal = useMemo(
    () => costFields.reduce<number>((sum, v) => sum + (Number(v) || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...costFields],
  );

  const onSubmit = async (data: FormValues) => {
    const payload: ClaimEditPayload = {
      visitDate: data.visitDate || undefined,
      cbhiId: data.cbhiId || undefined,
      shiId: data.shiId || undefined,
      woreda: data.woreda || undefined,
      employerOrganization: data.employerOrganization || undefined,
      serviceType: data.serviceType || undefined,
      diagnosisCode: data.diagnosisCode || undefined,
      diagnosisName: data.diagnosisName || undefined,
      labOrders: data.labOrders || undefined,
      imagingOrders: data.imagingOrders || undefined,
      procedureOrders: data.procedureOrders || undefined,
      medicineOrders: data.medicineOrders || undefined,
      consultationCost: data.consultationCost,
      labCost: data.labCost,
      imagingCost: data.imagingCost,
      procedureCost: data.procedureCost,
      medicineCost: data.medicineCost,
      foodBedCost: data.foodBedCost,
      otherCost: data.otherCost,
      totalCost: computedTotal,
    };

    try {
      await updateClaim(claim.uuid, payload);

      await mutate((key) => typeof key === 'string' && key.startsWith(AUTO_CLAIMS_SWR_KEY), undefined, {
        revalidate: true,
      });

      showSnackbar({
        title: t('claimUpdated', 'Claim updated'),
        subtitle: t('claimUpdatedSubtitle', 'Changes saved successfully.'),
        kind: 'success',
        isLowContrast: true,
      });

      closeWorkspaceWithSavedChanges();
    } catch (err: unknown) {
      showSnackbar({
        title: t('claimUpdateFailed', 'Update failed'),
        subtitle: err instanceof Error ? err.message : t('unexpectedError', 'An unexpected error occurred.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formBody}>
        {(claim.patientName || claim.claimReference) && (
          <div className={styles.contextBanner}>
            {claim.patientName && <span className={styles.patientName}>{claim.patientName}</span>}
            {claim.gender && <span className={styles.metaPill}>{claim.gender}</span>}
            {claim.age != null && <span className={styles.metaPill}>{claim.age}y</span>}
            {claim.claimReference && (
              <span className={styles.claimRef}>
                {t('ref', 'Ref')}: {claim.claimReference}
              </span>
            )}
          </div>
        )}

        <Stack gap={7}>
          <section aria-labelledby="identity-heading">
            <h2 className={styles.sectionHeading} id="identity-heading">
              {t('identity', 'Identity')}
            </h2>
            <Stack gap={4}>
              <div className={styles.twoCol}>
                <Controller
                  name="visitDate"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-visit-date"
                      labelText={t('visitDate', 'Visit Date')}
                      placeholder="YYYY-MM-DD"
                      helperText="e.g. 2026-05-01"
                      invalid={!!errors.visitDate}
                      invalidText={errors.visitDate?.message}
                    />
                  )}
                />
              </div>

              <div className={styles.twoCol}>
                <Controller
                  name="cbhiId"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-cbhi-id"
                      labelText={t('cbhiId', 'CBHI ID')}
                      invalid={!!errors.cbhiId}
                      invalidText={errors.cbhiId?.message}
                    />
                  )}
                />
                <Controller
                  name="shiId"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-shi-id"
                      labelText={t('shiId', 'SHI ID')}
                      invalid={!!errors.shiId}
                      invalidText={errors.shiId?.message}
                    />
                  )}
                />
              </div>

              <div className={styles.twoCol}>
                <Controller
                  name="woreda"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-woreda"
                      labelText={t('woreda', 'Woreda')}
                      invalid={!!errors.woreda}
                      invalidText={errors.woreda?.message}
                    />
                  )}
                />
                <Controller
                  name="employerOrganization"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-employer"
                      labelText={t('employerOrganization', 'Employer Organisation')}
                      invalid={!!errors.employerOrganization}
                      invalidText={errors.employerOrganization?.message}
                    />
                  )}
                />
              </div>
            </Stack>
          </section>

          <div className={styles.divider} role="separator" />

          <section aria-labelledby="clinical-heading">
            <h2 className={styles.sectionHeading} id="clinical-heading">
              {t('clinical', 'Clinical')}
            </h2>
            <Stack gap={4}>
              <FormGroup legendText="">
                <Controller
                  name="serviceType"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      id="claim-service-type"
                      titleText={t('serviceType', 'Service Type')}
                      label={t('selectServiceType', 'Select service type')}
                      items={SERVICE_TYPES}
                      selectedItem={field.value || null}
                      onChange={({ selectedItem }) => field.onChange(selectedItem ?? '')}
                      invalid={!!errors.serviceType}
                      invalidText={errors.serviceType?.message}
                    />
                  )}
                />
              </FormGroup>

              <div className={styles.twoCol}>
                <Controller
                  name="diagnosisCode"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-diagnosis-code"
                      labelText={t('icd10Code', 'ICD-10 Code')}
                      placeholder="e.g. J18.9"
                      invalid={!!errors.diagnosisCode}
                      invalidText={errors.diagnosisCode?.message}
                    />
                  )}
                />
                <Controller
                  name="diagnosisName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      id="claim-diagnosis-name"
                      labelText={t('diagnosisName', 'Diagnosis Name')}
                      invalid={!!errors.diagnosisName}
                      invalidText={errors.diagnosisName?.message}
                    />
                  )}
                />
              </div>
            </Stack>
          </section>

          <div className={styles.divider} role="separator" />

          <section aria-labelledby="orders-heading">
            <h2 className={styles.sectionHeading} id="orders-heading">
              {t('orders', 'Orders')}
            </h2>
            <p className={styles.sectionHint}>
              {t('ordersHint', 'Enter comma-separated order names for each category.')}
            </p>
            <Stack gap={4}>
              {(
                [
                  ['labOrders', t('labOrders', 'Lab Orders'), 'CBC, LFT, RFT, ...'],
                  ['imagingOrders', t('imagingOrders', 'Imaging Orders'), 'Chest X-Ray, Abdominal USS, ...'],
                  ['procedureOrders', t('procedureOrders', 'Procedure Orders'), 'Wound debridement, ...'],
                  [
                    'medicineOrders',
                    t('medicineOrders', 'Medicine Orders'),
                    'Amoxicillin 500mg #21, Paracetamol 500mg #30, ...',
                  ],
                ] as const
              ).map(([name, label, placeholder]) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      id={`claim-${name}`}
                      labelText={label}
                      placeholder={placeholder}
                      rows={2}
                      invalid={!!errors[name]}
                      invalidText={errors[name]?.message}
                    />
                  )}
                />
              ))}
            </Stack>
          </section>

          <div className={styles.divider} role="separator" />

          <section aria-labelledby="costs-heading">
            <h2 className={styles.sectionHeading} id="costs-heading">
              {t('costs', 'Costs (ETB)')}
            </h2>
            <Stack gap={4}>
              <div className={styles.twoCol}>
                {(
                  [
                    ['consultationCost', t('consultation', 'Consultation')],
                    ['labCost', t('laboratory', 'Laboratory')],
                    ['imagingCost', t('imaging', 'Imaging')],
                    ['procedureCost', t('surgicalProcedure', 'Surgical Procedure')],
                    ['medicineCost', t('medicine', 'Medicine')],
                    ['foodBedCost', t('foodBed', 'Food / Bed')],
                    ['otherCost', t('others', 'Others')],
                  ] as const
                ).map(([name, label]) => (
                  <Controller
                    key={name}
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        id={`claim-${name}`}
                        label={label}
                        value={field.value}
                        min={0}
                        step={0.01}
                        allowEmpty
                        onChange={(_e, { value }) => field.onChange(value)}
                        invalid={!!errors[name]}
                        invalidText={errors[name]?.message}
                      />
                    )}
                  />
                ))}
              </div>

              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>{t('total', 'Total')}</span>
                <span className={styles.totalValue}>ETB {computedTotal.toFixed(2)}</span>
              </div>
            </Stack>
          </section>
        </Stack>
      </div>

      <ButtonSet className={styles.buttonSet}>
        <Button kind="secondary" onClick={() => closeWorkspace({ ignoreChanges: false })} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <InlineLoading description={t('saving', 'Saving…')} status="active" />
          ) : (
            t('saveChanges', 'Save Changes')
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

function buildDefaults(claim: AutoClaimItem): FormValues {
  return {
    visitDate: claim.visitDate ?? '',
    cbhiId: claim.cbhiId ?? '',
    shiId: claim.shiId ?? '',
    woreda: claim.woreda ?? '',
    employerOrganization: claim.employerOrganization ?? '',
    serviceType: claim.serviceType ?? '',
    diagnosisCode: claim.diagnosisCode ?? '',
    diagnosisName: claim.diagnosisName ?? '',
    labOrders: claim.services?.lab ?? '',
    imagingOrders: claim.services?.imaging ?? '',
    procedureOrders: claim.services?.procedure ?? '',
    medicineOrders: claim.services?.medicine ?? '',
    consultationCost: claim.costs?.consultation ?? 0,
    labCost: claim.costs?.lab ?? 0,
    imagingCost: claim.costs?.imaging ?? 0,
    procedureCost: claim.costs?.procedure ?? 0,
    medicineCost: claim.costs?.medicine ?? 0,
    foodBedCost: claim.costs?.foodBed ?? 0,
    otherCost: claim.costs?.other ?? 0,
  };
}

export default EditClaimForm;
