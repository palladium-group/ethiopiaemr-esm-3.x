import React, { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  DataTable,
  IconButton,
  InlineLoading,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tooltip,
} from '@carbon/react';
import capitalize from 'lodash-es/capitalize';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import {
  CardHeader,
  compare,
  invalidateVisitAndEncounterData,
  invalidateVisitByUuid,
  PatientChartPagination,
  type DrugOrderBasketItem,
  type Order,
  type OrderBasketWindowProps,
  type PatientWorkspaceGroupProps,
  useLaunchWorkspaceRequiringVisit,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import {
  AddIcon,
  age,
  fhirBaseUrl,
  formatDate,
  getPatientName,
  launchWorkspace2,
  openmrsFetch,
  PrinterIcon,
  type StyleguideConfigObject,
  useConfig,
  useLayoutType,
  usePagination,
  UserIcon,
} from '@openmrs/esm-framework';
import { buildMedicationOrder } from '../api';
import { type AddDrugOrderWorkspaceProps } from '../add-drug-order/add-drug-order.workspace';
import { type ConfigObject } from '../config-schema';
import PrintComponent from '../print/print.component';
import { type ReturnedPrescriptionBasketItem } from '../types';
import styles from './medications-details-table.scss';

export interface MedicationsDetailsTableProps {
  isValidating?: boolean;
  title?: string;
  medications?: Array<Order> | null;
  showAddButton?: boolean;
  showDiscontinueButton: boolean;
  showModifyButton: boolean;
  showRenewButton: boolean;
  showResendPrescriptionButton?: boolean;
  patient: fhir.Patient;
}

type DtpStatusReason = {
  text?: string;
  coding?: Array<{
    code?: string;
    display?: string;
  }>;
};

type OrderWithDtpStatusReason = Order & {
  statusReasonCodeableConcept?: DtpStatusReason;
};

type MedicationDispenseSearchResponse = {
  entry?: Array<{
    resource?: fhir.MedicationDispense & {
      statusReasonCodeableConcept?: DtpStatusReason;
    };
  }>;
};

function getFulfillerStatus(order: Order) {
  return (order as Order & { fulfillerStatus?: string | null }).fulfillerStatus?.toUpperCase() ?? null;
}

/**
 * A returned prescription is defined purely by fulfiller status: the pharmacy (through the Dagu
 * mediator) sets EXCEPTION on the drug order when it returns a prescription to the physician for
 * revision and resend. It is intentionally NOT derived from the status reason, which is a dynamic,
 * free-text/coded value used only for display.
 */
function isReturnedMedicationOrder(order: Order) {
  return getFulfillerStatus(order) === 'EXCEPTION';
}

/**
 * An encounter group is a returned prescription only when it contains at least one order and ALL of
 * its orders carry the EXCEPTION fulfiller status. The mediator updates every order of an encounter
 * when the whole prescription is returned, so a partially-EXCEPTION group is not treated as returned.
 */
function isReturnedEncounterGroup(encounterMedications: Array<Order>) {
  return encounterMedications.length > 0 && encounterMedications.every(isReturnedMedicationOrder);
}

/**
 * Orders for which a pharmacy status reason is needed for per-order display (terminal DECLINED outcomes).
 */
function orderNeedsStatusReason(order: Order) {
  return getFulfillerStatus(order) === 'DECLINED';
}

function getStatusReasonText(statusReason?: DtpStatusReason) {
  const firstCoding = statusReason?.coding?.find((coding) => coding.display || coding.code);
  return statusReason?.text ?? firstCoding?.display ?? firstCoding?.code;
}

function getStatusReasonFromOrder(order: Order) {
  return getStatusReasonText((order as OrderWithDtpStatusReason).statusReasonCodeableConcept);
}

function getOrderUuidFromPrescriptionReference(reference?: string) {
  if (!reference) {
    return undefined;
  }

  const medicationRequestMatch = reference.match(/MedicationRequest\/([0-9a-f-]+)/i);
  if (medicationRequestMatch) {
    return medicationRequestMatch[1];
  }

  if (/^[0-9a-f-]{36}$/i.test(reference)) {
    return reference;
  }

  return undefined;
}

function buildStatusReasonByOrderUuidFromDispenseBundle(data?: MedicationDispenseSearchResponse) {
  const statusReasonByOrderUuid = new Map<string, string>();

  data?.entry?.forEach(({ resource: dispense }) => {
    if (!dispense) {
      return;
    }

    const orderUuid = getOrderUuidFromPrescriptionReference(dispense.authorizingPrescription?.[0]?.reference);
    const statusReason = getStatusReasonText(dispense.statusReasonCodeableConcept);
    if (orderUuid && statusReason && !statusReasonByOrderUuid.has(orderUuid)) {
      statusReasonByOrderUuid.set(orderUuid, statusReason);
    }
  });

  return statusReasonByOrderUuid;
}

async function fetchMedicationDispenses(orderUuids: Array<string>) {
  const { data } = await openmrsFetch<MedicationDispenseSearchResponse>(
    `${fhirBaseUrl}/MedicationDispense?prescription=${orderUuids.join(',')}`,
  );
  return data;
}

type PharmacyStatusLabelKey =
  | 'dispensed'
  | 'cancelled'
  | 'stockedOut'
  | 'notDispensed'
  | 'received'
  | 'inProgress'
  | 'onHold';

type PharmacyStatusTagType = 'red' | 'green' | 'blue' | 'gray';

type PharmacyStatusDisplay = {
  label: string;
  type: PharmacyStatusTagType;
  labelKey: PharmacyStatusLabelKey;
};

/**
 * Normalizes FHIR statusReason text/codes for known terminal DECLINED outcomes from Dagu/WF12.
 */
function normalizeStatusReasonKey(statusReason?: string | null): string | null {
  if (!statusReason?.trim()) {
    return null;
  }

  const normalized = statusReason.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled';
  }
  if (normalized === 'out-of-stock' || normalized === 'stocked-out') {
    return 'out-of-stock';
  }

  return normalized;
}

/**
 * Maps fulfiller status (and statusReason for DECLINED) to a per-order display tag.
 * Returned (EXCEPTION) is shown only on the encounter header, not per order.
 */
function getPharmacyStatusDisplay(
  order: Order,
  t: (key: string, fallback: string) => string,
  statusReason?: string,
): PharmacyStatusDisplay | null {
  switch (getFulfillerStatus(order)) {
    case 'COMPLETED':
      return { label: t('fulfillmentDispensed', 'Dispensed'), type: 'green', labelKey: 'dispensed' };
    case 'DECLINED': {
      const reasonKey = normalizeStatusReasonKey(statusReason);
      if (reasonKey === 'cancelled') {
        return { label: t('fulfillmentCancelled', 'Cancelled'), type: 'red', labelKey: 'cancelled' };
      }
      if (reasonKey === 'out-of-stock') {
        return { label: t('fulfillmentStockedOut', 'Stocked out'), type: 'red', labelKey: 'stockedOut' };
      }
      return { label: t('fulfillmentNotDispensed', 'Not dispensed'), type: 'red', labelKey: 'notDispensed' };
    }
    case 'EXCEPTION':
      return null;
    case 'RECEIVED':
      return { label: t('fulfillmentReceived', 'Received'), type: 'blue', labelKey: 'received' };
    case 'IN_PROGRESS':
      return { label: t('fulfillmentInProgress', 'In progress'), type: 'blue', labelKey: 'inProgress' };
    case 'ON_HOLD':
      return { label: t('fulfillmentOnHold', 'On hold'), type: 'gray', labelKey: 'onHold' };
    default:
      return null;
  }
}

function shouldShowPharmacyReasonAlongside(display: PharmacyStatusDisplay, statusReason?: string) {
  if (!statusReason?.trim()) {
    return false;
  }
  // Known DECLINED labels already encode the reason; only show raw reason for unknown DECLINED cases.
  return display.labelKey === 'notDispensed';
}

const MedicationsDetailsTable: React.FC<MedicationsDetailsTableProps> = ({
  isValidating,
  title,
  medications,
  showAddButton,
  showDiscontinueButton,
  showModifyButton,
  showRenewButton,
  showResendPrescriptionButton = true,
  patient,
}) => {
  const pageSize = 5;
  const { t } = useTranslation();
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patient.id, 'order-basket');
  const launchReturnedPrescriptionBasket = useLaunchWorkspaceRequiringVisit(
    patient.id,
    'returned-prescription-basket-ethio',
  );
  const config = useConfig<ConfigObject>();
  const showPrintButton = config.showPrintButton;
  const contentToPrintRef = useRef(null);
  const { excludePatientIdentifierCodeTypes } = useConfig<StyleguideConfigObject>();
  const [isPrinting, setIsPrinting] = useState(false);

  const { orders, setOrders } = useOrderBasket<DrugOrderBasketItem>(patient, 'medications');
  const { results, goTo, currentPage } = usePagination(medications, pageSize);
  const ordersMissingStatusReason = useMemo(
    () =>
      medications
        ?.filter((medication) => orderNeedsStatusReason(medication) && !getStatusReasonFromOrder(medication))
        .map((medication) => medication.uuid)
        .filter(Boolean)
        .sort() ?? [],
    [medications],
  );
  const { data: medicationDispenseBundle } = useSWRImmutable(
    ordersMissingStatusReason.length ? ['medication-dispenses', ...ordersMissingStatusReason] : null,
    ([, ...orderUuids]: Array<string>) => fetchMedicationDispenses(orderUuids),
  );
  const statusReasonByOrderUuid = useMemo(
    () => buildStatusReasonByOrderUuidFromDispenseBundle(medicationDispenseBundle),
    [medicationDispenseBundle],
  );
  const getStatusReasonForOrder = useCallback(
    (order: Order) => getStatusReasonFromOrder(order) ?? statusReasonByOrderUuid.get(order.uuid),
    [statusReasonByOrderUuid],
  );

  const tableHeaders = [
    {
      key: 'startDate',
      header: t('startDate', 'Start date'),
      isSortable: true,
      isVisible: true,
    },
    {
      key: 'details',
      header: t('details', 'Details'),
      isSortable: true,
      isVisible: true,
    },
  ];

  const medicationsByUuid = useMemo(
    () => new Map(results?.map((medication) => [medication.uuid, medication]) ?? []),
    [results],
  );
  const encounterMedicationsByUuid = useMemo(() => {
    const groups = new Map<string, Array<Order>>();

    medications?.forEach((medication) => {
      const encounterUuid = medication.encounter?.uuid;
      if (!encounterUuid) {
        return;
      }

      const existingGroup = groups.get(encounterUuid);
      if (existingGroup) {
        existingGroup.push(medication);
      } else {
        groups.set(encounterUuid, [medication]);
      }
    });

    return groups;
  }, [medications]);

  const getEncounterGroupLabel = useCallback(
    (medication: Order) => {
      const encounterDateTime = medication.encounter?.encounterDatetime;
      return encounterDateTime
        ? formatDate(new Date(encounterDateTime), { time: true })
        : t('unknownEncounterDate', 'Unknown date');
    },
    [t],
  );

  const handleRenewAllClick = useCallback(
    (encounterUuid: string, encounterMedications: Array<Order>) => {
      const renewableOrders = encounterMedications.filter(
        (medication) => !orders.some((existingOrder) => existingOrder.uuid === medication.uuid),
      );

      if (!renewableOrders.length) {
        return;
      }

      setOrders([...orders, ...renewableOrders.map((medication) => buildMedicationOrder(medication, 'RENEW'))]);
      launchOrderBasket({}, { encounterUuid });
    },
    [launchOrderBasket, orders, setOrders],
  );

  const handleResendPrescriptionClick = useCallback(
    (encounterUuid: string, encounterMedications: Array<Order>) => {
      const ordersToResend = encounterMedications.filter(
        (medication) => !orders.some((existingOrder) => existingOrder.uuid === medication.uuid),
      );

      if (!ordersToResend.length) {
        return;
      }

      const returnedPrescriptionOrders = ordersToResend.map((medication) => {
        const isReturnedPrescription = isReturnedMedicationOrder(medication);
        return {
          ...buildMedicationOrder(medication, 'REVISE'),
          isReturnedPrescription,
          isOrderIncomplete: isReturnedPrescription,
        } as ReturnedPrescriptionBasketItem;
      });

      setOrders([...orders, ...returnedPrescriptionOrders]);
      launchReturnedPrescriptionBasket({}, { encounterUuid });
    },
    [launchReturnedPrescriptionBasket, orders, setOrders],
  );

  const tableRows = results?.map((medication) => {
    const pharmacyStatusReason = getStatusReasonForOrder(medication);
    const pharmacyStatus = getPharmacyStatusDisplay(medication, t, pharmacyStatusReason);
    const showPharmacyReason =
      pharmacyStatus && shouldShowPharmacyReasonAlongside(pharmacyStatus, pharmacyStatusReason);
    return {
      id: medication.uuid,
      details: {
        sortKey: medication.drug?.display,
        content: (
          <div className={styles.medicationRecord}>
            <div>
              <p className={styles.bodyLong01}>
                <strong>{capitalize(medication.drug?.display)}</strong>{' '}
                {medication.drug?.strength && <>&mdash; {medication.drug?.strength.toLowerCase()}</>}{' '}
                {medication.drug?.dosageForm?.display && (
                  <>&mdash; {medication.drug.dosageForm.display.toLowerCase()}</>
                )}
                {medication.dateStopped && (
                  <Tooltip align="right" label={<>{formatDate(new Date(medication.dateStopped))}</>}>
                    <Tag type="gray" className={styles.tag}>
                      {t('discontinued', 'Discontinued')}
                    </Tag>
                  </Tooltip>
                )}
                {pharmacyStatus && (
                  <span className={styles.fulfillmentStatus}>
                    <Tag type={pharmacyStatus.type} className={styles.tag}>
                      {pharmacyStatus.label}
                    </Tag>
                    {showPharmacyReason && <span className={styles.fulfillmentReason}>{pharmacyStatusReason}</span>}
                  </span>
                )}
              </p>
              <p className={styles.bodyLong01}>
                {medication.dose != null && (
                  <>
                    <span className={styles.label01}>{t('dose', 'Dose').toUpperCase()}</span>{' '}
                    <span className={styles.dosage}>
                      {medication.dose} {medication.doseUnits?.display?.toLowerCase()}
                    </span>{' '}
                  </>
                )}
                {medication.route?.display && (
                  <>
                    {medication.dose != null && <>&mdash; </>}
                    {medication.route?.display.toLowerCase()}{' '}
                  </>
                )}
                {medication.frequency?.display && <>&mdash; {medication.frequency?.display.toLowerCase()} </>}
                {medication.duration != null && (
                  <>
                    {(medication.dose != null || medication.route?.display || medication.frequency?.display) && (
                      <>&mdash; </>
                    )}
                    {t('medicationDurationAndUnit', 'for {{duration}} {{durationUnit}}', {
                      duration: medication.duration,
                      durationUnit: medication.durationUnits?.display?.toLowerCase(),
                    })}{' '}
                  </>
                )}
                {medication.duration == null &&
                  (medication.dose != null || medication.route?.display || medication.frequency?.display) && (
                    <>&mdash; {t('medicationIndefiniteDuration', 'Indefinite duration').toLowerCase()} </>
                  )}
                {medication.numRefills != null && medication.numRefills !== 0 && (
                  <span>
                    {(medication.dose != null ||
                      medication.route?.display ||
                      medication.frequency?.display ||
                      medication.duration != null) && <> &mdash; </>}
                    <span className={styles.label01}>{t('refills', 'Refills').toUpperCase()}</span>{' '}
                    {medication.numRefills}
                  </span>
                )}
                {medication.dosingInstructions && (
                  <span>
                    {(medication.dose != null ||
                      medication.route?.display ||
                      medication.frequency?.display ||
                      medication.duration != null ||
                      (medication.numRefills != null && medication.numRefills !== 0)) && <> &mdash; </>}
                    {medication.dosingInstructions.toLocaleLowerCase()}
                  </span>
                )}
              </p>
            </div>
            <p className={styles.bodyLong01}>
              {medication.orderReasonNonCoded && (
                <span>
                  <span className={styles.label01}>{t('indication', 'Indication').toUpperCase()}</span>{' '}
                  {medication.orderReasonNonCoded}
                </span>
              )}{' '}
              {medication.orderReasonNonCoded && medication.quantity != null && <>&mdash;</>}
              {medication.quantity != null && (
                <span>
                  <span className={styles.label01}> {t('quantity', 'Quantity').toUpperCase()}</span>{' '}
                  {medication.quantity} {medication?.quantityUnits?.display}
                </span>
              )}
            </p>
          </div>
        ),
      },
      startDate: {
        sortKey: dayjs(medication.dateActivated).toDate(),
        content: (
          <div className={styles.startDateColumn}>
            <span>{formatDate(new Date(medication.dateActivated))}</span>
            {!isPrinting && <InfoTooltip orderer={medication.orderer?.person?.display ?? '--'} />}
          </div>
        ),
      },
    };
  });

  const sortRow = (cellA, cellB, { sortDirection, sortStates }) => {
    return sortDirection === sortStates.DESC
      ? compare(cellB.sortKey, cellA.sortKey)
      : compare(cellA.sortKey, cellB.sortKey);
  };

  const patientDetails = useMemo(() => {
    const getGender = (gender: string): string => {
      switch (gender) {
        case 'male':
          return t('male', 'Male');
        case 'female':
          return t('female', 'Female');
        case 'other':
          return t('other', 'Other');
        case 'unknown':
          return t('unknown', 'Unknown');
        default:
          return gender;
      }
    };

    const identifiers =
      patient?.identifier?.filter(
        (identifier) => !excludePatientIdentifierCodeTypes?.uuids.includes(identifier.type.coding[0].code),
      ) ?? [];

    return {
      name: patient ? getPatientName(patient) : '',
      age: age(patient?.birthDate),
      gender: getGender(patient?.gender),
      location: patient?.address?.[0].city,
      identifiers: identifiers?.length ? identifiers.map(({ value }) => value) : [],
    };
  }, [patient, t, excludePatientIdentifierCodeTypes?.uuids]);

  const onBeforeGetContentResolve = useRef(null);

  useEffect(() => {
    if (isPrinting && onBeforeGetContentResolve.current) {
      onBeforeGetContentResolve.current();
    }
  }, [isPrinting]);

  const handlePrint = useReactToPrint({
    content: () => contentToPrintRef.current,
    documentTitle: `OpenMRS - ${patientDetails.name} - ${title}`,
    onBeforeGetContent: () =>
      new Promise((resolve) => {
        if (patient && title) {
          onBeforeGetContentResolve.current = resolve;
          setIsPrinting(true);
        }
      }),
    onAfterPrint: () => {
      onBeforeGetContentResolve.current = null;
      setIsPrinting(false);
    },
  });

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={title}>
        {isValidating ? (
          <span>
            <InlineLoading />
          </span>
        ) : null}
        <div className={styles.buttons}>
          {showPrintButton && (
            <Button
              kind="ghost"
              renderIcon={PrinterIcon}
              iconDescription={t('printMedications', 'Print medications')}
              className={styles.printButton}
              onClick={handlePrint}>
              {t('print', 'Print')}
            </Button>
          )}
          {showAddButton ?? true ? (
            <Button
              kind="ghost"
              renderIcon={(props: ComponentProps<typeof AddIcon>) => <AddIcon size={16} {...props} />}
              iconDescription={t('launchOrderBasket', 'Launch order basket')}
              onClick={() => launchOrderBasket({}, { encounterUuid: '' })}>
              {t('add', 'Add')}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <div ref={contentToPrintRef}>
        <PrintComponent subheader={title} patientDetails={patientDetails} />
        <DataTable
          data-floating-menu-container
          size="sm"
          headers={tableHeaders}
          rows={tableRows}
          isSortable
          sortRow={sortRow}
          overflowMenuOnHover={false}
          useZebraStyles>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table aria-label="medications" className={styles.table} {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                        })}>
                        {header.header}
                      </TableHeader>
                    ))}
                    {!isPrinting && <TableHeader aria-label={t('actions', 'Actions')} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.reduce<Array<React.ReactNode>>((renderedRows, row, index) => {
                    const medication = medicationsByUuid.get(row.id);
                    if (!medication) {
                      return renderedRows;
                    }

                    const previousMedication = index > 0 ? medicationsByUuid.get(rows[index - 1].id) : null;
                    const encounterUuid = medication.encounter?.uuid;
                    const previousEncounterUuid = previousMedication?.encounter?.uuid;
                    const encounterGroupKey = encounterUuid ?? `missing-${row.id}`;

                    if (encounterGroupKey !== (previousEncounterUuid ?? `missing-${rows[index - 1]?.id}`)) {
                      const encounterMedications = encounterUuid
                        ? encounterMedicationsByUuid.get(encounterUuid) ?? [medication]
                        : [medication];
                      const allOrdersAlreadyInBasket = encounterMedications.every((groupMedication) =>
                        orders.some((existingOrder) => existingOrder.uuid === groupMedication.uuid),
                      );
                      const isReturnedGroup = isReturnedEncounterGroup(encounterMedications);

                      renderedRows.push(
                        <TableRow key={`encounter-${encounterGroupKey}`} className={styles.encounterRow}>
                          <TableCell
                            className={styles.encounterHeaderCell}
                            colSpan={headers.length + (isPrinting ? 0 : 1)}>
                            <div className={styles.encounterHeaderContent}>
                              <div className={styles.encounterHeaderLabel}>
                                <span>{getEncounterGroupLabel(medication)}</span>
                                {isReturnedGroup && (
                                  <Tag type="red" className={styles.returnedPrescriptionTag}>
                                    {t('prescriptionReturned', 'Prescription returned')}
                                  </Tag>
                                )}
                              </div>
                              {!isPrinting &&
                                encounterUuid &&
                                ((isReturnedGroup && showResendPrescriptionButton) ||
                                  (!isReturnedGroup && showRenewButton)) && (
                                  <Button
                                    kind="ghost"
                                    size="sm"
                                    className={styles.renewAllButton}
                                    disabled={allOrdersAlreadyInBasket}
                                    onClick={() =>
                                      isReturnedGroup
                                        ? handleResendPrescriptionClick(encounterUuid, encounterMedications)
                                        : handleRenewAllClick(encounterUuid, encounterMedications)
                                    }>
                                    {isReturnedGroup
                                      ? t('resendPrescription', 'Resend prescription')
                                      : t('renewAll', 'Renew all')}
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>,
                      );
                    }

                    renderedRows.push(
                      <TableRow className={styles.row} key={row.id} {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell className={styles.tableCell} key={cell.id}>
                            {cell.value?.content ?? cell.value}
                          </TableCell>
                        ))}

                        {!isPrinting && (
                          <TableCell className="cds--table-column-menu">
                            <OrderBasketItemActions
                              patient={patient}
                              showDiscontinueButton={showDiscontinueButton}
                              showModifyButton={showModifyButton}
                              showRenewButton={showRenewButton}
                              medication={medication}
                              items={orders}
                              setItems={setOrders}
                            />
                          </TableCell>
                        )}
                      </TableRow>,
                    );

                    return renderedRows;
                  }, [])}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        <PatientChartPagination
          pageNumber={currentPage}
          totalItems={medications?.length ?? 0}
          currentItems={results.length}
          pageSize={pageSize}
          onPageNumberChange={({ page }) => goTo(page)}
        />
      </div>
    </div>
  );
};

function InfoTooltip({ orderer }: { orderer: string }) {
  return (
    <IconButton className={styles.tooltip} align="top-left" label={orderer} kind="ghost" size="sm">
      <UserIcon size={16} />
    </IconButton>
  );
}

function OrderBasketItemActions({
  patient,
  showDiscontinueButton,
  showModifyButton,
  showRenewButton,
  medication,
  items,
  setItems,
}: {
  patient: fhir.Patient;
  showDiscontinueButton: boolean;
  showModifyButton: boolean;
  showRenewButton: boolean;
  medication: Order;
  items: Array<DrugOrderBasketItem>;
  setItems: (items: Array<DrugOrderBasketItem>) => void;
}) {
  const { mutate: globalMutate } = useSWRConfig();
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const alreadyInBasket = items.some((x) => x.uuid === medication.uuid);

  const workspaceGroupProps: PatientWorkspaceGroupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient.id,
      visitContext: medication.encounter.visit,
      mutateVisitContext: () => {
        invalidateVisitByUuid(globalMutate, medication.encounter.visit?.uuid);
        invalidateVisitAndEncounterData(globalMutate, patient.id);
      },
    }),
    [patient, medication, globalMutate],
  );
  const handleDiscontinueClick = useCallback(() => {
    setItems([...items, buildMedicationOrder(medication, 'DISCONTINUE')]);
    launchWorkspace2<{}, OrderBasketWindowProps, PatientWorkspaceGroupProps>(
      'order-basket',
      {},
      { encounterUuid: medication.encounter.uuid },
      workspaceGroupProps,
    );
  }, [items, setItems, medication, workspaceGroupProps]);

  const handleModifyClick = useCallback(() => {
    launchWorkspace2<AddDrugOrderWorkspaceProps, OrderBasketWindowProps, PatientWorkspaceGroupProps>(
      'add-drug-order',
      {
        order: buildMedicationOrder(medication, 'REVISE'),
        orderToEditOrdererUuid: medication.orderer.uuid,
      },
      { encounterUuid: medication.encounter.uuid },
      workspaceGroupProps,
    );
  }, [medication, workspaceGroupProps]);

  const handleRenewClick = useCallback(() => {
    setItems([...items, buildMedicationOrder(medication, 'RENEW')]);
    launchWorkspace2<{}, OrderBasketWindowProps, PatientWorkspaceGroupProps>(
      'order-basket',
      {},
      { encounterUuid: medication.encounter.uuid },
      workspaceGroupProps,
    );
  }, [items, setItems, medication, workspaceGroupProps]);

  return (
    <OverflowMenu
      aria-label={t('actionsMenu', 'Actions menu')}
      align="left"
      selectorPrimaryFocus={'#modify'}
      flipped
      size={isTablet ? 'lg' : 'md'}>
      {showModifyButton && (
        <OverflowMenuItem
          className={styles.menuItem}
          id="modify"
          itemText={t('modify', 'Modify')}
          onClick={handleModifyClick}
          disabled={alreadyInBasket}
        />
      )}
      {showRenewButton && (
        <OverflowMenuItem
          className={styles.menuItem}
          disabled={alreadyInBasket}
          id="renew"
          itemText={t('orderActionRenew', 'Renew')}
          onClick={handleRenewClick}
        />
      )}
      {showDiscontinueButton && (
        <OverflowMenuItem
          className={styles.menuItem}
          disabled={alreadyInBasket}
          hasDivider
          id="discontinue"
          isDelete
          itemText={t('discontinue', 'Discontinue')}
          onClick={handleDiscontinueClick}
        />
      )}
    </OverflowMenu>
  );
}

export default MedicationsDetailsTable;
