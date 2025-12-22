import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification, Tile } from '@carbon/react';
import { Add, Search } from '@carbon/react/icons';
import {
  ExtensionSlot,
  TriagePictogram,
  launchWorkspace,
  PageHeader,
  useConfig,
  useSession,
} from '@openmrs/esm-framework';

import styles from './triage-dashboard.scss';
import type { ClinicalWorkflowConfig } from '../config-schema';
import PatientBanner from './patient-banner.component';
import { getTriageFormForLocation } from './triage.resource';

const TriageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { triageLocationForms } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = useState<string | null>(null);

  const triageFormConfig = getTriageFormForLocation(sessionLocation?.uuid, triageLocationForms);

  if (!sessionLocation) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader
          className={styles.pageHeader}
          title={t('triageDashboard', 'Triage Dashboard')}
          illustration={<TriagePictogram />}
        />
        <InlineNotification
          kind="error"
          title={t('noSessionLocation', 'No session location')}
          subtitle={t('noSessionLocationSubtitle', 'Please select a location to continue')}
          lowContrast
        />
      </div>
    );
  }

  if (!triageFormConfig) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader
          className={styles.pageHeader}
          title={t('triageDashboard', 'Triage Dashboard')}
          illustration={<TriagePictogram />}
        />
        <InlineNotification
          kind="warning"
          title={t('noTriageFormConfigured', 'No triage form configured')}
          subtitle={t('noTriageFormConfiguredSubtitle', 'No triage form is configured for location: {{location}}', {
            location: sessionLocation.display,
          })}
          lowContrast
        />
      </div>
    );
  }

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader
        className={styles.pageHeader}
        title={t('triageDashboard', 'Triage Dashboard')}
        illustration={<TriagePictogram />}
      />
      <div className={styles.headerActions}>
        <ExtensionSlot
          className={styles.patientSearchBar}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => setPatientUuid(patientUuid),
            buttonProps: {
              kind: 'secondary',
            },
          }}
        />
        <Button onClick={() => launchWorkspace('patient-registration-workspace')} kind="tertiary" renderIcon={Add}>
          {t('registerNewPatient', 'Register New Patient')}
        </Button>
      </div>
      {!patientUuid ? (
        <div className={styles.emptyStateContainer}>
          <Tile className={styles.emptyStateTile}>
            <div className={styles.emptyStateContent}>
              <div className={styles.emptyStateIcon}>
                <Search size={48} />
              </div>
              <h3 className={styles.emptyStateHeading}>{t('noPatientSelected', 'No patient selected')}</h3>
              <p className={styles.emptyStateDescription}>
                {t(
                  'searchForPatientToStartTriage',
                  'Search for a patient using the search bar above to start the triage process, or register a new patient.',
                )}
              </p>
              <div className={styles.emptyStateActions}>
                <div className={styles.actionItem}>
                  <span className={styles.actionIcon}>
                    <Search size={16} />
                  </span>
                  <span className={styles.actionLabel}>
                    {t('searchExistingPatient', 'Search for an existing patient')}
                  </span>
                </div>
                <div className={styles.actionItem}>
                  <span className={styles.actionIcon}>
                    <Add size={16} />
                  </span>
                  <span className={styles.actionLabel}>{t('registerNewPatient', 'Register a new patient')}</span>
                </div>
              </div>
            </div>
          </Tile>
        </div>
      ) : (
        <PatientBanner patientUuid={patientUuid} formUuid={triageFormConfig.formUuid} setPatientUuid={setPatientUuid} />
      )}
    </div>
  );
};

export default TriageDashboard;
