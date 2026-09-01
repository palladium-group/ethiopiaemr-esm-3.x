import {
  type FetchResponse,
  openmrsFetch,
  type OpenmrsResource,
  restBaseUrl,
  showSnackbar,
  useAppContext,
  useConfig,
  useSession,
  type Visit,
} from '@openmrs/esm-framework';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { WardAppConfigSlice, WardPatient, WardViewContext } from '../admitted-patients/ward.types';

export function removePatientFromBed(bedId: number, patientUuid: string) {
  return openmrsFetch(`${restBaseUrl}/beds/${bedId}?patientUuid=${patientUuid}`, {
    method: 'DELETE',
  });
}

const createDischargeEncounterPayload = (
  patientUuid: string,
  encounterType: OpenmrsResource,
  location: OpenmrsResource,
  currentProvider: OpenmrsResource,
  visitUuid: string,
  clinicianEncounterRole: OpenmrsResource,
) => ({
  patient: patientUuid,
  encounterType,
  location: location?.uuid,
  encounterProviders: [
    {
      provider: currentProvider?.uuid,
      encounterRole: clinicianEncounterRole?.uuid,
    },
  ],
  obs: [],
  visit: visitUuid,
});

export const usePatientLeaveBed = () => {
  const { t } = useTranslation();
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const session = useSession();

  const handleLeaveBed = async (
    wardPatient: WardPatient,
    emrConfiguration: Record<string, unknown>,
    visit: Visit,
    wardLocation?: OpenmrsResource,
  ) => {
    try {
      const encounterPayload = createDischargeEncounterPayload(
        wardPatient.patient.uuid,
        emrConfiguration.exitFromInpatientEncounterType as OpenmrsResource,
        wardLocation ?? (session?.sessionLocation as OpenmrsResource),
        session?.currentProvider as OpenmrsResource,
        visit.uuid,
        emrConfiguration.clinicianEncounterRole as OpenmrsResource,
      );

      const dischargeResponse = await openmrsFetch(`${restBaseUrl}/encounter`, {
        method: 'POST',
        body: encounterPayload,
        headers: { 'Content-Type': 'application/json' },
      });

      if (!dischargeResponse?.ok) {
        throw new Error('Failed to create discharge encounter');
      }

      if (wardPatient?.bed?.id) {
        const bedRemovalResponse = await removePatientFromBed(wardPatient.bed.id, wardPatient.patient.uuid);
        if (!bedRemovalResponse?.ok) {
          throw new Error('Failed to remove patient from bed');
        }
      }

      showSnackbar({
        title: t('patientWasDischarged', 'Patient was discharged'),
        kind: 'success',
      });
    } catch (err) {
      showSnackbar({
        title: t('errorDischargingPatient', 'Error discharging patient'),
        subtitle: err instanceof Error ? err.message : 'Unknown error occurred',
        kind: 'error',
      });
    } finally {
      wardPatientGroupDetails?.mutate?.();
    }
  };

  return { handleLeaveBed };
};

export enum PaymentStatus {
  PENDING = 'PENDING',
}

type BillLineItem = {
  uuid: string;
  paymentStatus: string;
  itemOrServiceConceptUuid: string;
  quantity: number;
  dateCreated?: string;
};

type Bill = OpenmrsResource & {
  voided: boolean;
  patient: OpenmrsResource;
  lineItems: Array<BillLineItem>;
};

export const usePatientBills = (patientUuid: string, startingDate?: Date | null, endDate?: Date | null) => {
  const rep =
    'custom:(uuid,display,voided,voidReason,dateCreated,status,patient:(uuid,display),' +
    'lineItems:(uuid,paymentStatus,billableService,itemOrServiceConceptUuid,quantity,dateCreated))';

  const { dailyBedFeeBillableService } = useConfig<WardAppConfigSlice>({
    externalModuleName: '@kenyaemr/esm-ward-app',
  });

  const url = patientUuid ? `${restBaseUrl}/cashier/bill?v=${rep}&patientUuid=${patientUuid}` : null;
  const { data, isLoading, error, mutate } = useSWR<FetchResponse<{ results: Array<Bill> }>>(url, openmrsFetch);

  const bills = useMemo(
    () => (data?.data?.results ?? []).filter((bill) => !bill.voided && bill.patient?.uuid === patientUuid),
    [data, patientUuid],
  );

  const pendingBills = useMemo(
    () => bills.filter((bill) => (bill.lineItems ?? []).some((item) => item.paymentStatus === PaymentStatus.PENDING)),
    [bills],
  );

  /** Number of bed fee days already billed within this ward stay. */
  const bedFeeDaysBilled = useMemo(() => {
    const bedFeeLineItems = bills.reduce<Array<BillLineItem>>((prev, curr) => {
      const matching = (curr.lineItems ?? []).filter(
        (item) => item.itemOrServiceConceptUuid === dailyBedFeeBillableService,
      );
      prev.push(...matching);
      return prev;
    }, []);

    // Bed fees are often raised after the discharge date, so the window extends to now to keep
    // those line items in scope while still excluding fees from an earlier admission.
    const scopeEnd = endDate ? Math.max(endDate.getTime(), Date.now()) : null;

    const scopedItems =
      startingDate && scopeEnd
        ? bedFeeLineItems.filter((item) => {
            if (!item.dateCreated) {
              return true;
            }
            const created = new Date(item.dateCreated).getTime();
            return created >= startingDate.getTime() && created <= scopeEnd;
          })
        : bedFeeLineItems;

    return scopedItems.reduce((prev, curr) => prev + (curr.quantity ?? 0), 0);
  }, [bills, dailyBedFeeBillableService, endDate, startingDate]);

  const dailyBedFeeSettled = useCallback(
    (daysInWard?: number) => {
      if (!daysInWard || daysInWard <= 0) {
        return true;
      }
      return bedFeeDaysBilled >= daysInWard;
    },
    [bedFeeDaysBilled],
  );

  return {
    error,
    isLoading,
    bills,
    pendingBills,
    bedFeeDaysBilled,
    dailyBedFeeSettled,
    mutate,
  };
};
