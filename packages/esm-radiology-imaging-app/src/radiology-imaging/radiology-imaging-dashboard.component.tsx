import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './radiology-imaging-dashboard.scss';
import { PageHeader, XrayPictogram } from '@openmrs/esm-framework';
import PacsOfflineBanner from '../components/pacs-offline-banner/pacs-offline-banner.component';

const RadiologyImagingDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        className={styles.pageHeader}
        title={t('Radiology Imaging', 'Radiology Imaging')}
        illustration={<XrayPictogram />}
      />
      <PacsOfflineBanner />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default RadiologyImagingDashboard;
