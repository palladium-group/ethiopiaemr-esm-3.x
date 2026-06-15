import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import OrderSetsTable from './order-sets-table.component';
import OrderTemplatesTable from './order-templates-table.component';
import styles from './home.scss';

const OrdersAdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div className={styles.dashboard}>
      <h4>{t('ordersAdmin', 'Orders administration')}</h4>
      <p className={styles.description}>
        {t(
          'ordersAdminDescription',
          'Configure drug order templates and order sets with default dosing for use when prescribing medications.',
        )}
      </p>

      <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => setSelectedTab(selectedIndex)}>
        <TabList aria-label={t('ordersAdminTabs', 'Orders administration sections')} contained>
          <Tab>{t('drugOrderTemplates', 'Drug order templates')}</Tab>
          <Tab>{t('orderSets', 'Order sets')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <OrderTemplatesTable />
          </TabPanel>
          <TabPanel>
            <OrderSetsTable />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default OrdersAdminDashboard;
