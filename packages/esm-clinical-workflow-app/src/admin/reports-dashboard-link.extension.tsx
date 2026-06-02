import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

const ReportsDashboardLink: React.FC = () => {
  const { t } = useTranslation();
  return <ConfigurableLink to={`${window.getOpenmrsSpaBase()}reports`}>{t('reports', 'Reports')}</ConfigurableLink>;
};

export default ReportsDashboardLink;
