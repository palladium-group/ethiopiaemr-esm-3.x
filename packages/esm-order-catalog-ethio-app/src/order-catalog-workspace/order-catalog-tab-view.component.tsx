import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from '@carbon/react';
import { getCategoriesMatchingSearch, getOrderCatalogSearchPlaceholder } from '../api/order-catalog.utils';
import { type OrderDetailValidationError } from '../api/order-catalog-validation';
import { type CatalogTab, type OrderDetail } from '../types/order-catalog.types';
import OrderCatalogSelectedList from './order-catalog-selected-list.component';
import OrderCatalogTestGrid from './order-catalog-test-grid.component';
import styles from './order-catalog-tab-view.scss';

export interface OrderCatalogTabViewProps {
  tab: CatalogTab;
  selectedUuids: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  orderDetails: Record<string, OrderDetail>;
  onDetailsChange: (uuid: string, detail: OrderDetail) => void;
  onRemoveDetail: (uuid: string) => void;
  validationErrorsByUuid?: Record<string, Array<OrderDetailValidationError>>;
}

const OrderCatalogTabView: React.FC<OrderCatalogTabViewProps> = ({
  tab,
  selectedUuids,
  onSelectionChange,
  orderDetails,
  onDetailsChange,
  onRemoveDetail,
  validationErrorsByUuid,
}) => {
  const { t } = useTranslation();
  const defaultCategoryUuid = tab.categories[0]?.uuid ?? null;
  const [activeCategoryUuid, setActiveCategoryUuid] = useState<string | null>(() => defaultCategoryUuid);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setActiveCategoryUuid(defaultCategoryUuid);
    setSearchTerm('');
  }, [tab.uuid, defaultCategoryUuid]);

  const activeCategory = useMemo(
    () => tab.categories.find((category) => category.uuid === activeCategoryUuid),
    [tab.categories, activeCategoryUuid],
  );

  const trimmedSearch = searchTerm.trim();
  const isSearching = trimmedSearch.length > 0;
  const matchingCategories = useMemo(
    () => (isSearching ? getCategoriesMatchingSearch(tab.categories, trimmedSearch) : []),
    [isSearching, tab.categories, trimmedSearch],
  );
  const searchPlaceholder = getOrderCatalogSearchPlaceholder(tab.orderType, t);

  const renderOrderables = () => {
    if (isSearching) {
      if (matchingCategories.length === 0) {
        return <p className={styles.empty}>{t('noMatchingTests', 'No orderables match your search.')}</p>;
      }

      return matchingCategories.map((category) => (
        <section key={category.uuid} className={styles.searchResultGroup} aria-label={category.displayName}>
          <h3 className={styles.searchResultTitle}>{category.displayName}</h3>
          <OrderCatalogTestGrid
            tests={category.tests}
            orderType={tab.orderType}
            searchTerm={trimmedSearch}
            selectedUuids={selectedUuids}
            onSelectionChange={onSelectionChange}
          />
        </section>
      ));
    }

    if (!activeCategory?.tests.length) {
      return <p className={styles.empty}>{t('noTestsInCategory', 'No orderables in this category.')}</p>;
    }

    return (
      <OrderCatalogTestGrid
        tests={activeCategory.tests}
        orderType={tab.orderType}
        searchTerm=""
        selectedUuids={selectedUuids}
        onSelectionChange={onSelectionChange}
      />
    );
  };

  return (
    <div className={styles.tabView}>
      <div className={styles.dashboard}>
        <aside className={styles.leftColumn}>
          <nav className={styles.categories} aria-label={t('categories', 'Categories')}>
            <ul className={styles.categoryList}>
              {tab.categories.map((category) => (
                <li
                  key={category.uuid}
                  className={category.uuid === activeCategoryUuid ? styles.categoryActive : undefined}>
                  <button
                    type="button"
                    className={styles.categoryLink}
                    onClick={() => {
                      setActiveCategoryUuid(category.uuid);
                      setSearchTerm('');
                    }}>
                    {category.displayName || category.uuid}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <OrderCatalogSelectedList
            tab={tab}
            selectedUuids={selectedUuids}
            onSelectionChange={onSelectionChange}
            orderDetails={orderDetails}
            onDetailsChange={onDetailsChange}
            onRemoveDetail={onRemoveDetail}
            validationErrorsByUuid={validationErrorsByUuid}
          />
        </aside>

        <section className={styles.rightColumn} aria-label={t('orderables', 'Orderables')}>
          <div className={styles.searchRow}>
            <Search
              id={`order-catalog-search-${tab.uuid}`}
              labelText={t('searchOrders', 'Search')}
              placeholder={searchPlaceholder}
              size="sm"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className={styles.testGrids}>{renderOrderables()}</div>
        </section>
      </div>
    </div>
  );
};

export default OrderCatalogTabView;
