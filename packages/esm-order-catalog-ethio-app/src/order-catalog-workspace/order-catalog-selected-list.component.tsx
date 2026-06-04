import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Close } from '@carbon/react/icons';
import classNames from 'classnames';
import { collectSelectedItems, togglePanelSelection, toggleTestSelection } from '../api/order-catalog.utils';
import { type OrderDetailValidationError } from '../api/order-catalog-validation';
import { type CatalogTab, type CatalogTest, type OrderDetail } from '../types/order-catalog.types';
import OrderCatalogOrderDetailForm from './order-catalog-order-detail-form.component';
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const invalidUuids = Object.keys(validationErrorsByUuid);
    if (!invalidUuids.length) {
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const uuid of invalidUuids) {
        next.add(uuid);
      }
      return next;
    });
  }, [validationErrorsByUuid]);

  const toggleExpanded = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
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
    setExpanded((prev) => {
      if (!prev.has(uuid)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(uuid);
      return next;
    });
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
              const isExpanded = expanded.has(item.uuid);
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
