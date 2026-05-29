import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { Task } from '@carbon/react/icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import BillingHeader from '../../billing-header/billing-header.component';
import AutoClaimsTable from './auto-claims-table.component';
import styles from './auto-claims.scss';

const AutoClaims = () => {
  const { t } = useTranslation();

  return (
    <div>
      <BillingHeader title={t('claims', 'Claims')} />
      <div className={styles.claimsContainer}>
        <Tabs>
          <TabList aria-label={t('claims', 'Claims')} contained>
            <Tab
              className={styles.tabHeader}
              renderIcon={Task}
              secondaryLabel={t('claimsDescription', 'Claims Dashboard')}>
              {t('claims', 'Claims')}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.tabPanel}>
              <AutoClaimsTable />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

export default AutoClaims;
