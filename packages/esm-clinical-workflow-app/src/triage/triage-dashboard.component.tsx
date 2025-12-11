import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, Switch } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { ExtensionSlot, launchWorkspace, PageHeader, UserHasAccess } from '@openmrs/esm-framework';

import { useStartVisitAndLaunchTriageForm } from './useStartVisitAndLaunchTriageForm';

import styles from './triage-dashboard.scss';
import { handleStartVisitAndLaunchTriageForm } from '../helper';

const TriageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const triageMap = {
    centralTriage: '37f6bd8d-586a-4169-95fa-5781f987fe62',
    emergencyTriage: '37f6bd8d-586a-4169-95fa-5781f987fe62',
    pediatricsTriage: '37f6bd8d-586a-4169-95fa-5781f987fe62',
  };
  const [selectedTriageType, setSelectedTriageType] = React.useState<string | null>(triageMap.centralTriage);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();

  return (
    <>
      <PageHeader className={styles.pageHeader} title={t('triageDashboard', 'Triage Dashboard')} illustration={null} />
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
            selectPatientAction: (patientUuid: string) => {
              handleStartVisitAndLaunchTriageForm(patientUuid);
            },
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
