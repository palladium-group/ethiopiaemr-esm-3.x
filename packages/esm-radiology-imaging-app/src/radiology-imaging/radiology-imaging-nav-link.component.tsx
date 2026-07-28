import React from 'react';
import styles from './radiology-imaging-nav-link.scss';
import { useTranslation } from 'react-i18next';
import { navigate, UserXrayIcon } from '@openmrs/esm-framework';

interface RadiologyImagingNavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const RadiologyImagingNavLink: React.FC<RadiologyImagingNavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    hideOverlay?.(false);
    navigate({ to: `${globalThis.spaBase}/radiology-imaging` });
  };
  return (
    <button type="button" onClick={() => handleClick()} className={styles.radiologyImagingNavLinkItem}>
      <UserXrayIcon />
      <span>{t('radiologyImaging', 'Radiology Imaging')}</span>
    </button>
  );
};

export default RadiologyImagingNavLink;
