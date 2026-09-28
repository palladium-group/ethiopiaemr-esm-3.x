import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { type ExemptionRule, removeRule } from '../exemption-rules.utils';
import { updateExemptions } from '../exemptions.resource';

type DeleteExemptionRuleModalProps = {
  closeModal: () => void;
  rule: ExemptionRule;
  ruleDescription: string;
};

const DeleteExemptionRuleModal: React.FC<DeleteExemptionRuleModalProps> = ({ closeModal, rule, ruleDescription }) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await updateExemptions((config) => removeRule(config, rule.id));
      showSnackbar({
        title: t('exemptionRuleDeleted', 'Exemption rule deleted'),
        subtitle: t('exemptionRuleSavedSubtitle', 'The change applies to new bills straight away'),
        kind: 'success',
        isLowContrast: true,
      });
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('exemptionRuleDeleteFailed', 'Could not delete the exemption rule'),
        subtitle: error?.responseBody?.error?.message ?? error?.message,
        kind: 'error',
        isLowContrast: true,
      });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('deleteExemptionRule', 'Delete exemption rule')} />
      <ModalBody>
        <p>
          {t(
            'deleteExemptionRuleConfirmation',
            'New bills for “{{rule}}” will no longer be exempted. Bills already created are not changed.',
            { rule: ruleDescription, interpolation: { escapeValue: false } },
          )}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? <InlineLoading description={t('deleting', 'Deleting...')} /> : t('delete', 'Delete')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DeleteExemptionRuleModal;
