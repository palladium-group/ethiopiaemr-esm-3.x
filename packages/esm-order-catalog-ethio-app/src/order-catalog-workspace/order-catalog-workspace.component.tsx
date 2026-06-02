import React from 'react';
import { useTranslation } from 'react-i18next';
import { Workspace2 } from '@openmrs/esm-framework';
import { type PatientWorkspace2DefinitionProps } from '@openmrs/esm-patient-common-lib';
import OrderCatalogBrowse from './order-catalog-browse.component';
import styles from './order-catalog-workspace.scss';

export interface OrderCatalogWorkspaceLaunchProps {
  patientUuid: string;
}

export type OrderCatalogWorkspaceProps = PatientWorkspace2DefinitionProps<OrderCatalogWorkspaceLaunchProps, {}>;

const OrderCatalogWorkspace: React.FC<OrderCatalogWorkspaceProps> = ({ groupProps, closeWorkspace }) => {
  const { t } = useTranslation();

  if (!groupProps?.patient || !groupProps?.visitContext) {
    return null;
  }

  return (
    <Workspace2 title={t('orderCatalogWorkspaceTitle', 'Order catalog')}>
      <div className={styles.workspaceBody}>
        <OrderCatalogBrowse
          patient={groupProps.patient}
          visit={groupProps.visitContext}
          onRequestClose={() => {
            closeWorkspace({ closeWindow: true });
          }}
        />
      </div>
    </Workspace2>
  );
};

export default OrderCatalogWorkspace;
