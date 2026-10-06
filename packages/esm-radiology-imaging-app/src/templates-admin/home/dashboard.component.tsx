import React from 'react';
import { useTranslation } from 'react-i18next';
import RadiologyTemplatesTable from './templates-table.component';
import styles from './home.scss';

const RadiologyTemplatesAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.dashboard}>
      <h4>{t('radiologyTemplatesAdmin', 'Radiology Templates Admin')}</h4>
      <RadiologyTemplatesTable />
    </div>
  );
};

export default RadiologyTemplatesAdminDashboard;
