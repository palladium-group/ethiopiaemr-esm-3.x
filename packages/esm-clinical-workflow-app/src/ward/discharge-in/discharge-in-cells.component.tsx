import { InlineLoading, OverflowMenuItem, Tag } from '@carbon/react';
import { useConfig, type Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import React, { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { visitHasEncounterType } from '../discharge-confirmation/confirm-discharge.resource';
import { usePatientBills } from './patient-leave-bed.resource';

type PatientAdmissionCellProps = {
  patientUuid: string;
  encounterDatetime?: string;
  visit?: Visit | null;
};

const useAdmissionBillingDetails = (encounterDatetime?: string, visit?: Visit | null) => {
  const config = useConfig<ClinicalWorkflowConfig>();

  const admissionDate = useMemo(() => {
    if (!encounterDatetime) {
      return null;
    }
    const date = dayjs(encounterDatetime);
    return date.isValid() ? date.startOf('day') : null;
  }, [encounterDatetime]);

  const ipdDischargeEncounter = useMemo(() => {
    if (!visit?.encounters || !config.ipdDischargeEncounterTypeUuid) {
      return null;
    }
    return visit.encounters.find((encounter) => encounter.encounterType?.uuid === config.ipdDischargeEncounterTypeUuid);
  }, [config.ipdDischargeEncounterTypeUuid, visit]);

  const endDate = useMemo(() => {
    if (ipdDischargeEncounter?.encounterDatetime) {
      const date = dayjs(ipdDischargeEncounter.encounterDatetime);
      if (date.isValid()) {
        return date.endOf('day');
      }
    }
    return dayjs().endOf('day');
  }, [ipdDischargeEncounter]);

  const daysInWard = useMemo(() => {
    if (!admissionDate) {
      return 0;
    }
    return Math.abs(endDate.startOf('day').diff(admissionDate, 'days')) + 1;
  }, [admissionDate, endDate]);

  return {
    daysInWard,
    billStartDate: admissionDate?.toDate() ?? null,
    billEndDate: endDate.toDate(),
  };
};

export const PatientBillStatus: FC<PatientAdmissionCellProps> = ({ patientUuid, encounterDatetime, visit }) => {
  const { daysInWard, billStartDate, billEndDate } = useAdmissionBillingDetails(encounterDatetime, visit);
  const { t } = useTranslation();
  const { isLoading, error, bills, pendingBills, dailyBedFeeSettled } = usePatientBills(
    patientUuid,
    billStartDate,
    billEndDate,
  );

  if (isLoading) {
    return <InlineLoading />;
  }
  if (error) {
    return <p>--</p>;
  }
  if (bills.length === 0) {
    return <Tag type="red">{t('billsNotRaised', 'Bills Not Raised')}</Tag>;
  }
  if (pendingBills.length > 0) {
    return <Tag type="red">{t('pendingBills', 'Pending Bills')}</Tag>;
  }
  if (!dailyBedFeeSettled(daysInWard)) {
    return <Tag type="red">{t('dailyBedFeeUnmatching', 'Daily bed fee and days in ward not matching')}</Tag>;
  }
  return <Tag type="green">{t('billsSettled', 'Bills Settled')}</Tag>;
};

export const NurseDischargeConfirmationStatus: FC<{ visit?: Visit | null }> = ({ visit }) => {
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();
  const confirmed = visitHasEncounterType(visit, config.nurseDischargeConfirmationEncounterTypeUuid);

  if (confirmed) {
    return <Tag type="green">{t('nurseDischargeConfirmed', 'Nurse confirmed')}</Tag>;
  }

  return <Tag type="red">{t('nurseDischargePending', 'Awaiting nurse confirmation')}</Tag>;
};

type UnAssignPatientBedActionProps = PatientAdmissionCellProps & {
  onClick?: () => void;
  loading?: boolean;
};

export const UnAssignPatientBedAction: FC<UnAssignPatientBedActionProps> = ({
  encounterDatetime,
  patientUuid,
  visit,
  onClick,
  loading,
}) => {
  const { daysInWard, billStartDate, billEndDate } = useAdmissionBillingDetails(encounterDatetime, visit);
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();
  const { isLoading, error, bills, pendingBills, dailyBedFeeSettled } = usePatientBills(
    patientUuid,
    billStartDate,
    billEndDate,
  );
  const nurseConfirmed = visitHasEncounterType(visit, config.nurseDischargeConfirmationEncounterTypeUuid);

  if (isLoading || loading) {
    return <InlineLoading />;
  }
  if (error) {
    return null;
  }
  if (bills.length === 0 || pendingBills.length > 0 || !dailyBedFeeSettled(daysInWard) || !nurseConfirmed) {
    return null;
  }

  return <OverflowMenuItem itemText={t('unAssignBed', 'Un Assign bed')} onClick={onClick} />;
};
