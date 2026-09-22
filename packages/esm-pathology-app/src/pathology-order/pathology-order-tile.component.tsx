import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Microscope } from '@carbon/react/icons';
import { AddIcon, useLayoutType, type Visit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { PATHOLOGY_ORDER_WORKSPACE } from '../constants';
import styles from './pathology-order-tile.component.scss';

interface PathologyOrderTileProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  visitContext?: Visit;
}

/**
 * Tile on `special-orders-slot`. Opens the Pathology Orders workspace where the clinician
 * picks a service area (Histopathology / Cytopathology) and fills the matching request form.
 */
const PathologyOrderTile: React.FC<PathologyOrderTileProps> = ({ patientUuid, patient, visitContext }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const launchPathologyOrderWorkspace = useLaunchWorkspaceRequiringVisit(patientUuid, PATHOLOGY_ORDER_WORKSPACE);

  const openPathologyOrders = useCallback(() => {
    if (!patientUuid) {
      return;
    }

    launchPathologyOrderWorkspace(
      { patientUuid, patient, visitContext },
      { patient, patientUuid, visitContext },
      { patient, patientUuid, visitContext },
    );
  }, [launchPathologyOrderWorkspace, patient, patientUuid, visitContext]);

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
          onClick={openPathologyOrders}>
          {t('newPathologyOrder', 'New order')}
        </Button>
      </div>
    </Tile>
  );
};

export default PathologyOrderTile;
