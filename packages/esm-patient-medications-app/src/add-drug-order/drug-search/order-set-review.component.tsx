import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, RadioButton, SkeletonText, Tile } from '@carbon/react';
import { ArrowLeft, ShoppingCartArrowDown } from '@carbon/react/icons';
import { type DrugOrderBasketItem, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import { useConfig, useLayoutType, type Visit, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { prepMedicationOrderPostData } from '../../api/api';
import { type ConfigObject } from '../../config-schema';
import { ordersEqual } from './helpers';
import {
  buildBasketItemFromOrderSetMember,
  fetchOrderSetMemberDrugs,
  formatMemberDosingSummary,
  getActiveOrderSetMembers,
  getDefaultSelectedMemberUuids,
  getMemberDrugUuid,
  isMemberSelectionValid,
} from './order-set.helper';
import type { DrugSearchResult } from './drug-search.resource';
import { type OrderSetSearchResult, useOrderSet } from './order-set.resource';
import styles from './order-set-review.scss';

interface OrderSetReviewProps {
  orderSetSummary: OrderSetSearchResult;
  patient: fhir.Patient;
  visit: Visit;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  onBack: () => void;
}

const OrderSetReview: React.FC<OrderSetReviewProps> = ({ orderSetSummary, patient, visit, closeWorkspace, onBack }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const config = useConfig<ConfigObject>();
  const { orders, setOrders } = useOrderBasket<DrugOrderBasketItem>(
    patient,
    'medications',
    prepMedicationOrderPostData,
  );
  const { orderSet, isLoading, error } = useOrderSet(orderSetSummary.uuid);
  const [selectedMemberUuids, setSelectedMemberUuids] = useState<Array<string>>([]);
  const [isLoadingDrugs, setIsLoadingDrugs] = useState(false);
  const [drugLoadError, setDrugLoadError] = useState<string | null>(null);
  const [drugByUuid, setDrugByUuid] = useState<Map<string, DrugSearchResult>>(new Map());

  const activeMembers = useMemo(() => getActiveOrderSetMembers(orderSet?.orderSetMembers), [orderSet?.orderSetMembers]);
  const operator = orderSet?.operator ?? orderSetSummary.operator ?? 'ALL';

  useEffect(() => {
    if (!orderSet?.orderSetMembers?.length) {
      return;
    }

    setSelectedMemberUuids(getDefaultSelectedMemberUuids(orderSet.orderSetMembers, operator));
  }, [orderSet, operator]);

  useEffect(() => {
    if (!activeMembers.length) {
      setDrugByUuid(new Map());
      return;
    }

    let cancelled = false;
    setIsLoadingDrugs(true);
    setDrugLoadError(null);

    fetchOrderSetMemberDrugs(activeMembers)
      .then(({ drugByUuid: loadedDrugs, missingDrugUuids }) => {
        if (cancelled) {
          return;
        }

        setDrugByUuid(loadedDrugs);
        if (missingDrugUuids.length > 0) {
          setDrugLoadError(t('orderSetDrugLoadFailed', 'Some drugs in this order set could not be loaded.'));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDrugLoadError(t('orderSetDrugLoadFailed', 'Some drugs in this order set could not be loaded.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDrugs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembers, t]);

  const toggleMember = useCallback(
    (memberUuid: string, checked: boolean) => {
      if (operator === 'ALL') {
        return;
      }

      if (operator === 'ONE') {
        setSelectedMemberUuids(checked ? [memberUuid] : []);
        return;
      }

      setSelectedMemberUuids((current) =>
        checked ? [...current, memberUuid] : current.filter((uuid) => uuid !== memberUuid),
      );
    },
    [operator],
  );

  const addToBasket = useCallback(() => {
    const selectedMembers = activeMembers.filter((member) => selectedMemberUuids.includes(member.uuid));
    const newItems = selectedMembers
      .map((member) => {
        const drugUuid = getMemberDrugUuid(member);
        const drug = drugUuid ? drugByUuid.get(drugUuid) : undefined;
        if (!drug) {
          return null;
        }

        const basketItem = buildBasketItemFromOrderSetMember(drug, visit, member, config.daysDurationUnit);
        basketItem.isOrderIncomplete = true;
        return basketItem;
      })
      .filter((item): item is DrugOrderBasketItem => Boolean(item));

    const itemsToAdd = newItems.filter((item) => !orders.some((order) => ordersEqual(order, item)));
    if (itemsToAdd.length > 0) {
      setOrders([...orders, ...itemsToAdd]);
    }
    closeWorkspace();
  }, [
    activeMembers,
    closeWorkspace,
    config.daysDurationUnit,
    drugByUuid,
    orders,
    selectedMemberUuids,
    setOrders,
    visit,
  ]);

  const operatorHelp = useMemo(() => {
    if (operator === 'ALL') {
      return t('orderSetOperatorALLHelp', 'All drugs in this bundle will be added to the basket.');
    }
    if (operator === 'ONE') {
      return t('orderSetOperatorONEHelp', 'Select exactly one drug from this bundle.');
    }
    return t('orderSetOperatorANYHelp', 'Select one or more drugs from this bundle.');
  }, [operator, t]);

  if (isLoading || isLoadingDrugs) {
    return (
      <div className={styles.container}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (error || !orderSet) {
    return (
      <Tile className={styles.container}>
        <p className={styles.errorText}>{t('orderSetLoadFailed', 'Failed to load order set.')}</p>
        <Button kind="ghost" onClick={onBack}>
          {t('backToSearch', 'Back to search')}
        </Button>
      </Tile>
    );
  }

  const selectionValid = isMemberSelectionValid(selectedMemberUuids, operator);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button kind="ghost" size={isTablet ? 'md' : 'sm'} renderIcon={ArrowLeft} onClick={onBack}>
          {t('backToSearch', 'Back to search')}
        </Button>
      </div>

      <div className={styles.titleBlock}>
        <span className={styles.name}>{orderSet.name}</span>
        {orderSet.description ? <span className={styles.description}>{orderSet.description}</span> : null}
      </div>

      <p className={styles.operatorHelp}>{operatorHelp}</p>

      {drugLoadError ? <p className={styles.errorText}>{drugLoadError}</p> : null}

      <div className={styles.memberList}>
        {activeMembers.map((member) => {
          const drugUuid = getMemberDrugUuid(member);
          const drug = drugUuid ? drugByUuid.get(drugUuid) : undefined;
          const dosingSummary = formatMemberDosingSummary(member);
          const isSelected = selectedMemberUuids.includes(member.uuid);
          const selectionControl =
            operator === 'ONE' ? (
              <RadioButton
                id={`order-set-member-${member.uuid}`}
                name={`order-set-${orderSet.uuid}`}
                labelText=""
                hideLabel
                checked={isSelected}
                onChange={() => toggleMember(member.uuid, true)}
              />
            ) : (
              <Checkbox
                id={`order-set-member-${member.uuid}`}
                labelText=""
                hideLabel
                checked={isSelected}
                disabled={operator === 'ALL'}
                onChange={(_, { checked }) => toggleMember(member.uuid, checked)}
              />
            );

          return (
            <div key={member.uuid} className={styles.memberTile}>
              <div className={styles.memberHeader}>
                {selectionControl}
                <div className={styles.memberDetails}>
                  <div className={styles.memberName}>{drug?.display ?? member.display ?? t('unknown', 'Unknown')}</div>
                  {dosingSummary ? <div className={styles.memberDosing}>{dosingSummary}</div> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button kind="secondary" size={isTablet ? 'md' : 'sm'} onClick={onBack}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          kind="primary"
          size={isTablet ? 'md' : 'sm'}
          renderIcon={ShoppingCartArrowDown}
          disabled={!selectionValid || activeMembers.length === 0}
          onClick={addToBasket}>
          {t('addSelectedToBasket', 'Add selected to basket')}
        </Button>
      </div>
    </div>
  );
};

export default OrderSetReview;
