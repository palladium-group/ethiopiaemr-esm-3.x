import React, { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import {
  AddIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  launchWorkspace2,
  MaybeIcon,
  useConfig,
  useLayoutType,
} from '@openmrs/esm-framework';
import { type OrderBasketExtensionProps, useStartVisitIfNeeded } from '@openmrs/esm-patient-common-lib';
import { type ConfigObject } from '../config-schema';
import { ethioOrderCatalogWorkspaceName } from '../constants';
import OrderCatalogBasketItemTile from './order-catalog-basket-item-tile.component';
import { partitionBasketOrders } from './order-catalog-basket-panel.utils';
import { useCatalogBasketOrders } from './use-catalog-basket-orders';
import styles from './order-catalog-panel.scss';

const OrderCatalogPanel: React.FC<Partial<OrderBasketExtensionProps>> = (props) => {
  const config = useConfig<ConfigObject>();

  if (!config.orderCatalogEnabled || !props.patient?.id) {
    return null;
  }

  return <OrderCatalogPanelContent patient={props.patient} />;
};

interface OrderCatalogPanelContentProps {
  patient: fhir.Patient;
}

/**
 * Single "All orderables" basket panel: lab, radiology, and procedure lines from the catalog
 * are listed together; Add opens the unified catalog workspace.
 */
const OrderCatalogPanelContent: React.FC<OrderCatalogPanelContentProps> = ({ patient }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const responsiveSize = isTablet ? 'md' : 'sm';
  const startVisitIfNeeded = useStartVisitIfNeeded(patient.id);
  const { orders, entries } = useCatalogBasketOrders(patient);
  const [isExpanded, setIsExpanded] = useState(orders.length > 0);

  const {
    incompleteOrderBasketItems,
    newOrderBasketItems,
    renewedOrderBasketItems,
    revisedOrderBasketItems,
    discontinuedOrderBasketItems,
  } = useMemo(() => partitionBasketOrders(orders), [orders]);

  const entryByOrder = useMemo(() => new Map(entries.map((entry) => [entry.order, entry])), [entries]);

  const openCatalogWorkspace = useCallback(async () => {
    const didStartVisit = await startVisitIfNeeded();
    if (!didStartVisit) {
      return;
    }

    await launchWorkspace2(ethioOrderCatalogWorkspaceName, {
      patientUuid: patient.id,
    });
  }, [patient.id, startVisitIfNeeded]);

  useEffect(() => {
    setIsExpanded(orders.length > 0);
  }, [orders.length]);

  const renderTiles = (items: typeof orders) =>
    items.map((order, index) => {
      const withTestType = order as (typeof orders)[number] & { testType?: { conceptUuid?: string } };
      const key = order.uuid ?? withTestType.testType?.conceptUuid ?? `${order.display}-${index}`;
      const entry = entryByOrder.get(order);

      return (
        <OrderCatalogBasketItemTile
          key={key}
          orderBasketItem={order}
          onItemClick={() => {
            openCatalogWorkspace();
          }}
          onRemoveClick={() => entry?.remove()}
        />
      );
    });

  return (
    <Tile
      className={classNames(styles.tile, isTablet ? styles.tabletTile : styles.desktopTile, {
        [styles.collapsedTile]: !isExpanded,
      })}>
      <div className={classNames(isTablet ? styles.tabletContainer : styles.desktopContainer)}>
        <div className={styles.iconAndLabel}>
          <MaybeIcon icon="omrs-icon-list-checked" size={isTablet ? 40 : 24} />
          <h4 className={styles.heading}>{`${t('allOrderables', 'All orderables')} (${orders.length})`}</h4>
        </div>
        <div className={styles.buttonContainer}>
          <Button
            className={styles.addButton}
            iconDescription={t('addCatalogOrders', 'Add orders from catalog')}
            kind="ghost"
            onClick={() => {
              openCatalogWorkspace();
            }}
            renderIcon={(props: ComponentProps<typeof AddIcon>) => <AddIcon size={16} {...props} />}
            size={responsiveSize}>
            {t('add', 'Add')}
          </Button>
          <Button
            className={styles.chevron}
            disabled={orders.length === 0}
            hasIconOnly
            iconDescription={t('viewCatalogOrders', 'View orders')}
            kind="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            renderIcon={(props: ComponentProps<typeof ChevronUpIcon>) =>
              isExpanded ? <ChevronUpIcon size={16} {...props} /> : <ChevronDownIcon size={16} {...props} />
            }
            size={responsiveSize}
          />
        </div>
      </div>
      {isExpanded && orders.length > 0 && (
        <>
          {renderTiles(incompleteOrderBasketItems)}
          {renderTiles(newOrderBasketItems)}
          {renderTiles(renewedOrderBasketItems)}
          {renderTiles(revisedOrderBasketItems)}
          {renderTiles(discontinuedOrderBasketItems)}
        </>
      )}
    </Tile>
  );
};

export default OrderCatalogPanel;
