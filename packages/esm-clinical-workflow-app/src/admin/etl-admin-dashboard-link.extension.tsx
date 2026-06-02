import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@openmrs/esm-framework';
import { Renew } from '@carbon/react/icons';
import styles from './admin-dashboard-link.scss';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const EtlAdminDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    hideOverlay?.(false);
    navigate({ to: `${window.openmrsBase}/ethiopiaemretl/etl/sync.page` });
  };

  return (
    <button type="button" onClick={handleClick} className={styles.navLinkItem}>
      <Renew size={24} />
      <span>{t('etlAdministration', 'ETL Administration')}</span>
    </button>
  );
};

export default EtlAdminDashboardLink;
