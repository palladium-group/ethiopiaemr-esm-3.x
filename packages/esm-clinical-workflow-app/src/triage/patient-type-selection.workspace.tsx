import React from 'react';
import { Dropdown, InlineLoading } from '@carbon/react';
import { DefaultWorkspaceProps, ExtensionSlot, usePatient, useVisit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { TriageVariantConfig } from '../config-schema';
import { useStartVisitAndLaunchTriageForm, launchTriageFormWorkspace } from './useStartVisitAndLaunchTriageForm';

type PatientTypeSelectionWorkspaceProps = DefaultWorkspaceProps & {
  patientUuid: string;
  variantConfig: TriageVariantConfig;
};

const PatientTypeSelectionWorkspace: React.FC<PatientTypeSelectionWorkspaceProps> = ({
  patientUuid,
  variantConfig,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const { patient, isLoading: isPatientLoading } = usePatient(patientUuid);
  const { activeVisit, isLoading: isVisitLoading } = useVisit(patientUuid);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();

  const patientTypeItems = variantConfig.patientTypes
    ? Object.entries(variantConfig.patientTypes).map(([key, config]) => ({
        id: key,
        label: t(`patientType_${key}`, config.displayName),
        formUuid: config.formUuid,
        formName: config.formName,
      }))
    : [];

  const handleSelect = async ({ selectedItem }: { selectedItem: (typeof patientTypeItems)[0] | null }) => {
    if (selectedItem) {
      if (activeVisit) {
        launchTriageFormWorkspace(patient, patientUuid, activeVisit, selectedItem.formUuid, selectedItem.formName, t);
      } else {
        await handleStartVisitAndLaunchTriageForm(patientUuid, selectedItem.formUuid, selectedItem.formName);
      }
      closeWorkspace();
    }
  };

  if (isPatientLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <>
      {patient && (
        <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid, hideActionsOverflow: true }} />
      )}
      <div style={{ padding: '1rem' }}>
        <Dropdown
          id="patient-type-selection"
          titleText={t('selectPatientType', 'Select patient type')}
          label={t('selectPatientType', 'Select patient type')}
          items={patientTypeItems}
          itemToString={(item) => item?.label || ''}
          onChange={handleSelect}
        />
      </div>
    </>
  );
};

export default PatientTypeSelectionWorkspace;
