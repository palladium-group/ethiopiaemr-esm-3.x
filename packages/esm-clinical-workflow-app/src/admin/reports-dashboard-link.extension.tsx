import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@openmrs/esm-framework';
import { DocumentMultiple_01 } from '@carbon/react/icons';
import styles from './admin-dashboard-link.scss';

interface NavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const ReportsDashboardLink: React.FC<NavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    hideOverlay?.(false);
    navigate({ to: `${window.getOpenmrsSpaBase()}reports` });
  };

  return (
    <button type="button" onClick={handleClick} className={styles.navLinkItem}>
      <DocumentMultiple_01 size={24} />
      <span>{t('reports', 'Reports')}</span>
    </button>
  );
};

export default ReportsDashboardLink;
