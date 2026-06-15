import React, { type ComponentProps, useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSkeleton, SkeletonText, Tag, Tile } from '@carbon/react';
import { ArrowRight, ShoppingCartArrowUp } from '@carbon/react/icons';
import { type DrugOrderBasketItem, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import {
  ArrowRightIcon,
  ExtensionSlot,
  ShoppingCartArrowDownIcon,
  useConfig,
  useLayoutType,
  UserHasAccess,
  type Visit,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { prepMedicationOrderPostData, useActivePatientOrders } from '../../api/api';
import { ordersEqual } from './helpers';
import {
  type DrugSearchResult,
  getTemplateOrderBasketItem,
  useDrugSearch,
  useDrugTemplate,
} from './drug-search.resource';
import OrderSetReview from './order-set-review.component';
import { type OrderSetSearchResult, useOrderSetSearch } from './order-set.resource';
import styles from './order-basket-search-results.scss';

export interface OrderBasketSearchResultsProps {
  patient: fhir.Patient;
  searchTerm: string;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  openOrderForm: (searchResult: DrugOrderBasketItem) => void;
  focusAndClearSearchInput: () => void;
  visit: Visit;
}

interface DrugSearchResultItemProps {
  patient: fhir.Patient;
  drug: DrugSearchResult;
  openOrderForm: (searchResult: DrugOrderBasketItem) => void;
  visit: Visit;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
}

interface OrderSetSearchResultItemProps {
  orderSet: OrderSetSearchResult;
  onReview: (orderSet: OrderSetSearchResult) => void;
}

export default function OrderBasketSearchResults({
  searchTerm,
  openOrderForm,
  focusAndClearSearchInput,
  patient,
  visit,
  closeWorkspace,
}: OrderBasketSearchResultsProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { enableOrderSets } = useConfig<ConfigObject>();
  const [selectedOrderSet, setSelectedOrderSet] = useState<OrderSetSearchResult | null>(null);
  const { drugs, isLoading: isLoadingDrugs, error: drugSearchError } = useDrugSearch(searchTerm);
  const {
    orderSets,
    isLoading: isLoadingOrderSets,
    error: orderSetSearchError,
  } = useOrderSetSearch(searchTerm, enableOrderSets);

  if (!searchTerm) {
    return <div className={styles.container}></div>;
  }

  if (selectedOrderSet) {
    return (
      <OrderSetReview
        orderSetSummary={selectedOrderSet}
        patient={patient}
        visit={visit}
        closeWorkspace={closeWorkspace}
        onBack={() => setSelectedOrderSet(null)}
      />
    );
  }

  const isLoading = isLoadingDrugs || (enableOrderSets && isLoadingOrderSets);
  const error = drugSearchError ?? (enableOrderSets ? orderSetSearchError : undefined);
  const totalResults = (drugs?.length ?? 0) + (enableOrderSets ? orderSets.length : 0);

  if (isLoading) {
    return <DrugSearchSkeleton />;
  }

  if (error) {
    return (
      <Tile className={styles.emptyState}>
        <div>
          <h4 className={styles.productiveHeading01}>
            {t('errorFetchingDrugResults', 'Error fetching results for "{{searchTerm}}"', {
              searchTerm,
            })}
          </h4>
          <p className={styles.bodyShort01}>
            <span>{t('trySearchingAgain', 'Please try searching again')}</span>
          </p>
        </div>
      </Tile>
    );
  }

  if (totalResults === 0) {
    return (
      <Tile className={styles.emptyState}>
        <div>
          <h4 className={styles.productiveHeading01}>
            {t('noResultsForDrugSearch', 'No results to display for "{{searchTerm}}"', {
              searchTerm,
            })}
          </h4>
          <p className={styles.bodyShort01}>
            <span>{t('tryTo', 'Try to')}</span>{' '}
            <span className={styles.link} role="link" tabIndex={0} onClick={focusAndClearSearchInput}>
              {t('searchAgain', 'search again')}
            </span>{' '}
            <span>{t('usingADifferentTerm', 'using a different term')}</span>
          </p>
        </div>
      </Tile>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.orderBasketSearchResultsHeader}>
        <span className={styles.searchResultsCount}>
          {t('searchResultsMatchesForTerm', '{{count}} results for "{{searchTerm}}"', {
            count: totalResults,
            searchTerm,
          })}
        </span>
        <Button kind="ghost" onClick={focusAndClearSearchInput} size={isTablet ? 'md' : 'sm'}>
          {t('clearSearchResults', 'Clear Results')}
        </Button>
      </div>
      <div className={styles.resultsContainer}>
        {enableOrderSets && orderSets.length > 0 ? (
          <div className={styles.resultSection}>
            <span className={styles.sectionLabel}>{t('orderSets', 'Order sets')}</span>
            {orderSets.map((orderSet) => (
              <OrderSetSearchResultItem key={orderSet.uuid} orderSet={orderSet} onReview={setSelectedOrderSet} />
            ))}
          </div>
        ) : null}
        {drugs?.length ? (
          <div className={styles.resultSection}>
            {enableOrderSets && orderSets.length > 0 ? (
              <span className={styles.sectionLabel}>{t('drugs', 'Drugs')}</span>
            ) : null}
            {drugs.map((drug) => (
              <DrugSearchResultItem
                key={drug.uuid}
                patient={patient}
                drug={drug}
                openOrderForm={openOrderForm}
                visit={visit}
                closeWorkspace={closeWorkspace}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const OrderSetSearchResultItem: React.FC<OrderSetSearchResultItemProps> = ({ orderSet, onReview }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const memberCount = orderSet.orderSetMembers?.filter((member) => !member.retired).length ?? 0;

  return (
    <Tile
      role="listitem"
      className={classNames(styles.searchResultTile, {
        [styles.tabletSearchResultTile]: isTablet,
      })}>
      <div className={classNames(styles.searchResultTileContent, styles.text02)}>
        <div className={styles.drugNameRow}>
          <p className={styles.drugNameText}>
            <Tag type="blue" size="sm">
              {t('orderSet', 'Order set')}
            </Tag>
            <span className={styles.productiveHeading01}>{orderSet.name}</span>
          </p>
        </div>
        {orderSet.description ? <p className={styles.orderSetDescription}>{orderSet.description}</p> : null}
        <p className={styles.label01}>
          {t('orderSetMemberCount', '{{count}} drugs', { count: memberCount })}
          {orderSet.operator ? <> &mdash; {orderSet.operator}</> : null}
        </p>
      </div>
      <div className={styles.searchResultActions}>
        <Button
          kind="ghost"
          renderIcon={(props: ComponentProps<typeof ArrowRight>) => <ArrowRight size={16} {...props} />}
          onClick={() => onReview(orderSet)}>
          {t('reviewOrderSet', 'Review')}
        </Button>
      </div>
    </Tile>
  );
};

export const DrugSearchResultItem: React.FC<DrugSearchResultItemProps> = ({
  patient,
  drug,
  openOrderForm,
  visit,
  closeWorkspace,
}) => {
  const isTablet = useLayoutType() === 'tablet';
  const { orders, setOrders } = useOrderBasket<DrugOrderBasketItem>(
    patient,
    'medications',
    prepMedicationOrderPostData,
  );
  const patientUuid = patient.id;
  const { data: activeOrders, isLoading: isLoadingActiveOrders } = useActivePatientOrders(patientUuid);
  const drugAlreadyInBasket = useMemo(
    () => orders?.some((order) => ordersEqual(order, getTemplateOrderBasketItem(drug, visit))),
    [orders, drug, visit],
  );
  const drugAlreadyPrescribed = useMemo(
    () => activeOrders?.some((order) => order?.drug?.uuid === drug?.uuid),
    [activeOrders, drug?.uuid],
  );

  const { templates, error: fetchingDrugOrderTemplatesError } = useDrugTemplate(drug?.uuid);
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const drugItemTemplateOptions: Array<DrugOrderBasketItem> = useMemo(
    () =>
      templates?.length
        ? templates.map((template) => getTemplateOrderBasketItem(drug, visit, config?.daysDurationUnit, template))
        : [getTemplateOrderBasketItem(drug, visit, config?.daysDurationUnit)],
    [templates, drug, config?.daysDurationUnit, visit],
  );

  const addToBasket = useCallback(
    (searchResult: DrugOrderBasketItem) => {
      searchResult.isOrderIncomplete = true;
      setOrders([...orders, searchResult]);
      closeWorkspace();
    },
    [orders, setOrders, closeWorkspace],
  );

  const removeFromBasket = useCallback(
    (searchResult: DrugOrderBasketItem) => {
      setOrders(orders.filter((order) => !ordersEqual(order, searchResult)));
    },
    [orders, setOrders],
  );

  return (
    <>
      {drugItemTemplateOptions.map((orderItem, indx) => (
        <Tile
          key={templates?.length ? templates[indx]?.uuid : drug?.uuid}
          role="listitem"
          className={classNames(styles.searchResultTile, {
            [styles.tabletSearchResultTile]: isTablet,
          })}>
          <div className={classNames(styles.searchResultTileContent, styles.text02)}>
            <div className={styles.drugNameRow}>
              <p className={styles.drugNameText}>
                <span className={styles.productiveHeading01}>{drug?.display}</span>{' '}
                {drug?.strength && <>&mdash; {drug?.strength.toLowerCase()}</>}{' '}
                {drug?.dosageForm?.display && <>&mdash; {drug?.dosageForm?.display.toLowerCase()}</>}
              </p>
              <ExtensionSlot name="drug-search-result-actions-slot" state={{ drug, orderItem }} />
            </div>
            <UserHasAccess privilege="Manage OrderTemplates">
              {fetchingDrugOrderTemplatesError ? (
                <p>
                  <span className={styles.errorLabel}>
                    {t('errorFetchingDrugOrderTemplates', 'Error fetching drug order templates')}
                  </span>
                </p>
              ) : (
                <p>
                  {orderItem?.frequency?.value && (
                    <span className={styles.label01}>{orderItem?.frequency?.value.toLowerCase()}</span>
                  )}
                  {orderItem?.route?.value && (
                    <span className={styles.label01}>&mdash; {orderItem?.route?.value.toLowerCase()}</span>
                  )}
                </p>
              )}
            </UserHasAccess>
          </div>
          {!isLoadingActiveOrders ? (
            drugAlreadyPrescribed ? (
              <div className={styles.drugAlreadyPrescribed}>{t('drugAlreadyPrescribed', 'Already prescribed')}</div>
            ) : (
              <div className={styles.searchResultActions}>
                {drugAlreadyInBasket ? (
                  <Button
                    kind="danger--ghost"
                    renderIcon={(props: ComponentProps<typeof ShoppingCartArrowUp>) => (
                      <ShoppingCartArrowUp size={16} {...props} />
                    )}
                    onClick={() => removeFromBasket(orderItem)}>
                    {t('removeFromBasket', 'Remove from basket')}
                  </Button>
                ) : (
                  <Button
                    kind="ghost"
                    renderIcon={(props: ComponentProps<typeof ShoppingCartArrowDownIcon>) => (
                      <ShoppingCartArrowDownIcon size={16} {...props} />
                    )}
                    onClick={() => addToBasket(orderItem)}
                    disabled={drugAlreadyPrescribed}>
                    {t('directlyAddToBasket', 'Add to basket')}
                  </Button>
                )}
                <Button
                  kind="ghost"
                  renderIcon={(props: ComponentProps<typeof ArrowRightIcon>) => <ArrowRightIcon size={16} {...props} />}
                  onClick={() => openOrderForm(orderItem)}
                  disabled={drugAlreadyPrescribed}>
                  {t('goToDrugOrderForm', 'Order form')}
                </Button>
              </div>
            )
          ) : null}
        </Tile>
      ))}
    </>
  );
};

const DrugSearchSkeleton = () => {
  const isTablet = useLayoutType() === 'tablet';
  const tileClassName = classNames({
    [styles.tabletSearchResultTile]: isTablet,
    [styles.desktopSearchResultTile]: !isTablet,
    [styles.skeletonTile]: true,
  });
  const buttonSize = isTablet ? 'md' : 'sm';

  return (
    <div className={styles.searchResultSkeletonWrapper}>
      <div className={styles.orderBasketSearchResultsHeader}>
        <SkeletonText className={styles.searchResultCntSkeleton} />
        <ButtonSkeleton size={buttonSize} />
      </div>
      {[...Array(4)].map((_, index) => (
        <Tile key={index} className={tileClassName}>
          <SkeletonText />
        </Tile>
      ))}
    </div>
  );
};
