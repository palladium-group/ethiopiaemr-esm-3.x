import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, ButtonSet, Form, InlineNotification, Tile } from '@carbon/react';
import {
  showSnackbar,
  useAppContext,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import type { WardPatient, WardViewContext } from '../admitted-patients/ward.types';
import BedSelector from './bed-selector.component';
import { exchangePatientBeds, movePatientToBed } from './bed-swap.resource';
import styles from './bed-swap-form.scss';
import { useEmrConfiguration } from './useEmrConfiguration';
import { useWardLocation } from './useWardLocation';

export interface WardPatientWorkspaceProps {
  wardPatient: WardPatient;
}

const BedSwapWorkspace: React.FC<Workspace2DefinitionProps<WardPatientWorkspaceProps>> = ({
  workspaceProps: { wardPatient },
  closeWorkspace,
}) => {
  const { patient: sourcePatient, visit: sourceVisit, bed: sourceBed } = wardPatient;
  const { t } = useTranslation();
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const { emrConfiguration, isLoadingEmrConfiguration, errorFetchingEmrConfiguration } = useEmrConfiguration();
  const { location, isLoadingLocation } = useWardLocation();
  const { currentProvider } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorNotifications, setShowErrorNotifications] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const beds = useMemo(() => wardPatientGroupDetails?.bedLayouts ?? [], [wardPatientGroupDetails?.bedLayouts]);
  const isLoadingBeds = wardPatientGroupDetails?.isLoading || isLoadingLocation;

  const zodSchema = useMemo(
    () =>
      z.object({
        bedId: z.number({
          required_error: t('pleaseSelectBed', 'Please select a bed'),
        }),
      }),
    [t],
  );

  type FormValues = z.infer<typeof zodSchema>;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(zodSchema) });

  const selectedBedId = watch('bedId');
  const selectedBed = useMemo(() => beds.find((bed) => bed.bedId === selectedBedId), [beds, selectedBedId]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  const getEncounterContext = useCallback(() => {
    const bedAssignmentEncounterType = emrConfiguration?.bedAssignmentEncounterType?.uuid;
    const clinicianEncounterRole = emrConfiguration?.clinicianEncounterRole?.uuid;
    const locationUuid = location?.uuid;
    const providerUuid = currentProvider?.uuid;

    if (!bedAssignmentEncounterType || !clinicianEncounterRole || !locationUuid || !providerUuid) {
      return null;
    }

    return {
      encounterTypeUuid: bedAssignmentEncounterType,
      encounterRoleUuid: clinicianEncounterRole,
      locationUuid,
      providerUuid,
    };
  }, [currentProvider?.uuid, emrConfiguration, location?.uuid]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!sourceVisit) {
        return;
      }

      const targetBed = beds.find((bed) => bed.bedId === values.bedId);
      if (!targetBed) {
        return;
      }

      const encounterContext = getEncounterContext();
      if (!encounterContext) {
        showSnackbar({
          kind: 'error',
          title: t('errorChangingPatientBedAssignment', 'Error changing patient bed assignment'),
          subtitle: t(
            'fetchingEmrConfigurationFailed',
            'Fetching EMR configuration failed. Try refreshing the page or contact your system administrator.',
          ),
        });
        return;
      }

      const occupants = targetBed.patients ?? [];
      if (occupants.length > 1) {
        showSnackbar({
          kind: 'error',
          title: t('errorChangingPatientBedAssignment', 'Error changing patient bed assignment'),
          subtitle: t('bedHasMultipleOccupants', 'The selected bed has more than one patient and cannot be used'),
        });
        return;
      }

      setIsSubmitting(true);
      setShowErrorNotifications(false);

      try {
        if (occupants.length === 0) {
          await movePatientToBed({
            patientUuid: sourcePatient.uuid,
            visitUuid: sourceVisit.uuid,
            sourceBedId: sourceBed.id,
            targetBedId: targetBed.bedId,
            ...encounterContext,
          });

          showSnackbar({
            kind: 'success',
            title: t('patientAssignedNewBed', 'Patient assigned to new bed'),
            subtitle: t('patientAssignedNewBedDetail', '{{patientName}} assigned to bed {{bedNumber}}', {
              patientName: sourcePatient.person?.display,
              bedNumber: targetBed.bedNumber,
            }),
          });
        } else {
          const otherPatient = occupants[0];
          const otherAdmission = wardPatientGroupDetails?.wardAdmittedPatientsWithBed?.get(otherPatient.uuid);
          const otherVisit = otherAdmission?.visit;

          if (!otherVisit) {
            throw new Error(
              t('bedOccupantVisitNotFound', 'Could not find an active visit for the patient in the selected bed'),
            );
          }

          await exchangePatientBeds({
            patientAUuid: sourcePatient.uuid,
            patientBUuid: otherPatient.uuid,
            visitAUuid: sourceVisit.uuid,
            visitBUuid: otherVisit.uuid,
            bedAId: sourceBed.id,
            bedBId: targetBed.bedId,
            ...encounterContext,
          });

          showSnackbar({
            kind: 'success',
            title: t('exchangeBedsSuccess', 'Beds exchanged successfully'),
            subtitle: t(
              'exchangeBedsSuccessDetail',
              '{{patientA}} is now in bed {{bedB}} and {{patientB}} is now in bed {{bedA}}',
              {
                patientA: sourcePatient.person?.display,
                patientB: otherPatient.person?.display,
                bedA: sourceBed.bedNumber,
                bedB: targetBed.bedNumber,
              },
            ),
          });
        }

        wardPatientGroupDetails?.mutate?.();
        closeWorkspace({ discardUnsavedChanges: hasUnsavedChanges });
      } catch (error) {
        showSnackbar({
          kind: 'error',
          title: t('errorChangingPatientBedAssignment', 'Error changing patient bed assignment'),
          subtitle: error instanceof Error ? error.message : t('unknownError', 'An unknown error occurred'),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      beds,
      closeWorkspace,
      getEncounterContext,
      hasUnsavedChanges,
      sourceBed.bedNumber,
      sourceBed.id,
      sourcePatient.person?.display,
      sourcePatient.uuid,
      sourceVisit,
      t,
      wardPatientGroupDetails,
    ],
  );

  const onError = useCallback(() => {
    setShowErrorNotifications(true);
  }, []);

  const summaryMessage = useMemo(() => {
    if (!selectedBed) {
      return null;
    }

    if (selectedBed.patients.length === 0) {
      return t('moveBedSummary', '{{patient}} will move from bed {{fromBed}} to bed {{toBed}}', {
        patient: sourcePatient.person?.display,
        fromBed: sourceBed.bedNumber,
        toBed: selectedBed.bedNumber,
      });
    }

    if (selectedBed.patients.length === 1) {
      return t('exchangeBedsSummary', '{{patientA}} (Bed {{bedA}}) ↔ {{patientB}} (Bed {{bedB}})', {
        patientA: sourcePatient.person?.display,
        patientB: selectedBed.patients[0].person?.display,
        bedA: sourceBed.bedNumber,
        bedB: selectedBed.bedNumber,
      });
    }

    return t('bedHasMultipleOccupants', 'The selected bed has more than one patient and cannot be used');
  }, [selectedBed, sourceBed.bedNumber, sourcePatient.person?.display, t]);

  if (!wardPatientGroupDetails) {
    return null;
  }

  if (!sourceVisit) {
    return <InlineNotification kind="error" title={t('noVisit', 'No visit found')} />;
  }

  return (
    <Workspace2 title={t('bedSwap', 'Bed Swap')}>
      <Form
        onSubmit={handleSubmit(onSubmit, onError)}
        className={classNames(styles.formContainer, styles.workspaceContent)}>
        <div>
          {errorFetchingEmrConfiguration && (
            <div className={styles.formError}>
              <InlineNotification
                kind="error"
                title={t('somePartsOfTheFormDidntLoad', "Some parts of the form didn't load")}
                subtitle={t(
                  'fetchingEmrConfigurationFailed',
                  'Fetching EMR configuration failed. Try refreshing the page or contact your system administrator.',
                )}
                lowContrast
                hideCloseButton
              />
            </div>
          )}

          <h2 className={styles.productiveHeading02}>{t('selectABed', 'Select a bed')}</h2>
          <Controller
            name="bedId"
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <BedSelector
                beds={beds}
                isLoadingBeds={isLoadingBeds}
                currentPatient={sourcePatient}
                selectedBedId={value}
                error={error}
                onChange={onChange}
              />
            )}
          />

          {summaryMessage ? (
            <Tile className={styles.summaryTile}>
              <p>{summaryMessage}</p>
            </Tile>
          ) : null}

          {showErrorNotifications && (
            <div className={styles.notifications}>
              {Object.values(errors).map((error) => (
                <InlineNotification key={error.message} lowContrast subtitle={error.message} />
              ))}
            </div>
          )}
        </div>

        <ButtonSet className={styles.buttonSet}>
          <Button size="xl" kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            size="xl"
            disabled={
              isLoadingEmrConfiguration ||
              isSubmitting ||
              !!errorFetchingEmrConfiguration ||
              !selectedBed ||
              selectedBed.patients.length > 1
            }>
            {t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default BedSwapWorkspace;
