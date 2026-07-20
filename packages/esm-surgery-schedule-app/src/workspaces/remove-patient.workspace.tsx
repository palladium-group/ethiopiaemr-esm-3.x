import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Form, InlineLoading, Stack, TextArea, Tile } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { ResponsiveWrapper, showSnackbar, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { getApiErrorMessage, removePatient } from '../api/elective-surgery-schedule.resource';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';
import styles from './workspace.scss';

export type RemovePatientWorkspaceProps = {
  scheduleItem: ElectiveSurgeryScheduleItem;
  onSaved?: () => void;
};

interface RemoveFormValues {
  reason: string;
}

const RemoveElectiveSurgeryPatientWorkspace: React.FC<Workspace2DefinitionProps<RemovePatientWorkspaceProps>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const scheduleItem = workspaceProps?.scheduleItem;
  const onSaved = workspaceProps?.onSaved;

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<RemoveFormValues>({
    defaultValues: {
      reason: '',
    },
  });

  const onSubmit = async (values: RemoveFormValues) => {
    const reason = values.reason?.trim();
    if (!scheduleItem || !reason) {
      return;
    }

    try {
      await removePatient(scheduleItem.uuid, { reason });

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('patientRemoved', 'Patient removed from elective surgery schedule.'),
        isLowContrast: true,
      });

      onSaved?.();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getApiErrorMessage(error, t('patientRemoveError', 'Unable to remove patient.')),
        isLowContrast: true,
      });
    }
  };

  return (
    <Workspace2 title={t('removePatient', 'Remove patient')} hasUnsavedChanges={isDirty}>
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
                  name="reason"
                  rules={{ required: t('removalReasonRequired', 'Removal reason is required.') }}
                  render={({ field, fieldState }) => (
                    <TextArea
                      id="removal-reason"
                      labelText={t('removalReason', 'Removal reason')}
                      rows={4}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!fieldState.error}
                      invalidText={fieldState.error?.message}
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
            <Button disabled={isSubmitting} kind="danger" type="submit">
              {isSubmitting ? (
                <span className={styles.inlineLoading}>
                  {t('saving', 'Saving')}
                  <InlineLoading />
                </span>
              ) : (
                t('removePatient', 'Remove patient')
              )}
            </Button>
          </ButtonSet>
        </Form>
      )}
    </Workspace2>
  );
};

export default RemoveElectiveSurgeryPatientWorkspace;
