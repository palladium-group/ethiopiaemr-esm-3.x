import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { rejectPreliminaryReport } from '../workspace/preliminary.resource';

interface RejectReportModalProps {
  procedureUuid: string;
  mutate: () => void;
  closeModal: () => void;
}

const RejectReportModal: React.FC<RejectReportModalProps> = ({ procedureUuid, mutate, closeModal }) => {
  const { t } = useTranslation();
  const [revisionComment, setRevisionComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await rejectPreliminaryReport(procedureUuid, revisionComment);
      showSnackbar({
        title: t('reportRejected', 'Report rejected'),
        subtitle: t('reportRejectedSubtitle', 'The report has been sent back for revision.'),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      closeModal();
    } catch {
      showSnackbar({ title: t('rejectError', 'Failed to reject report'), kind: 'error', isLowContrast: true });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('rejectReport', 'Reject preliminary report')} />
      <ModalBody>
        <p>
          {t(
            'rejectReportDescription',
            'This will send the report back to the resident for revision. Please provide a reason.',
          )}
        </p>
        <TextArea
          labelText={t('revisionComment', 'Revision comment')}
          placeholder={t('revisionCommentPlaceholder', 'Describe what needs to be corrected...')}
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          rows={4}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isRejecting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleReject} disabled={isRejecting || !revisionComment.trim()}>
          {isRejecting ? (
            <InlineLoading description={t('rejecting', 'Rejecting...')} />
          ) : (
            t('confirmReject', 'Confirm rejection')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default RejectReportModal;
