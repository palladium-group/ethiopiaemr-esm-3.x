import React from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from '@carbon/react/icons';
import NavTileLink from './nav-tile-link.component';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const ShrAdminDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  return (
    <NavTileLink
      hideOverlay={hideOverlay}
      icon={<Share size={24} />}
      label={t('shrAdmin', 'SHR Admin')}
      to={`${window.getOpenmrsSpaBase()}shr-admin`}
    />
  );
};

export default ShrAdminDashboardLink;
