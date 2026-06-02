import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

const EtlAdminDashboardLink: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ConfigurableLink to={`${window.openmrsBase}/ethiopiaemretl/etl/sync.page`}>
      {t('etlAdministration', 'ETL Administration')}
    </ConfigurableLink>
  );
};

export default EtlAdminDashboardLink;
