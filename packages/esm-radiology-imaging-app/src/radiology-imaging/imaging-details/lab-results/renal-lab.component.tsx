import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, SkeletonText } from '@carbon/react';
import { Microscope, WarningFilled } from '@carbon/react/icons';
import { formatDate, launchWorkspace2, showSnackbar, useConfig, usePatient, useVisit } from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../../config-schema';
import { type ImagingOrderBasketItem } from '../../../types';
import { useLatestRenalFunctionPanel } from '../../../resources/hooks/useRenalLabResults';
import styles from './renal-warning.scss';

type RenalWarningProps = {
  order: ImagingOrderBasketItem;
  patient: fhir.Patient;
};

const RenalWarning: React.FC<RenalWarningProps> = ({ order, patient }) => {
  const { radiologyOrdersRequiringRenalFunctionCheck, renalFunctionTestConceptUuid } = useConfig<RadiologyConfig>();

  const matchedConfig = radiologyOrdersRequiringRenalFunctionCheck.find(
    ({ procedureConceptUuid }) => order.testType?.conceptUuid === procedureConceptUuid,
  );

  if (!matchedConfig || !patient?.id) {
    return null;
  }

  return (
    <div className={styles.container}>
      <RenalLabResults
        patientUuid={patient.id}
        testConceptUuid={renalFunctionTestConceptUuid}
        validityPeriodInDays={matchedConfig.labResultValidityPeriodInDays}
      />
    </div>
  );
};

export default RenalWarning;

type RenalWarningForOrderProps = {
  conceptUuid: string;
  patientUuid: string;
};

export const RenalWarningForOrder: React.FC<RenalWarningForOrderProps> = ({ conceptUuid, patientUuid }) => {
  const { radiologyOrdersRequiringRenalFunctionCheck, renalFunctionTestConceptUuid } = useConfig<RadiologyConfig>();

  const matchedConfig = radiologyOrdersRequiringRenalFunctionCheck.find(
    ({ procedureConceptUuid }) => conceptUuid === procedureConceptUuid,
  );

  if (!matchedConfig) {
    return null;
  }

  return (
    <div className={styles.container}>
      <RenalLabResults
        patientUuid={patientUuid}
        testConceptUuid={renalFunctionTestConceptUuid}
        validityPeriodInDays={matchedConfig.labResultValidityPeriodInDays}
      />
    </div>
  );
};

type RenalLabResultsProps = {
  patientUuid: string;
  testConceptUuid: string;
  validityPeriodInDays: number;
};

type RenalResultStatus = 'valid' | 'high' | 'low' | 'critical' | 'expired' | 'warning';

interface InterpretedResultView {
  testName: string;
  value: string;
  interpretation: string;
  interpretationClass: string;
  date?: string | number | Date;
}

function normalizeStatus(interpretationClass: string): RenalResultStatus {
  switch ((interpretationClass ?? '').toLowerCase()) {
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    case 'normal':
      return 'valid';
    case 'critical':
      return 'critical';
    case 'expired':
    case 'invalid':
    case 'stale':
      return 'expired';
    default:
      return 'warning';
  }
}

const RenalLabResults: React.FC<RenalLabResultsProps> = ({ patientUuid, testConceptUuid, validityPeriodInDays }) => {
  const { t } = useTranslation();
  const { patient, isLoading: isPatientLoading } = usePatient(patientUuid);
  const { activeVisit, mutate: mutateVisitContext } = useVisit(patientUuid);
  const { interpretedResults, isLoading, error, lastResultDate } = useLatestRenalFunctionPanel(
    patientUuid,
    testConceptUuid,
    validityPeriodInDays,
  );

  const sectionTitle = <p className={styles.sectionTitle}>{t('renalFunctionResults', 'Renal function results')}</p>;

  if (isLoading) {
    return (
      <>
        {sectionTitle}
        <SkeletonText paragraph lineCount={4} />
      </>
    );
  }

  if (error) {
    return (
      <>
        {sectionTitle}
        <InlineNotification
          kind="error"
          title={t('renalResultsError', 'Could not load renal function results')}
          subtitle={error?.message}
          lowContrast
        />
      </>
    );
  }

  function handleOrderTest() {
    if (!activeVisit) {
      showSnackbar({
        title: t('visitRequired', 'Visit required'),
        subtitle: t('startVisitBeforeOrderingLabTest', 'Please start a visit before ordering a lab test.'),
        kind: 'error',
      });
      return;
    }
    launchWorkspace2(
      'imaging-renal-order-basket-workspace',
      { patient, patientUuid, visitContext: activeVisit, mutateVisitContext },
      {
        patient,
        patientUuid,
        visitContext: activeVisit,
        mutateVisitContext,
        labOrderWorkspaceName: 'imaging-renal-add-lab-order-workspace',
        visibleOrderPanels: ['imaging-renal-add-lab-order-workspace'],
      },
    );
  }

  if (!interpretedResults.length) {
    const lastDoneText = lastResultDate
      ? t('renalResultsLastDone', 'Last result: {{date}} (valid for {{validityDuration}} day(s)).', {
          date: formatDate(new Date(lastResultDate), { noToday: true }),
          validityDuration: validityPeriodInDays,
        })
      : t('renalResultsNoneOnFile', 'No previous result on file.');

    return (
      <div className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <p className={styles.panelTitle}>{t('renalFunctionPanel', 'Renal function panel')}</p>
          <p className={styles.statusRequired}>{t('statusRequired', 'Status: Required')}</p>
        </div>
        <div className={styles.emptyStateBody}>
          <div className={styles.emptyStateBox} role="alert">
            <svg
              className={styles.emptyStateIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="7" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="currentColor" />
            </svg>
            <p className={styles.emptyStateTitle}>{t('renalResultsRequiredTitle', 'Renal function test required')}</p>
            <p className={styles.emptyStateSubtitle}>
              {t('renalResultsRequiredSubtitle', 'A recent RFT is required before ordering this test.')} {lastDoneText}
            </p>
          </div>
        </div>
        <div className={styles.panelFooter}>
          <button type="button" className={styles.orderLabButton} disabled={isPatientLoading} onClick={handleOrderTest}>
            <Microscope size={16} />
            {t('orderLabTest', 'Order lab test')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <p className={styles.panelTitle}>{t('renalFunctionPanel', 'Renal function panel')}</p>
        {lastResultDate && (
          <p className={styles.lastUpdated}>
            {t('updated', 'Updated: {{date}}', {
              date: formatDate(new Date(lastResultDate), { noToday: true, time: false }),
            })}
          </p>
        )}
      </div>
      <ul className={styles.resultList}>
        {interpretedResults.map((result, i) => {
          const view = result as InterpretedResultView;
          const status = normalizeStatus(view.interpretationClass);

          return (
            <li key={i} className={`${styles.resultRow} ${styles[status]}`}>
              <div className={styles.resultInfo}>
                <p className={styles.testName}>{view.testName}</p>
                <p className={styles.testValue}>{view.value}</p>
              </div>
              <div className={styles.statusBlock}>
                <div className={styles.statusRow}>
                  {status === 'critical' && <WarningFilled size={16} className={styles.criticalIcon} />}
                  <span className={styles.statusBadge}>
                    <span className={styles.statusLabel}>{view.interpretation}</span>
                  </span>
                </div>
                {status === 'expired' && (
                  <button
                    type="button"
                    className={styles.orderTestLink}
                    disabled={isPatientLoading}
                    onClick={handleOrderTest}>
                    {t('orderTest', 'Order Test')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
