import React from 'react';
import { Checkmark, Subtract } from '@carbon/react/icons';
import classNames from 'classnames';
import { type CatalogTestAvailability } from '../types/order-catalog.types';
import styles from './order-catalog-order-button.scss';

export type OrderCatalogOrderButtonVariant = 'panel' | 'test' | 'child';

export interface OrderCatalogOrderButtonProps {
  label: string;
  active: boolean;
  /** Panel with a subset of its children selected — rendered as an outlined (not filled) tile. */
  partial?: boolean;
  variant?: OrderCatalogOrderButtonVariant;
  onClick: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  availability?: CatalogTestAvailability;
}

const OrderCatalogOrderButton: React.FC<OrderCatalogOrderButtonProps> = ({
  label,
  active,
  partial = false,
  variant = 'test',
  onClick,
  className,
  title,
  disabled = false,
  availability = 'available',
}) => {
  const isUnavailable = availability === 'unavailable' && !disabled;
  const showFilled = active && !partial && !disabled;
  const showPartial = partial && !disabled;
  const showUnavailableIdle = isUnavailable && !showFilled && !showPartial;

  return (
    <button
      type="button"
      className={classNames(
        styles.orderBtn,
        {
          [styles.orderBtnPanel]: variant === 'panel',
          [styles.orderBtnChild]: variant === 'child',
          [styles.orderBtnActive]: showFilled && !isUnavailable,
          [styles.orderBtnActiveUnavailable]: showFilled && isUnavailable,
          [styles.orderBtnPartial]: showPartial && !isUnavailable,
          [styles.orderBtnPartialUnavailable]: showPartial && isUnavailable,
          [styles.orderBtnDisabled]: disabled,
          [styles.orderBtnUnavailable]: showUnavailableIdle,
        },
        className,
      )}
      onClick={onClick}
      title={title ?? label}
      aria-pressed={active}
      disabled={disabled}>
      <span className={styles.indicator} aria-hidden>
        {showFilled ? <Checkmark size={14} /> : showPartial ? <Subtract size={14} /> : null}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
};

export default OrderCatalogOrderButton;
