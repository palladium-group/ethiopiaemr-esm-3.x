import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Microscope } from '@carbon/react/icons';
import { AddIcon, showSnackbar, useConfig, useLayoutType, type Visit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type PathologyConfig } from '../config-schema';
import styles from './pathology-order-tile.component.scss';

interface PathologyOrderTileProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  visitContext?: Visit;
}

/**
 * Tile contributed to `special-orders-slot`. Opens the configured pathology order form in the O3
 * form engine; submitting that form saves the pathology order together with the observations the
 * OpenELIS pathology workflow needs as a single encounter, which lab-on-fhir then pushes onwards.
 */
const PathologyOrderTile: React.FC<PathologyOrderTileProps> = ({ patientUuid, patient, visitContext }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { pathologyFormUuid } = useConfig<PathologyConfig>();
  const launchPathologyForm = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  const openPathologyOrderForm = useCallback(() => {
    if (!pathologyFormUuid) {
      showSnackbar({
        kind: 'error',
        title: t('cannotOpenPathologyForm', 'Cannot open the pathology order form'),
        subtitle: t('pathologyFormNotConfigured', 'No pathology order form has been configured.'),
      });
      return;
    }

    launchPathologyForm(
      {
        workspaceTitle: t('pathologyOrderForm', 'Pathology order form'),
        form: { uuid: pathologyFormUuid },
        encounterUuid: '',
      },
      {},
      { patient, patientUuid, visitContext },
    );
  }, [launchPathologyForm, pathologyFormUuid, patient, patientUuid, visitContext, t]);

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
