import React from 'react';
import { useTranslation } from 'react-i18next';
import OrderTemplatesTable from './order-templates-table.component';
import styles from './home.scss';

const OrdersAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.dashboard}>
      <h4>{t('ordersAdmin', 'Orders administration')}</h4>
      <p className={styles.description}>
        {t(
          'ordersAdminDescription',
          'Configure drug order templates with default dosing for use when prescribing medications.',
        )}
      </p>
      <OrderTemplatesTable />
    </div>
  );
};

export default OrdersAdminDashboard;
