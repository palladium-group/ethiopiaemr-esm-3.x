import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExtensionSlot, Workspace2 } from '@openmrs/esm-framework';
import { type PatientWorkspace2DefinitionProps } from '@openmrs/esm-patient-common-lib';
import styles from './special-orders.workspace.scss';

export type SpecialOrdersWorkspaceProps = PatientWorkspace2DefinitionProps<{}, {}>;

/**
 * Host workspace for special orders. Each special-order MFE (pathology, GeneXpert, microbiology, ...)
 * contributes a tile to `special-orders-slot`, and a tile opens that order's form in the O3 form engine.
 * Submitting the form places the order in full, so unlike the standard order basket there is no
 * collect-then-sign step here — this workspace only lists the available special orders.
 */
export default function SpecialOrdersWorkspace({ groupProps }: SpecialOrdersWorkspaceProps) {
  const { t } = useTranslation();
  const patientUuid = groupProps?.patientUuid ?? groupProps?.patient?.id;

  return (
    <Workspace2 title={t('specialOrders', 'Special orders')}>
      <div className={styles.container}>
        {patientUuid ? (
          <ExtensionSlot
            name="special-orders-slot"
            state={{
              patient: groupProps?.patient,
              patientUuid,
              visitContext: groupProps?.visitContext,
            }}
          />
        ) : null}
      </div>
    </Workspace2>
  );
}
