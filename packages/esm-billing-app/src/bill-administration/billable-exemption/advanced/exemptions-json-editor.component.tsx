import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AceEditor from 'react-ace';
import 'ace-builds/webpack-resolver';
import { Button, ButtonSet, InlineLoading, InlineNotification } from '@carbon/react';
import { showSnackbar, useSession, userHasAccess } from '@openmrs/esm-framework';
import { Permissions } from '../../../permission/permissions.constants';
import { parseExemptions } from '../exemption-rules.utils';
import { saveExemptionsValue, useExemptionsSetting } from '../exemptions.resource';
import styles from './exemptions-json-editor.scss';

function prettify(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** Raw JSON view of the exemptions for troubleshooting and copying config between installations. */
const ExemptionsJsonEditor: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const canEdit = userHasAccess(Permissions.AddExcemptionsSchema, session?.user);
  const { raw, settingUuid, isLoading } = useExemptionsSetting();
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(prettify(raw));
  }, [raw]);

  const validationError = useMemo(() => {
    if (!text.trim()) {
      return null;
    }
    try {
      const json = JSON.parse(text);
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        return t('exemptionsJsonNotObject', 'The value must be a JSON object with "services" and "commodities"');
      }
      parseExemptions(text);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [text, t]);

  const isDirty = text !== prettify(raw);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveExemptionsValue(text.trim() ? JSON.stringify(JSON.parse(text), null, 2) : '', settingUuid);
      showSnackbar({
        title: t('exemptionsSaved', 'Exemptions saved'),
        subtitle: t('exemptionRuleSavedSubtitle', 'The change applies to new bills straight away'),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (error) {
      showSnackbar({
        title: t('exemptionsSaveFailed', 'Could not save the exemptions'),
        subtitle: error?.responseBody?.error?.message ?? error?.message,
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <div className={styles.container}>
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title={t('exemptionsJsonTitle', 'Stored as the global property kenyaemr.billing.exemptions')}
        subtitle={t(
          'exemptionsJsonHelp',
          'Prefer the Rules tab. Use this view to copy exemptions to another facility or fix entries the Rules tab cannot edit.',
        )}
      />
      {validationError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('exemptionsJsonInvalid', 'Invalid JSON')}
          subtitle={validationError}
        />
      )}
      <AceEditor
        mode="json"
        theme="textmate"
        name="exemptionsJsonEditor"
        width="100%"
        height="60vh"
        fontSize={14}
        showPrintMargin={false}
        readOnly={!canEdit}
        value={text}
        onChange={setText}
        setOptions={{ tabSize: 2, showLineNumbers: true }}
      />
      {canEdit && (
        <ButtonSet className={styles.buttons}>
          <Button kind="secondary" disabled={!isDirty || isSaving} onClick={() => setText(prettify(raw))}>
            {t('discardChanges', 'Discard changes')}
          </Button>
          <Button kind="primary" disabled={!isDirty || !!validationError || isSaving} onClick={handleSave}>
            {isSaving ? <InlineLoading description={t('saving', 'Saving…')} /> : t('save', 'Save')}
          </Button>
        </ButtonSet>
      )}
    </div>
  );
};

export default ExemptionsJsonEditor;
