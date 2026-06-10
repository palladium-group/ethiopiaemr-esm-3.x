import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TimePicker,
  TimePickerSelect,
} from '@carbon/react';
import { formatDate, OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { useAppointmentServicesFull } from '../api/quota.resource';
import { parseDateKey } from '../quota/quota-form-props.helper';
import { convert12HourTimeTo24Hour, convert24HourTo12Hour } from '../quota/quota-form-dom.helper';
import { useQuotaEvaluation } from '../quota/use-quota-evaluation';
import type { AppointmentQuotaLaunchProps, QuotaLevel, QuotaLimitResult } from '../types';
import styles from './quota-overlay.scss';

type Meridiem = 'AM' | 'PM';

interface QuotaPanelContentProps {
  panelProps: AppointmentQuotaLaunchProps;
}

function getLevelClassName(level: QuotaLevel): string {
  switch (level) {
    case 'ok':
      return styles.levelOk;
    case 'warn':
      return styles.levelWarn;
    case 'full':
      return styles.levelFull;
    default:
      return styles.levelNone;
  }
}

function getLevelNotificationKind(level: QuotaLevel): 'info' | 'warning' | 'error' | undefined {
  switch (level) {
    case 'warn':
      return 'warning';
    case 'full':
      return 'error';
    default:
      return undefined;
  }
}

function initTimeState(time24?: string): { time12: string; meridiem: Meridiem } {
  if (!time24) {
    return { time12: '', meridiem: 'AM' };
  }

  const { time12, meridiem } = convert24HourTo12Hour(time24);
  return { time12, meridiem };
}

const QuotaLimitRow: React.FC<{ limit: QuotaLimitResult }> = ({ limit }) => {
  const { t } = useTranslation();
  const percentUsed = limit.limit > 0 ? Math.round((limit.booked / limit.limit) * 100) : 0;

  return (
    <div className={classNames(styles.limitRow, getLevelClassName(limit.level))}>
      <div className={styles.limitHeader}>{limit.label}</div>
      <div className={styles.limitMeta}>
        {t('quotaBookedOfLimit', '{{booked}} / {{limit}} booked ({{percent}}%)', {
          booked: limit.booked,
          limit: limit.limit,
          percent: percentUsed,
        })}
      </div>
    </div>
  );
};

/**
 * The interactive quota panel body: service / date / time inputs plus the
 * evaluated capacity status. Self-contained — keeps its own form state and
 * re-syncs whenever `panelProps` (from the booking form) changes.
 */
const QuotaPanelContent: React.FC<QuotaPanelContentProps> = ({ panelProps }) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { appointmentServices, isLoading: isLoadingServices } = useAppointmentServicesFull();

  const [serviceUuid, setServiceUuid] = useState(panelProps?.serviceUuid ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(parseDateKey(panelProps?.date));
  const [isRecurring, setIsRecurring] = useState(panelProps?.isRecurring ?? false);

  const [startTime12, setStartTime12] = useState(() => initTimeState(panelProps?.startTime).time12);
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>(() => initTimeState(panelProps?.startTime).meridiem);
  const [endTime12, setEndTime12] = useState(() => initTimeState(panelProps?.endTime).time12);
  const [endMeridiem, setEndMeridiem] = useState<Meridiem>(() => initTimeState(panelProps?.endTime).meridiem);

  // Re-sync from booking-form-driven props whenever they change.
  useEffect(() => {
    if (panelProps?.serviceUuid) {
      setServiceUuid(panelProps.serviceUuid);
    }
    if (panelProps?.date) {
      setSelectedDate(parseDateKey(panelProps.date));
    }
    if (panelProps?.startTime) {
      const { time12, meridiem } = convert24HourTo12Hour(panelProps.startTime);
      setStartTime12(time12);
      setStartMeridiem(meridiem);
    }
    if (panelProps?.endTime) {
      const { time12, meridiem } = convert24HourTo12Hour(panelProps.endTime);
      setEndTime12(time12);
      setEndMeridiem(meridiem);
    }
    if (panelProps?.isRecurring !== undefined) {
      setIsRecurring(panelProps.isRecurring);
    }
  }, [panelProps]);

  const startTime24 = useMemo(
    () => (startTime12 ? convert12HourTimeTo24Hour(startTime12, startMeridiem) ?? '' : ''),
    [startTime12, startMeridiem],
  );
  const endTime24 = useMemo(
    () => (endTime12 ? convert12HourTimeTo24Hour(endTime12, endMeridiem) ?? '' : ''),
    [endTime12, endMeridiem],
  );

  const { evaluation, isLoading, error } = useQuotaEvaluation({
    serviceUuid: serviceUuid || undefined,
    date: selectedDate,
    startTime: startTime24 || undefined,
    endTime: endTime24 || undefined,
    enabled: config.enabled && Boolean(serviceUuid && selectedDate),
  });

  const primaryNotificationKind = evaluation ? getLevelNotificationKind(evaluation.primaryLevel) : undefined;

  return (
    <div className={styles.panelBody}>
      <Stack gap={5} className={styles.formSection}>
        <OpenmrsDatePicker
          id="quota-date-picker"
          labelText={t('quotaDate', 'Date')}
          value={selectedDate ?? undefined}
          onChange={(date) => setSelectedDate(date ?? null)}
        />

        <Select
          id="quota-service-select"
          labelText={t('quotaService', 'Appointment service')}
          value={serviceUuid}
          onChange={(event) => setServiceUuid(event.target.value)}
          disabled={isLoadingServices}>
          <SelectItem text={t('quotaSelectService', 'Select a service')} value="" />
          {appointmentServices.map((service) => (
            <SelectItem key={service.uuid} text={service.name} value={service.uuid} />
          ))}
        </Select>

        <TimePicker
          id="quota-start-time"
          labelText={t('quotaStartTime', 'Start time (optional)')}
          placeholder="hh:mm"
          pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$"
          value={startTime12}
          onChange={(event) => setStartTime12(event.target.value)}>
          <TimePickerSelect
            id="quota-start-meridiem"
            aria-label={t('quotaStartMeridiem', 'AM/PM')}
            value={startMeridiem}
            onChange={(event) => setStartMeridiem(event.target.value as Meridiem)}>
            <SelectItem value="AM" text="AM" />
            <SelectItem value="PM" text="PM" />
          </TimePickerSelect>
        </TimePicker>

        <TimePicker
          id="quota-end-time"
          labelText={t('quotaEndTime', 'End time (optional)')}
          placeholder="hh:mm"
          pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$"
          value={endTime12}
          onChange={(event) => setEndTime12(event.target.value)}>
          <TimePickerSelect
            id="quota-end-meridiem"
            aria-label={t('quotaEndMeridiem', 'AM/PM')}
            value={endMeridiem}
            onChange={(event) => setEndMeridiem(event.target.value as Meridiem)}>
            <SelectItem value="AM" text="AM" />
            <SelectItem value="PM" text="PM" />
          </TimePickerSelect>
        </TimePicker>
      </Stack>

      <div className={styles.resultsSection}>
        <div className={styles.sectionTitle}>{t('quotaResults', 'Capacity status')}</div>

        {isRecurring && (
          <InlineNotification
            kind="info"
            lowContrast
            subtitle={t(
              'recurringQuotaNote',
              'Showing capacity for the first appointment date only. Check each date in the series individually.',
            )}
            title={t('recurringAppointment', 'Recurring appointment')}
          />
        )}

        {!serviceUuid || !selectedDate ? (
          <InlineNotification
            kind="info"
            lowContrast
            subtitle={t('quotaSelectServiceAndDate', 'Choose a service and date to check capacity.')}
            title={t('quotaAwaitingInput', 'Waiting for input')}
          />
        ) : isLoading ? (
          <InlineLoading description={t('quotaLoading', 'Checking capacity...')} />
        ) : error ? (
          <InlineNotification
            kind="error"
            lowContrast
            subtitle={t('quotaLoadError', 'Could not load capacity data. Try again.')}
            title={t('error', 'Error')}
          />
        ) : evaluation ? (
          <>
            {primaryNotificationKind && (
              <InlineNotification
                kind={primaryNotificationKind}
                lowContrast
                subtitle={
                  evaluation.primaryLevel === 'full'
                    ? t('quotaFullMessage', 'This service is at or over its configured limit for the selected scope.')
                    : t('quotaWarnMessage', 'This service is nearing its configured limit for the selected scope.')
                }
                title={
                  evaluation.primaryLevel === 'full'
                    ? t('quotaFull', 'At capacity')
                    : t('quotaNearCapacity', 'Near capacity')
                }
              />
            )}

            {evaluation.limits.length === 0 ? (
              <InlineNotification
                kind="info"
                lowContrast
                subtitle={t(
                  'quotaNoLimitsConfigured',
                  'No day or service limits are configured for this service on the selected date.',
                )}
                title={t('quotaNoLimits', 'No limits apply')}
              />
            ) : (
              evaluation.limits.map((limit) => <QuotaLimitRow key={`${limit.type}-${limit.label}`} limit={limit} />)
            )}

            <div className={styles.limitMeta}>
              {t('quotaCheckedForDate', 'Checked for {{date}}', {
                date: formatDate(selectedDate, { mode: 'standard', time: false }),
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default QuotaPanelContent;
