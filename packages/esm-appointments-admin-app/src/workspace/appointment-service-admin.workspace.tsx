import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DefaultWorkspaceProps } from '@openmrs/esm-framework';
import type { AppointmentService } from '../types';

type AppointmentServiceAdminWorkspaceProps = DefaultWorkspaceProps & {
  appointmentService?: AppointmentService;
};

const AppointmentServiceAdminWorkspace: React.FC<AppointmentServiceAdminWorkspaceProps> = ({ appointmentService }) => {
  const { t } = useTranslation();

  if (!appointmentService) {
    return (
      <div style={{ padding: '1rem' }}>
        <p>{t('selectServiceFromList', 'Select a service from the list to configure availability.')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <p>{t('configuringService', 'Configuring: {{serviceName}}', { serviceName: appointmentService.name })}</p>
      <p>{t('appointmentServiceAdminComingSoon', 'Appointment service availability configuration coming soon.')}</p>
    </div>
  );
};

export default AppointmentServiceAdminWorkspace;
