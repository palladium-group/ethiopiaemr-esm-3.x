import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  filterPartitionedTests,
  getPanelSelectionState,
  getStandaloneOrderablesSectionLabel,
  getVisiblePanelChildren,
  hasVisiblePartitionedTests,
  isPanelExpanded,
  partitionCategoryTests,
  togglePanelSelection,
  toggleChildSelection,
  toggleTestSelection,
} from '../api/order-catalog.utils';
import { type CatalogTest, type OrderCatalogOrderType } from '../types/order-catalog.types';
import OrderCatalogOrderButton from './order-catalog-order-button.component';
import styles from './order-catalog-test-grid.scss';

export interface OrderCatalogTestGridProps {
  /** All top-level orderables in the active category (panels + standalone tests). */
  tests: Array<CatalogTest>;
  orderType: OrderCatalogOrderType;
  searchTerm: string;
  selectedUuids: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

const OrderCatalogTestGrid: React.FC<OrderCatalogTestGridProps> = ({
  tests,
  orderType,
  searchTerm,
  selectedUuids,
  onSelectionChange,
}) => {
  const { t } = useTranslation();
  const standaloneSectionLabel = useMemo(() => getStandaloneOrderablesSectionLabel(orderType, t), [orderType, t]);
  const partition = useMemo(
    () => filterPartitionedTests(partitionCategoryTests(tests), searchTerm),
    [tests, searchTerm],
  );

  if (!hasVisiblePartitionedTests(partition)) {
    return null;
  }

  return (
    <div className={styles.grid}>
      {partition.panels.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('panels', 'Panels')}</h3>
          <ul className={styles.orderList}>
            {partition.panels.map((panel) => {
              const state = getPanelSelectionState(panel, selectedUuids);
              return (
                <li key={panel.uuid} className={styles.orderListItem}>
                  <OrderCatalogOrderButton
                    label={panel.displayName}
                    variant="panel"
                    active={state.checked || state.indeterminate}
                    partial={state.indeterminate}
                    onClick={() => onSelectionChange(togglePanelSelection(panel, selectedUuids))}
                  />
                </li>
              );
            })}
          </ul>

          {partition.panels
            .filter((panel) => isPanelExpanded(panel, selectedUuids))
            .map((panel) => {
              const children = getVisiblePanelChildren(panel, searchTerm);
              if (!children.length) {
                return null;
              }
              return (
                <div key={`members-${panel.uuid}`} className={styles.panelMembers}>
                  <p className={styles.panelMembersTitle}>
                    {t('panelMembersHeading', '{{panel}} — tap to include or remove', { panel: panel.displayName })}
                  </p>
                  <ul className={styles.orderList}>
                    {children.map((child) => (
                      <li key={child.uuid} className={styles.orderListItem}>
                        <OrderCatalogOrderButton
                          label={child.displayName}
                          variant="child"
                          active={selectedUuids.has(child.uuid)}
                          onClick={() => onSelectionChange(toggleChildSelection(panel, child, selectedUuids))}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </section>
      ) : null}

      {partition.standaloneTests.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{standaloneSectionLabel}</h3>
          <ul className={styles.orderList}>
            {partition.standaloneTests.map((test) => (
              <li key={test.uuid} className={styles.orderListItem}>
                <OrderCatalogOrderButton
                  label={test.displayName}
                  active={selectedUuids.has(test.uuid)}
                  onClick={() => onSelectionChange(toggleTestSelection(test, selectedUuids))}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default OrderCatalogTestGrid;
