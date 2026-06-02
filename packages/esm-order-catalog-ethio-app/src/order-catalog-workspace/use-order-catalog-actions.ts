import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import { type TestOrderBasketItem, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import {
  buildCatalogBasketPayload,
  collectSelectedOrdersAcrossTabs,
  createPrepImagingOrderPostData,
  createPrepProceduresOrderPostData,
  imagingBasketGrouping,
  mergeCatalogIntoBasket,
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
  onClose?: () => void;
}

export function useOrderCatalogActions({
  patient,
  visit,
  tabs,
  selectedUuids,
  orderDetails,
  onClose,
}: UseOrderCatalogActionsOptions) {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const session = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrorsByUuid, setValidationErrorsByUuid] = useState<
    Record<string, Array<OrderDetailValidationError>>
  >({});

  const labGrouping = config.labOrderTypeUuid;
  const prepImagingOrderPostData = useMemo(
    () => createPrepImagingOrderPostData(config.radiologyOrderTypeUuid, config.careSettingUuid),
    [config.careSettingUuid, config.radiologyOrderTypeUuid],
  );
  const prepProceduresOrderPostData = useMemo(
    () => createPrepProceduresOrderPostData(config.procedureOrderTypeUuid, config.careSettingUuid),
    [config.careSettingUuid, config.procedureOrderTypeUuid],
  );

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

  const syncSelectionToBasket = useCallback((): boolean => {
    if (!tabs?.length || selectedCount === 0) {
      return false;
    }

    if (!ensureValidSelections()) {
      return false;
    }

    const ordererUuid = session?.currentProvider?.uuid;
    if (!ordererUuid) {
      showSnackbar({
        title: t('addToBasketErrorTitle', 'Cannot add orders'),
        subtitle: t('addToBasketMissingProvider', 'No ordering provider is available for this session.'),
        kind: 'error',
      });
      return false;
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

    return true;
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

  const saveAndClose = useCallback(async () => {
    setIsSaving(true);
    try {
      const ok = syncSelectionToBasket();
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

      onClose?.();
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [onClose, selectedCount, syncSelectionToBasket, t]);

  return {
    saveAndClose,
    selectedCount,
    canActOnSelection,
    isSaving,
    isBusy: isSaving,
    validationErrorsByUuid,
    clearValidationErrors: () => setValidationErrorsByUuid({}),
  };
}
