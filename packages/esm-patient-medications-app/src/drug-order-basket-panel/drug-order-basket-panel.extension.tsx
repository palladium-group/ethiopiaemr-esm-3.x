import React, { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Button, Select, SelectItem, Tile } from '@carbon/react';
import { AddIcon, ChevronDownIcon, ChevronUpIcon, useConfig, useLayoutType } from '@openmrs/esm-framework';
import {
  type OrderBasketExtensionProps,
  useOrderBasket,
  type DrugOrderBasketItem,
} from '@openmrs/esm-patient-common-lib';
import type { ConfigObject } from '../config-schema';
import { prepMedicationOrderPostData } from '../api/api';
import OrderBasketItemTile from './order-basket-item-tile.component';
import RxIcon from './rx-icon.component';
import styles from './drug-order-basket-panel.scss';

type DtpResponse = 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED';

function canEditReturnedPrescriptionOrders(dtpResponse?: DtpResponse) {
  return dtpResponse === 'ACCEPTED' || dtpResponse === 'PARTIALLY_ACCEPTED';
}

type ReturnedPrescriptionBasketItem = DrugOrderBasketItem & {
  isReturnedPrescription?: boolean;
  dtpResponse?: DtpResponse;
  dtpResponseConceptUuid?: string;
};

/**
 * The extension is slotted into order-basket-slot in the main Order Basket workspace by default.
 * It renders the "Add +" button for drug orders, and lists pending drug orders in the order basket.
 *
 * Designs: https://app.zeplin.io/project/60d59321e8100b0324762e05/screen/62c6bb9500e7671a618efa56
 */
function DrugOrderBasketPanelExtension({ patient, launchDrugOrderForm }: OrderBasketExtensionProps) {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const isTablet = useLayoutType() === 'tablet';

  const responsiveSize = isTablet ? 'md' : 'sm';
  const dtpResponseOptions = useMemo(
    () => [
      {
        label: t('dtpResponseAccepted', 'Accepted'),
        response: 'ACCEPTED' as DtpResponse,
        conceptUuid: config.dtpResponse?.acceptedConceptUuid,
      },
      {
        label: t('dtpResponseRejected', 'Rejected'),
        response: 'REJECTED' as DtpResponse,
        conceptUuid: config.dtpResponse?.rejectedConceptUuid,
      },
      {
        label: t('dtpResponsePartiallyAccepted', 'Partially accepted'),
        response: 'PARTIALLY_ACCEPTED' as DtpResponse,
        conceptUuid: config.dtpResponse?.partiallyAcceptedConceptUuid,
      },
    ],
    [
      config.dtpResponse?.acceptedConceptUuid,
      config.dtpResponse?.partiallyAcceptedConceptUuid,
      config.dtpResponse?.rejectedConceptUuid,
      t,
    ],
  );
  const { orders, setOrders } = useOrderBasket<DrugOrderBasketItem>(
    patient,
    'medications',
    prepMedicationOrderPostData,
  );
  const returnedPrescriptionOrders = useMemo(
    () => orders.filter((order) => (order as ReturnedPrescriptionBasketItem).isReturnedPrescription),
    [orders],
  );
  const isReturnedPrescriptionBasket = returnedPrescriptionOrders.length > 0;
  const selectedDtpResponseType = (returnedPrescriptionOrders[0] as ReturnedPrescriptionBasketItem)?.dtpResponse;
  const canEditReturnedOrders = canEditReturnedPrescriptionOrders(selectedDtpResponseType);
  const selectedDtpResponse =
    (returnedPrescriptionOrders[0] as ReturnedPrescriptionBasketItem)?.dtpResponseConceptUuid ??
    (returnedPrescriptionOrders[0] as ReturnedPrescriptionBasketItem)?.dtpResponse ??
    '';
  const isDtpResponseMissing = isReturnedPrescriptionBasket && !selectedDtpResponse;
  const dtpResponseHelperText = useMemo(() => {
    if (!isReturnedPrescriptionBasket) {
      return null;
    }
    if (!selectedDtpResponseType) {
      return t(
        'dtpResponseHelperSelectFirst',
        'Select a DTP response above to continue. Orders cannot be changed until then.',
      );
    }
    if (selectedDtpResponseType === 'REJECTED') {
      return t(
        'dtpResponseHelperRejected',
        'Prescription will be resubmitted without changes. Orders cannot be edited or removed.',
      );
    }
    return t('dtpResponseHelperCanEdit', 'You can now update or remove orders before signing and closing.');
  }, [isReturnedPrescriptionBasket, selectedDtpResponseType, t]);
  const isReturnedOrderReadOnly = useCallback(
    (order: DrugOrderBasketItem) =>
      isReturnedPrescriptionBasket &&
      Boolean((order as ReturnedPrescriptionBasketItem).isReturnedPrescription) &&
      !canEditReturnedOrders,
    [canEditReturnedOrders, isReturnedPrescriptionBasket],
  );
  const [isExpanded, setIsExpanded] = useState(orders.length > 0);
  const {
    incompleteOrderBasketItems,
    newOrderBasketItems,
    renewedOrderBasketItems,
    revisedOrderBasketItems,
    discontinuedOrderBasketItems,
  } = useMemo(() => {
    const incompleteOrderBasketItems: Array<DrugOrderBasketItem> = [];
    const newOrderBasketItems: Array<DrugOrderBasketItem> = [];
    const renewedOrderBasketItems: Array<DrugOrderBasketItem> = [];
    const revisedOrderBasketItems: Array<DrugOrderBasketItem> = [];
    const discontinuedOrderBasketItems: Array<DrugOrderBasketItem> = [];

    orders.forEach((order) => {
      if (order?.isOrderIncomplete) {
        incompleteOrderBasketItems.push(order);
      } else if (order.action === 'NEW') {
        newOrderBasketItems.push(order);
      } else if (order.action === 'RENEW') {
        renewedOrderBasketItems.push(order);
      } else if (order.action === 'REVISE') {
        revisedOrderBasketItems.push(order);
      } else if (order.action === 'DISCONTINUE') {
        discontinuedOrderBasketItems.push(order);
      }
    });

    return {
      incompleteOrderBasketItems,
      newOrderBasketItems,
      renewedOrderBasketItems,
      revisedOrderBasketItems,
      discontinuedOrderBasketItems,
    };
  }, [orders]);

  const removeMedication = useCallback(
    (order: DrugOrderBasketItem) => {
      const newOrders = [...orders];
      newOrders.splice(orders.indexOf(order), 1);
      setOrders(newOrders);
    },
    [orders, setOrders],
  );

  useEffect(() => {
    setIsExpanded(orders.length > 0);
  }, [orders]);

  useEffect(() => {
    if (config.orderTypeUuid !== config.drugOrderTypeUUID) {
      console.warn('orderTypeUuid does not match drugOrderTypeUUID — order basket filtering may not work as expected');
    }
  }, [config.orderTypeUuid, config.drugOrderTypeUUID]);

  useEffect(() => {
    if (!isReturnedPrescriptionBasket) {
      return;
    }

    const nextOrders = orders.map((order) => {
      const returnedOrder = order as ReturnedPrescriptionBasketItem;
      if (!returnedOrder.isReturnedPrescription || order.isOrderIncomplete === isDtpResponseMissing) {
        return order;
      }
      return {
        ...order,
        isOrderIncomplete: isDtpResponseMissing,
      };
    });

    if (nextOrders.some((order, index) => order !== orders[index])) {
      setOrders(nextOrders);
    }
  }, [isDtpResponseMissing, isReturnedPrescriptionBasket, orders, setOrders]);

  const handleDtpResponseChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = event.target.value;
      const selectedOption = dtpResponseOptions.find(
        (option) => selectedValue === (option.conceptUuid || option.response),
      );
      setOrders(
        orders.map((order) =>
          (order as ReturnedPrescriptionBasketItem).isReturnedPrescription
            ? {
                ...order,
                dtpResponse: selectedOption?.response,
                dtpResponseConceptUuid: selectedOption?.conceptUuid,
                isOrderIncomplete: !selectedOption,
              }
            : order,
        ),
      );
    },
    [dtpResponseOptions, orders, setOrders],
  );

  return (
    <Tile
      className={classNames(isTablet ? styles.tabletTile : styles.desktopTile, {
        [styles.collapsedTile]: !isExpanded,
      })}>
      {isReturnedPrescriptionBasket && (
        <div className={styles.dtpResponseContainer}>
          <Select
            id="dtp-response"
            invalid={isDtpResponseMissing}
            invalidText={t('dtpResponseRequired', 'DTP response is required')}
            labelText={t('dtpResponse', 'DTP response')}
            onChange={handleDtpResponseChange}
            size={responsiveSize}
            value={selectedDtpResponse}>
            <SelectItem text={t('selectDtpResponse', 'Select DTP response')} value="" />
            {dtpResponseOptions.map((option) => (
              <SelectItem key={option.response} text={option.label} value={option.conceptUuid || option.response} />
            ))}
          </Select>
          {dtpResponseHelperText && <p className={styles.dtpResponseHelperText}>{dtpResponseHelperText}</p>}
        </div>
      )}
      <div className={classNames(isTablet ? styles.tabletContainer : styles.desktopContainer)}>
        <div className={styles.iconAndLabel}>
          <RxIcon isTablet={isTablet} />
          <h4 className={styles.heading}>{`${t('drugOrders', 'Drug orders')} (${orders.length})`}</h4>
        </div>
        <div className={styles.buttonContainer}>
          <Button
            aria-label={t('addMedication', 'Add medication')}
            className={styles.addButton}
            disabled={isReturnedPrescriptionBasket && !canEditReturnedOrders}
            kind="ghost"
            renderIcon={(props: ComponentProps<typeof AddIcon>) => <AddIcon size={16} {...props} />}
            onClick={() => launchDrugOrderForm()}
            size={responsiveSize}>
            {t('add', 'Add')}
          </Button>
          <Button
            className={styles.chevron}
            hasIconOnly
            kind="ghost"
            renderIcon={(props: ComponentProps<typeof ChevronUpIcon>) =>
              isExpanded ? <ChevronUpIcon size={16} {...props} /> : <ChevronDownIcon size={16} {...props} />
            }
            iconDescription="View"
            disabled={orders.length === 0}
            onClick={() => setIsExpanded(!isExpanded)}
            size={responsiveSize}>
            {t('add', 'Add')}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <>
          {incompleteOrderBasketItems.length > 0 && (
            <>
              {incompleteOrderBasketItems.map((order, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={order}
                  readOnly={isReturnedOrderReadOnly(order)}
                  onItemClick={() => launchDrugOrderForm(order)}
                  onRemoveClick={() => removeMedication(order)}
                />
              ))}
            </>
          )}
          {newOrderBasketItems.length > 0 && (
            <>
              {newOrderBasketItems.map((order, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={order}
                  readOnly={isReturnedOrderReadOnly(order)}
                  onItemClick={() => launchDrugOrderForm(order)}
                  onRemoveClick={() => removeMedication(order)}
                />
              ))}
            </>
          )}

          {renewedOrderBasketItems.length > 0 && (
            <>
              {renewedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  readOnly={isReturnedOrderReadOnly(item)}
                  onItemClick={() => launchDrugOrderForm(item)}
                  onRemoveClick={() => removeMedication(item)}
                />
              ))}
            </>
          )}

          {revisedOrderBasketItems.length > 0 && (
            <>
              {revisedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  readOnly={isReturnedOrderReadOnly(item)}
                  onItemClick={() => launchDrugOrderForm(item)}
                  onRemoveClick={() => removeMedication(item)}
                />
              ))}
            </>
          )}

          {discontinuedOrderBasketItems.length > 0 && (
            <>
              {discontinuedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  readOnly={isReturnedOrderReadOnly(item)}
                  onItemClick={() => launchDrugOrderForm(item)}
                  onRemoveClick={() => removeMedication(item)}
                />
              ))}
            </>
          )}
        </>
      )}
    </Tile>
  );
}

export default DrugOrderBasketPanelExtension;
