import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Form, InlineLoading, Stack, TextInput } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { EditorContent, useEditor } from '@tiptap/react';
import { type DefaultWorkspaceProps, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import PreliminaryEditorToolbar from '../../radiology-imaging/workspace/preliminary-editor-toolbar.component';
import { parseReportContent, stringifyTipTapDoc } from '../../radiology-imaging/workspace/report-content';
import { tiptapExtensions } from '../../radiology-imaging/workspace/tiptap-extensions';
import {
  getErrorMessage,
  revalidateRadiologyReportTemplates,
  saveRadiologyReportTemplate,
} from '../api/report-template.resource';
import type { RadiologyReportTemplate } from '../types';
import styles from './radiology-template-admin.workspace.scss';

interface TemplateFormValues {
  name: string;
}

type RadiologyTemplateAdminWorkspaceProps = DefaultWorkspaceProps & {
  template?: RadiologyReportTemplate;
};

const RadiologyTemplateAdminWorkspace: React.FC<RadiologyTemplateAdminWorkspaceProps> = ({
  template,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TemplateFormValues>({
    defaultValues: { name: template?.name ?? '' },
  });

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: parseReportContent(template?.contentJson),
    editorProps: {
      attributes: { class: styles.editorArea },
    },
  });

  useEffect(() => {
    promptBeforeClosing(() => isDirty || Boolean(editor?.isFocused));
  }, [editor, isDirty, promptBeforeClosing]);

  const onSubmit = async (values: TemplateFormValues) => {
    if (!editor) {
      return;
    }

    const contentJson = stringifyTipTapDoc(editor.getJSON());
    try {
      await saveRadiologyReportTemplate({ name: values.name.trim(), contentJson }, template?.uuid);
      await revalidateRadiologyReportTemplates();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: template
          ? t('templateUpdated', 'Report template updated.')
          : t('templateCreated', 'Report template created.'),
        isLowContrast: true,
      });
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(error, t('templateSaveFailed', 'Failed to save report template.')),
        isLowContrast: true,
      });
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={5} className={styles.formContainer}>
        <Controller
          name="name"
          control={control}
          rules={{ required: t('templateNameRequired', 'Template name is required.') }}
          render={({ field }) => (
            <TextInput
              id="radiology-template-name"
              labelText={t('templateName', 'Template name')}
              required
              autoFocus
              invalid={Boolean(errors.name)}
              invalidText={errors.name?.message}
              {...field}
            />
          )}
        />
        <div>
          <p className={styles.editorLabel}>{t('templateContent', 'Template content')}</p>
          <PreliminaryEditorToolbar editor={editor} />
          <EditorContent editor={editor} className={styles.editorWrapper} />
        </div>
      </Stack>
      <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
        <Button className={styles.buttonContainer} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.buttonContainer} kind="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoading description={t('saving', 'Saving...')} />
          ) : template ? (
            t('saveChanges', 'Save changes')
          ) : (
            t('createTemplate', 'Create template')
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default RadiologyTemplateAdminWorkspace;
