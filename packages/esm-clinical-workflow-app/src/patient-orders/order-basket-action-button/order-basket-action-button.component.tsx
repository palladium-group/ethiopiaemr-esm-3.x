import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuButton2, ShoppingCartIcon, userHasAccess, useSession } from '@openmrs/esm-framework';
import {
  useStartVisitIfNeeded,
  useOrderBasket,
  type PatientChartWorkspaceActionButtonProps,
} from '@openmrs/esm-patient-common-lib';
import { Permissions } from '../../permission/permissions.constants';

/**
 * This extension uses the patient chart store and MUST only be mounted within the patient chart
 */
const OrderBasketActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = (props) => {
  const {
    groupProps: { patientUuid, patient },
  } = props;
  const { t } = useTranslation();
  const { orders } = useOrderBasket(patient);
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);
  const session = useSession();
  const OrderBasketPermissions = [
    Permissions.AddDrugOrder,
    Permissions.AddLabOrder,
    Permissions.AddImagingOrder,
    Permissions.AddProcedureOrder,
  ];

  // Check if user has permission to add visit notes
  const canAddOrder = OrderBasketPermissions.some((permission) => userHasAccess(permission, session?.user));

  if (!canAddOrder) {
    return null;
  }

  return (
    <ActionMenuButton2
      icon={(props: ComponentProps<typeof ShoppingCartIcon>) => <ShoppingCartIcon {...props} />}
      label={t('orderBasket', 'Order basket')}
      tagContent={orders?.length > 0 ? orders?.length : null}
      workspaceToLaunch={{
        workspaceName: 'order-basket',
        windowProps: { encounterUuid: '' },
      }}
      onBeforeWorkspaceLaunch={startVisitIfNeeded}
    />
  );
};

export default OrderBasketActionButton;
