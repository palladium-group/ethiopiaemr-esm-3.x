import { useAssignedExtensions, ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { useParams } from 'react-router-dom';
import styles from './dashboard-container.scss';
import { DashboardConfig } from '../../../types';

const AutoClaimsDashboardContainer: React.FC = () => {
  const params = useParams();
  const assignedExtensions = useAssignedExtensions('auto-claims-admin-dashboard-slot');
  const ungroupedDashboards = assignedExtensions.map((e) => e.meta).filter((e) => Object.keys(e).length) || [];
  const dashboards = ungroupedDashboards as Array<DashboardConfig>;
  const activeDashboard = dashboards.find((dashboard) => dashboard.name === params?.dashboard) || dashboards[0];

  if (!activeDashboard?.slot) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <ExtensionSlot
        className={styles.dashboardView}
        name={activeDashboard.slot}
        state={{ dashboardTitle: activeDashboard.name }}
      />
    </div>
  );
};

export default AutoClaimsDashboardContainer;
