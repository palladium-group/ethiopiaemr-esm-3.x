import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton } from '@carbon/react';
import {
  EmptyState,
  ErrorState,
  useLaunchWorkspaceRequiringVisit,
  EmptyStateProps,
} from '@openmrs/esm-patient-common-lib';
import MedicationsDetailsTable from '../components/medications-details-table.component';
import { useActivePatientOrders } from '../api/api';
import { userHasAccess, useSession } from '@openmrs/esm-framework';
import { PatientMedicationsPermissions } from '../permissions.constants';

interface ActiveMedicationsProps {
  patient: fhir.Patient;
}

const ActiveMedications: React.FC<ActiveMedicationsProps> = ({ patient }) => {
  const { t } = useTranslation();
  const headerTitle = t('activeMedicationsHeaderTitle', 'Active medications');
  const displayText = t('activeMedicationsDisplayText', 'active medications');

  const session = useSession();
  const canManageMedications = userHasAccess(
    PatientMedicationsPermissions.ManagePatientMedications,
    session?.user ?? { privileges: [], roles: [] },
  );

  const { data: activePatientOrders, error, isLoading, isValidating } = useActivePatientOrders(patient?.id);

  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patient.id, 'order-basket');

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }

  if (activePatientOrders?.length) {
    return (
      <MedicationsDetailsTable
        isValidating={isValidating}
        title={t('activeMedicationsTableTitle', 'Active Medications')}
        medications={activePatientOrders}
        showDiscontinueButton={true}
        showModifyButton={true}
        showRenewButton={true}
        patient={patient}
      />
    );
  }

  const emptyStateProps: EmptyStateProps = {
    displayText: displayText,
    headerTitle: headerTitle,
  };

  /** If the user has the ManagePatientMedications permission, show the launch form button. */
  if (canManageMedications) {
    emptyStateProps.launchForm = () => launchOrderBasket({}, { encounterUuid: '' });
  }

  return <EmptyState {...emptyStateProps} />;
};

export default ActiveMedications;
