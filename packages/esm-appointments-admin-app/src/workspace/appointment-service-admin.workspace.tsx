import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Button, ButtonSet, Form, InlineLoading, NumberInput, Stack, TextInput } from '@carbon/react';
import { Add, Copy, TrashCan } from '@carbon/react/icons';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { type DefaultWorkspaceProps, ResponsiveWrapper, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { revalidateAppointmentServices, saveAppointmentService } from '../api/appointment-service.resource';
import { DAYS_OF_WEEK, type DayOfWeek } from '../constants';
import type { AppointmentService, AppointmentServiceFormValues } from '../types';
import {
  getDayBlockTotal,
  getErrorMessage,
  mapFormValuesToSavePayload,
  mapServiceToFormValues,
} from './appointment-service-form.helper';
import CopyDayBlocksModal from './copy-day-blocks-modal.component';
import { copyDayBlocksToDays, type CopyDayBlocksMode } from './copy-day-blocks.helper';
import styles from './appointment-service-admin.workspace.scss';

type AppointmentServiceAdminWorkspaceProps = DefaultWorkspaceProps & {
  appointmentService?: AppointmentService;
};

const defaultBlockTimes = {
  startTime: '09:00',
  endTime: '17:00',
};

const AppointmentServiceAdminWorkspace: React.FC<AppointmentServiceAdminWorkspaceProps> = ({
  appointmentService,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const [copySourceDay, setCopySourceDay] = useState<DayOfWeek | null>(null);
  const defaultValues = useMemo(
    () =>
      appointmentService ? mapServiceToFormValues(appointmentService) : { maxAppointmentsLimit: null, blocks: [] },
    [appointmentService],
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<AppointmentServiceFormValues>({
    defaultValues,
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'blocks',
    keyName: 'clientId',
  });

  const blocks = watch('blocks');

  useEffect(() => {
    if (appointmentService) {
      reset(mapServiceToFormValues(appointmentService));
    }
  }, [appointmentService, reset]);

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const getDayLabel = (day: DayOfWeek) => {
    const labels: Record<DayOfWeek, string> = {
      MONDAY: t('dayMonday', 'Monday'),
      TUESDAY: t('dayTuesday', 'Tuesday'),
      WEDNESDAY: t('dayWednesday', 'Wednesday'),
      THURSDAY: t('dayThursday', 'Thursday'),
      FRIDAY: t('dayFriday', 'Friday'),
      SATURDAY: t('daySaturday', 'Saturday'),
      SUNDAY: t('daySunday', 'Sunday'),
    };
    return labels[day];
  };

  const handleAddBlock = (dayOfWeek: DayOfWeek) => {
    append({
      clientId: crypto.randomUUID(),
      dayOfWeek,
      startTime: defaultBlockTimes.startTime,
      endTime: defaultBlockTimes.endTime,
      maxAppointmentsLimit: null,
      voided: false,
    });
  };

  const handleCopyDayBlocks = (targetDays: Array<DayOfWeek>, mode: CopyDayBlocksMode) => {
    if (!copySourceDay) {
      return;
    }

    const sourceDay = copySourceDay;
    const nextBlocks = copyDayBlocksToDays(blocks, sourceDay, targetDays, mode);
    setValue('blocks', nextBlocks, { shouldDirty: true });
    setCopySourceDay(null);

    showSnackbar({
      title: t('success', 'Success'),
      kind: 'success',
      subtitle: t('copyDayBlocksSuccess', 'Copied blocks from {{sourceDay}} to {{count}} day(s).', {
        sourceDay: getDayLabel(sourceDay),
        count: targetDays.length,
      }),
      isLowContrast: true,
    });
  };

  const handleRemoveBlock = (index: number) => {
    const block = blocks[index];
    if (block?.uuid) {
      update(index, { ...block, voided: true });
      return;
    }

    remove(index);
  };

  const onSubmit = async (values: AppointmentServiceFormValues) => {
    if (!appointmentService) {
      return;
    }

    try {
      const payload = mapFormValuesToSavePayload(appointmentService, values);
      await saveAppointmentService(payload);
      await revalidateAppointmentServices();

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('serviceAvailabilitySaved', 'Availability saved for {{serviceName}}.', {
          serviceName: appointmentService.name,
        }),
      });

      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(
          error,
          t('serviceAvailabilitySaveError', 'Error saving appointment service availability'),
        ),
      });
    }
  };

  if (!appointmentService) {
    return (
      <div className={styles.formContainer}>
        <p>{t('selectServiceFromList', 'Select a service from the list to configure availability.')}</p>
      </div>
    );
  }

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formContainer}>
        <p className={styles.serviceName}>{appointmentService.name}</p>

        <Stack gap={6}>
          <ResponsiveWrapper>
            <Controller
              control={control}
              name="maxAppointmentsLimit"
              render={({ field }) => (
                <NumberInput
                  id="maxAppointmentsLimit"
                  label={t('serviceMaxAppointmentsLimit', 'Service max appointments (daily cap)')}
                  helperText={t(
                    'serviceMaxAppointmentsLimitHelper',
                    'Optional overall limit for this service. Weekly block limits are summed per day.',
                  )}
                  min={0}
                  value={field.value ?? ''}
                  onChange={(_, { value }) => {
                    if (value === '' || value === undefined) {
                      field.onChange(null);
                      return;
                    }
                    field.onChange(Number(value));
                  }}
                />
              )}
            />
          </ResponsiveWrapper>

          <div>
            <h4 className={styles.sectionTitle}>{t('weeklyAvailability', 'Weekly availability')}</h4>

            {DAYS_OF_WEEK.map((day) => {
              const dayBlocks = fields
                .map((field, index) => ({ field, index }))
                .filter(({ index }) => blocks[index]?.dayOfWeek === day && !blocks[index]?.voided);

              return (
                <section className={styles.daySection} key={day}>
                  <div className={styles.dayHeader}>
                    <h5 className={styles.dayTitle}>{getDayLabel(day)}</h5>
                    <div className={styles.dayActions}>
                      <Button
                        disabled={dayBlocks.length === 0}
                        kind="ghost"
                        renderIcon={Copy}
                        size="sm"
                        onClick={() => setCopySourceDay(day)}>
                        {t('copyToOtherDays', 'Copy to other days')}
                      </Button>
                      <Button kind="ghost" renderIcon={Add} size="sm" onClick={() => handleAddBlock(day)}>
                        {t('addBlock', 'Add block')}
                      </Button>
                    </div>
                  </div>

                  {dayBlocks.length === 0 ? (
                    <p className={styles.emptyDay}>{t('noBlocksForDay', 'No availability blocks for this day.')}</p>
                  ) : (
                    dayBlocks.map(({ field, index }) => (
                      <div className={styles.blockRow} key={field.clientId}>
                        <Controller
                          control={control}
                          name={`blocks.${index}.startTime`}
                          rules={{ required: t('startTimeRequired', 'Start time is required') }}
                          render={({ field: timeField, fieldState }) => (
                            <TextInput
                              id={`${field.clientId}-start`}
                              labelText={t('startTime', 'Start time')}
                              placeholder="09:00"
                              type="time"
                              value={timeField.value}
                              onChange={timeField.onChange}
                              invalid={!!fieldState.error}
                              invalidText={fieldState.error?.message}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name={`blocks.${index}.endTime`}
                          rules={{ required: t('endTimeRequired', 'End time is required') }}
                          render={({ field: timeField, fieldState }) => (
                            <TextInput
                              id={`${field.clientId}-end`}
                              labelText={t('endTime', 'End time')}
                              placeholder="17:00"
                              type="time"
                              value={timeField.value}
                              onChange={timeField.onChange}
                              invalid={!!fieldState.error}
                              invalidText={fieldState.error?.message}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name={`blocks.${index}.maxAppointmentsLimit`}
                          render={({ field: limitField }) => (
                            <NumberInput
                              id={`${field.clientId}-limit`}
                              label={t('blockMaxAppointments', 'Block limit')}
                              min={0}
                              value={limitField.value ?? ''}
                              onChange={(_, { value }) => {
                                if (value === '' || value === undefined) {
                                  limitField.onChange(null);
                                  return;
                                }
                                limitField.onChange(Number(value));
                              }}
                            />
                          )}
                        />
                        <Button
                          kind="danger--ghost"
                          renderIcon={TrashCan}
                          iconDescription={t('removeBlock', 'Remove block')}
                          hasIconOnly
                          onClick={() => handleRemoveBlock(index)}
                        />
                      </div>
                    ))
                  )}

                  <p className={styles.dayTotal}>
                    {t('dayBlockTotal', 'Day total: {{total}}', {
                      total: getDayBlockTotal(blocks, day),
                    })}
                  </p>
                </section>
              );
            })}
          </div>
        </Stack>
      </div>

      <CopyDayBlocksModal
        open={copySourceDay !== null}
        sourceDay={copySourceDay}
        getDayLabel={getDayLabel}
        onClose={() => setCopySourceDay(null)}
        onApply={handleCopyDayBlocks}
      />

      <ButtonSet className={classNames(styles.buttonSet, { [styles.buttonSetTablet]: isTablet })}>
        <Button kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={isSubmitting || !isDirty} kind="primary" type="submit">
          {isSubmitting ? (
            <span className={styles.inlineLoading}>
              {t('saving', 'Saving')}
              <InlineLoading />
            </span>
          ) : (
            t('saveAndClose', 'Save & close')
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default AppointmentServiceAdminWorkspace;
