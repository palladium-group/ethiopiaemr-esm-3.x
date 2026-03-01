import {
  formatDatetime,
  makeUrl,
  openmrsFetch,
  parseDate,
  restBaseUrl,
  type Diagnosis,
  type Encounter,
  type EncounterType,
  type Obs,
  useOpenmrsFetchAll,
  useOpenmrsPagination,
} from '@openmrs/esm-framework';
import { type Form } from '@openmrs/esm-patient-common-lib';

export interface EncountersTableProps {
  patientUuid: string;
  totalCount: number;
  currentPage: number;
  goTo(page: number): void;
  isLoading: boolean;
  showVisitType: boolean;
  paginatedEncounters: Array<Encounter>;
  showEncounterTypeFilter: boolean;
  encounterTypeToFilter?: EncounterType;
  setEncounterTypeToFilter?: React.Dispatch<React.SetStateAction<EncounterType>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}

export interface EncounterOrder {
  uuid?: string;
  display?: string;
  orderType?: { uuid?: string; display?: string };
  drug?: { display?: string; strength?: string };
  concept?: { display?: string; uuid?: string };
  dose?: number;
  doseUnits?: { display?: string };
  route?: { display?: string };
  frequency?: { display?: string };
  dosingInstructions?: string;
  orderNumber?: string;
  dateActivated?: string;
  instructions?: string;
}

export interface MappedEncounter {
  datetime: string;
  // original encounter datetime
  encounterDatetime: string;
  diagnoses: Array<Diagnosis>;
  editPrivilege: string;
  encounterType: string;
  form: Form;
  formName: string;
  id: string;
  obs: Array<Obs>;
  orders?: Array<EncounterOrder>;
  provider: string;
  visitStartDatetime?: string;
  visitStopDatetime?: string;
  visitType: string;
  visitTypeUuid?: string;
  visitUuid: string;
}

export function deleteEncounter(encounterUuid: string, abortController: AbortController) {
  return openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}`, {
    method: 'DELETE',
    signal: abortController.signal,
  });
}

export function usePaginatedEncounters(patientUuid: string, encounterType: string, pageSize: number) {
  const customRep = `custom:(uuid,display,diagnoses:(uuid,display,rank,diagnosis,certainty,voided),encounterDatetime,form:(uuid,display,name,description,encounterType,version,resources:(uuid,display,name,valueReference)),encounterType,visit,patient,orders:(uuid,display,orderType:(uuid,display),orderer:(display),drug:(display,strength),concept:(uuid,display),dose,doseUnits:(display),route:(display),frequency:(display),dosingInstructions,orderNumber,dateActivated,instructions),obs:(uuid,concept:(uuid,display,conceptClass:(uuid,display)),display,groupMembers:(uuid,concept:(uuid,display),value:(uuid,display),display),value,obsDatetime),encounterProviders:(provider:(person)))`;
  const url = new URL(makeUrl(`${restBaseUrl}/encounter`), window.location.toString());
  url.searchParams.set('patient', patientUuid);
  url.searchParams.set('v', customRep);
  url.searchParams.set('order', 'desc');
  encounterType && url.searchParams.set('encounterType', encounterType);
  return useOpenmrsPagination<Encounter>(patientUuid ? url : null, pageSize);
}

export function useEncounterTypes() {
  return useOpenmrsFetchAll<EncounterType>(`${restBaseUrl}/encountertype`, {
    immutable: true,
  });
}

export function mapEncounter(encounter: Encounter): MappedEncounter {
  return {
    id: encounter.uuid,
    datetime: formatDatetime(parseDate(encounter.encounterDatetime), {
      noToday: true,
    }),
    encounterDatetime: encounter.encounterDatetime,
    diagnoses:
      encounter.diagnoses
        ?.filter((diagnosis) => !diagnosis.voided)
        .map((diagnosis) => ({
          ...diagnosis,
          certainty: diagnosis.certainty || 'PROVISIONAL',
        })) || [],
    encounterType: encounter.encounterType?.display,
    editPrivilege: encounter.encounterType?.editPrivilege?.display,
    form: encounter.form as Form,
    formName: encounter.form?.display ?? '--',
    obs: encounter.obs,
    orders: (encounter as Encounter & { orders?: Array<EncounterOrder> }).orders,
    provider:
      encounter.encounterProviders?.length > 0
        ? encounter.encounterProviders[0].provider?.person?.display
        : (encounter as Encounter & { orders?: Array<{ orderer?: { display?: string } }> }).orders?.[0]?.orderer
            ?.display ?? '--',
    visitStartDatetime: encounter.visit?.startDatetime,
    visitStopDatetime: encounter.visit?.stopDatetime,
    visitType: encounter.visit?.visitType?.display,
    visitTypeUuid: encounter.visit?.visitType?.uuid,
    visitUuid: encounter.visit?.uuid,
  };
}
