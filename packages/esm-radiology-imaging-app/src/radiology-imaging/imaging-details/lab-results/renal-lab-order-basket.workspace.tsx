import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { Button, ButtonSet, InlineLoading, InlineNotification } from '@carbon/react';
import {
  ExtensionSlot,
  useConfig,
  useSession,
  Workspace2,
  type AssignedExtension,
  type Visit,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  invalidateVisitAndEncounterData,
  postOrdersOnNewEncounter,
  showOrderSuccessToast,
  useMutatePatientOrders,
  useOrderBasket,
  type TestOrderBasketItem,
} from '@openmrs/esm-patient-common-lib';
import { type RadiologyConfig } from '../../../config-schema';

/** Owns the translations used by the order success toast. */
const patientOrdersModuleName = '@openmrs/esm-patient-orders-app';

/** Extension contributed to `order-basket-slot` by `@openmrs/esm-patient-tests-app`. */
const labOrderPanelExtensionName = 'lab-order-panel';

/** Must match the `imaging-renal-add-lab-order` workspace registered in routes.json. */
const addLabOrderWorkspaceName = 'imaging-renal-add-lab-order';

export interface RenalLabOrderBasketWindowProps {
  patient: fhir.Patient;
  patientUuid: string;
  visitContext: Visit;
  mutateVisitContext: () => void;
}

/**
 * A lab-only order basket for the renal function check on contrast imaging orders. The shared
 * `order-basket` workspace cannot be narrowed to a single order type from the caller, since panels
 * that do not declare an `orderTypeUuid` always render, so this renders just the lab panel and
 * signs the basket itself.
 */
export default function RenalLabOrderBasketWorkspace({
  windowProps,
  closeWorkspace,
  launchChildWorkspace,
}: Workspace2DefinitionProps<object, RenalLabOrderBasketWindowProps>) {
  const { t } = useTranslation();
  const { patient, patientUuid, visitContext, mutateVisitContext } = windowProps ?? {};
  const { orderEncounterType } = useConfig<RadiologyConfig>();
  const { currentProvider, sessionLocation } = useSession();
  const { mutate } = useSWRConfig();
  const { mutate: mutateOrders } = useMutatePatientOrders(patientUuid ?? '');
  const basketPatient = (patient ?? { id: patientUuid }) as fhir.Patient;
  const { orders, clearOrders } = useOrderBasket(basketPatient);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const launchLabOrderForm = useCallback(
    (orderTypeUuid: string, order?: TestOrderBasketItem) => {
      launchChildWorkspace(addLabOrderWorkspaceName, { orderTypeUuid, order });
    },
    [launchChildWorkspace],
  );

  const labOrderPanelProps = useMemo(() => ({ patient, launchLabOrderForm }), [patient, launchLabOrderForm]);

  const selectLabOrderPanel = useCallback(
    (extensions: Array<AssignedExtension>) =>
      extensions.filter((extension) => extension.name === labOrderPanelExtensionName),
    [],
  );

  const canSign =
    Boolean(patient?.id) &&
    orders.length > 0 &&
    !orders.some((order) => order.isOrderIncomplete) &&
    Boolean(orderEncounterType && currentProvider?.uuid && sessionLocation?.uuid);

  const handleSign = useCallback(async () => {
    if (!patientUuid || !orderEncounterType || !sessionLocation?.uuid || !currentProvider?.uuid) {
      return;
    }

    const abortController = new AbortController();
    setSignError('');
    setIsSigning(true);

    try {
      await postOrdersOnNewEncounter(
        patientUuid,
        orderEncounterType,
        visitContext,
        sessionLocation.uuid,
        currentProvider.uuid,
        abortController,
      );
      clearOrders();
      await mutateOrders();
      mutateVisitContext?.();
      invalidateVisitAndEncounterData(mutate, patientUuid);
      showOrderSuccessToast(patientOrdersModuleName, orders);
      await closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      setSignError(
        error?.responseBody?.error?.message ?? t('tryPlacingTheOrderAgain', 'Please try placing the order again.'),
      );
    } finally {
      setIsSigning(false);
    }
  }, [
    clearOrders,
    closeWorkspace,
    currentProvider?.uuid,
    mutate,
    mutateOrders,
    mutateVisitContext,
    orderEncounterType,
    orders,
    patientUuid,
    sessionLocation?.uuid,
    t,
    visitContext,
  ]);

  const handleCancel = useCallback(async () => {
    const didClose = await closeWorkspace();
    if (didClose) {
      clearOrders();
    }
  }, [clearOrders, closeWorkspace]);

  if (!patient?.id || !patientUuid) {
    return (
      <Workspace2 title={t('orderLabTest', 'Order lab test')}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('errorLoadingPatient', 'Error loading patient')}
          subtitle={t('tryPlacingTheOrderAgain', 'Please try placing the order again.')}
        />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={t('orderLabTest', 'Order lab test')} hasUnsavedChanges={orders.length > 0}>
      <ExtensionSlot name="order-basket-slot" select={selectLabOrderPanel} state={labOrderPanelProps} />
      {signError && (
        <InlineNotification
          kind="error"
          lowContrast
          title={t('errorPlacingOrder', 'Could not place the order')}
          subtitle={signError}
          onCloseButtonClick={() => setSignError('')}
        />
      )}
      <ButtonSet>
        <Button kind="secondary" onClick={handleCancel} disabled={isSigning}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button onClick={handleSign} disabled={!canSign || isSigning}>
          {isSigning ? (
            <InlineLoading description={t('signing', 'Signing') + '...'} />
          ) : (
            t('signAndClose', 'Sign and close')
          )}
        </Button>
      </ButtonSet>
    </Workspace2>
  );
}
