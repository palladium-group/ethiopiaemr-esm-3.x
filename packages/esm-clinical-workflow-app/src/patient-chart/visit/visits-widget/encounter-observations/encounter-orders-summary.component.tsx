import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, useConfig } from '@openmrs/esm-framework';
import type { EncounterOrder } from '../past-visits-components/encounters-table/encounters-table.resource';
import { type ChartConfig } from '../../../../config-schema';
import styles from './styles.scss';

interface EncounterOrdersSummaryProps {
  orders: Array<EncounterOrder>;
}

const EncounterOrdersSummary: React.FC<EncounterOrdersSummaryProps> = ({ orders }) => {
  const { t } = useTranslation();
  const { drugOrderTypeUUID } = useConfig<ChartConfig>();

  if (!orders?.length) {
    return null;
  }

  const drugOrders = orders.filter((o) => o.orderType?.uuid === drugOrderTypeUUID);
  const otherOrders = orders.filter((o) => o.orderType?.uuid !== drugOrderTypeUUID);

  const renderDrugOrder = (order: EncounterOrder) => (
    <React.Fragment key={order.uuid || order.orderNumber}>
      <span className={styles.orderLabel}>{order.drug?.display ?? order.display ?? '--'}</span>
      <span>
        {order.dose != null && order.doseUnits?.display
          ? `${order.dose} ${order.doseUnits.display}`
          : order.dosingInstructions}
        {order.route?.display && ` — ${order.route.display}`}
        {order.frequency?.display && ` — ${order.frequency.display}`}
        {order.dateActivated && (
          <span className={styles.orderMeta}> · {formatDate(new Date(order.dateActivated))}</span>
        )}
      </span>
    </React.Fragment>
  );

  const renderTestOrder = (order: EncounterOrder) => (
    <React.Fragment key={order.uuid || order.orderNumber}>
      <span className={styles.orderLabel}>{order.concept?.display ?? order.display ?? '--'}</span>
      <span>
        {order.instructions ?? ''}
        {order.dateActivated && (
          <span className={styles.orderMeta}> · {formatDate(new Date(order.dateActivated))}</span>
        )}
      </span>
    </React.Fragment>
  );

  return (
    <div className={styles.observation}>
      {drugOrders.map(renderDrugOrder)}
      {otherOrders.map(renderTestOrder)}
    </div>
  );
};

export default EncounterOrdersSummary;
