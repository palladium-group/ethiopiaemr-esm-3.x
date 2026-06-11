import React from 'react';
import { useTranslation } from 'react-i18next';
import { Medication } from '@carbon/react/icons';
import { UserHasAccess, useConfig } from '@openmrs/esm-framework';
import NavTileLink from '../components/nav-tile-link.component';
import type { ConfigObject } from '../config-schema';
import { ordersAdminBasePath } from '../constants';

interface OrdersAdminNavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const OrdersAdminNavLink: React.FC<OrdersAdminNavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  const { manageOrderTemplatesPrivilege, manageOrderSetsPrivilege } = useConfig<ConfigObject>();

  return (
    <UserHasAccess privilege={[manageOrderTemplatesPrivilege, manageOrderSetsPrivilege]}>
      <NavTileLink
        hideOverlay={hideOverlay}
        icon={<Medication size={24} />}
        label={t('ordersAdmin', 'Orders administration')}
        to={ordersAdminBasePath}
      />
    </UserHasAccess>
  );
};

export default OrdersAdminNavLink;
