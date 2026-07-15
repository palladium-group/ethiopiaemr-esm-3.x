import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Form, InlineLoading, Stack, TextArea, Tile } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { ResponsiveWrapper, showSnackbar, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { getApiErrorMessage, returnFromAdmission } from '../api/elective-surgery-schedule.resource';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';
import styles from './workspace.scss';

export type ReturnFromAdmissionWorkspaceProps = {
  scheduleItem: ElectiveSurgeryScheduleItem;
  onSaved?: () => void;
};

interface ReturnFormValues {
  reason: string;
}

const ReturnFromSurgicalAdmissionWorkspace: React.FC<Workspace2DefinitionProps<ReturnFromAdmissionWorkspaceProps>> = ({
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
  } = useForm<ReturnFormValues>({
    defaultValues: {
      reason: '',
    },
  });

  const onSubmit = async (values: ReturnFormValues) => {
    const reason = values.reason?.trim();
    if (!scheduleItem || !reason) {
      return;
    }

    try {
      await returnFromAdmission(scheduleItem.uuid, { reason });

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('returnFromAdmissionSuccess', 'Patient returned from admission.'),
        isLowContrast: true,
      });

      onSaved?.();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getApiErrorMessage(error, t('returnFromAdmissionError', 'Unable to return patient from admission.')),
        isLowContrast: true,
      });
    }
  };

  return (
    <Workspace2 title={t('returnFromAdmission', 'Return from admission')} hasUnsavedChanges={isDirty}>
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
                  rules={{ required: t('returnReasonRequired', 'Return reason is required.') }}
                  render={({ field, fieldState }) => (
                    <TextArea
                      id="return-reason"
                      labelText={t('returnReason', 'Return reason')}
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

export default ReturnFromSurgicalAdmissionWorkspace;
