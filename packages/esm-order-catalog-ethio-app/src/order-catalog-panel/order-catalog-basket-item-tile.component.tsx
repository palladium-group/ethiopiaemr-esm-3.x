import React, { useRef } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ClickableTile, IconButton, Tile } from '@carbon/react';
import { TrashCanIcon, useLayoutType, WarningIcon } from '@openmrs/esm-framework';
import { type OrderBasketItem } from '@openmrs/esm-patient-common-lib';
import { getCatalogBasketItemLabel } from './order-catalog-basket-panel.utils';
import styles from './order-catalog-basket-item-tile.scss';

export interface OrderCatalogBasketItemTileProps {
  orderBasketItem: OrderBasketItem;
  onItemClick: () => void;
  onRemoveClick: () => void;
}

function OrderActionLabel({ orderBasketItem }: { orderBasketItem: OrderBasketItem }) {
  const { t } = useTranslation();

  if (orderBasketItem.isOrderIncomplete) {
    return <span className={styles.orderActionIncompleteLabel}>{t('orderActionIncomplete', 'Incomplete')}</span>;
  }

  switch (orderBasketItem.action) {
    case 'NEW':
      return <span className={styles.orderActionNewLabel}>{t('orderActionNew', 'New')}</span>;
    case 'RENEW':
      return <span className={styles.orderActionRenewLabel}>{t('orderActionRenew', 'Renew')}</span>;
    case 'REVISE':
      return <span className={styles.orderActionReviseLabel}>{t('orderActionRevise', 'Modify')}</span>;
    case 'DISCONTINUE':
      return <span className={styles.orderActionDiscontinueLabel}>{t('orderActionDiscontinue', 'Discontinue')}</span>;
    default:
      return null;
  }
}

const OrderCatalogBasketItemTile: React.FC<OrderCatalogBasketItemTileProps> = ({
  orderBasketItem,
  onItemClick,
  onRemoveClick,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const shouldOnClickBeCalled = useRef(true);

  const orderTile = (
    <div className={styles.orderBasketItemTile}>
      <div>
        <OrderActionLabel orderBasketItem={orderBasketItem} />
        <br />
        <span className={styles.name}>{getCatalogBasketItemLabel(orderBasketItem)}</span>
        {!!orderBasketItem.orderError && (
          <div className={styles.orderErrorText}>
            <WarningIcon size={16} />
            &nbsp;
            {t('error', 'Error').toUpperCase()} &nbsp;
            {orderBasketItem.orderError.responseBody?.error?.message ?? orderBasketItem.orderError.message}
          </div>
        )}
      </div>
      <IconButton
        align="left"
        className={styles.removeButton}
        kind="ghost"
        label={t('removeFromBasket', 'Remove from basket')}
        onClick={() => {
          shouldOnClickBeCalled.current = false;
          onRemoveClick();
        }}
        size={isTablet ? 'lg' : 'sm'}>
        <TrashCanIcon size={16} />
      </IconButton>
    </div>
  );

  return orderBasketItem.action === 'DISCONTINUE' ? (
    <Tile className={isTablet ? styles.clickableTileTablet : styles.clickableTileDesktop}>{orderTile}</Tile>
  ) : (
    <ClickableTile
      className={isTablet ? styles.clickableTileTablet : styles.clickableTileDesktop}
      onClick={() => {
        if (shouldOnClickBeCalled.current) {
          onItemClick();
        }
      }}>
      {orderTile}
    </ClickableTile>
  );
};

export default OrderCatalogBasketItemTile;
