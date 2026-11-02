import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import {
  getDrugOrderByUuid,
  invalidateVisitByUuid,
  type Order,
  type OrderBasketItem,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import {
  buildGeneralOrder,
  buildLabOrder,
  buildMedicationOrder,
  getOrderGrouping,
  ORDER_TYPES,
} from './order-basket-items';
import { type OrderRowAction } from './order-status';
import styles from './patient-orders-table.scss';

type OrderRowActionsProps = {
  actions: Array<OrderRowAction>;
  order: Order;
  patient: fhir.Patient;
};

const OrderRowActions: React.FC<OrderRowActionsProps> = ({ actions, order, patient }) => {
  const { t } = useTranslation();
  const { orders, setOrders } = useOrderBasket<OrderBasketItem>(patient, getOrderGrouping(order));
  const { mutate: globalMutate } = useSWRConfig();
  const alreadyInBasket = orders.some((item) => item.uuid === order.uuid);
  const isTestOrder = order.type === ORDER_TYPES.TEST_ORDER;

  const windowProps = useMemo(() => ({ encounterUuid: order.encounter.uuid }), [order.encounter.uuid]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient.id,
      visitContext: order.encounter.visit,
      mutateVisitContext: invalidateVisitByUuid(globalMutate, order.encounter.visit.uuid),
    }),
    [patient, order.encounter.visit, globalMutate],
  );

  const handleCancelOrder = useCallback(async () => {
    let item: OrderBasketItem;
    if (order.type === ORDER_TYPES.DRUG_ORDER) {
      const { data: drugOrder } = await getDrugOrderByUuid(order.uuid);
      item = buildMedicationOrder(drugOrder, 'DISCONTINUE');
    } else {
      item = isTestOrder ? buildLabOrder(order, 'DISCONTINUE') : buildGeneralOrder(order, 'DISCONTINUE');
    }
    setOrders([...orders, item]);
    launchWorkspace2('order-basket', {}, windowProps, groupProps);
  }, [order, isTestOrder, setOrders, orders, windowProps, groupProps]);

  const handleModifyOrder = useCallback(async () => {
    const ordererProps = { orderToEditOrdererUuid: order.orderer.uuid };
    if (order.type === ORDER_TYPES.DRUG_ORDER) {
      // The list is fetched for all order types, so the drug fields need their own request
      const { data: drugOrder } = await getDrugOrderByUuid(order.uuid);
      launchWorkspace2(
        'add-drug-order',
        { order: buildMedicationOrder(drugOrder, 'REVISE'), ...ordererProps },
        windowProps,
        groupProps,
      );
    } else if (isTestOrder) {
      launchWorkspace2(
        'add-lab-order',
        { order: buildLabOrder(order, 'REVISE'), orderTypeUuid: order.orderType.uuid, ...ordererProps },
        windowProps,
        groupProps,
      );
    } else {
      launchWorkspace2(
        'orderable-concept-workspace',
        { order: buildGeneralOrder(order, 'REVISE'), orderTypeUuid: order.orderType.uuid, ...ordererProps },
        windowProps,
        groupProps,
      );
    }
  }, [order, isTestOrder, windowProps, groupProps]);

  const handleResults = useCallback(() => {
    launchWorkspace2('test-results-form-workspace', { order, patient });
  }, [order, patient]);

  const canEditResults = actions.includes('results') && isTestOrder;

  if (!actions.includes('modify') && !actions.includes('cancel') && !canEditResults) {
    return null;
  }

  return (
    <Layer className={styles.layer}>
      <OverflowMenu aria-label={t('actionsMenu', 'Actions menu')} align="left" flipped>
        {actions.includes('modify') && (
          <OverflowMenuItem
            className={styles.menuItem}
            disabled={alreadyInBasket}
            itemText={t('modifyOrder', 'Modify order')}
            onClick={handleModifyOrder}
          />
        )}
        {canEditResults && (
          <OverflowMenuItem
            className={styles.menuItem}
            disabled={alreadyInBasket}
            itemText={
              order.fulfillerStatus === 'COMPLETED' ? t('editResults', 'Edit results') : t('addResults', 'Add results')
            }
            onClick={handleResults}
          />
        )}
        {actions.includes('cancel') && (
          <OverflowMenuItem
            className={styles.menuItem}
            disabled={alreadyInBasket || order.action === 'DISCONTINUE'}
            hasDivider
            isDelete
            itemText={t('cancelOrder', 'Cancel order')}
            onClick={handleCancelOrder}
          />
        )}
      </OverflowMenu>
    </Layer>
  );
};

export default OrderRowActions;
