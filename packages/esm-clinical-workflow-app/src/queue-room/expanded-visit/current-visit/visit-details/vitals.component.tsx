import React, { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { ArrowRight, CircleFilled } from '@carbon/react/icons';
import {
  fetchCurrentPatient,
  getConfigStore,
  launchWorkspace2,
  showSnackbar,
  useConfig,
  type Visit,
} from '@openmrs/esm-framework';
import { calculateBMI, assessValue, getReferenceRangesForConcept } from '../current-visit.resource';
import { useVitalsConceptMetadata } from '../hooks/useVitalsConceptMetadata';
import { getCurrentVisitForPatient, invalidateVisitCache } from '../../../../triage/triage.resource';
import { type ConfigObject } from '@openmrs/esm-service-queues-app/src/config-schema';
import { type PatientVitals } from '@openmrs/esm-service-queues-app/src/types/index';
import styles from './triage-note.scss';

const DEFAULT_VITALS_FORM_UUID = '4d4f4e54-947b-5dcd-bad8-6c9f2e2ab969';
const DEFAULT_VITALS_FORM_NAME = 'Vital Signs (Adult & Pediatric)';

type VitalsModuleConfig = { vitals?: { formUuid?: string; formName?: string } };

function resolveVitalsFormConfig(): { formUuid: string; formName: string } {
  const state = getConfigStore('@openmrs/esm-patient-vitals-app')?.getState?.() as
    | { config?: VitalsModuleConfig; providedConfigs?: Array<{ config?: VitalsModuleConfig }> }
    | undefined;

  const vitalsConfig =
    state?.config?.vitals ??
    state?.providedConfigs?.reduce<VitalsModuleConfig['vitals']>(
      (acc, entry) => (entry?.config?.vitals ? entry.config.vitals : acc),
      undefined,
    );

  return {
    formUuid: vitalsConfig?.formUuid || DEFAULT_VITALS_FORM_UUID,
    formName: vitalsConfig?.formName || DEFAULT_VITALS_FORM_NAME,
  };
}

interface VitalsComponentProps {
  vitals: Array<PatientVitals>;
  patientUuid: string;
  visitType: string;
  visit?: Visit | null;
  mutateVisit?: () => void;
}

const Vitals: React.FC<VitalsComponentProps> = ({ vitals, patientUuid, visitType, visit, mutateVisit }) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>({ externalModuleName: '@openmrs/esm-service-queues-app' });
  const { data: conceptUnits, conceptMetadata } = useVitalsConceptMetadata();
  const [isLaunching, setIsLaunching] = useState(false);

  const vitalsToDisplay = vitals.reduce(
    (previousVital, currentVital) => Object.assign(previousVital, currentVital),
    {},
  );

  const handleRecordVital = async () => {
    if (!patientUuid || isLaunching) {
      return;
    }

    setIsLaunching(true);
    try {
      const [patient, activeVisit] = await Promise.all([
        fetchCurrentPatient(patientUuid),
        visit?.uuid && visit?.visitType?.uuid ? Promise.resolve(visit) : getCurrentVisitForPatient(patientUuid),
      ]);

      if (!patient || !activeVisit?.uuid || !activeVisit?.visitType?.uuid) {
        throw new Error(t('activeVisitRequiredForVitals', 'An active visit is required to record vitals.'));
      }

      const { formUuid, formName } = resolveVitalsFormConfig();

      await launchWorkspace2(
        'clinical-workflow-patient-form-entry-workspace',
        {
          formEntryWorkspaceName: formName,
          patient,
          visitContext: activeVisit,
          form: {
            visitUuid: activeVisit.uuid,
            uuid: formUuid,
            visitTypeUuid: activeVisit.visitType.uuid,
          },
          encounterUuid: '',
          handlePostResponse: () => {
            mutateVisit?.();
            invalidateVisitCache(patientUuid);
          },
        },
        {
          patient,
          patientUuid,
          visitContext: activeVisit,
          mutateVisitContext: mutateVisit ?? null,
        },
      );
    } catch (error) {
      showSnackbar({
        title: t('errorLaunchingVitalsForm', 'Error opening vitals form'),
        kind: 'error',
        isLowContrast: true,
        subtitle: error instanceof Error ? error.message : t('unexpectedError', 'An unexpected error occurred'),
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div>
      {Object.keys(vitalsToDisplay).length > 0 ? (
        <div>
          <div className={styles.row}>
            <Tile className={styles.tile}>
              <p>{t('temperature', 'Temperature')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>{vitalsToDisplay.temperature ? vitalsToDisplay.temperature : '--'}</p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.temperatureUuid) ?? ''}</p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>{t('bp', 'Bp')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>
                  {vitalsToDisplay.systolic ? vitalsToDisplay.systolic : '--'} /
                  {vitalsToDisplay.diastolic ? vitalsToDisplay.diastolic : '--'}
                </p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.systolicBloodPressureUuid) ?? ''}</p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>
                {t('heartRate', 'Heart rate')}
                {assessValue(
                  vitalsToDisplay.pulse,
                  getReferenceRangesForConcept(config.concepts.pulseUuid, conceptMetadata),
                ) !== 'normal' ? (
                  <CircleFilled className={styles['danger-icon']} size={16} />
                ) : null}
              </p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>{vitalsToDisplay.pulse ? vitalsToDisplay.pulse : '--'}</p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.pulseUuid) ?? ''}</p>
                <p className={styles.iconWrapper}>
                  {assessValue(
                    vitalsToDisplay.pulse,
                    getReferenceRangesForConcept(config.concepts.pulseUuid, conceptMetadata),
                  ) === 'high' ? (
                    <span className={styles.high}></span>
                  ) : assessValue(
                      vitalsToDisplay.pulse,
                      getReferenceRangesForConcept(config.concepts.pulseUuid, conceptMetadata),
                    ) === 'critically_high' ? (
                    <span className={styles['critically-high']}></span>
                  ) : assessValue(
                      vitalsToDisplay.pulse,
                      getReferenceRangesForConcept(config.concepts.pulseUuid, conceptMetadata),
                    ) === 'low' ? (
                    <span className={styles.low}></span>
                  ) : assessValue(
                      vitalsToDisplay.pulse,
                      getReferenceRangesForConcept(config.concepts.pulseUuid, conceptMetadata),
                    ) === 'critically_low' ? (
                    <span className={styles['critically-low']}></span>
                  ) : null}
                </p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>{t('sp02', 'Sp02')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>
                  {vitalsToDisplay.oxygenSaturation ? vitalsToDisplay.oxygenSaturation : '--'}
                </p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.oxygenSaturationUuid) ?? ''}</p>
              </div>
            </Tile>
          </div>
          <div className={styles.row}>
            <Tile className={styles.tile}>
              <p>{t('rRate', 'R. Rate')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>
                  {vitalsToDisplay.respiratoryRate ? vitalsToDisplay.respiratoryRate : '--'}
                </p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.respiratoryRateUuid) ?? ''}</p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>{t('height', 'Height')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>{vitalsToDisplay.height ? vitalsToDisplay.height : '--'}</p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.heightUuid) ?? ''}</p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>{t('weight', 'Weight')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>{vitalsToDisplay.weight ? vitalsToDisplay.weight : '--'} </p>
                <p className={styles.unit}>{conceptUnits.get(config.concepts.weightUuid) ?? ''}</p>
              </div>
            </Tile>
            <Tile className={styles.tile}>
              <p>{t('bmi', 'Bmi')}</p>
              <div className={styles.vitalValuesWrapper}>
                <p className={styles.vitalValues}>
                  {' '}
                  {calculateBMI(Number(vitalsToDisplay.weight), Number(vitalsToDisplay.height))}
                </p>
                <p className={styles.unit}>{config.biometrics['bmiUnit']}</p>
              </div>
            </Tile>
          </div>
          <p className={styles.subHeading}>
            {vitalsToDisplay.provider?.name ? <span>{vitalsToDisplay.provider.name} · </span> : null}
            {vitalsToDisplay.time}
          </p>
        </div>
      ) : visitType === 'currentVisit' ? (
        <p className={styles.emptyText}>{t('noVitalsRecorded', 'No vitals have been recorded in this visit')}</p>
      ) : (
        <p className={classNames(styles.bodyLong01, styles.text02)}>{t('noVitalsFound', 'No vitals found')}</p>
      )}
      {visitType === 'currentVisit' && (
        <Button
          size="sm"
          kind="ghost"
          disabled={isLaunching}
          renderIcon={(props) => <ArrowRight size={16} {...props} />}
          onClick={handleRecordVital}
          iconDescription={t('recordVital', 'Record vital')}>
          {t('recordVital', 'Record vital')}
        </Button>
      )}
    </div>
  );
};

export default Vitals;
