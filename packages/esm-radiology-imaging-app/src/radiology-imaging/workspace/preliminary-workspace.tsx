import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import Color from '@tiptap/extension-color';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Controller, useForm } from 'react-hook-form';
import { Button, ButtonSet, FormLabel, InlineLoading, InlineNotification } from '@carbon/react';
import {
  formatDatetime,
  parseDate,
  showSnackbar,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { updateOrderFulfillmentStatus } from '../../resources/hooks/useOrders';
import {
  amendAndFinalizePreliminaryReport,
  cleanWordHtml,
  decodeHtmlEntities,
  type PreliminaryReportPayload,
  preliminaryReportSchema,
  resubmitPreliminaryReport,
  savePreliminaryReport,
} from './preliminary.resource';
import PreliminaryEditorToolbar from './preliminary-editor-toolbar.component';
import TemplatePickerModal from './template-picker-modal.component';
import styles from './preliminary-workspace.scss';
import classNames from 'classnames';
import { type RadiologyOrder } from '../types';
import { ProcedureInfoCard } from '../../components/procedure-info-card/procedure-info-card.component';
import PatientCard from '../../components/patient-card/patient-card.component';

interface PreliminaryWorkspaceProps {
  patientUuid?: string;
  orderUuid?: string;
  order?: RadiologyOrder;
  mutate: () => void;
}

const tiptapExtensions = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TiptapImage.configure({ inline: false, allowBase64: true }),
  TiptapTable.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

const PreliminaryWorkspace: React.FC<Workspace2DefinitionProps<PreliminaryWorkspaceProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const isTablet = useLayoutType() === 'tablet';
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const { orderUuid = '', order, mutate: orderMutate } = workspaceProps ?? {};
  const procedure = order?.procedures?.[0];
  const { t } = useTranslation();
  const isAmendMode = !!procedure;
  const isRevisionMode = procedure?.status === 'REVISION_REQUESTED';

  const initialFindings = isAmendMode ? procedure?.preliminaryReport ?? '' : '';
  const initialImpression = isAmendMode ? procedure?.impressions ?? '' : '';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PreliminaryReportPayload>({
    resolver: zodResolver(preliminaryReportSchema),
    defaultValues: { preliminaryReport: initialFindings, preliminaryImpression: initialImpression },
  });

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: '',
    editorProps: {
      attributes: { class: styles.editorArea },
      transformPastedHTML: cleanWordHtml,
    },
    onCreate: ({ editor: e }) => {
      if (initialFindings) {
        e.commands.setContent(decodeHtmlEntities(initialFindings));
      }
    },
    onUpdate: ({ editor: e }) => {
      setValue('preliminaryReport', e.getHTML(), { shouldDirty: true, shouldValidate: true });
    },
  });

  const impressionEditor = useEditor({
    extensions: tiptapExtensions,
    content: '',
    editorProps: {
      attributes: { class: styles.editorArea },
      transformPastedHTML: cleanWordHtml,
    },
    onCreate: ({ editor: e }) => {
      if (initialImpression) {
        e.commands.setContent(decodeHtmlEntities(initialImpression));
      }
    },
    onUpdate: ({ editor: e }) => {
      setValue('preliminaryImpression', e.getHTML(), { shouldDirty: true, shouldValidate: true });
    },
  });

  const onSubmit = useCallback(
    async (values: PreliminaryReportPayload) => {
      try {
        if (isRevisionMode) {
          await resubmitPreliminaryReport(
            procedure?.uuid ?? '',
            values.preliminaryReport,
            values.preliminaryImpression,
          );
          showSnackbar({
            title: t('reportResubmitted', 'Report resubmitted'),
            subtitle: t('reportResubmittedSubtitle', 'The revised report has been sent for review.'),
            kind: 'success',
            isLowContrast: true,
          });
        } else if (isAmendMode) {
          await amendAndFinalizePreliminaryReport(
            procedure?.uuid ?? '',
            values.preliminaryReport,
            values.preliminaryImpression,
          );
          showSnackbar({
            title: t('reportFinalized', 'Report finalized'),
            subtitle: t('reportFinalizedSubtitle', 'The report has been approved and finalized.'),
            kind: 'success',
            isLowContrast: true,
          });
        } else {
          await updateOrderFulfillmentStatus(orderUuid, 'COMPLETED');
          await savePreliminaryReport({
            orderUuid,
            preliminaryReport: values.preliminaryReport,
            impressions: values.preliminaryImpression,
            status: 'PRELIMINARY',
          });
          showSnackbar({
            title: t('reportSaved', 'Report saved'),
            subtitle: t('reportSavedSubtitle', 'The preliminary report has been saved.'),
            kind: 'success',
            isLowContrast: true,
          });
        }
        orderMutate?.();
        closeWorkspace?.({ discardUnsavedChanges: true });
      } catch {
        let errorTitle: string;
        if (isRevisionMode) {
          errorTitle = t('resubmitError', 'Failed to resubmit report');
        } else if (isAmendMode) {
          errorTitle = t('finalizeError', 'Failed to finalize report');
        } else {
          errorTitle = t('saveError', 'Failed to save report');
        }
        showSnackbar({
          title: errorTitle,
          kind: 'error',
          isLowContrast: true,
        });
      }
    },
    [orderUuid, closeWorkspace, isAmendMode, isRevisionMode, procedure, t, orderMutate],
  );

  if (!editor || !impressionEditor) {
    return null;
  }

  const effectiveOrder = (procedure?.parentOrder ?? order) as unknown as RadiologyOrder;
  const isSubmitDisabled = isSubmitting || (!isAmendMode && !isDirty);

  let workspaceTitle: string;
  if (isRevisionMode) {
    workspaceTitle = t('revisePreliminaryReport', 'Revise Preliminary Report');
  } else if (isAmendMode) {
    workspaceTitle = t('amendAndFinalizeReport', 'Amend & Finalize Report');
  } else {
    workspaceTitle = t('preliminaryReport', 'Preliminary Report');
  }

  let submitLabel: string;
  if (isRevisionMode) {
    submitLabel = t('resubmitForReview', 'Resubmit for review');
  } else if (isAmendMode) {
    submitLabel = t('approveAndFinalize', 'Approve & Finalize');
  } else {
    submitLabel = t('saveAndClose', 'Save & close');
  }

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={isDirty}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formHeader}>
          {isRevisionMode && procedure?.revisionComment && (
            <InlineNotification
              kind="warning"
              title={t('revisionRequestedTitle', 'Revision requested')}
              subtitle={procedure.revisionComment}
              lowContrast
              hideCloseButton
            />
          )}
          {isAmendMode && !isRevisionMode && (
            <InlineNotification
              kind="info"
              title={t('amendModeTitle', 'Amend & Finalize')}
              subtitle={t(
                'amendModeSubtitle',
                'You are editing a preliminary report. Saving will approve and finalize it.',
              )}
              lowContrast
              hideCloseButton
            />
          )}
          {effectiveOrder?.patient && (
            <PatientCard patient={effectiveOrder.patient} status={effectiveOrder.fulfillerStatus} compact />
          )}
          <ProcedureInfoCard
            items={[
              {
                label: t('studyDate', 'Study Date'),
                value: (() => {
                  const dateStr = effectiveOrder?.scheduledDate ?? effectiveOrder?.dateActivated;
                  return dateStr ? formatDatetime(parseDate(dateStr), { noToday: true }) : '—';
                })(),
              },
              { label: t('procedure', 'Procedure'), value: effectiveOrder?.concept?.display },
            ]}
          />
          <div className={styles.clinicalHistory}>
            <FormLabel className={styles.label}>{t('clinicalHistory', 'Clinical History')}</FormLabel>
            <p>{effectiveOrder?.orderReason?.display ?? effectiveOrder?.orderReasonNonCoded}</p>
          </div>
        </div>

        <div className={styles.formContainer}>
          <Controller
            name="preliminaryReport"
            control={control}
            render={() => (
              <div>
                <div className={styles.labelRow}>
                  <FormLabel className={styles.label}>
                    {isAmendMode ? t('findings', 'Findings') : t('preliminaryFindings', 'Preliminary Findings')}
                  </FormLabel>
                  <Button
                    kind="ghost"
                    size="sm"
                    className={styles.templateButton}
                    onClick={() => setIsTemplateModalOpen(true)}>
                    {t('useTemplate', 'Use template')}
                  </Button>
                </div>
                <PreliminaryEditorToolbar editor={editor} />
                <EditorContent editor={editor} className={styles.editorWrapper} />
                {errors.preliminaryReport && <p className={styles.errorText}>{errors.preliminaryReport.message}</p>}
              </div>
            )}
          />
          <TemplatePickerModal
            open={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            onSelect={(html) => {
              editor.commands.setContent(html);
              setValue('preliminaryReport', html, { shouldDirty: true, shouldValidate: true });
            }}
          />

          <Controller
            name="preliminaryImpression"
            control={control}
            render={() => (
              <div>
                <FormLabel className={styles.label}>
                  {isAmendMode ? t('impression', 'Impression') : t('preliminaryImpression', 'Preliminary Impression')}
                </FormLabel>
                <PreliminaryEditorToolbar editor={impressionEditor} />
                <EditorContent editor={impressionEditor} className={styles.editorWrapper} />
                {errors.preliminaryImpression && (
                  <p className={styles.errorText}>{errors.preliminaryImpression.message}</p>
                )}
              </div>
            )}
          />
        </div>

        <ButtonSet
          className={classNames({
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}>
          <Button className={styles.buttonContainer} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button className={styles.buttonContainer} disabled={isSubmitDisabled} kind="primary" type="submit">
            {isSubmitting ? (
              <span className={styles.inlineLoading}>
                {isAmendMode ? t('finalizing', 'Finalizing...') : t('submitting', 'Submitting...')}
                <InlineLoading status="active" iconDescription="Loading" />
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </ButtonSet>
      </form>
    </Workspace2>
  );
};

export default PreliminaryWorkspace;
