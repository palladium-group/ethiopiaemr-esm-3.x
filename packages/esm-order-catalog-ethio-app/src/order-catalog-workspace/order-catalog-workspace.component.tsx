import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet } from '@carbon/react';
import { type DefaultWorkspaceProps } from '@openmrs/esm-framework';
import styles from './order-catalog-workspace.scss';

export interface OrderCatalogWorkspaceLaunchProps {
  patientUuid: string;
}

export type OrderCatalogWorkspaceProps = DefaultWorkspaceProps & OrderCatalogWorkspaceLaunchProps;

const OrderCatalogWorkspace: React.FC<OrderCatalogWorkspaceProps> = ({ closeWorkspace }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{t('orderCatalogWorkspaceTitle', 'Order catalog')}</h4>
      <p>{t('orderCatalogWorkspaceStub', 'Order catalog workspace — browse UI coming in the next step.')}</p>
      <ButtonSet className={styles.buttonSet}>
        <Button kind="secondary" onClick={() => closeWorkspace()}>
          {t('close', 'Close')}
        </Button>
      </ButtonSet>
    </div>
  );
};

export default OrderCatalogWorkspace;
