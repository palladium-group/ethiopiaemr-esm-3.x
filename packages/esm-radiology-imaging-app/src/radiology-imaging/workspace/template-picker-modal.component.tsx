import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComposedModal, ModalBody, ModalFooter, ModalHeader, Search, Button, Tile } from '@carbon/react';
import styles from './template-picker-modal.scss';
import templates from './radiology-templates.json';

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (html: string) => void;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ open, onClose, onSelect }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const templateEntries = useMemo(
    () =>
      Object.entries(templates as Record<string, string>).filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const handleApply = () => {
    if (selected && templates[selected as keyof typeof templates]) {
      onSelect(templates[selected as keyof typeof templates]);
      setSelected(null);
      setSearch('');
    }
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    setSearch('');
    onClose();
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="md">
      <ModalHeader closeModal={handleClose} title={t('selectTemplate', 'Select a report template')} />
      <ModalBody hasScrollingContent>
        <Search
          labelText={t('searchTemplates', 'Search templates')}
          placeholder={t('searchTemplatesPlaceholder', 'Search by study name...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="md"
          className={styles.search}
        />
        <div className={styles.templateList}>
          {templateEntries.length === 0 && (
            <p className={styles.empty}>{t('noTemplatesFound', 'No templates match your search.')}</p>
          )}
          {templateEntries.map(([name]) => (
            <Tile
              key={name}
              className={`${styles.templateTile} ${selected === name ? styles.selected : ''}`}
              onClick={() => setSelected(name)}>
              {name}
            </Tile>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={handleClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleApply} disabled={!selected}>
          {t('useTemplate', 'Use template')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default TemplatePickerModal;
