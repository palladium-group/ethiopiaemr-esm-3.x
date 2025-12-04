import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, Switch } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import {
  ExtensionSlot,
  fetchCurrentPatient,
  launchWorkspace,
  PageHeader,
  showSnackbar,
  TriagePictogram,
  UserHasAccess,
} from '@openmrs/esm-framework';

import { createVisitForPatient } from './triage.resource';

import styles from './triage-dashboard.scss';

const TriageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTriageType, setSelectedTriageType] = React.useState<string | null>(null);

  const triageMap = {
    centralTriage: '37f6bd8d-586a-4169-95fa-5781f987fe62',
    emergencyTriage: '0038a296-62f8-4099-80e5-c9ea7590c157',
    pediatricsTriage: 'a1a62d1e-2def-11e9-b210-d663bd873d93',
  };

  const handleStartVisitAndLaunchTriageForm = async (patientUuid: string) => {
    const patient = await fetchCurrentPatient(patientUuid);
    const visitResponse = await createVisitForPatient(patientUuid);
    if (visitResponse.ok) {
      // launch triage form based on switch button value
      const { data: visit } = visitResponse;
      launchWorkspace('patient-form-entry-workspace', {
        patientUuid: patientUuid,
        patient: patient,
        visitContext: visit,
        formInfo: {
          encounterUuid: '',
          visitUuid: visit.uuid,
          formUuid: triageMap[selectedTriageType], // Triage form UUID
          visitTypeUuid: visit.visitType.uuid,
        },
      });
    } else {
      showSnackbar({
        title: t('triageDashboardErrorStartingVisit', 'Error starting visit for patient'),
        kind: 'error',
        subtitle: t('triageDashboardPleaseTryAgain', 'Please try again.'),
        isLowContrast: true,
      });
    }
  };

  return (
    <>
      <PageHeader
        className={styles.pageHeader}
        title={t('triageDashboard', 'Triage Dashboard')}
        illustration={<TriagePictogram />}
      />
      <div className={styles.headerActions}>
        <ContentSwitcher
          lowContrast
          selectedIndex={-1}
          size="md"
          onChange={({ name }) => setSelectedTriageType(name as string)}>
          <UserHasAccess privilege={'Central triage'}>
            <Switch name="centralTriage" text={t('centralTriage', 'Central triage')} />
          </UserHasAccess>
          <UserHasAccess privilege="Emergency triage">
            <Switch name="emergencyTriage" text={t('emergencyTriage', 'Emergency triage')} />
          </UserHasAccess>
          <UserHasAccess privilege="Pediatrics triage">
            <Switch name="pediatricsTriage" text={t('pediatricsTriage', 'Pediatrics triage')} />
          </UserHasAccess>
        </ContentSwitcher>
      </div>
      <div className={styles.headerActions}>
        <ExtensionSlot
          className={styles.patientSearchBar}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid) => handleStartVisitAndLaunchTriageForm(patientUuid),
            buttonProps: {
              kind: 'secondary',
            },
          }}
        />
        <Button onClick={() => launchWorkspace('patient-registration-workspace')} kind="tertiary" renderIcon={Add}>
          {t('registerNewPatient', 'Register New Patient')}
        </Button>
      </div>
    </>
  );
};

export default TriageDashboard;
