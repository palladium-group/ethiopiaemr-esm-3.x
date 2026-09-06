import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Microscope } from '@carbon/react/icons';
import { AddIcon, showSnackbar, useConfig, useLayoutType, type Visit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type PathologyConfig } from '../config-schema';
import styles from './pathology-order-tile.component.scss';

interface CytologyOrderTileProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  visitContext?: Visit;
}

/**
 * Tile contributed to `special-orders-slot`. Opens the configured cytology order form in the O3
 * form engine; submitting that form saves the cytology order together with the observations the
 * OpenELIS cytology workflow needs as a single encounter, which lab-on-fhir then pushes onwards.
 */
const CytologyOrderTile: React.FC<CytologyOrderTileProps> = ({ patientUuid, patient, visitContext }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { cytologyFormUuid } = useConfig<PathologyConfig>();
  const launchCytologyForm = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  const openCytologyOrderForm = useCallback(() => {
    if (!cytologyFormUuid) {
      showSnackbar({
        kind: 'error',
        title: t('cannotOpenCytologyForm', 'Cannot open the cytology order form'),
        subtitle: t('cytologyFormNotConfigured', 'No cytology order form has been configured.'),
      });
      return;
    }

    launchCytologyForm(
      {
        workspaceTitle: t('cytologyOrderForm', 'Cytology order form'),
        form: { uuid: cytologyFormUuid },
        encounterUuid: '',
      },
      {},
      { patient, patientUuid, visitContext },
    );
  }, [launchCytologyForm, cytologyFormUuid, patient, patientUuid, visitContext, t]);

  if (!patientUuid) {
    return null;
  }

  return (
    <Tile className={styles.tile}>
      <div className={styles.container}>
        <div className={styles.iconAndLabel}>
          <Microscope size={24} />
          <h4 className={styles.heading}>{t('cytologyOrders', 'Cytology orders')}</h4>
        </div>
        <Button
          kind="ghost"
          size={isTablet ? 'md' : 'sm'}
          renderIcon={(props) => <AddIcon size={16} {...props} />}
          onClick={openCytologyOrderForm}>
          {t('newCytologyOrder', 'New order')}
        </Button>
      </div>
    </Tile>
  );
};

export default CytologyOrderTile;
