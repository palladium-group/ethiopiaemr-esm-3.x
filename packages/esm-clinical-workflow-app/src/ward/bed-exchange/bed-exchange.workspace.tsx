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
  useConfig,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { buildWardPatients, getExchangeCandidates } from '../admitted-patients/build-ward-patients';
import type { WardAppConfigSlice, WardPatient, WardViewContext } from '../admitted-patients/ward.types';
import { exchangePatientBeds } from './bed-exchange.resource';
import ExchangePatientSelector from './exchange-patient-selector.component';
import { useEmrConfiguration } from './useEmrConfiguration';
import { useWardLocation } from './useWardLocation';
import styles from './bed-exchange-form.scss';

export interface WardPatientWorkspaceProps {
  wardPatient: WardPatient;
}

const BedExchangeWorkspace: React.FC<Workspace2DefinitionProps<WardPatientWorkspaceProps>> = ({
  workspaceProps: { wardPatient },
  closeWorkspace,
}) => {
  const { patient: sourcePatient, visit: sourceVisit, bed: sourceBed } = wardPatient;
  const { t } = useTranslation();
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const config = useConfig<WardAppConfigSlice>({ externalModuleName: '@kenyaemr/esm-ward-app' });
  const { emrConfiguration, isLoadingEmrConfiguration, errorFetchingEmrConfiguration } = useEmrConfiguration();
  const { location, isLoadingLocation } = useWardLocation();
  const { currentProvider } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorNotifications, setShowErrorNotifications] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const wardPatients = useMemo(
    () => buildWardPatients(wardPatientGroupDetails, config),
    [wardPatientGroupDetails, config],
  );
  const exchangeCandidates = useMemo(
    () => getExchangeCandidates(wardPatients, sourcePatient.uuid),
    [wardPatients, sourcePatient.uuid],
  );

  const zodSchema = useMemo(
    () =>
      z.object({
        targetPatientUuid: z
          .string({
            required_error: t('pleaseSelectPatientToExchange', 'Please select a patient to exchange with'),
          })
          .min(1, t('pleaseSelectPatientToExchange', 'Please select a patient to exchange with')),
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

  const selectedTargetPatientUuid = watch('targetPatientUuid');
  const selectedTargetPatient = useMemo(
    () => exchangeCandidates.find((candidate) => candidate.patient.uuid === selectedTargetPatientUuid),
    [exchangeCandidates, selectedTargetPatientUuid],
  );

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const targetPatient = exchangeCandidates.find((candidate) => candidate.patient.uuid === values.targetPatientUuid);
      if (!targetPatient?.visit || !sourceVisit) {
        return;
      }

      const bedAssignmentEncounterType = emrConfiguration?.bedAssignmentEncounterType?.uuid;
      const clinicianEncounterRole = emrConfiguration?.clinicianEncounterRole?.uuid;
      const locationUuid = location?.uuid;
      const providerUuid = currentProvider?.uuid;

      if (!bedAssignmentEncounterType || !clinicianEncounterRole || !locationUuid || !providerUuid) {
        showSnackbar({
          kind: 'error',
          title: t('exchangeBedsError', 'Error exchanging beds'),
          subtitle: t(
            'fetchingEmrConfigurationFailed',
            'Fetching EMR configuration failed. Try refreshing the page or contact your system administrator.',
          ),
        });
        return;
      }

      setIsSubmitting(true);
      setShowErrorNotifications(false);

      try {
        await exchangePatientBeds({
          patientAUuid: sourcePatient.uuid,
          patientBUuid: targetPatient.patient.uuid,
          visitAUuid: sourceVisit.uuid,
          visitBUuid: targetPatient.visit.uuid,
          bedAId: sourceBed.id,
          bedBId: targetPatient.bed.id,
          encounterTypeUuid: bedAssignmentEncounterType,
          locationUuid,
          providerUuid,
          encounterRoleUuid: clinicianEncounterRole,
        });

        showSnackbar({
          kind: 'success',
          title: t('exchangeBedsSuccess', 'Beds exchanged successfully'),
          subtitle: t(
            'exchangeBedsSuccessDetail',
            '{{patientA}} is now in bed {{bedB}} and {{patientB}} is now in bed {{bedA}}',
            {
              patientA: sourcePatient.person?.display,
              patientB: targetPatient.patient.person?.display,
              bedA: sourceBed.bedNumber,
              bedB: targetPatient.bed.bedNumber,
            },
          ),
        });

        wardPatientGroupDetails?.mutate?.();
        closeWorkspace({ discardUnsavedChanges: hasUnsavedChanges });
      } catch (error) {
        showSnackbar({
          kind: 'error',
          title: t('exchangeBedsError', 'Error exchanging beds'),
          subtitle: error instanceof Error ? error.message : t('unknownError', 'An unknown error occurred'),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      closeWorkspace,
      currentProvider?.uuid,
      emrConfiguration,
      exchangeCandidates,
      hasUnsavedChanges,
      location?.uuid,
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

  if (!wardPatientGroupDetails) {
    return null;
  }

  if (!sourceVisit) {
    return <InlineNotification kind="error" title={t('noVisit', 'No visit found')} />;
  }

  if (!exchangeCandidates.length) {
    return (
      <Workspace2 title={t('exchangeBeds', 'Exchange beds')}>
        <InlineNotification
          kind="info"
          title={t('noPatientToExchangeWith', 'No other occupied beds in this ward to exchange with')}
          lowContrast
          hideCloseButton
        />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={t('exchangeBeds', 'Exchange beds')}>
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

          <h2 className={styles.productiveHeading02}>
            {t('selectPatientToExchangeWith', 'Select patient to exchange with')}
          </h2>
          <Controller
            name="targetPatientUuid"
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <ExchangePatientSelector
                candidates={exchangeCandidates}
                isLoading={wardPatientGroupDetails.isLoading || isLoadingLocation}
                selectedPatientUuid={value}
                error={error}
                onChange={onChange}
              />
            )}
          />

          {selectedTargetPatient ? (
            <Tile className={styles.summaryTile}>
              <p>
                {t('exchangeBedsSummary', '{{patientA}} (Bed {{bedA}}) ↔ {{patientB}} (Bed {{bedB}})', {
                  patientA: sourcePatient.person?.display,
                  patientB: selectedTargetPatient.patient.person?.display,
                  bedA: sourceBed.bedNumber,
                  bedB: selectedTargetPatient.bed.bedNumber,
                })}
              </p>
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
              isLoadingEmrConfiguration || isSubmitting || !!errorFetchingEmrConfiguration || !selectedTargetPatient
            }>
            {t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default BedExchangeWorkspace;
