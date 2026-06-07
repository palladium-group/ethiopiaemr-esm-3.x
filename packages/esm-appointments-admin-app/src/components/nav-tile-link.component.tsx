import React from 'react';
import { navigate } from '@openmrs/esm-framework';
import styles from './nav-tile-link.scss';

interface NavTileLinkProps {
  hideOverlay: (hide: boolean) => void;
  icon: React.ReactNode;
  label: string;
  to: string;
}

const NavTileLink: React.FC<NavTileLinkProps> = ({ hideOverlay, icon, label, to }) => {
  const handleClick = () => {
    hideOverlay(false);
    navigate({ to });
  };

  return (
    <button type="button" onClick={handleClick} className={styles.navLinkItem}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default NavTileLink;
