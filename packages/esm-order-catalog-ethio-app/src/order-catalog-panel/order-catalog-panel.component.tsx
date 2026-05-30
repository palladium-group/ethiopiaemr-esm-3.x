import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { launchWorkspace2, useConfig, usePatient } from '@openmrs/esm-framework';
import {
  type OrderBasketWindowProps,
  type PatientWorkspaceGroupProps,
  usePatientChartStore,
  useStartVisitIfNeeded,
} from '@openmrs/esm-patient-common-lib';
import { type ConfigObject } from '../config-schema';
import { ethioOrderCatalogWorkspaceName } from '../constants';
import { type OrderCatalogWorkspaceLaunchProps } from '../order-catalog-workspace/order-catalog-workspace.component';
import styles from './order-catalog-panel.scss';

/**
 * Order basket entry point for the catalog UX. Renders nothing when `orderCatalogEnabled` is false.
 */
const OrderCatalogPanel: React.FC = () => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { patient } = usePatient();
  const patientUuid = patient?.id ?? '';
  const { visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);

  const handleAddOrders = useCallback(async () => {
    if (!patient?.id) {
      return;
    }

    const didStartVisit = await startVisitIfNeeded();
    if (!didStartVisit) {
      return;
    }

    launchWorkspace2<OrderCatalogWorkspaceLaunchProps, OrderBasketWindowProps, PatientWorkspaceGroupProps>(
      ethioOrderCatalogWorkspaceName,
      { patientUuid: patient.id },
      { encounterUuid: '' },
      {
        patient,
        patientUuid: patient.id,
        visitContext,
        mutateVisitContext,
      },
    );
  }, [patient, startVisitIfNeeded, visitContext, mutateVisitContext]);

  if (!config.orderCatalogEnabled || !patientUuid) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <h4 className={styles.title}>{t('orderCatalog', 'Order catalog')}</h4>
      <p className={styles.description}>
        {t('orderCatalogPanelStub', 'Browse lab, radiology, and procedure orders by category.')}
      </p>
      <Button kind="ghost" size="sm" onClick={handleAddOrders}>
        {t('addOrders', 'Add orders')}
      </Button>
    </div>
  );
};

export default OrderCatalogPanel;
