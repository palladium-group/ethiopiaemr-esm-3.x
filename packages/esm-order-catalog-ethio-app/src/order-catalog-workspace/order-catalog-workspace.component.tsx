import React from 'react';
import { useTranslation } from 'react-i18next';
import { Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import OrderCatalogBrowse from './order-catalog-browse.component';

export interface OrderCatalogWorkspaceLaunchProps {
  patientUuid: string;
}

export type OrderCatalogWorkspaceProps = Workspace2DefinitionProps<OrderCatalogWorkspaceLaunchProps>;

const OrderCatalogWorkspace: React.FC<OrderCatalogWorkspaceProps> = () => {
  const { t } = useTranslation();

  return (
    <Workspace2 title={t('orderCatalogWorkspaceTitle', 'Order catalog')}>
      <OrderCatalogBrowse />
    </Workspace2>
  );
};

export default OrderCatalogWorkspace;
