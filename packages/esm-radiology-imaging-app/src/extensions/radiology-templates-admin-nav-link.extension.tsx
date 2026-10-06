import React from 'react';
import { useTranslation } from 'react-i18next';
import { Document } from '@carbon/react/icons';
import { navigate } from '@openmrs/esm-framework';
import UserHasTemplateCatalogAccess from '../templates-admin/user-has-template-catalog-access.component';
import styles from '../radiology-imaging/radiology-imaging-nav-link.scss';

interface RadiologyTemplatesAdminNavLinkProps {
  hideOverlay: (hide: boolean) => void;
}

const RadiologyTemplatesAdminNavLink: React.FC<RadiologyTemplatesAdminNavLinkProps> = ({ hideOverlay }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    hideOverlay?.(false);
    navigate({ to: `${globalThis.spaBase}/radiology-templates-admin` });
  };

  return (
    <UserHasTemplateCatalogAccess>
      <button type="button" onClick={handleClick} className={styles.radiologyImagingNavLinkItem}>
        <Document size={24} />
        <span>{t('radiologyTemplatesAdmin', 'Radiology Templates Admin')}</span>
      </button>
    </UserHasTemplateCatalogAccess>
  );
};

export default RadiologyTemplatesAdminNavLink;
