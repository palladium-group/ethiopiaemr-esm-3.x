import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePacsStatus } from '../../resources/hooks/usePacsStatus';
import styles from './pacs-offline-banner.scss';

const PacsOfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, isLoading } = usePacsStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isOnline || dismissed) {
    return null;
  }

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <div className={styles.iconWrapper}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text x="10" y="15" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">
            !
          </text>
        </svg>
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{t('pacsOfflineTitle', 'PACS System Offline')}</p>
        <p className={styles.subtitle}>
          {t(
            'pacsOfflineSubtitle',
            'Image retrieval and storage may be delayed. contact support if the problem persists.',
          )}
        </p>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={() => setDismissed(true)}
        aria-label={t('dismiss', 'Dismiss')}>
        ×
      </button>
    </div>
  );
};

export default PacsOfflineBanner;
