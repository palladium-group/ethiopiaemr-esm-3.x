import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { showSnackbar, useConfig, useLayoutType, useSession, Workspace2, type Visit } from '@openmrs/esm-framework';
import {
  useLaunchWorkspaceRequiringVisit,
  type PatientWorkspace2DefinitionProps,
} from '@openmrs/esm-patient-common-lib';
import { type PathologyConfig, type PathologyTypeOfSampleOption } from '../config-schema';
import { SPECIAL_ORDER_FORM_ENTRY_WORKSPACE } from '../constants';
import { buildSpecialOrderFormLaunchProps } from './special-order-form-launch.resource';
import styles from './pathology-order.workspace.scss';

export type PathologyOrderWorkspaceProps = PatientWorkspace2DefinitionProps<
  {
    patientUuid?: string;
    patient?: fhir.Patient;
    visitContext?: Visit;
  },
  {}
>;

/**
 * Pathology Orders workspace: Bahmni-style Type of Sample chooser.
 * Clicking a type opens that option's request form immediately; after save a fixed TestOrder is created.
 */
export default function PathologyOrderWorkspace({ groupProps, workspaceProps }: PathologyOrderWorkspaceProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const session = useSession();
  const { pathologyTypeOfSampleOptions, careSettingUuid } = useConfig<PathologyConfig>();
  const patientUuid = workspaceProps?.patientUuid ?? groupProps?.patientUuid ?? groupProps?.patient?.id;
  const patient = workspaceProps?.patient ?? groupProps?.patient;
  const visitContext = workspaceProps?.visitContext ?? groupProps?.visitContext;
  const launchSpecialOrderForm = useLaunchWorkspaceRequiringVisit(patientUuid, SPECIAL_ORDER_FORM_ENTRY_WORKSPACE);

  const options = useMemo(
    () => pathologyTypeOfSampleOptions?.filter((option) => option?.id && option?.formUuid) ?? [],
    [pathologyTypeOfSampleOptions],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openFormForOption = useCallback(
    (option: PathologyTypeOfSampleOption) => {
      if (!patientUuid) {
        return;
      }

      if (!option.formUuid) {
        showSnackbar({
          kind: 'error',
          title: t('cannotOpenPathologyForm', 'Cannot open the pathology order form'),
          subtitle: t('pathologyFormNotConfigured', 'No pathology order form has been configured.'),
        });
        return;
      }

      setSelectedId(option.id);

      const workspaceLaunchProps = buildSpecialOrderFormLaunchProps({
        typeOfSampleLabel: option.label,
        formUuid: option.formUuid,
        orderConceptUuid: option.orderConceptUuid,
        careSettingUuid,
        patientUuid,
        visitContext,
        ordererUuid: session?.currentProvider?.uuid,
        t,
      });

      launchSpecialOrderForm(
        workspaceLaunchProps,
        { patient, patientUuid, visitContext },
        { patient, patientUuid, visitContext },
      );
    },
    [careSettingUuid, launchSpecialOrderForm, patient, patientUuid, session?.currentProvider?.uuid, t, visitContext],
  );

  return (
    <Workspace2 title={t('pathologyOrders', 'Pathology orders')}>
      <div className={styles.container}>
        <p className={styles.sectionLabel}>{t('typeOfSample', 'Type of Sample')} *</p>
        {options.length > 0 ? (
          <div className={styles.typeOfSampleSwitcher} role="group" aria-label={t('typeOfSample', 'Type of Sample')}>
            {options.map((option) => {
              const selected = selectedId === option.id;
              return (
                <Button
                  key={option.id}
                  kind={selected ? 'primary' : 'ghost'}
                  size={isTablet ? 'lg' : 'md'}
                  className={`${styles.typeOfSampleButton} ${
                    selected ? styles.typeOfSampleButtonSelected : styles.typeOfSampleButtonUnselected
                  }`}
                  onClick={() => openFormForOption(option)}>
                  {option.label}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>
            {t('noTypeOfSampleConfigured', 'No Type of Sample options have been configured for Pathology orders.')}
          </p>
        )}
      </div>
    </Workspace2>
  );
}
