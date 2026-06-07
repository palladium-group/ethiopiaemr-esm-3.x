import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  ComposedModal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  Stack,
} from '@carbon/react';
import { DAYS_OF_WEEK, WEEKDAYS, type DayOfWeek } from '../constants';
import type { CopyDayBlocksMode } from './copy-day-blocks.helper';
import styles from './copy-day-blocks-modal.scss';

interface CopyDayBlocksModalProps {
  open: boolean;
  sourceDay: DayOfWeek | null;
  getDayLabel: (day: DayOfWeek) => string;
  onClose: () => void;
  onApply: (targetDays: Array<DayOfWeek>, mode: CopyDayBlocksMode) => void;
}

const CopyDayBlocksModal: React.FC<CopyDayBlocksModalProps> = ({ open, sourceDay, getDayLabel, onClose, onApply }) => {
  const { t } = useTranslation();
  const [selectedDays, setSelectedDays] = useState<Array<DayOfWeek>>([]);
  const [mode, setMode] = useState<CopyDayBlocksMode>('replace');

  const targetDayOptions = useMemo(() => DAYS_OF_WEEK.filter((day) => day !== sourceDay), [sourceDay]);

  useEffect(() => {
    if (open) {
      setSelectedDays([]);
      setMode('replace');
    }
  }, [open, sourceDay]);

  const handleApply = () => {
    if (!sourceDay || selectedDays.length === 0) {
      return;
    }

    onApply(selectedDays, mode);
  };

  const selectWeekdays = () => {
    setSelectedDays(WEEKDAYS.filter((day) => day !== sourceDay));
  };

  const selectAll = () => {
    setSelectedDays([...targetDayOptions]);
  };

  const clearSelection = () => {
    setSelectedDays([]);
  };

  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title={t('copyDayBlocksTitle', 'Copy {{day}} blocks', {
          day: sourceDay ? getDayLabel(sourceDay) : '',
        })}
        closeModal={onClose}
      />
      <ModalBody>
        <Stack gap={5}>
          <p className={styles.description}>
            {t(
              'copyDayBlocksDescription',
              'Copy this day’s time blocks and limits to other days. Existing blocks on target days can be replaced or kept.',
            )}
          </p>

          <div className={styles.quickSelect}>
            <Button kind="ghost" size="sm" onClick={selectWeekdays}>
              {t('selectWeekdays', 'Weekdays')}
            </Button>
            <Button kind="ghost" size="sm" onClick={selectAll}>
              {t('selectAllDays', 'All days')}
            </Button>
            <Button kind="ghost" size="sm" onClick={clearSelection}>
              {t('clearSelection', 'Clear')}
            </Button>
          </div>

          <CheckboxGroup legendText={t('copyToDays', 'Copy to')}>
            {targetDayOptions.map((day) => (
              <Checkbox
                key={day}
                id={`copy-to-${day}`}
                labelText={getDayLabel(day)}
                checked={selectedDays.includes(day)}
                onChange={(_, { checked }) => {
                  setSelectedDays((current) =>
                    checked ? [...current, day] : current.filter((selectedDay) => selectedDay !== day),
                  );
                }}
              />
            ))}
          </CheckboxGroup>

          <RadioButtonGroup
            legendText={t('copyMode', 'When target days already have blocks')}
            name="copy-day-blocks-mode"
            valueSelected={mode}
            onChange={(value) => setMode(value as CopyDayBlocksMode)}>
            <RadioButton
              id="copy-mode-replace"
              labelText={t('copyModeReplace', 'Replace existing blocks')}
              value="replace"
            />
            <RadioButton
              id="copy-mode-append"
              labelText={t('copyModeAppend', 'Add to existing blocks')}
              value="append"
            />
          </RadioButtonGroup>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={selectedDays.length === 0} kind="primary" onClick={handleApply}>
          {t('copyBlocks', 'Copy blocks')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default CopyDayBlocksModal;
