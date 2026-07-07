import React, { Suspense, lazy } from 'react';
import { TabPanels, TabList, Tabs, Tab, TabPanel } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import styles from './orderSheet-tabs.scss';

// Lazy-load tab content to reduce initial bundle size
const OrderSheetPanel = lazy(() => import('./order-sheet-panel.component'));

export interface OrderSheetProps {
  patientUuid?: string;
  patient?: fhir.Patient;
}

export const OrderSheet: React.FC<OrderSheetProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const params = useParams<{ patientUuid: string }>();
  const resolvedPatientUuid = patientUuid ?? patient?.id ?? params.patientUuid;

  const tabsData = [
    {
      label: 'orderSheet',
      text: t('orderSheet', 'Order Sheet'),
      LazyComponent: OrderSheetPanel,
      componentProps: { patientUuid: resolvedPatientUuid },
    },
  ];

  return (
    <div className={styles.orderSheetTabsContainer}>
      <Tabs>
        <TabList aria-label="List of tabs" contained style={{ marginLeft: '0' }}>
          {tabsData.map(({ label, text }) => (
            <Tab key={label}>{t(label, text)}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabsData.map(({ label, LazyComponent, componentProps }) => (
            <TabPanel key={label}>
              <Suspense fallback={null}>
                {/* LazyComponent + componentProps are paired per tab; cast needed for union in map */}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <LazyComponent {...(componentProps as any)} />
              </Suspense>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default OrderSheet;
