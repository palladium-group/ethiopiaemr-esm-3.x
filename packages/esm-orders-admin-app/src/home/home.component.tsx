import React from 'react';
import { WorkspaceContainer } from '@openmrs/esm-framework';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ORDERS_ADMIN_CONTEXT_KEY, ordersAdminBasePath } from '../constants';
import OrdersAdminDashboard from './dashboard.component';
import styles from './home.scss';

const OrdersAdminHome: React.FC = () => {
  return (
    <BrowserRouter basename={ordersAdminBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<OrdersAdminDashboard />} />
          <Route path="/*" element={<OrdersAdminDashboard />} />
        </Routes>
      </main>
      <WorkspaceContainer key={ORDERS_ADMIN_CONTEXT_KEY} contextKey={ORDERS_ADMIN_CONTEXT_KEY} />
    </BrowserRouter>
  );
};

export default OrdersAdminHome;
