import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import PathologyOrders from './pathology-orders.component';
import PathologyResults from './pathology-results.component';
import styles from './pathology.scss';

interface PathologyProps {
  patient?: fhir.Patient;
  patientUuid?: string;
}

/**
 * Patient-chart Pathology dashboard: Orders | Results (same pattern as Radiology & Imaging).
 */
const Pathology: React.FC<PathologyProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const resolvedPatientUuid = patientUuid ?? patient?.id;

  return (
    <div className={styles.container}>
      <Tabs>
        <TabList aria-label={t('pathology', 'Pathology')} contained>
          <Tab>{t('orders', 'Orders')}</Tab>
          <Tab>{t('results', 'Results')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className={styles.tabPanel}>
            <PathologyOrders patient={patient} patientUuid={resolvedPatientUuid} />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <PathologyResults patient={patient} patientUuid={resolvedPatientUuid} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default Pathology;
