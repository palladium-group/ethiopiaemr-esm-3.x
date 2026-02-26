import React, { useState } from 'react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useConfig, userHasAccess, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { ChartConfig } from '../../../config-schema';
import VisitHistoryTable from '../visit-history-table/visit-history-table.component';
import AllEncountersTable from './past-visits-components/encounters-table/all-encounters-table.component';
import styles from './visit-detail-overview.scss';
import { Permissions } from '../../../permission/permissions.constants';

interface VisitOverviewComponentProps {
  patientUuid: string;
  patient: fhir.Patient;
}

function VisitDetailOverviewComponent({ patientUuid, patient }: VisitOverviewComponentProps) {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const { showAllEncountersTab } = useConfig<ChartConfig>();
  const session = useSession();
  const canViewEncounters = showAllEncountersTab && userHasAccess(Permissions.ViewEncounter, session?.user);

  return (
    <div className={styles.tabs}>
      <Tabs onChange={({ selectedIndex }) => setTabIndex(selectedIndex)} selectedIndex={tabIndex}>
        <TabList aria-label="Visit detail tabs" className={styles.tabList}>
          <Tab className={styles.tab} id="visit-summaries-tab">
            {t('Visits', 'Visits')}
          </Tab>
          {canViewEncounters ? (
            <Tab className={styles.tab} id="all-encounters-tab">
              {t('allEncounters', 'All encounters')}
            </Tab>
          ) : (
            <></>
          )}
        </TabList>
        <TabPanels>
          <TabPanel>
            <VisitHistoryTable patientUuid={patientUuid} patient={patient} />
          </TabPanel>
          {canViewEncounters && (
            <TabPanel>
              <AllEncountersTable patientUuid={patientUuid} />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </div>
  );
}

export default VisitDetailOverviewComponent;
