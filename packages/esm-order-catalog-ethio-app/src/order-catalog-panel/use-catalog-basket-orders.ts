import { useMemo } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { type OrderBasketItem, type TestOrderBasketItem, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import {
  createPrepImagingOrderPostData,
  createPrepProceduresOrderPostData,
  imagingBasketGrouping,
  prepTestOrderPostData,
  proceduresBasketGrouping,
} from '../api/order-catalog-basket';
import { type ConfigObject } from '../config-schema';
import { type ImagingOrderBasketItem, type ProcedureOrderBasketItem } from '../types/order-basket.types';

export interface CatalogBasketOrderEntry {
  order: OrderBasketItem;
  remove: () => void;
}

export function useCatalogBasketOrders(patient: fhir.Patient) {
  const config = useConfig<ConfigObject>();
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

  const entries = useMemo((): Array<CatalogBasketOrderEntry> => {
    const result: Array<CatalogBasketOrderEntry> = [];

    labOrders.forEach((order) => {
      result.push({
        order,
        remove: () => {
          const next = [...labOrders];
          next.splice(labOrders.indexOf(order), 1);
          setLabOrders(next);
        },
      });
    });
    imagingOrders.forEach((order) => {
      result.push({
        order,
        remove: () => {
          const next = [...imagingOrders];
          next.splice(imagingOrders.indexOf(order), 1);
          setImagingOrders(next);
        },
      });
    });
    procedureOrders.forEach((order) => {
      result.push({
        order,
        remove: () => {
          const next = [...procedureOrders];
          next.splice(procedureOrders.indexOf(order), 1);
          setProcedureOrders(next);
        },
      });
    });

    return result;
  }, [imagingOrders, labOrders, procedureOrders, setImagingOrders, setLabOrders, setProcedureOrders]);

  const orders = useMemo(() => entries.map((entry) => entry.order), [entries]);

  return { orders, entries };
}
