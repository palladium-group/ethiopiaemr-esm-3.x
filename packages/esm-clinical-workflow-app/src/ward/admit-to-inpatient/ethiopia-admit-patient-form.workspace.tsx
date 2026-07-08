import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { z } from 'zod';
import { Button, ButtonSet, DatePicker, DatePickerInput, Form, InlineNotification, Stack, Tile } from '@carbon/react';
import {
  type DefaultWorkspaceProps,
  restBaseUrl,
  showSnackbar,
  useAppContext,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import BedSelector from '../bed-swap/bed-selector.component';
import { useWardLocation } from '../bed-swap/useWardLocation';
import type { WardPatient, WardViewContext } from '../admitted-patients/ward.types';
import { admitToInpatient, AdmitToInpatientError } from './admit-to-inpatient.resource';
import { buildAdmissionDatetime, resolveSourceVisitUuid, resolveWardPatientVisit } from './resolve-admission-context';
import styles from '../bed-swap/bed-swap-form.scss';

export interface WardPatientWorkspaceProps extends DefaultWorkspaceProps {
  wardPatient: WardPatient;
}

type EthiopiaAdmitPatientFormWorkspaceProps =
  | WardPatientWorkspaceProps
  | Workspace2DefinitionProps<{ wardPatient: WardPatient }>;

function resolveWorkspaceProps(props: EthiopiaAdmitPatientFormWorkspaceProps) {
  if ('workspaceProps' in props) {
    return {
      wardPatient: props.workspaceProps.wardPatient,
      closeWorkspace: props.closeWorkspace,
      closeWorkspaceWithSavedChanges: props.closeWorkspace,
      promptBeforeClosing: undefined as ((check: () => boolean) => void) | undefined,
    };
  }

  return {
    wardPatient: props.wardPatient,
    closeWorkspace: props.closeWorkspace,
    closeWorkspaceWithSavedChanges: props.closeWorkspaceWithSavedChanges,
    promptBeforeClosing: props.promptBeforeClosing,
  };
}

const EthiopiaAdmitPatientFormWorkspace: React.FC<EthiopiaAdmitPatientFormWorkspaceProps> = (props) => {
  const { wardPatient, closeWorkspace, closeWorkspaceWithSavedChanges, promptBeforeClosing } =
    resolveWorkspaceProps(props);
  const { patient, visit } = wardPatient ?? {};
  const sourceVisit = resolveWardPatientVisit(wardPatient) ?? visit;
  const { t } = useTranslation();
  const { location, isLoadingLocation, errorFetchingLocation } = useWardLocation();
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const { mutate: globalMutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorNotifications, setShowErrorNotifications] = useState(false);

  const beds = useMemo(() => wardPatientGroupDetails?.bedLayouts ?? [], [wardPatientGroupDetails?.bedLayouts]);
  const isLoadingBeds = wardPatientGroupDetails?.isLoading || isLoadingLocation;

  const zodSchema = useMemo(
    () =>
      z.object({
        admissionDate: z.date({ coerce: true }),
        bedId: z.number().optional(),
      }),
    [],
  );

  type FormValues = z.infer<typeof zodSchema>;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { admissionDate: new Date() },
    resolver: zodResolver(zodSchema),
  });

  const selectedBedId = watch('bedId');
  const selectedBed = useMemo(() => beds.find((bed) => bed.bedId === selectedBedId), [beds, selectedBedId]);

  useEffect(() => {
    promptBeforeClosing?.(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const invalidateAdmissionCaches = useCallback(async () => {
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith(`${restBaseUrl}/visit`) ||
          key.includes('/emrapi/inpatient/') ||
          key.includes('/beds') ||
          key.includes('/admissionLocation')),
    );
  }, [globalMutate]);

  const onSubmit = async (values: FormValues) => {
    if (!patient?.uuid) {
      return;
    }

    if (!location?.uuid) {
      showSnackbar({
        kind: 'error',
        title: t('errorCreatingEncounter', 'Failed to admit patient'),
        subtitle: t('wardLocationRequired', 'Ward location is required'),
      });
      return;
    }

    setShowErrorNotifications(false);
    setIsSubmitting(true);

    try {
      const sourceVisitUuid = await resolveSourceVisitUuid(wardPatient, patient.uuid);

      if (!sourceVisitUuid) {
        showSnackbar({
          kind: 'error',
          title: t('errorCreatingEncounter', 'Failed to admit patient'),
          subtitle: t(
            'activeVisitRequiredForAdmission',
            'No active visit was found for this patient. The OPD visit must be open before admission.',
          ),
        });
        return;
      }

      await admitToInpatient({
        patientUuid: patient.uuid,
        wardLocationUuid: location.uuid,
        sourceVisitUuid,
        admissionDatetime: buildAdmissionDatetime(values.admissionDate, sourceVisit?.startDatetime),
        bedId: values.bedId,
      });

      await invalidateAdmissionCaches();
      wardPatientGroupDetails?.mutate?.();

      if (selectedBed) {
        showSnackbar({
          kind: 'success',
          title: t('patientAdmittedSuccessfully', 'Patient admitted successfully'),
          subtitle: t(
            'patientAdmittedSuccessfullySubtitle',
            '{{patientName}} has been successfully admitted and assigned to bed {{bedNumber}}',
            {
              patientName: patient.person?.preferredName?.display ?? patient.person?.display,
              bedNumber: selectedBed.bedNumber,
            },
          ),
        });
      } else {
        showSnackbar({
          kind: 'success',
          title: t('patientAdmittedSuccessfully', 'Patient admitted successfully'),
          subtitle: t('patientAdmittedWoBed', 'Patient admitted successfully to {{location}}', {
            location: location.display,
          }),
        });
      }

      closeWorkspaceWithSavedChanges();
    } catch (error) {
      const subtitle =
        error instanceof AdmitToInpatientError
          ? error.message
          : error instanceof Error
          ? error.message
          : t('unknownError', 'An unknown error occurred');

      showSnackbar({
        kind: 'error',
        title: t('errorCreatingEncounter', 'Failed to admit patient'),
        subtitle,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = useCallback(() => {
    setShowErrorNotifications(true);
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    if ('workspaceProps' in props) {
      closeWorkspace();
      return;
    }
    closeWorkspace({ ignoreChanges: true });
  }, [closeWorkspace, props]);

  if (!wardPatientGroupDetails) {
    return null;
  }

  return (
    <Form className={styles.formContainer} onSubmit={handleSubmit(onSubmit, onError)}>
      <div className={styles.workspaceContent}>
        <Stack gap={5}>
          <Tile>
            <p>{patient?.person?.display}</p>
          </Tile>

          {errorFetchingLocation ? (
            <InlineNotification
              kind="error"
              title={t('somePartsOfTheFormDidntLoad', "Some parts of the form didn't load")}
              subtitle={t(
                'fetchingWardLocationFailed',
                'Fetching ward location failed. Try refreshing the page or contact your system administrator.',
              )}
              lowContrast
              hideCloseButton
            />
          ) : null}

          <Controller
            control={control}
            name="admissionDate"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <DatePicker
                value={value}
                datePickerType="single"
                onChange={([date]) => onChange(date)}
                maxDate={new Date().toISOString()}>
                <DatePickerInput
                  id="admission-date"
                  labelText={t('admissionDate', 'Admission Date')}
                  placeholder="mm/dd/yyyy"
                  invalid={!!error?.message}
                  invalidText={error?.message}
                />
              </DatePicker>
            )}
          />

          <div>
            <h2 className={styles.productiveHeading02}>{t('selectABed', 'Select a bed')}</h2>
            <Controller
              control={control}
              name="bedId"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <BedSelector
                  beds={beds}
                  isLoadingBeds={isLoadingBeds}
                  currentPatient={patient}
                  selectedBedId={value}
                  error={error}
                  onChange={onChange}
                />
              )}
            />
          </div>

          {showErrorNotifications ? (
            <div className={styles.notifications}>
              {Object.values(errors).map((error) => (
                <InlineNotification key={error.message} kind="error" lowContrast subtitle={error.message} />
              ))}
            </div>
          ) : null}
        </Stack>
      </div>

      <ButtonSet className={styles.buttonSet}>
        <Button className={styles.button} size="xl" kind="secondary" onClick={handleCancel}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          className={styles.button}
          type="submit"
          size="xl"
          disabled={isSubmitting || isLoadingBeds || !!errorFetchingLocation}>
          {!isSubmitting ? t('admit', 'Admit') : t('admitting', 'Admitting...')}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default EthiopiaAdmitPatientFormWorkspace;
