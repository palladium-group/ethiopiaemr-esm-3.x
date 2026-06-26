import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, SkeletonText, Tab, TabList, Tabs } from '@carbon/react';
import { useConfig, type Visit } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useOrderCatalog } from '../api/order-catalog.resource';
import { useBillableAvailabilityLookup } from '../api/billable-availability.resource';
import { type ConfigObject } from '../config-schema';
import { type OrderDetail } from '../types/order-catalog.types';
import OrderCatalogTabView from './order-catalog-tab-view.component';
import { useOrderCatalogActions } from './use-order-catalog-actions';
import styles from './order-catalog-browse.scss';

export interface OrderCatalogBrowseProps {
  patient: fhir.Patient;
  visit: Visit;
  onRequestClose: () => void;
}

const OrderCatalogBrowse: React.FC<OrderCatalogBrowseProps> = ({ patient, visit, onRequestClose }) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { lookup, isLoading: isBillingLoading, error: billingError } = useBillableAvailabilityLookup();
  const {
    tabs,
    error: catalogError,
    isLoading: isCatalogLoading,
  } = useOrderCatalog(config.allOrderablesConceptUuid, config.orderCatalogDisplayLocale, lookup);
  const isLoading = isCatalogLoading || isBillingLoading;
  const error = catalogError ?? billingError;
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(() => new Set());
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});

  const activeTab = tabs?.[activeTabIndex];

  const {
    saveAndClose,
    selectedCount,
    canActOnSelection,
    isSaving,
    isBusy,
    validationErrorsByUuid,
    clearValidationErrors,
  } = useOrderCatalogActions({
    patient,
    visit,
    tabs,
    selectedUuids,
    orderDetails,
    onClose: onRequestClose,
  });

  const handleDetailsChange = (uuid: string, detail: OrderDetail) => {
    clearValidationErrors();
    setOrderDetails((prev) => ({ ...prev, [uuid]: detail }));
  };

  const handleRemoveDetail = (uuid: string) =>
    setOrderDetails((prev) => {
      if (!(uuid in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[uuid];
      return next;
    });

  const showFooter = !isLoading && !error && Boolean(tabs?.length);

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
            validationErrorsByUuid={validationErrorsByUuid}
          />
        ) : isLoading ? (
          <SkeletonText paragraph lineCount={8} />
        ) : null}
      </div>

      {showFooter ? (
        <footer className={styles.footer}>
          <ButtonSet className={styles.footerActions}>
            <Button kind="secondary" disabled={isBusy} onClick={onRequestClose}>
              {t('close', 'Close')}
            </Button>
            <Button
              kind="primary"
              disabled={!canActOnSelection || isBusy}
              onClick={() => {
                saveAndClose();
              }}>
              {isSaving
                ? t('savingAndClosing', 'Saving…')
                : t('saveAndClose', 'Save and close ({{count}})', { count: selectedCount })}
            </Button>
          </ButtonSet>
        </footer>
      ) : null}
    </div>
  );
};

export default OrderCatalogBrowse;
