import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification } from '@carbon/react';
import {
  launchWorkspace2,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  useConfig,
  useSession,
  Workspace2,
} from '@openmrs/esm-framework';
import {
  type DrugOrderBasketItem,
  type OrderBasketWindowProps,
  type PatientWorkspace2DefinitionProps,
  type PatientWorkspaceGroupProps,
  showOrderSuccessToast,
  useMutatePatientOrders,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import { type AddDrugOrderWorkspaceProps } from '../add-drug-order/add-drug-order.workspace';
import { prepMedicationOrderPostData } from '../api/api';
import { type ConfigObject } from '../config-schema';
import { moduleName } from '../dashboard.meta';
import DrugOrderBasketPanelExtension from '../drug-order-basket-panel/drug-order-basket-panel.extension';
import { type ReturnedPrescriptionBasketItem, type ReturnedPrescriptionDtpState } from '../types';
import { buildReturnedPrescriptionOrderPayloads } from './returned-prescription-basket.utils';

export default function ReturnedPrescriptionBasketWorkspace({
  groupProps,
  windowProps,
  closeWorkspace,
}: PatientWorkspace2DefinitionProps<{}, OrderBasketWindowProps>) {
  const { t } = useTranslation();
  const { patient, patientUuid, visitContext, mutateVisitContext } = groupProps;
  const { dtpResponse, dtpRemark: dtpRemarkConfig } = useConfig<ConfigObject>();
  const { orderEncounterType } = useConfig<{ orderEncounterType: string }>({
    externalModuleName: '@openmrs/esm-patient-orders-app',
  });
  const { currentProvider, sessionLocation } = useSession();
  const { mutate: mutateOrders } = useMutatePatientOrders(patientUuid);
  const { orders, setOrders } = useOrderBasket<DrugOrderBasketItem>(
    patient,
    'medications',
    prepMedicationOrderPostData,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnedPrescriptionDtp, setReturnedPrescriptionDtp] = useState<ReturnedPrescriptionDtpState>({});
  const initialResendOrdersRef = useRef<DrugOrderBasketItem[] | null>(null);

  useEffect(() => {
    initialResendOrdersRef.current = null;
  }, [windowProps.encounterUuid]);

  useEffect(() => {
    if (orders.length > 0 && initialResendOrdersRef.current === null) {
      initialResendOrdersRef.current = orders.map((order) => ({ ...order }));
    }
  }, [orders]);
  const returnedPrescriptionOrders = useMemo(
    () => orders.filter((order) => (order as ReturnedPrescriptionBasketItem).isReturnedPrescription),
    [orders],
  );
  const selectedDtpResponseConceptUuid =
    returnedPrescriptionDtp.dtpResponseConceptUuid ??
    (returnedPrescriptionOrders[0] as ReturnedPrescriptionBasketItem)?.dtpResponseConceptUuid;
  const selectedDtpRemark =
    returnedPrescriptionDtp.dtpRemark?.trim() ??
    (returnedPrescriptionOrders[0] as ReturnedPrescriptionBasketItem)?.dtpRemark?.trim();
  const canSubmit = Boolean(
    windowProps.encounterUuid &&
      orders.length > 0 &&
      selectedDtpResponseConceptUuid &&
      selectedDtpRemark &&
      dtpResponse.questionConceptUuid &&
      dtpRemarkConfig.conceptUuid &&
      currentProvider?.uuid &&
      sessionLocation?.uuid,
  );

  const launchDrugOrderForm = useCallback(
    (order?: DrugOrderBasketItem) => {
      launchWorkspace2<AddDrugOrderWorkspaceProps, OrderBasketWindowProps, PatientWorkspaceGroupProps>(
        'add-drug-order',
        order ? { order } : {},
        windowProps,
        groupProps,
      );
    },
    [groupProps, windowProps],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    const encounterUuid = windowProps.encounterUuid;
    const ordererUuid = currentProvider?.uuid;
    const locationUuid = sessionLocation?.uuid;
    if (!encounterUuid || !ordererUuid || !locationUuid || !selectedDtpResponseConceptUuid || !selectedDtpRemark) {
      return;
    }

    setIsSubmitting(true);
    try {
      await openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          patient: patientUuid,
          location: locationUuid,
          encounterType: orderEncounterType,
          visit: visitContext?.uuid,
          obs: [
            {
              concept: dtpResponse.questionConceptUuid,
              value: selectedDtpResponseConceptUuid,
            },
            {
              concept: dtpRemarkConfig.conceptUuid,
              value: selectedDtpRemark,
            },
          ],
          orders: buildReturnedPrescriptionOrderPayloads(
            initialResendOrdersRef.current ?? [],
            orders,
            prepMedicationOrderPostData,
            patientUuid,
            encounterUuid,
            ordererUuid,
          ),
        },
      });

      setOrders([]);
      mutateOrders();
      mutateVisitContext?.();
      showOrderSuccessToast(moduleName, orders);
      await closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        isLowContrast: false,
        kind: 'error',
        title: t('errorSavingReturnedPrescription', 'Error saving returned prescription'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    closeWorkspace,
    currentProvider?.uuid,
    dtpRemarkConfig.conceptUuid,
    dtpResponse.questionConceptUuid,
    mutateOrders,
    mutateVisitContext,
    orderEncounterType,
    orders,
    patientUuid,
    selectedDtpRemark,
    selectedDtpResponseConceptUuid,
    sessionLocation?.uuid,
    setOrders,
    t,
    visitContext?.uuid,
    windowProps.encounterUuid,
  ]);

  const handleCancel = useCallback(async () => {
    setOrders([]);
    setReturnedPrescriptionDtp({});
    await closeWorkspace({ discardUnsavedChanges: true });
  }, [closeWorkspace, setOrders]);

  return (
    <Workspace2 title={t('returnedPrescription', 'Returned prescription')}>
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title={t('returnedPrescriptionReview', 'Review returned prescription')}
        subtitle={t(
          'returnedPrescriptionReviewIntro',
          'Select a DTP response, enter a remark, then update orders if needed before signing and closing.',
        )}
      />
      <DrugOrderBasketPanelExtension
        patient={patient}
        launchDrugOrderForm={launchDrugOrderForm}
        isReturnedPrescriptionWorkspace
        returnedPrescriptionDtp={returnedPrescriptionDtp}
        onReturnedPrescriptionDtpChange={setReturnedPrescriptionDtp}
      />
      <ButtonSet>
        <Button kind="secondary" onClick={handleCancel} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? (
            <InlineLoading description={t('submitting', 'Submitting')} />
          ) : (
            t('signAndClose', 'Sign and close')
          )}
        </Button>
      </ButtonSet>
    </Workspace2>
  );
}
