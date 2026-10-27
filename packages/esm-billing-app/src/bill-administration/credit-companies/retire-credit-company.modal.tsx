import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { type CreditCompany } from '../../types';
import { unescapeHtml } from '../billable-exemption/exemption-rules.utils';
import { getErrorMessage, mutateCreditCompanies, retireCreditCompany } from './credit-company.resource';

type RetireCreditCompanyModalProps = {
  closeModal: () => void;
  creditCompany: CreditCompany;
};

const RetireCreditCompanyModal: React.FC<RetireCreditCompanyModalProps> = ({ closeModal, creditCompany }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const name = unescapeHtml(creditCompany.name);

  const handleRetire = async () => {
    setIsSubmitting(true);
    try {
      await retireCreditCompany(creditCompany.uuid, reason.trim() || 'Retired from billing admin');
      showSnackbar({
        title: t('creditCompanyRetired', 'Credit company retired'),
        subtitle: t('creditCompanyRetiredSubtitle', '{{name}} is no longer offered at MRU', {
          name,
          interpolation: { escapeValue: false },
        }),
        kind: 'success',
        isLowContrast: true,
      });
      mutateCreditCompanies();
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('creditCompanyRetireFailed', 'Could not retire credit company'),
        subtitle: getErrorMessage(error),
        kind: 'error',
        isLowContrast: true,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('retireCreditCompany', 'Retire credit company')} />
      <ModalBody>
        <p>
          {t(
            'retireCreditCompanyDescription',
            '{{name}} will no longer be offered at MRU. Visits already billed to it keep their record, and you can restore it later.',
            { name, interpolation: { escapeValue: false } },
          )}
        </p>
        <br />
        <TextInput
          id="retireCreditCompanyReason"
          labelText={t('reasonOptional', 'Reason (optional)')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleRetire} disabled={isSubmitting}>
          {t('retire', 'Retire')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default RetireCreditCompanyModal;
