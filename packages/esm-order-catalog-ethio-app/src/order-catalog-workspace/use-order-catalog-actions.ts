import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import {
  invalidateVisitAndEncounterData,
  type OrderBasketItem,
  type TestOrderBasketItem,
  postOrdersOnNewEncounter,
  showOrderSuccessToast,
  useMutatePatientOrders,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import {
  buildCatalogBasketPayload,
  collectSelectedOrdersAcrossTabs,
  imagingBasketGrouping,
  mergeCatalogIntoBasket,
  prepImagingOrderPostData,
  prepProceduresOrderPostData,
  prepTestOrderPostData,
  proceduresBasketGrouping,
} from '../api/order-catalog-basket';
import { type OrderDetailValidationError, validateCatalogSelections } from '../api/order-catalog-validation';
import { type ConfigObject } from '../config-schema';
import { type CatalogTab, type OrderDetail } from '../types/order-catalog.types';
import { type ImagingOrderBasketItem, type ProcedureOrderBasketItem } from '../types/order-basket.types';

export interface UseOrderCatalogActionsOptions {
  patient: fhir.Patient;
  visit: Visit;
  tabs: Array<CatalogTab> | undefined;
  selectedUuids: Set<string>;
  orderDetails: Record<string, OrderDetail>;
  mutateVisitContext?: () => void;
  onClose?: () => void;
}

function getEarliestScheduledDate(orders: Array<OrderBasketItem>): Date | undefined {
  const timestamps = orders
    .map((order) => order.scheduledDate)
    .filter((date): date is Date => date instanceof Date)
    .map((date) => date.getTime());

  if (!timestamps.length) {
    return undefined;
  }

  return new Date(Math.min(...timestamps));
}

export function useOrderCatalogActions({
  patient,
  visit,
  tabs,
  selectedUuids,
  orderDetails,
  mutateVisitContext,
  onClose,
}: UseOrderCatalogActionsOptions) {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const session = useSession();
  const { mutate: globalMutate } = useSWRConfig();
  const { mutate: mutatePatientOrders } = useMutatePatientOrders(patient.id);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrorsByUuid, setValidationErrorsByUuid] = useState<
    Record<string, Array<OrderDetailValidationError>>
  >({});

  const labGrouping = config.labOrderTypeUuid;

  const { orders: labOrders, setOrders: setLabOrders } = useOrderBasket<TestOrderBasketItem>(
    patient,
    labGrouping,
    prepTestOrderPostData,
  );
  const { orders: imagingOrders, setOrders: setImagingOrders } = useOrderBasket<ImagingOrderBasketItem>(
    patient,
    imagingBasketGrouping,
    prepImagingOrderPostData,
  );
  const { orders: procedureOrders, setOrders: setProcedureOrders } = useOrderBasket<ProcedureOrderBasketItem>(
    patient,
    proceduresBasketGrouping,
    prepProceduresOrderPostData,
  );
  const { clearOrders } = useOrderBasket(patient);

  const selectedCount = tabs ? collectSelectedOrdersAcrossTabs(tabs, selectedUuids).length : 0;
  const canActOnSelection = selectedCount > 0;

  const ensureValidSelections = useCallback((): boolean => {
    if (!tabs?.length || selectedCount === 0) {
      return false;
    }

    const lines = collectSelectedOrdersAcrossTabs(tabs, selectedUuids);
    const { valid, errorsByUuid } = validateCatalogSelections(lines, orderDetails);

    if (!valid) {
      setValidationErrorsByUuid(errorsByUuid);
      showSnackbar({
        title: t('validationErrorTitle', 'Missing required fields'),
        subtitle: t('validationErrorSubtitle', 'Expand each selected order and complete the required fields.'),
        kind: 'error',
      });
      return false;
    }

    setValidationErrorsByUuid({});
    return true;
  }, [orderDetails, selectedCount, selectedUuids, t, tabs]);

  const syncSelectionToBasket = useCallback((): {
    ok: boolean;
    basketOrders?: Array<OrderBasketItem>;
  } => {
    if (!tabs?.length || selectedCount === 0) {
      return { ok: false };
    }

    if (!ensureValidSelections()) {
      return { ok: false };
    }

    const ordererUuid = session?.currentProvider?.uuid;
    if (!ordererUuid) {
      showSnackbar({
        title: t('addToBasketErrorTitle', 'Cannot add orders'),
        subtitle: t('addToBasketMissingProvider', 'No ordering provider is available for this session.'),
        kind: 'error',
      });
      return { ok: false };
    }

    const payload = buildCatalogBasketPayload(tabs, selectedUuids, orderDetails, visit, ordererUuid);

    const nextLab = payload.lab.length ? mergeCatalogIntoBasket(labOrders, payload.lab) : labOrders;
    const nextImaging = payload.imaging.length ? mergeCatalogIntoBasket(imagingOrders, payload.imaging) : imagingOrders;
    const nextProcedures = payload.procedures.length
      ? mergeCatalogIntoBasket(procedureOrders, payload.procedures)
      : procedureOrders;

    if (payload.lab.length) {
      setLabOrders(nextLab);
    }
    if (payload.imaging.length) {
      setImagingOrders(nextImaging);
    }
    if (payload.procedures.length) {
      setProcedureOrders(nextProcedures);
    }

    return {
      ok: true,
      basketOrders: [...nextLab, ...nextImaging, ...nextProcedures],
    };
  }, [
    imagingOrders,
    labOrders,
    orderDetails,
    procedureOrders,
    selectedCount,
    selectedUuids,
    session?.currentProvider?.uuid,
    setImagingOrders,
    setLabOrders,
    setProcedureOrders,
    t,
    tabs,
    visit,
    ensureValidSelections,
  ]);

  const saveToBasket = useCallback(async () => {
    setSubmitError(null);
    setIsSaving(true);
    try {
      const { ok } = syncSelectionToBasket();
      if (!ok) {
        return false;
      }

      showSnackbar({
        title: t('saveToBasketSuccessTitle', 'Orders saved'),
        subtitle: t('saveToBasketSuccessSubtitle', '{{count}} order(s) saved to the basket.', {
          count: selectedCount,
        }),
        kind: 'success',
      });
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [selectedCount, syncSelectionToBasket, t]);

  const signAndClose = useCallback(async () => {
    setSubmitError(null);
    setIsSigning(true);

    const abortController = new AbortController();

    try {
      const { ok, basketOrders } = syncSelectionToBasket();
      if (!ok || !basketOrders?.length) {
        return false;
      }

      const ordererUuid = session?.currentProvider?.uuid;
      const locationUuid = session?.sessionLocation?.uuid;

      if (!ordererUuid || !locationUuid) {
        showSnackbar({
          title: t('signAndCloseErrorTitle', 'Cannot sign orders'),
          subtitle: t('signAndCloseMissingSession', 'Provider or session location is missing.'),
          kind: 'error',
        });
        return false;
      }

      const encounterDate = getEarliestScheduledDate(basketOrders);

      const postedEncounter = await postOrdersOnNewEncounter(
        patient.id,
        config.orderEncounterType,
        visit,
        locationUuid,
        ordererUuid,
        abortController,
        encounterDate,
      );

      clearOrders();
      mutateVisitContext?.();
      invalidateVisitAndEncounterData(globalMutate, patient.id);
      await mutatePatientOrders();

      showOrderSuccessToast('@openmrs/esm-patient-orders-app', basketOrders);

      onClose?.();
      return Boolean(postedEncounter);
    } catch (error: unknown) {
      const message =
        (error as { responseBody?: { error?: { message?: string } } })?.responseBody?.error?.message ??
        (error instanceof Error ? error.message : t('signAndCloseGenericError', 'Failed to sign orders.'));
      setSubmitError(message);
      showSnackbar({
        title: t('signAndCloseErrorTitle', 'Cannot sign orders'),
        subtitle: message,
        kind: 'error',
      });
      return false;
    } finally {
      setIsSigning(false);
    }
  }, [
    clearOrders,
    config.orderEncounterType,
    globalMutate,
    mutatePatientOrders,
    mutateVisitContext,
    onClose,
    patient.id,
    session?.currentProvider?.uuid,
    session?.sessionLocation?.uuid,
    syncSelectionToBasket,
    t,
    visit,
  ]);

  return {
    saveToBasket,
    signAndClose,
    selectedCount,
    canActOnSelection,
    isSaving,
    isSigning,
    isBusy: isSaving || isSigning,
    submitError,
    validationErrorsByUuid,
    clearValidationErrors: () => setValidationErrorsByUuid({}),
  };
}
