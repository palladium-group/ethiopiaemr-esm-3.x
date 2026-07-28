import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DatePicker, DatePickerInput, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';

interface CustomDateRangeModalProps {
  closeModal: () => void;
  onApply: (start: Date, end: Date) => void;
  initialStart?: Date;
  initialEnd?: Date;
}

const CustomDateRangeModal: React.FC<CustomDateRangeModalProps> = ({
  closeModal,
  onApply,
  initialStart,
  initialEnd,
}) => {
  const { t } = useTranslation();
  const [start, setStart] = useState<Date | null>(initialStart ?? null);
  const [end, setEnd] = useState<Date | null>(initialEnd ?? null);

  const handleApply = () => {
    if (start && end) {
      onApply(start, end);
      closeModal();
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('customDateRange', 'Custom date range')} />
      <ModalBody>
        <DatePicker
          datePickerType="range"
          dateFormat="m/d/Y"
          value={[start ?? undefined, end ?? undefined]}
          onChange={([s, e]) => {
            setStart(s ?? null);
            setEnd(e ?? null);
          }}>
          <DatePickerInput
            id="custom-date-start"
            placeholder="mm/dd/yyyy"
            labelText={t('startDate', 'Start date')}
            size="md"
          />
          <DatePickerInput
            id="custom-date-end"
            placeholder="mm/dd/yyyy"
            labelText={t('endDate', 'End date')}
            size="md"
          />
        </DatePicker>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleApply} disabled={!start || !end}>
          {t('apply', 'Apply')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default CustomDateRangeModal;
