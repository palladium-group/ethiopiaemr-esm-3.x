import React, { useState } from 'react';
import {
  DataTable,
  TableContainer,
  Table,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
  InlineLoading,
  Tag,
} from '@carbon/react';
import { Add, Close } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink, getPatientName, usePatient, useVisit, launchWorkspace } from '@openmrs/esm-framework';
import capitalize from 'lodash/capitalize';

import { type MappedBill } from '../types';
import BillLineItems, { lineItemTotal } from '../bills-table/bill-line-items.component';
import { BillPriority } from '../bills-table/order-priority';
import EmptyPatientBill from './patient-bills-dashboard/empty-patient-bill.component';

import styles from './patient-bills.scss';
import { useCurrencyFormatting } from '../helpers/currency';

type PatientBillsProps = {
  patientUuid: string;
  bills: Array<MappedBill>;
  isLoading?: boolean;
  /** Clears the selected patient, returning the tab to the search. */
  onCancel: (patientUuid: string | undefined) => void;
};

export const PatientBills: React.FC<PatientBillsProps> = ({
  bills,
  isLoading: isLoadingBills,
  onCancel,
  patientUuid,
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  // Only one bill's line items are open at a time.
  const [expandedBillUuid, setExpandedBillUuid] = useState<string | null>(null);

  const { patient, isLoading: isLoadingPatient } = usePatient(patientUuid);

  // usePatient keeps the first patient it was given, so never render one that is not the selected patient.
  if (isLoadingPatient || isLoadingBills || !patient || patient.id !== patientUuid) {
    return <InlineLoading status="active" description={t('loading', 'Loading...')} />;
  }

  const billingUrl = '${openmrsSpaBase}/home/accounting/patient/${patientUuid}/${uuid}';

  if (bills.length === 0) {
    return (
      <>
        <PatientHeader patient={patient} onCancel={onCancel} />
        <EmptyPatientBill
          title={t('noBillsFound', 'No bills found')}
          subTitle={t('noBillsFoundDescription', 'No bills found for this patient')}
        />
      </>
    );
  }

  const headers = [
    { header: t('billDate', 'Date'), key: 'date' },
    { header: t('invoiceNumber', 'Invoice Number'), key: 'invoiceNumber' },
    { header: t('priority', 'Priority'), key: 'priority' },
    { header: t('billedItems', 'Billed Items'), key: 'billedItems' },
    { header: t('total', 'Total'), key: 'total' },
    { header: t('status', 'Status'), key: 'status' },
  ];

  const tableRows = bills.map((bill) => {
    const lineItems = bill.lineItems ?? [];
    return {
      id: `${bill.uuid}`,
      date: bill.dateCreated,
      invoiceNumber: (
        <ConfigurableLink
          style={{ textDecoration: 'none' }}
          to={billingUrl}
          templateParams={{ patientUuid: bill.patientUuid, uuid: bill.uuid }}>
          {bill.receiptNumber ?? t('viewInvoice', 'View invoice')}
        </ConfigurableLink>
      ),
      priority: <BillPriority lineItems={lineItems} />,
      billedItems: `${lineItems.length} ${
        lineItems.length === 1 ? t('itemLowercase', 'item') : t('itemsLowercase', 'items')
      }`,
      total: formatCurrency(lineItems.reduce((sum, lineItem) => sum + lineItemTotal(lineItem), 0)),
      status: bill.closed ? (
        <>
          {bill.status}{' '}
          <Tag size="sm" type="gray">
            {t('closed', 'Closed')}
          </Tag>
        </>
      ) : (
        bill.status
      ),
    };
  });

  return (
    <div className={styles.container}>
      <PatientHeader patient={patient} onCancel={onCancel} />
      <DataTable
        rows={tableRows}
        headers={headers}
        size="sm"
        useZebraStyles
        render={({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getTableContainerProps,
          getExpandedRowProps,
        }) => (
          <TableContainer
            title={t('patientBillsSummary', 'Patient bill summary')}
            description={t('patientBillsSummaryDescription', 'A list of all bills for this patient')}
            {...getTableContainerProps()}>
            <Table {...getTableProps()} aria-label={t('patientBillsSummary', 'Patient bill summary')}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  {headers.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableExpandRow
                      {...getRowProps({ row })}
                      isExpanded={row.id === expandedBillUuid}
                      onExpand={() => setExpandedBillUuid(row.id === expandedBillUuid ? null : row.id)}
                      aria-label={
                        row.id === expandedBillUuid
                          ? t('hideLineItems', 'Hide line items')
                          : t('showLineItems', 'Show line items')
                      }>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableExpandRow>
                    {row.id === expandedBillUuid && (
                      <TableExpandedRow
                        className={styles.expandedRow}
                        colSpan={headers.length + 1}
                        {...getExpandedRowProps({ row })}>
                        <BillLineItems
                          lineItems={bills.find((bill) => bill.uuid === row.id)?.lineItems ?? []}
                          showDate
                          emptyMessage={t('noLineItems', 'This bill has no line items')}
                        />
                      </TableExpandedRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      />
    </div>
  );
};

type PatientHeaderProps = {
  patient: fhir.Patient;
  onCancel: (patientUuid: string | undefined) => void;
};

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, onCancel }) => {
  const { t } = useTranslation();
  const { activeVisit, isLoading: isVisitLoading } = useVisit(patient.id);
  const patientName = getPatientName(patient);
  const identifier = patient?.identifier?.[0]?.value ?? '--';

  const handleAddNewBill = () => {
    launchWorkspace('billing-form-workspace', {
      patientUuid: patient.id,
      patient,
    });
  };

  const getAddBillButtonContent = () => {
    if (isVisitLoading) {
      return <InlineLoading status="active" description={t('loading', 'Loading...')} />;
    }
    if (activeVisit) {
      return t('addNewBillItem', 'Add New Bill Item');
    }
    return t('startVisit', 'Start Visit');
  };

  return (
    <div className={styles.patientHeaderContainer}>
      <div className={styles.patientNameContainer}>
        <span className={styles.patientName}>{patientName}</span>
        <span className={styles.patientGender}>{capitalize(patient.gender)}</span>
        <span className={styles.identifier}>{identifier}</span>
      </div>
      <div className={styles.headerActions}>
        {/* This only clears the selected patient; it does not close any bill. */}
        <Button kind="ghost" onClick={() => onCancel(undefined)} renderIcon={Close}>
          {t('clearPatientSearch', 'Clear search')}
        </Button>
        <Button disabled={!activeVisit} kind="ghost" onClick={handleAddNewBill} renderIcon={Add}>
          {getAddBillButtonContent()}
        </Button>
      </div>
    </div>
  );
};
