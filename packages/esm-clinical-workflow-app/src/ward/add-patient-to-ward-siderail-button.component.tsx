import React, { useCallback, useRef } from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import styles from './add-patient-to-ward-siderail-button.scss';

export const wardAddPatientToWardInnerSlotName = 'ward-add-patient-to-ward-inner-slot';

export interface AddPatientToWardSiderailButtonProps {
  state?: Record<string, unknown>;
}

const AddPatientToWardSiderailButton: React.FC<AddPatientToWardSiderailButtonProps> = ({ state }) => {
  const { t } = useTranslation();
  const innerContainerRef = useRef<HTMLSpanElement | null>(null);

  const handleClick = useCallback(() => {
    const container = innerContainerRef.current;
    if (!container) {
      return;
    }

    const clickable = container.querySelector<HTMLElement>('button, [role="button"], a[href]');
    clickable?.click();
  }, []);

  return (
    <div className={styles.wrapper}>
      <Button onClick={handleClick} kind="tertiary" renderIcon={Add}>
        {t('addPatientToWard', 'Add Patient to Ward')}
      </Button>
      <span ref={innerContainerRef} className={styles.hiddenChild}>
        <ExtensionSlot name={wardAddPatientToWardInnerSlotName} state={state} />
      </span>
    </div>
  );
};

export default AddPatientToWardSiderailButton;
