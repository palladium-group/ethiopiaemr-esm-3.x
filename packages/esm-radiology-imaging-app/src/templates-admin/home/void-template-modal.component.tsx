import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import {
  getErrorMessage,
  revalidateRadiologyReportTemplates,
  voidRadiologyReportTemplate,
} from '../api/report-template.resource';

interface VoidTemplateModalProps {
  templateUuid: string;
  templateName: string;
  closeModal: () => void;
}

const VoidTemplateModal: React.FC<VoidTemplateModalProps> = ({ templateUuid, templateName, closeModal }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVoid = async () => {
    setIsSubmitting(true);
    try {
      await voidRadiologyReportTemplate(templateUuid, t('voidedFromAdmin', 'Voided from radiology templates admin'));
      await revalidateRadiologyReportTemplates();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('templateVoided', 'Report template voided.'),
        isLowContrast: true,
      });
      closeModal();
    } catch (voidError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(voidError, t('templateVoidFailed', 'Failed to void report template.')),
        isLowContrast: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('voidTemplate', 'Void report template')} />
      <ModalBody>
        <p>
          {t(
            'voidTemplateConfirmation',
            'Are you sure you want to void "{{templateName}}"? It will no longer be available when selecting a report template.',
            { templateName },
          )}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleVoid} disabled={isSubmitting}>
          {isSubmitting ? <InlineLoading description={t('voiding', 'Voiding...')} /> : t('void', 'Void')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default VoidTemplateModal;
