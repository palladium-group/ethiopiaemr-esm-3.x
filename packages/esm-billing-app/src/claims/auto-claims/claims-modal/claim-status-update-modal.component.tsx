import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComposedModal, Dropdown, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';

import { AutoClaimItem, CLAIM_STATUSES, updateClaimStatus } from '../auto-claims.resource';
import styles from './claims-pdf-export-modal.scss';

interface StatusModalProps {
  claim: AutoClaimItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StatusUpdateModal: React.FC<StatusModalProps> = ({ claim, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(claim?.status ?? '');
  const [batchRef, setBatchRef] = useState(claim?.batchReference ?? '');
  const [saving, setSaving] = useState(false);

  if (!claim) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClaimStatus(claim.uuid, selectedStatus, batchRef || undefined);
      showSnackbar({ title: t('statusUpdated', 'Status updated'), kind: 'success', isLowContrast: true });
      onSuccess();
      onClose();
    } catch {
      showSnackbar({ title: t('statusUpdateFailed', 'Status update failed'), kind: 'error', isLowContrast: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComposedModal open={Boolean(claim)} onClose={onClose} size="sm">
      <ModalHeader title={t('updateClaimStatus', 'Update Claim Status')} />
      <ModalBody>
        <p className={styles.modalHeader}>
          {t('claimRef', 'Claim Ref')}: <strong>{claim.claimReference}</strong>
          &ensp;|&ensp;{claim.patientName}
        </p>
        <Dropdown
          id="status-update-dropdown"
          titleText={t('newStatus', 'New Status')}
          label={t('selectStatus', 'Select status')}
          items={CLAIM_STATUSES.map((s) => ({ id: s, label: s }))}
          itemToString={(item) => item?.label ?? ''}
          selectedItem={{ id: selectedStatus, label: selectedStatus }}
          onChange={({ selectedItem }) => setSelectedStatus(selectedItem?.id ?? '')}
        />
        <div className={styles.batchReference}>
          <TextInput
            id="batch-ref-input"
            labelText={t('batchReference', 'Batch Reference')}
            placeholder="e.g. BATCH-2026-05"
            value={batchRef}
            onChange={(e) => setBatchRef(e.target.value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} disabled={saving}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={saving || !selectedStatus}>
          {saving ? t('saving', 'Saving…') : t('save', 'Save')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
