import React from 'react';
import { useTranslation } from 'react-i18next';
import { Medication } from '@carbon/react/icons';
import NavTileLink from '../components/nav-tile-link.component';
import { ordersAdminBasePath } from '../constants';

interface OrdersAdminNavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const OrdersAdminNavLink: React.FC<OrdersAdminNavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();

  return (
    <NavTileLink
      hideOverlay={hideOverlay}
      icon={<Medication size={24} />}
      label={t('ordersAdmin', 'Orders administration')}
      to={ordersAdminBasePath}
    />
  );
};

export default OrdersAdminNavLink;
