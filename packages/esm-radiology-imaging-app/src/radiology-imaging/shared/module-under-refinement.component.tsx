import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { ArrowRight, DocumentBlank } from '@carbon/react/icons';
import { navigate } from '@openmrs/esm-framework';
import styles from './module-under-refinement.scss';

interface ModuleUnderRefinementProps {
  description?: string;
}

const ModuleUnderRefinement: React.FC<ModuleUnderRefinementProps> = ({ description }) => {
  const { t } = useTranslation();

  const handleBackToDashboard = () => navigate({ to: `${globalThis.spaBase}/radiology-imaging/incoming-orders` });

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('moduleUnderDevelopment', 'Module under development')}</h2>
      <p className={styles.description}>
        {description ?? t('moduleUnderDevelopmentDescription', 'This section is currently being developed.')}
      </p>
      <div className={styles.actions}>
        <Button renderIcon={ArrowRight} onClick={handleBackToDashboard}>
          {t('backToDashboard', 'Back to Dashboard')}
        </Button>
        <Button
          kind="secondary"
          renderIcon={DocumentBlank}
          href="https://github.com/palladium-group/palladium-group-esm-radiology-imaging-app/releases"
          target="_blank">
          {t('viewReleaseNotes', 'View Release Notes')}
        </Button>
      </div>
    </div>
  );
};

export default ModuleUnderRefinement;
