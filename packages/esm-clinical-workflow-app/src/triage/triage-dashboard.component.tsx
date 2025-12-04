import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, Switch } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import {
  ExtensionSlot,
  launchWorkspace,
  PageHeader,
  TriagePictogram,
  UserHasAccess,
  useSession,
} from '@openmrs/esm-framework';

import styles from './triage-dashboard.scss';
import { handleStartVisitAndLaunchTriageForm } from '../helper';

const TriageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const [selectedTriageType, setSelectedTriageType] = React.useState<string | null>(null);

  const triageMap = {
    centralTriage: 'bea30222-4b16-40a1-8b7e-1396ff1e0038',
    emergencyTriage: '0038a296-62f8-4099-80e5-c9ea7590c157',
    pediatricsTriage: 'a1a62d1e-2def-11e9-b210-d663bd873d93',
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
            selectPatientAction: (patientUuid: string) => {
              handleStartVisitAndLaunchTriageForm(patientUuid, triageMap[selectedTriageType], t);
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
