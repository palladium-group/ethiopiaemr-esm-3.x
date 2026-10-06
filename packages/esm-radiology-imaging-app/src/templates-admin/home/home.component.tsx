import React from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceContainer } from '@openmrs/esm-framework';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RADIOLOGY_TEMPLATE_ADMIN_CONTEXT_KEY, radiologyTemplatesAdminBasePath } from '../constants';
import UserHasTemplateCatalogAccess from '../user-has-template-catalog-access.component';
import RadiologyTemplatesAdminDashboard from './dashboard.component';
import styles from './home.scss';

const RadiologyTemplatesAdminHome: React.FC = () => {
  const { t } = useTranslation();

  return (
    <UserHasTemplateCatalogAccess
      fallback={
        <main className={styles.container}>
          <p className={styles.dashboard}>
            {t('templateAdminNoAccess', 'You do not have permission to view or manage radiology report templates.')}
          </p>
        </main>
      }>
      <BrowserRouter basename={radiologyTemplatesAdminBasePath}>
        <main className={styles.container}>
          <Routes>
            <Route path="/" element={<RadiologyTemplatesAdminDashboard />} />
            <Route path="/*" element={<RadiologyTemplatesAdminDashboard />} />
          </Routes>
        </main>
        <WorkspaceContainer
          key={RADIOLOGY_TEMPLATE_ADMIN_CONTEXT_KEY}
          contextKey={RADIOLOGY_TEMPLATE_ADMIN_CONTEXT_KEY}
        />
      </BrowserRouter>
    </UserHasTemplateCatalogAccess>
  );
};

export default RadiologyTemplatesAdminHome;
