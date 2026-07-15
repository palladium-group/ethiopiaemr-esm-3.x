import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, ComboBox, Form, InlineLoading, Stack, TextArea, Tile } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { ResponsiveWrapper, showSnackbar, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { getApiErrorMessage, recordContactOutcome } from '../api/elective-surgery-schedule.resource';
import type { ContactOutcome, ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';
import { CONTACT_OUTCOME_OPTIONS } from '../utils/schedule-status.utils';
import styles from './workspace.scss';

export type RecordContactWorkspaceProps = {
  scheduleItem: ElectiveSurgeryScheduleItem;
  onSaved?: () => void;
};

interface ContactFormValues {
  outcome: ContactOutcome | null;
  notes: string;
}

const RecordElectiveSurgeryContactWorkspace: React.FC<Workspace2DefinitionProps<RecordContactWorkspaceProps>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const scheduleItem = workspaceProps?.scheduleItem;
  const onSaved = workspaceProps?.onSaved;

  const outcomeItems = CONTACT_OUTCOME_OPTIONS.map((option) => ({
    id: option.value,
    text: t(option.labelKey, option.defaultLabel),
  }));

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: {
      outcome: null,
      notes: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    if (!scheduleItem || !values.outcome) {
      return;
    }

    try {
      await recordContactOutcome(scheduleItem.uuid, {
        outcome: values.outcome,
        note: values.notes?.trim() || undefined,
      });

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('contactOutcomeSaved', 'Contact outcome recorded.'),
        isLowContrast: true,
      });

      onSaved?.();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getApiErrorMessage(error, t('contactOutcomeSaveError', 'Unable to record contact outcome.')),
        isLowContrast: true,
      });
    }
  };

  return (
    <Workspace2 title={t('recordContactOutcome', 'Record contact outcome')} hasUnsavedChanges={isDirty}>
      {!scheduleItem?.patient ? (
        <div className={styles.formContainer}>
          <Tile>
            <p>{t('scheduleItemMissing', 'Schedule details are missing. Close this workspace and try again.')}</p>
          </Tile>
        </div>
      ) : (
        <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formContainer}>
            <p className={styles.patientName}>{scheduleItem.patient.display}</p>

            <Stack gap={6}>
              <ResponsiveWrapper>
                <Controller
                  control={control}
                  name="outcome"
                  rules={{ required: t('contactOutcomeRequired', 'Contact outcome is required.') }}
                  render={({ field, fieldState }) => (
                    <ComboBox
                      id="contact-outcome"
                      titleText={t('contactOutcome', 'Contact outcome')}
                      items={outcomeItems}
                      itemToString={(item) => item?.text ?? ''}
                      selectedItem={outcomeItems.find((item) => item.id === field.value) ?? null}
                      onChange={({ selectedItem }) => field.onChange((selectedItem?.id as ContactOutcome) ?? null)}
                      invalid={!!fieldState.error}
                      invalidText={fieldState.error?.message}
                    />
                  )}
                />
              </ResponsiveWrapper>

              <ResponsiveWrapper>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <TextArea
                      id="contact-notes"
                      labelText={t('notes', 'Notes')}
                      rows={4}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </ResponsiveWrapper>
            </Stack>
          </div>

          <ButtonSet className={styles.buttonSet}>
            <Button kind="secondary" onClick={() => closeWorkspace()}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button disabled={isSubmitting} kind="primary" type="submit">
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
      )}
    </Workspace2>
  );
};

export default RecordElectiveSurgeryContactWorkspace;
