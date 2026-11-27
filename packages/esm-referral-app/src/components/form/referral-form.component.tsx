import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  ButtonSet,
  InlineLoading,
  InlineNotification,
  NumberInput,
  Search,
  Select,
  SelectItem,
  SkeletonText,
  TextArea,
  TextInput,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/react/icons';
import { showSnackbar, useDebounce } from '@openmrs/esm-framework';
import { saveReferral, submitReferral, useReferral, useReferralOptions } from '../../api/referral.resource';
import { demographicsFrom, usePatient, usePatientSearch } from '../../api/patient.resource';
import type { ReferralDetail } from '../../api/types';
import { extractErrorMessage } from '../../api/errors';
import { useCodeLabel } from '../../utils/labels';
import styles from './referral-form.scss';

type Values = Record<string, string>;

const TEXT_FIELDS = [
  'referralType',
  'priority',
  'patientType',
  'patientUuid',
  'patientGivenName',
  'patientFatherName',
  'patientGrandfatherName',
  'patientBirthdate',
  'patientGender',
  'patientPhone',
  'patientRegion',
  'patientZone',
  'patientWoreda',
  'patientMrn',
  'patientHealthId',
  'bloodPressure',
  'transfusionNeeded',
  'bloodGroup',
  'historyOfIllness',
  'physicalExamination',
  'investigationSummary',
  'diagnosis',
  'treatmentGiven',
  'chiefComplaints',
  'department',
  'requestedService',
  'reasonForReferral',
  'physicianName',
  'physicianPhone',
  'escortName',
  'escortPhone',
] as const;
const NUMBER_FIELDS = ['respiratoryRate', 'temperature', 'pulseRate', 'oxygenSaturation'] as const;
const REQUIRED = ['patientGivenName', 'patientFatherName', 'requestedService', 'reasonForReferral', 'patientType'];

function valuesFrom(r?: ReferralDetail | null): Values {
  const values: Values = { referralType: 'LOCAL', priority: 'COLD_CASE' };
  if (!r) {
    return values;
  }
  for (const key of [...TEXT_FIELDS, ...NUMBER_FIELDS]) {
    const raw = (r as unknown as Record<string, unknown>)[key];
    if (raw !== null && raw !== undefined) {
      values[key] = key === 'patientBirthdate' ? String(raw).slice(0, 10) : String(raw);
    }
  }
  return values;
}

/** Loads the draft (when editing) before mounting the form, so the form starts from real values. */
const ReferralFormPage: React.FC = () => {
  const { uuid } = useParams();
  const { data, isLoading, error } = useReferral(uuid);
  const { t } = useTranslation();

  if (uuid && isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonText heading width="30%" />
        <SkeletonText paragraph lineCount={10} />
      </div>
    );
  }
  if (uuid && (error || !data)) {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('referralLoadError', 'Could not load this referral.')}
          subtitle={error?.message}
        />
      </div>
    );
  }
  if (uuid && data.referral.status !== 'DRAFT') {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('onlyDraftsEditable', 'Only draft referrals can be edited.')}
        />
      </div>
    );
  }
  return <ReferralForm key={uuid ?? 'new'} initial={data?.referral ?? null} />;
};

const ReferralForm: React.FC<{ initial: ReferralDetail | null }> = ({ initial }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useCodeLabel();
  const [searchParams] = useSearchParams();
  const { options } = useReferralOptions();
  const [values, setValues] = useState<Values>(() => valuesFrom(initial));
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [patientQuery, setPatientQuery] = useState('');
  const debouncedPatientQuery = useDebounce(patientQuery, 300);
  const { matches, isLoading: searching } = usePatientSearch(debouncedPatientQuery);

  // Opened from a patient's chart: /referral/new?patientUuid=...
  const { patient: preselected } = usePatient(initial ? null : searchParams.get('patientUuid'));
  useEffect(() => {
    if (preselected) {
      setValues((prev) => ({ ...prev, ...demographicsFrom(preselected) }));
    }
  }, [preselected]);

  const v = (k: string) => values[k] ?? '';
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((prev) => ({ ...prev, [k]: e.target.value }));
  const invalid = (k: string) => touched && REQUIRED.includes(k) && !v(k).trim();

  const text = (k: string, labelText: string, props: Record<string, unknown> = {}) => (
    <TextInput
      id={k}
      labelText={labelText}
      value={v(k)}
      onChange={set(k)}
      invalid={invalid(k)}
      invalidText={t('required', 'Required')}
      {...props}
    />
  );
  const area = (k: string, labelText: string, rows = 3) => (
    <TextArea
      id={k}
      labelText={labelText}
      rows={rows}
      value={v(k)}
      onChange={set(k)}
      invalid={invalid(k)}
      invalidText={t('required', 'Required')}
    />
  );
  const num = (k: string, labelText: string, step = 1) => (
    <NumberInput
      id={k}
      label={labelText}
      hideSteppers
      allowEmpty
      step={step}
      value={v(k) === '' ? '' : Number(v(k))}
      onChange={(_e, { value }) => setValues((prev) => ({ ...prev, [k]: value === '' ? '' : String(value) }))}
    />
  );

  const save = async (andSubmit: boolean) => {
    setTouched(true);
    if (REQUIRED.some((k) => !v(k).trim())) {
      setError(t('fillRequired', 'Fill in the required fields.'));
      return;
    }
    setSaving(andSubmit ? 'submit' : 'draft');
    setError(null);
    // The module overwrites every field on save, so the whole draft is posted every time.
    const payload: Record<string, unknown> = { uuid: initial?.uuid };
    for (const k of TEXT_FIELDS) {
      payload[k] = v(k).trim() || null;
    }
    for (const k of NUMBER_FIELDS) {
      payload[k] = v(k) === '' ? null : Number(v(k));
    }
    try {
      const saved = await saveReferral(payload);
      const uuid = saved.referral.uuid;
      if (andSubmit) {
        try {
          await submitReferral(uuid);
        } catch (e) {
          // The draft exists now; staying here and retrying would save a second one.
          showSnackbar({
            kind: 'warning',
            title: t('savedNotSubmitted', 'Saved as draft, but not submitted'),
            subtitle: extractErrorMessage(e) ?? '',
          });
        }
      }
      navigate(`/${uuid}`);
    } catch (e) {
      setError(extractErrorMessage(e) ?? t('saveFailed', 'The referral could not be saved.'));
      setSaving(null);
    }
  };

  return (
    <div className={styles.page}>
      <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={() => navigate(-1)} className={styles.back}>
        {t('back', 'Back')}
      </Button>
      <h2 className={styles.title}>
        {initial ? t('editReferral', 'Edit referral') : t('newReferral', 'New referral')}
      </h2>
      <p className={styles.lede}>
        {t(
          'formLede',
          'Record what the receiving facility needs to decide. The liaison officer chooses the destination after you submit.',
        )}
      </p>

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('patient', 'Patient')}</legend>
          {!v('patientUuid') && (
            <div className={styles.patientSearch}>
              <Search
                size="md"
                labelText={t('findPatient', 'Find patient')}
                placeholder={t('findPatientPlaceholder', 'Search registered patients by name or MRN')}
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
              />
              {searching && <InlineLoading description={t('searching', 'Searching…')} />}
              {matches.length > 0 && (
                <ul className={styles.matches}>
                  {matches.map((p) => (
                    <li key={p.uuid}>
                      <button
                        type="button"
                        className={styles.match}
                        onClick={() => {
                          setValues((prev) => ({ ...prev, ...demographicsFrom(p) }));
                          setPatientQuery('');
                        }}>
                        <span>{p.display}</span>
                        <span className={styles.matchMeta}>
                          {[p.person.gender, p.person.birthdate?.slice(0, 10)].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {v('patientUuid') && (
            <p className={styles.linked}>
              {t('linkedToPatient', 'Linked to a registered patient.')}{' '}
              <Button kind="ghost" size="sm" onClick={() => setValues((prev) => ({ ...prev, patientUuid: '' }))}>
                {t('unlink', 'Unlink')}
              </Button>
            </p>
          )}
          <div className={styles.row3}>
            {text('patientGivenName', t('givenName', 'Given name'))}
            {text('patientFatherName', t('fatherName', "Father's name"))}
            {text('patientGrandfatherName', t('grandfatherName', "Grandfather's name"))}
          </div>
          <div className={styles.row4}>
            <Select
              id="patientGender"
              labelText={t('sex', 'Sex')}
              value={v('patientGender')}
              onChange={set('patientGender')}>
              <SelectItem value="" text="—" />
              <SelectItem value="F" text={t('female', 'Female')} />
              <SelectItem value="M" text={t('male', 'Male')} />
            </Select>
            {text('patientBirthdate', t('birthdate', 'Birthdate'), { type: 'date' })}
            {text('patientMrn', t('mrn', 'MRN'))}
            {text('patientHealthId', t('healthId', 'Health ID'))}
          </div>
          <div className={styles.row4}>
            {text('patientPhone', t('phone', 'Phone'))}
            {text('patientRegion', t('region', 'Region'))}
            {text('patientZone', t('zone', 'Zone'))}
            {text('patientWoreda', t('woreda', 'Woreda'))}
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('referral', 'Referral')}</legend>
          <div className={styles.row4}>
            <Select
              id="patientType"
              labelText={t('patientType', 'Patient type')}
              value={v('patientType')}
              onChange={set('patientType')}
              invalid={invalid('patientType')}
              invalidText={t('required', 'Required')}>
              <SelectItem value="" text={t('choose', 'Choose')} />
              {(options?.patientTypes ?? []).map((c) => (
                <SelectItem key={c} value={c} text={label('patientType', c)} />
              ))}
            </Select>
            <Select
              id="priority"
              labelText={t('priority', 'Priority')}
              value={v('priority')}
              onChange={set('priority')}>
              {(options?.priorities ?? ['COLD_CASE', 'EMERGENCY']).map((c) => (
                <SelectItem key={c} value={c} text={label('priority', c)} />
              ))}
            </Select>
            <Select
              id="referralType"
              labelText={t('referralType', 'Referral type')}
              value={v('referralType')}
              onChange={set('referralType')}>
              {(options?.types ?? ['LOCAL', 'ABROAD']).map((c) => (
                <SelectItem key={c} value={c} text={label('type', c)} />
              ))}
            </Select>
            {text('department', t('department', 'Department'))}
          </div>
          {text('requestedService', t('requestedService', 'Requested service'), {
            helperText: t('requestedServiceHelp', 'Must match a service in the catchment list, e.g. Surgery.'),
          })}
          {area('reasonForReferral', t('reasonForReferral', 'Reason for referral'))}
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('clinical', 'Clinical')}</legend>
          <div className={styles.row5}>
            {text('bloodPressure', t('bloodPressure', 'Blood pressure'), { placeholder: '120/80' })}
            {num('pulseRate', t('pulse', 'Pulse'))}
            {num('respiratoryRate', t('rr', 'RR'))}
            {num('temperature', t('tempC', 'Temp (°C)'), 0.1)}
            {num('oxygenSaturation', t('spo2', 'SpO₂ (%)'))}
          </div>
          {area('chiefComplaints', t('chiefComplaints', 'Chief complaints'), 2)}
          {area('historyOfIllness', t('historyOfIllness', 'History of illness'))}
          {area('physicalExamination', t('physicalExamination', 'Physical examination'))}
          {area('investigationSummary', t('investigations', 'Investigations'))}
          {area('diagnosis', t('diagnosis', 'Diagnosis'), 2)}
          {area('treatmentGiven', t('treatmentGiven', 'Treatment given'))}
          <div className={styles.row4}>
            {text('bloodGroup', t('bloodGroup', 'Blood group'))}
            <Select
              id="transfusionNeeded"
              labelText={t('transfusionNeeded', 'Transfusion needed')}
              value={v('transfusionNeeded')}
              onChange={set('transfusionNeeded')}>
              <SelectItem value="" text="—" />
              <SelectItem value="YES" text={t('yes', 'Yes')} />
              <SelectItem value="NO" text={t('no', 'No')} />
            </Select>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('contacts', 'Contacts')}</legend>
          <div className={styles.row4}>
            {text('physicianName', t('referringPhysician', 'Referring physician'))}
            {text('physicianPhone', t('physicianPhone', 'Physician phone'))}
            {text('escortName', t('escortName', 'Escort name'))}
            {text('escortPhone', t('escortPhone', 'Escort phone'))}
          </div>
        </fieldset>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('saveFailed', 'The referral could not be saved.')}
            subtitle={error}
          />
        )}

        <ButtonSet className={styles.buttons}>
          <Button kind="secondary" disabled={!!saving} onClick={() => save(false)}>
            {saving === 'draft' ? <InlineLoading description={t('saving', 'Saving…')} /> : t('saveDraft', 'Save draft')}
          </Button>
          <Button kind="primary" disabled={!!saving} onClick={() => save(true)}>
            {saving === 'submit' ? (
              <InlineLoading description={t('saving', 'Saving…')} />
            ) : (
              t('saveAndSubmit', 'Save and submit to liaison')
            )}
          </Button>
        </ButtonSet>
      </form>
    </div>
  );
};

export default ReferralFormPage;
