import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Microscope } from '@carbon/react/icons';
import { AddIcon, showSnackbar, useConfig, useLayoutType, useSession, type Visit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type PathologyConfig } from '../config-schema';
import { SPECIAL_ORDER_FORM_ENTRY_WORKSPACE } from '../constants';
import { buildSpecialOrderFormLaunchProps } from './special-order-form-launch.resource';
import styles from './pathology-order-tile.component.scss';

interface PathologyOrderTileProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  visitContext?: Visit;
}

/**
 * Tile contributed to `special-orders-slot`. Opens the Pathology request form for clinical context;
 * after save, creates the fixed Histopathology examination TestOrder on that encounter.
 */
const PathologyOrderTile: React.FC<PathologyOrderTileProps> = ({ patientUuid, patient, visitContext }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const session = useSession();
  const { pathologyFormUuid, pathologyOrderConceptUuid, careSettingUuid } = useConfig<PathologyConfig>();
  const launchSpecialOrderForm = useLaunchWorkspaceRequiringVisit(patientUuid, SPECIAL_ORDER_FORM_ENTRY_WORKSPACE);

  const openPathologyOrderForm = useCallback(() => {
    if (!pathologyFormUuid) {
      showSnackbar({
        kind: 'error',
        title: t('cannotOpenPathologyForm', 'Cannot open the pathology order form'),
        subtitle: t('pathologyFormNotConfigured', 'No pathology order form has been configured.'),
      });
      return;
    }

    if (!patientUuid) {
      return;
    }

    const workspaceProps = buildSpecialOrderFormLaunchProps({
      kind: 'pathology',
      formUuid: pathologyFormUuid,
      orderConceptUuid: pathologyOrderConceptUuid,
      careSettingUuid,
      patientUuid,
      visitContext,
      ordererUuid: session?.currentProvider?.uuid,
      t,
    });

    launchSpecialOrderForm(
      workspaceProps,
      { patient, patientUuid, visitContext },
      { patient, patientUuid, visitContext },
    );
  }, [
    careSettingUuid,
    launchSpecialOrderForm,
    pathologyFormUuid,
    pathologyOrderConceptUuid,
    patient,
    patientUuid,
    session?.currentProvider?.uuid,
    t,
    visitContext,
  ]);

  if (!patientUuid) {
    return null;
  }

  return (
    <Tile className={styles.tile}>
      <div className={styles.container}>
        <div className={styles.iconAndLabel}>
          <Microscope size={24} />
          <h4 className={styles.heading}>{t('pathologyOrders', 'Pathology orders')}</h4>
        </div>
        <Button
          kind="ghost"
          size={isTablet ? 'md' : 'sm'}
          renderIcon={(props) => <AddIcon size={16} {...props} />}
          onClick={openPathologyOrderForm}>
          {t('newPathologyOrder', 'New order')}
        </Button>
      </div>
    </Tile>
  );
};

export default PathologyOrderTile;
