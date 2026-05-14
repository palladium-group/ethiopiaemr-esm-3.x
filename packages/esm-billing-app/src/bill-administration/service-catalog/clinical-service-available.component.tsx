import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { Task } from '@carbon/react/icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './clinical-charges.scss';
import BillingHeader from '../../billing-header/billing-header.component';
import ServicesAvailableTable from './services-available-table.component';

const ClinicalServicesAvailable = () => {
  const { t } = useTranslation();

  return (
    <div>
      <BillingHeader title={t('serviceAvailable', 'Services Available')} />
      <div className={styles.clinicalChargesContainer}>
        <Tabs>
          <TabList aria-label={t('serviceAvailable', 'Services Available')} contained>
            <Tab
              className={styles.tabHeader}
              renderIcon={Task}
              secondaryLabel={t('serviceAvailableDescription', 'Services Available Dashboard')}>
              {t('servicesAvailable', 'Services Available')}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.tabPanel}>
              <ServicesAvailableTable />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

export default ClinicalServicesAvailable;
