import { InlineLoading, OverflowMenuItem, Tag } from '@carbon/react';
import { showModal, useConfig, type Visit } from '@openmrs/esm-framework';
import React, { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { findEncounterDatetimeByType, getBedStayWindow } from '../bed-fee/bed-fee.utils';
import { visitHasEncounterType } from '../discharge-confirmation/confirm-discharge.resource';
import { usePatientBills } from './patient-leave-bed.resource';

type PatientAdmissionCellProps = {
  patientUuid: string;
  encounterDatetime?: string;
  visit?: Visit | null;
};

const useAdmissionBillingDetails = (encounterDatetime?: string, visit?: Visit | null) => {
  const config = useConfig<ClinicalWorkflowConfig>();

  return useMemo(
    () => getBedStayWindow(encounterDatetime, findEncounterDatetimeByType(visit, config.ipdDischargeEncounterTypeUuid)),
    [config.ipdDischargeEncounterTypeUuid, encounterDatetime, visit],
  );
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

type GenerateBedFeeBillActionProps = PatientAdmissionCellProps & {
  patientName?: string;
  bedTypeName?: string;
};

/**
 * Lets the liaison raise the bed fee bill for the outstanding days. Hidden once the whole stay has
 * been billed, which is also what unblocks the bed unassign action below.
 */
export const GenerateBedFeeBillAction: FC<GenerateBedFeeBillActionProps> = ({
  patientUuid,
  encounterDatetime,
  visit,
  patientName,
  bedTypeName,
}) => {
  const { t } = useTranslation();
  const { daysInWard, billStartDate, billEndDate } = useAdmissionBillingDetails(encounterDatetime, visit);
  const { isLoading, error, bedFeeDaysBilled } = usePatientBills(patientUuid, billStartDate, billEndDate);

  if (isLoading) {
    return <InlineLoading />;
  }
  if (error || daysInWard <= 0 || daysInWard - bedFeeDaysBilled <= 0) {
    return null;
  }

  const handleClick = () => {
    const dispose = showModal('generate-bed-fee-bill-dialog', {
      patientUuid,
      visitUuid: visit?.uuid,
      patientName,
      bedTypeName,
      admissionDatetime: encounterDatetime,
      closeModal: () => dispose(),
    });
  };

  return <OverflowMenuItem itemText={t('generateBill', 'Generate bill')} onClick={handleClick} />;
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
