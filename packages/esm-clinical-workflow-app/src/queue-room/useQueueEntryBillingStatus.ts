import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig, type FetchResponse } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import type { QueueEntry } from '../types';
import { getVisitPaymentModeUuid } from '../ward/bed-fee/bed-fee.utils';
import { usePaymentModes } from '../mru/billing-information/hooks/usePaymentModes';

export type QueueEntryBillingStatusType =
  | 'LOADING'
  | 'NO_PAYMENT_METHOD'
  | 'NO_CONSULTATION_BILL'
  | 'PENDING_PAYMENT'
  | 'CLEARED';

export interface QueueEntryBillingStatus {
  status: QueueEntryBillingStatusType;
  isCleared: boolean;
  isLoading: boolean;
  paymentModeName?: string;
  badgeText: string;
  badgeType: 'green' | 'red' | 'gray' | 'high-contrast' | 'cool-gray';
  message: string;
}

interface BillLineItem {
  uuid: string;
  paymentStatus?: string;
  price?: number;
  quantity?: number;
}

interface CashierBill {
  uuid: string;
  display?: string;
  voided?: boolean;
  status?: string;
  balance?: number | string;
  lineItems?: BillLineItem[];
  dateCreated?: string;
}

const CASHIER_BILL_REP =
  'custom:(uuid,display,voided,status,balance,lineItems:(uuid,paymentStatus,price,quantity),dateCreated)';

/**
 * Evaluates the billing and MRU registration clearance status of a service queue entry.
 *
 * Strict policy: NO bypass.
 * - Missing paymentMethod visit attribute => BLOCKED (MRU Pending).
 * - Non-cash payment method (CBHI, Credit, Waiver, Free, Exempt) => CLEARED.
 * - Cash / Paying payment method:
 *     - No bill found => BLOCKED (Fee Not Created).
 *     - Bill found with positive balance or pending payment => BLOCKED (Payment Pending).
 *     - Bill fully paid (balance == 0, status == 'PAID') => CLEARED.
 */
export function useQueueEntryBillingStatus(queueEntry: QueueEntry | null | undefined): QueueEntryBillingStatus {
  const { t } = useTranslation();
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const { billingTypes, isLoading: isLoadingPaymentModes } = usePaymentModes();

  const paymentMethodAttributeTypeUuid =
    billingVisitAttributeTypes?.paymentMethod ?? 'e6cb0c3b-04b0-4117-9bc6-ce24adbda802';

  const paymentModeUuid = useMemo(
    () => getVisitPaymentModeUuid(queueEntry?.visit, paymentMethodAttributeTypeUuid),
    [queueEntry?.visit, paymentMethodAttributeTypeUuid],
  );

  const matchedPaymentMode = useMemo(
    () => (paymentModeUuid ? billingTypes.find((mode) => mode.uuid === paymentModeUuid) : undefined),
    [billingTypes, paymentModeUuid],
  );

  const modeName = matchedPaymentMode?.name ?? '';
  const isKnownNonCash = useMemo(() => {
    if (!matchedPaymentMode) {
      return false;
    }
    // Any mode that does not contain 'cash' or 'paying' is considered covered / non-cash (CBHI, Credit, Waiver, Exempt, etc.)
    return !/cash|paying/i.test(modeName);
  }, [matchedPaymentMode, modeName]);

  const patientUuid = queueEntry?.patient?.uuid;
  const shouldFetchBills = Boolean(patientUuid && paymentModeUuid && !isKnownNonCash);

  const billsUrl = shouldFetchBills
    ? `${restBaseUrl}/cashier/bill?v=${CASHIER_BILL_REP}&patientUuid=${patientUuid}`
    : null;

  const { data: billsData, isLoading: isLoadingBills } = useSWR<FetchResponse<{ results: Array<CashierBill> }>>(
    billsUrl,
    openmrsFetch,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  );

  return useMemo<QueueEntryBillingStatus>(() => {
    if (!queueEntry?.visit) {
      return {
        status: 'NO_PAYMENT_METHOD',
        isCleared: false,
        isLoading: false,
        badgeText: t('mruPending', 'MRU Pending'),
        badgeType: 'gray',
        message: t('noActiveVisitFound', 'No active visit found for this queue entry.'),
      };
    }

    // Check if payment method visit attribute is attached
    if (!paymentModeUuid) {
      return {
        status: 'NO_PAYMENT_METHOD',
        isCleared: false,
        isLoading: false,
        badgeText: t('mruPending', 'MRU Pending'),
        badgeType: 'gray',
        message: t(
          'noPaymentMethodAttached',
          'No payment method attached. Patient must visit the MRU desk to register payment mode and consultation fee.',
        ),
      };
    }

    if (isLoadingPaymentModes && !matchedPaymentMode) {
      return {
        status: 'LOADING',
        isCleared: false,
        isLoading: true,
        badgeText: t('checkingStatus', 'Checking...'),
        badgeType: 'cool-gray',
        message: t('verifyingPaymentMode', 'Verifying registered payment mode...'),
      };
    }

    // Non-cash modes (CBHI, Credit Company, Waiver / Free / Exempt) are cleared once registered at MRU
    if (isKnownNonCash) {
      return {
        status: 'CLEARED',
        isCleared: true,
        isLoading: false,
        paymentModeName: modeName,
        badgeText: modeName ? `${t('cleared', 'Cleared')} (${modeName})` : t('cleared', 'Cleared'),
        badgeType: 'green',
        message: t('paymentMethodRegistered', 'Payment method registered: {{mode}}', {
          mode: modeName || 'Non-Cash',
        }),
      };
    }

    // For Cash / Paying patients, verify consultation fee bill
    if (isLoadingBills) {
      return {
        status: 'LOADING',
        isCleared: false,
        isLoading: true,
        badgeText: t('checkingStatus', 'Checking...'),
        badgeType: 'cool-gray',
        message: t('checkingCashierBills', 'Checking cashier bills...'),
      };
    }

    const nonVoidedBills = (billsData?.data?.results ?? []).filter((bill) => !bill.voided);

    if (nonVoidedBills.length === 0) {
      return {
        status: 'NO_CONSULTATION_BILL',
        isCleared: false,
        isLoading: false,
        paymentModeName: modeName || 'Cash',
        badgeText: t('feeNotCreated', 'Fee Not Created'),
        badgeType: 'high-contrast',
        message: t(
          'consultationFeeNotCreated',
          'Consultation fee has not been created. Patient must visit the MRU desk.',
        ),
      };
    }

    const hasPendingLineItems = nonVoidedBills.some((bill) =>
      (bill.lineItems ?? []).some(
        (item) =>
          item.paymentStatus === 'PENDING' ||
          (item.paymentStatus &&
            item.paymentStatus !== 'PAID' &&
            item.paymentStatus !== 'EXEMPTED' &&
            item.paymentStatus !== 'WAIVED'),
      ),
    );

    const totalBalance = nonVoidedBills.reduce((acc, bill) => acc + (Number(bill.balance) || 0), 0);
    const hasUnpaidBillStatus = nonVoidedBills.some(
      (bill) => bill.status === 'PENDING' || bill.status === 'UNPAID' || bill.status === 'PARTIALLY_PAID',
    );

    if (hasPendingLineItems || totalBalance > 0 || hasUnpaidBillStatus) {
      return {
        status: 'PENDING_PAYMENT',
        isCleared: false,
        isLoading: false,
        paymentModeName: modeName || 'Cash',
        badgeText: t('paymentPending', 'Payment Pending'),
        badgeType: 'red',
        message: t(
          'consultationFeePendingPayment',
          'Consultation fee payment is pending. Patient must make payment at the cashier before being served.',
        ),
      };
    }

    return {
      status: 'CLEARED',
      isCleared: true,
      isLoading: false,
      paymentModeName: modeName || 'Cash',
      badgeText: t('paid', 'Paid'),
      badgeType: 'green',
      message: t('consultationFeePaid', 'Consultation fee paid and cleared for service.'),
    };
  }, [
    queueEntry?.visit,
    paymentModeUuid,
    isLoadingPaymentModes,
    matchedPaymentMode,
    isKnownNonCash,
    modeName,
    isLoadingBills,
    billsData?.data?.results,
    t,
  ]);
}
