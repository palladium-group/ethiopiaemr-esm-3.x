import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedModal,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
  Button,
} from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import {
  acceptReferral,
  cancelReferral,
  referBack,
  rejectReferral,
  reReferReferral,
  sendFeedback,
  sendReferral,
  submitReferral,
  useCatchment,
  useReferralOptions,
} from '../../api/referral.resource';
import type { ReferralDetail, ReferralDetailResponse } from '../../api/types';
import { extractErrorMessage } from '../../api/errors';
import { toServerDateTime } from '../../utils/format';
import { useCodeLabel } from '../../utils/labels';
import { useActionLabels, type ReferralActionKind } from './available-actions';

interface ReferralActionModalProps {
  kind: ReferralActionKind;
  referral: ReferralDetail;
  onClose: () => void;
  onDone: (response: ReferralDetailResponse) => void;
}

type Fields = Record<string, string>;

const ReferralActionModal: React.FC<ReferralActionModalProps> = ({ kind, referral, onClose, onDone }) => {
  const { t } = useTranslation();
  const label = useCodeLabel();
  const { options } = useReferralOptions();
  const needsCatchment = kind === 'send' || kind === 're-refer';
  const { entries: catchment, isLoading: catchmentLoading } = useCatchment({ enabled: needsCatchment });
  const [fields, setFields] = useState<Fields>({
    requestedService: referral.requestedService ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((prev) => ({ ...prev, [name]: e.target.value }));
  const v = (name: string) => fields[name] ?? '';
  const opt = (name: string) => (v(name).trim() ? v(name).trim() : undefined);

  const titles = useActionLabels();

  // The facility the requested service is asked of must have recorded it; the server refuses
  // otherwise, so the picker only lists destinations that can take the referral.
  const service = v('requestedService').trim().toLowerCase();
  const destinations = catchment.filter(
    (c) =>
      c.active &&
      c.facilityCode !== referral.referringFacilityCode &&
      (!service || kind === 're-refer' || c.services.some((s) => s.toLowerCase() === service)),
  );

  const required: Partial<Record<ReferralActionKind, Array<string>>> = {
    send: ['receivingFacilityCode'],
    reject: ['reasonCode'],
    're-refer': ['onwardFacilityCode'],
    cancel: ['comment'],
    'refer-back': ['feedbackDiagnosis', 'treatmentSummary'],
    feedback: ['feedbackDiagnosis', 'treatmentSummary'],
  };
  const missing = (required[kind] ?? []).some((f) => !v(f).trim());
  const showMissing = (name: string) => {
    const waitingForCatchment = catchmentLoading && (name === 'receivingFacilityCode' || name === 'onwardFacilityCode');
    return (required[kind] ?? []).includes(name) && !v(name).trim() && !waitingForCatchment;
  };

  const run = async () => {
    const feedback = {
      comment: opt('comment'),
      feedbackDiagnosis: opt('feedbackDiagnosis'),
      treatmentSummary: opt('treatmentSummary'),
      medicationPlan: opt('medicationPlan'),
      followUpInstruction: opt('followUpInstruction'),
      feedbackTreatmentGiven: opt('feedbackTreatmentGiven'),
    };
    switch (kind) {
      case 'submit':
        return submitReferral(referral.uuid, opt('comment'));
      case 'send':
        return sendReferral(referral.uuid, {
          receivingFacilityCode: v('receivingFacilityCode'),
          requestedService: opt('requestedService'),
          comment: opt('comment'),
        });
      case 'cancel':
        return cancelReferral(referral.uuid, opt('comment'));
      case 'accept':
        return acceptReferral(referral.uuid, {
          comment: opt('comment'),
          conditionAtHandover: opt('conditionAtHandover'),
          handoverSummary: opt('handoverSummary'),
          receivingDepartment: opt('receivingDepartment'),
          arrivalDate: toServerDateTime(v('arrivalDate')),
        });
      case 'reject':
        return rejectReferral(referral.uuid, { reasonCode: v('reasonCode'), comment: opt('comment') });
      case 'refer-back':
        return referBack(referral.uuid, feedback);
      case 'feedback':
        return sendFeedback(referral.uuid, feedback);
      case 're-refer':
        return reReferReferral(referral.uuid, { onwardFacilityCode: v('onwardFacilityCode'), comment: opt('comment') });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await run();
      showSnackbar({ kind: 'success', title: titles[kind], subtitle: t('actionDone', 'Done.'), isLowContrast: true });
      onDone(response);
    } catch (e) {
      setError(extractErrorMessage(e) ?? t('actionFailed', 'The action could not be completed.'));
      setSubmitting(false);
    }
  };

  const facilityPicker = (name: string) => (
    <Select
      id={name}
      labelText={t('destinationFacility', 'Destination facility')}
      value={v(name)}
      invalid={showMissing(name)}
      invalidText={t('destinationRequired', 'Choose a destination facility.')}
      onChange={set(name)}>
      <SelectItem value="" text={t('chooseFacility', 'Choose a facility')} />
      {destinations.map((c) => (
        <SelectItem
          key={c.uuid}
          value={c.facilityCode}
          text={`${c.facilityName ?? c.facilityCode} — ${label('tier', c.tier)}`}
        />
      ))}
    </Select>
  );

  const feedbackFields = (
    <>
      <TextArea
        id="feedbackDiagnosis"
        labelText={t('finalDiagnosis', 'Final diagnosis')}
        rows={2}
        value={v('feedbackDiagnosis')}
        invalid={showMissing('feedbackDiagnosis')}
        invalidText={t('finalDiagnosisRequired', 'Enter the final diagnosis.')}
        onChange={set('feedbackDiagnosis')}
      />
      <TextArea
        id="treatmentSummary"
        labelText={t('treatmentSummary', 'Treatment summary')}
        rows={3}
        value={v('treatmentSummary')}
        invalid={showMissing('treatmentSummary')}
        invalidText={t('treatmentSummaryRequired', 'Enter the treatment summary.')}
        onChange={set('treatmentSummary')}
      />
      <TextArea
        id="feedbackTreatmentGiven"
        labelText={t('proceduresDone', 'Procedures / treatment given')}
        rows={2}
        value={v('feedbackTreatmentGiven')}
        onChange={set('feedbackTreatmentGiven')}
      />
      <TextArea
        id="medicationPlan"
        labelText={t('medicationPlan', 'Medication plan')}
        rows={2}
        value={v('medicationPlan')}
        onChange={set('medicationPlan')}
      />
      <TextArea
        id="followUpInstruction"
        labelText={t('followUpInstruction', 'Follow-up instructions for the referring facility')}
        rows={2}
        value={v('followUpInstruction')}
        onChange={set('followUpInstruction')}
      />
    </>
  );

  return (
    <ComposedModal open size="md" onClose={onClose} preventCloseOnClickOutside>
      <ModalHeader title={titles[kind]} label={referral.patientName ?? ''} />
      <ModalBody hasForm>
        <Stack gap={5}>
          {kind === 'submit' && (
            <p>{t('submitHelp', 'The liaison officer will choose the destination facility and send the referral.')}</p>
          )}

          {kind === 'send' && (
            <>
              <TextInput
                id="requestedService"
                labelText={t('requestedService', 'Requested service')}
                helperText={t('serviceFilterHelp', 'Only facilities that record this service are listed.')}
                value={v('requestedService')}
                onChange={set('requestedService')}
              />
              {facilityPicker('receivingFacilityCode')}
              {destinations.length === 0 && (
                <InlineNotification
                  kind="warning"
                  lowContrast
                  hideCloseButton
                  title={t('noDestinations', 'No active catchment facility provides this service.')}
                />
              )}
            </>
          )}

          {kind === 're-refer' && (
            <>
              <p>
                {t(
                  'reReferHelp',
                  'This facility becomes the referring facility for a new referral to the onward destination.',
                )}
              </p>
              {facilityPicker('onwardFacilityCode')}
            </>
          )}

          {kind === 'accept' && (
            <>
              <Select
                id="conditionAtHandover"
                labelText={t('conditionAtHandover', 'Condition at handover')}
                value={v('conditionAtHandover')}
                onChange={set('conditionAtHandover')}>
                <SelectItem value="" text={t('notRecorded', 'Not recorded')} />
                {(options?.handoverConditions ?? []).map((c) => (
                  <SelectItem key={c} value={c} text={label('condition', c)} />
                ))}
              </Select>
              <TextInput
                id="receivingDepartment"
                labelText={t('receivingDepartment', 'Receiving department')}
                value={v('receivingDepartment')}
                onChange={set('receivingDepartment')}
              />
              <TextInput
                id="arrivalDate"
                type="datetime-local"
                labelText={t('arrivalDate', 'Arrival date and time')}
                helperText={t('arrivalDateHelp', 'Leave empty to record now.')}
                value={v('arrivalDate')}
                onChange={set('arrivalDate')}
              />
              <TextArea
                id="handoverSummary"
                labelText={t('handoverSummary', 'Handover summary')}
                rows={3}
                value={v('handoverSummary')}
                onChange={set('handoverSummary')}
              />
            </>
          )}

          {kind === 'reject' && (
            <Select
              id="reasonCode"
              labelText={t('reason', 'Reason')}
              value={v('reasonCode')}
              invalid={showMissing('reasonCode')}
              invalidText={t('reasonRequired', 'Choose a reason.')}
              onChange={set('reasonCode')}>
              <SelectItem value="" text={t('chooseReason', 'Choose a reason')} />
              {(options?.rejectionReasons ?? []).map((r) => (
                <SelectItem key={r} value={r} text={label('reason', r)} />
              ))}
            </Select>
          )}

          {kind === 'refer-back' && (
            <p>
              {t('referBackHelp', 'Use when the patient is returning to the referring facility for continued care.')}
            </p>
          )}
          {(kind === 'refer-back' || kind === 'feedback') && feedbackFields}

          <TextArea
            id="comment"
            labelText={kind === 'cancel' ? t('cancelReason', 'Reason for cancelling') : t('comment', 'Comment')}
            rows={2}
            value={v('comment')}
            invalid={showMissing('comment')}
            invalidText={t('cancelReasonRequired', 'Enter a reason for cancelling.')}
            onChange={set('comment')}
          />

          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={t('actionFailed', 'The action could not be completed.')}
              subtitle={error}
            />
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
        <Button
          kind={kind === 'reject' || kind === 'cancel' ? 'danger' : 'primary'}
          disabled={submitting || missing || (needsCatchment && destinations.length === 0)}
          onClick={handleSubmit}>
          {submitting ? <InlineLoading description={t('saving', 'Saving…')} /> : titles[kind]}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default ReferralActionModal;
