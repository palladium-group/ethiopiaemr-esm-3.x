import React from 'react';
import { useTranslation } from 'react-i18next';
import { Renew } from '@carbon/react/icons';
import NavTileLink from './nav-tile-link.component';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const EtlAdminDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  return (
    <NavTileLink
      hideOverlay={hideOverlay}
      icon={<Renew size={24} />}
      label={t('etlAdministration', 'ETL Administration')}
      to={`${window.openmrsBase}/ethiopiaemretl/etl/sync.page`}
    />
  );
};

export default EtlAdminDashboardLink;
