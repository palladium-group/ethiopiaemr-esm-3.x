import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification } from '@carbon/react';
import { PageHeader, TriagePictogram } from '@openmrs/esm-framework';
import styles from '../triage-dashboard.scss';

interface TriageConfigurationGuardProps {
  variantKey: string;
}

export const TriageConfigurationGuard: React.FC<TriageConfigurationGuardProps> = ({ variantKey }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader title={t('triage', 'Triage')} illustration={<TriagePictogram />} />
      <InlineNotification
        kind="error"
        title={t('triageNotConfigured', 'Triage not configured')}
        subtitle={t('configureTriageVariant', 'Please configure the {{variant}} triage form.', {
          variant: variantKey,
        })}
      />
    </div>
  );
};
