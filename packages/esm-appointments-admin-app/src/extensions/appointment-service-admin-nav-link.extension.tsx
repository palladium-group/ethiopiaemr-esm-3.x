import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@carbon/react/icons';
import { UserHasAccess, useConfig } from '@openmrs/esm-framework';
import NavTileLink from '../components/nav-tile-link.component';
import { appointmentServiceAdminBasePath } from '../constants';
import type { ConfigObject } from '../config-schema';

interface AppointmentServiceAdminNavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const AppointmentServiceAdminNavLink: React.FC<AppointmentServiceAdminNavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  const { appointmentServiceAdminPrivilege } = useConfig<ConfigObject>();

  return (
    <UserHasAccess privilege={appointmentServiceAdminPrivilege}>
      <NavTileLink
        hideOverlay={hideOverlay}
        icon={<Calendar size={24} />}
        label={t('appointmentServiceAdmin', 'Appointment service admin')}
        to={appointmentServiceAdminBasePath}
      />
    </UserHasAccess>
  );
};

export default AppointmentServiceAdminNavLink;
