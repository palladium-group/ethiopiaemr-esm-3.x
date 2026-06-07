import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DefaultWorkspaceProps } from '@openmrs/esm-framework';

/**
 * Shell workspace for appointment service availability admin.
 *
 * Phase 0: renders a placeholder while the form UI is built in Phase 1.
 */
const AppointmentServiceAdminWorkspace: React.FC<DefaultWorkspaceProps> = ({ closeWorkspace }) => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '1rem' }}>
      <p>{t('appointmentServiceAdminComingSoon', 'Appointment service availability configuration coming soon.')}</p>
    </div>
  );
};

export default AppointmentServiceAdminWorkspace;
