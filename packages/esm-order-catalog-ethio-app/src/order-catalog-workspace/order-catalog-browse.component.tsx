import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonText, Tab, TabList, Tabs } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useOrderCatalog } from '../api/order-catalog.resource';
import { type ConfigObject } from '../config-schema';
import { type OrderDetail } from '../types/order-catalog.types';
import OrderCatalogTabView from './order-catalog-tab-view.component';
import styles from './order-catalog-browse.scss';

const OrderCatalogBrowse: React.FC = () => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { tabs, error, isLoading } = useOrderCatalog(config.allOrderablesConceptUuid, config.orderCatalogDisplayLocale);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(() => new Set());
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});

  const handleDetailsChange = (uuid: string, detail: OrderDetail) =>
    setOrderDetails((prev) => ({ ...prev, [uuid]: detail }));

  const handleRemoveDetail = (uuid: string) =>
    setOrderDetails((prev) => {
      if (!(uuid in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[uuid];
      return next;
    });

  const activeTab = tabs?.[activeTabIndex];

  return (
    <div className={styles.browse}>
      {isLoading ? (
        <div className={styles.tabBarSkeleton}>
          <SkeletonText heading width="50%" />
        </div>
      ) : error ? (
        <ErrorState error={error} headerTitle={t('orderCatalogLoadErrorTitle', 'Order catalog')} />
      ) : !tabs?.length ? (
        <p className={styles.empty}>{t('orderCatalogEmpty', 'No orderables found in the concept set.')}</p>
      ) : (
        <Tabs selectedIndex={activeTabIndex} onChange={({ selectedIndex }) => setActiveTabIndex(selectedIndex)}>
          <TabList aria-label={t('orderCatalogTabs', 'Order catalog tabs')} contained>
            {tabs.map((tab) => (
              <Tab key={tab.uuid}>{tab.displayName}</Tab>
            ))}
          </TabList>
        </Tabs>
      )}

      <div className={styles.tabContent}>
        {activeTab ? (
          <OrderCatalogTabView
            key={activeTab.uuid}
            tab={activeTab}
            selectedUuids={selectedUuids}
            onSelectionChange={setSelectedUuids}
            orderDetails={orderDetails}
            onDetailsChange={handleDetailsChange}
            onRemoveDetail={handleRemoveDetail}
          />
        ) : isLoading ? (
          <SkeletonText paragraph lineCount={8} />
        ) : null}
      </div>
    </div>
  );
};

export default OrderCatalogBrowse;
