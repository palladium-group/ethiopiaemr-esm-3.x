import React from 'react';
import OrderSheetTable from './order-sheet-table.component';
import { useOrderSheet } from './order-sheet.resource';

interface OrderSheetPanelProps {
  patientUuid?: string;
}

const OrderSheetPanel: React.FC<OrderSheetPanelProps> = ({ patientUuid }) => {
  const { orderSheet, error, isLoading } = useOrderSheet(patientUuid);

  return <OrderSheetTable orders={orderSheet ?? []} isLoading={isLoading} error={error} />;
};

export default OrderSheetPanel;
