import React from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from '@carbon/react/icons';
import NavTileLink from './nav-tile-link.component';
import { useShrAdminEnabled } from './use-shr-admin-enabled';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const ShrAdminDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  const { isShrAdminEnabled } = useShrAdminEnabled();

  // Hidden until the feature is switched on for this environment. The page and its endpoints check
  // the same property, so this only spares the user a tile that leads nowhere.
  if (!isShrAdminEnabled) {
    return null;
  }

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
