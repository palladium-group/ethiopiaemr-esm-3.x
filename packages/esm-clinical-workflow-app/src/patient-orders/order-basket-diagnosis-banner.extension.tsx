import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification } from '@carbon/react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { type OrderBasketExtensionProps } from '@openmrs/esm-patient-common-lib';
import { useRequireVisitDiagnosis } from './use-require-visit-diagnosis';
import styles from './order-basket-diagnosis-banner.scss';

const visitNoteWorkspaceName = 'visit-notes-form-shadow-workspace';

/**
 * Informational banner at the top of the order basket when the active visit
 * has no primary diagnosis. Does not block adding orders in the UI.
 *
 * Uses InlineNotification (not ActionableNotification) so focus trapping / toast
 * positioning cannot interfere with order search and forms in this workspace.
 */
const OrderBasketDiagnosisBanner: React.FC<Partial<OrderBasketExtensionProps>> = ({ patient }) => {
  const { t } = useTranslation();
  const patientUuid = patient?.id ?? '';
  const { shouldShowBanner } = useRequireVisitDiagnosis(patientUuid);

  const openVisitNote = useCallback(() => {
    launchWorkspace2(visitNoteWorkspaceName);
  }, []);

  if (!patientUuid || !shouldShowBanner) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('diagnosisRequiredToOrder', 'Diagnosis required')}
        subtitle={t(
          'diagnosisRequiredToOrderSubtitle',
          'Enter a primary diagnosis on the current visit before ordering medications or investigations.',
        )}
      />
      <Button kind="ghost" size="sm" className={styles.actionButton} onClick={openVisitNote}>
        {t('addVisitNote', 'Add a visit note')}
      </Button>
    </div>
  );
};

export default OrderBasketDiagnosisBanner;
