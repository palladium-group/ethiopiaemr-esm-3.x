import { InlineLoading, Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from '@carbon/react';
import classNames from 'classnames';
import { ExtensionSlot, formatDatetime, parseDate, usePatient, useVisit } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBill } from '../billing.resource';
import { usePaymentsReconciler } from '../hooks/use-payments-reconciler';
import { LineItem, MappedBill } from '../types';
import styles from './invoice.scss';
import InvoiceCheckout from './checkout/invoice-checkout.component';
import PaymentChannelButtons from './payment-channel-buttons.component';
import capitalize from 'lodash-es/capitalize';
import { InvoiceActions } from './invoice-actions.component';
import { useCurrencyFormatting } from '../helpers/currency';
import BillTimeline, { paymentStatusTagType } from './timeline/bill-timeline.component';

const Invoice: React.FC = () => {
  const { t } = useTranslation();
  const { billUuid, patientUuid } = useParams();
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUuid);
  const { bill, isLoading: isLoadingBill, error: billingError } = useBill(billUuid);
  usePaymentsReconciler(billUuid);
  const { activeVisit, isLoading: isVisitLoading, error: visitError } = useVisit(patientUuid);
  // The ticked line items, reported by the checkout so the Telebirr and EthSwitch buttons act on them.
  const [selectedLineItems, setSelectedLineItems] = useState<Array<LineItem>>([]);

  // useBill returns an empty bill while its cached data is cleared for a refetch (the bill mutations clear
  // every cashier/bill key), so wait for a real bill instead of rendering one without line items.
  const isBillMissing = !billingError && !bill?.uuid;

  if (isLoadingPatient || isLoadingBill || isVisitLoading || isBillMissing) {
    return (
      <div className={styles.invoiceContainer}>
        <InlineLoading
          className={styles.loader}
          status="active"
          iconDescription="Loading"
          description="Loading patient header..."
        />
      </div>
    );
  }

  if (billingError || patientError || visitError) {
    return (
      <div className={styles.errorContainer}>
        <ErrorState
          headerTitle={t('invoiceError', 'Invoice error')}
          error={billingError ?? patientError ?? visitError}
        />
      </div>
    );
  }

  return (
    <div className={styles.invoiceContainer}>
      {patient && patientUuid && (
        <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid, hideActionsOverflow: true }} />
      )}
      <InvoiceHeader bill={bill} selectedLineItems={selectedLineItems} activeVisit={activeVisit} />
      <Tabs>
        <TabList className={styles.invoiceTabs} aria-label={t('invoiceSections', 'Invoice sections')} contained>
          <Tab>
            {t('itemsAndPayment', 'Items & payment')} ({bill?.lineItems?.length ?? 0})
          </Tab>
          <Tab>{t('timeline', 'Timeline')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className={styles.invoiceTabPanel}>
            <InvoiceCheckout bill={bill} onSelectItem={setSelectedLineItems} />
          </TabPanel>
          <TabPanel className={styles.invoiceTabPanel}>
            <div className={styles.timelineCard}>
              <BillTimeline bill={bill} />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export function InvoiceHeader({
  bill,
  selectedLineItems,
  activeVisit,
}: {
  readonly bill: MappedBill;
  readonly selectedLineItems?: LineItem[];
  readonly activeVisit?: any;
}) {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const details = [
    {
      label: t('dateAndTime', 'Date And Time'),
      value: formatDatetime(parseDate(bill.dateCreatedUnformatted), { mode: 'standard', noToday: true }),
    },
    { label: t('cashPoint', 'Cash Point'), value: bill?.cashPointName },
    { label: t('cashier', 'Cashier'), value: capitalize(bill?.cashier?.display) },
  ];

  const figures = [
    { label: t('totalAmount', 'Total Amount'), value: bill?.totalAmount },
    { label: t('totalPayments', 'Total Payments'), value: bill?.totalPayments },
    { label: t('totalExempted', 'Total Exempted'), value: bill?.totalExempted },
    { label: t('totalDeposits', 'Total Deposits'), value: bill?.totalDeposits },
  ];

  return (
    <header className={styles.invoiceHeader}>
      <div className={styles.invoiceHeaderTop}>
        <div>
          <h4 className={styles.invoiceTitle}>
            {t('invoice', 'Invoice')} {bill.receiptNumber}
            <Tag size="sm" type={paymentStatusTagType(bill?.status)}>
              {bill?.status}
            </Tag>
            {bill?.closed && (
              <Tag size="sm" type="gray">
                {t('closed', 'Closed')}
              </Tag>
            )}
          </h4>
          <dl className={styles.invoiceDetails}>
            {details.map(({ label, value }) => (
              <div key={label} className={styles.invoiceDetail}>
                <dt>{label}</dt>
                <dd>{value || '--'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={styles.invoiceHeaderActions}>
          <InvoiceActions bill={bill} activeVisit={activeVisit} />
          <PaymentChannelButtons bill={bill} selectedLineItems={selectedLineItems} />
        </div>
      </div>
      <dl className={styles.invoiceFigures}>
        {figures.map(({ label, value }) => (
          <div key={label} className={styles.invoiceFigure}>
            <dt>{label}</dt>
            <dd>{formatCurrency(value ?? 0)}</dd>
          </div>
        ))}
        <div className={classNames(styles.invoiceFigure, styles.invoiceBalance)}>
          <dt>{t('balance', 'Balance')}</dt>
          <dd>{formatCurrency(bill?.balance ?? 0)}</dd>
        </div>
      </dl>
    </header>
  );
}

export default Invoice;
