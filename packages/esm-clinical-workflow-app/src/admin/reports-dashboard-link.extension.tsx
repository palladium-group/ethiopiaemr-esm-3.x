import React from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentMultiple_01 } from '@carbon/react/icons';
import NavTileLink from './nav-tile-link.component';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const ReportsDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();
  return (
    <NavTileLink
      hideOverlay={hideOverlay}
      icon={<DocumentMultiple_01 size={24} />}
      label={t('reports', 'Reports')}
      to={`${window.getOpenmrsSpaBase()}reports`}
    />
  );
};

export default ReportsDashboardLink;
