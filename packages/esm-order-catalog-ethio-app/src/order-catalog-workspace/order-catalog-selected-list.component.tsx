import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Close } from '@carbon/react/icons';
import classNames from 'classnames';
import { useBillableAvailabilityLookup } from '../api/billable-availability.resource';
import { collectSelectedItems, togglePanelSelection, toggleTestSelection } from '../api/order-catalog.utils';
import { type OrderDetailValidationError } from '../api/order-catalog-validation';
import { type CatalogTab, type CatalogTest, type OrderDetail } from '../types/order-catalog.types';
import OrderCatalogOrderDetailForm from './order-catalog-order-detail-form.component';
import { resolveExpandedSelection } from './order-catalog-selected-list.utils';
import styles from './order-catalog-selected-list.scss';

export interface OrderCatalogSelectedListProps {
  tab: CatalogTab;
  selectedUuids: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  orderDetails: Record<string, OrderDetail>;
  onDetailsChange: (uuid: string, detail: OrderDetail) => void;
  onRemoveDetail: (uuid: string) => void;
  validationErrorsByUuid?: Record<string, Array<OrderDetailValidationError>>;
}

function findTestByUuid(tab: CatalogTab, uuid: string): { test: CatalogTest; panel?: CatalogTest } | undefined {
  for (const category of tab.categories) {
    for (const test of category.tests) {
      if (test.uuid === uuid) {
        return { test };
      }
      if (test.isPanel) {
        const child = test.childTests.find((c) => c.uuid === uuid);
        if (child) {
          return { test: child, panel: test };
        }
      }
    }
  }
  return undefined;
}

const OrderCatalogSelectedList: React.FC<OrderCatalogSelectedListProps> = ({
  tab,
  selectedUuids,
  onSelectionChange,
  orderDetails,
  onDetailsChange,
  onRemoveDetail,
  validationErrorsByUuid = {},
}) => {
  const { t } = useTranslation();
  const items = useMemo(() => collectSelectedItems(tab, selectedUuids), [tab, selectedUuids]);
  const itemUuids = useMemo(() => items.map((item) => item.uuid), [items]);
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const [trackedUuids, setTrackedUuids] = useState<Array<string>>([]);
  const { prices, isLoading: pricesLoading, error: pricesError } = useBillableAvailabilityLookup();
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    setExpandedUuid((current) => resolveExpandedSelection(trackedUuids, itemUuids, current));
    setTrackedUuids(itemUuids);
    // trackedUuids is the previous list; listing it as a dependency would retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemUuids]);

  useEffect(() => {
    const firstInvalid = itemsRef.current.find((item) => validationErrorsByUuid[item.uuid]?.length)?.uuid;
    if (firstInvalid) {
      setExpandedUuid(firstInvalid);
    }
  }, [validationErrorsByUuid]);

  const toggleExpanded = (uuid: string) => {
    setExpandedUuid((current) => (current === uuid ? null : uuid));
  };

  const handleRemove = (uuid: string, isPanel: boolean) => {
    const found = findTestByUuid(tab, uuid);
    if (found) {
      if (isPanel && found.test.isPanel) {
        onSelectionChange(togglePanelSelection(found.test, selectedUuids));
      } else {
        onSelectionChange(toggleTestSelection(found.test, selectedUuids));
      }
    }
    onRemoveDetail(uuid);
  };

  return (
    <div className={styles.selectedBlock}>
      <h2 className={styles.selectedTitle}>
        {t('selectedOrders', 'Selected')}
        {items.length ? <span className={styles.count}>{items.length}</span> : null}
      </h2>
      <div className={styles.selectedOrders}>
        {items.length === 0 ? (
          <p className={styles.empty}>{t('selectedOrdersEmpty', 'No orders selected yet.')}</p>
        ) : (
          <ul className={styles.selectedList}>
            {items.map((item) => {
              const isExpanded = expandedUuid === item.uuid;
              const itemErrors = validationErrorsByUuid[item.uuid];
              const hasErrors = Boolean(itemErrors?.length);
              return (
                <li
                  key={item.uuid}
                  className={classNames(styles.selectedItem, { [styles.selectedItemInvalid]: hasErrors })}>
                  <div className={styles.itemHeader}>
                    <button
                      type="button"
                      className={styles.disclosure}
                      onClick={() => toggleExpanded(item.uuid)}
                      aria-expanded={isExpanded}
                      title={t('orderDetails', 'Order details')}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className={classNames(styles.selectedLabel, { [styles.panelLabel]: item.isPanel })}>
                        {item.displayName}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemove(item.uuid, item.isPanel)}
                      aria-label={t('removeOrder', 'Remove {{order}}', { order: item.displayName })}>
                      <Close size={16} />
                    </button>
                  </div>
                  {isExpanded ? (
                    <OrderCatalogOrderDetailForm
                      idPrefix={`order-detail-${item.uuid}`}
                      orderType={tab.orderType}
                      displayName={item.displayName}
                      prices={prices.get(item.uuid)}
                      pricesLoading={pricesLoading}
                      pricesError={Boolean(pricesError)}
                      value={orderDetails[item.uuid]}
                      validationErrors={itemErrors}
                      onChange={(detail) => onDetailsChange(item.uuid, detail)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default OrderCatalogSelectedList;
