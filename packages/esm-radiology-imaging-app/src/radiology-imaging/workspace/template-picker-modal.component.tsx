import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModalBody, ModalFooter, ModalHeader, Search, Button, Tile, InlineLoading } from '@carbon/react';
import { useRadiologyReportTemplates } from '../../templates-admin/api/report-template.resource';
import { parseReportContent, type TipTapDoc } from './report-content';
import styles from './template-picker-modal.scss';

interface TemplatePickerModalProps {
  closeModal: () => void;
  onSelect: (doc: TipTapDoc) => void;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ closeModal, onSelect }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { templates, isLoading, error } = useRadiologyReportTemplates(false);

  const templateEntries = useMemo(
    () => templates.filter((template) => (template.name ?? '').toLowerCase().includes(search.toLowerCase())),
    [search, templates],
  );

  const handleApply = () => {
    const chosen = templates.find((template) => template.uuid === selected);
    if (chosen) {
      onSelect(parseReportContent(chosen.contentJson));
    }
    closeModal();
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('selectTemplate', 'Select a report template')} />
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
          {isLoading && <InlineLoading description={t('loadingTemplates', 'Loading templates...')} />}
          {error && <p className={styles.empty}>{t('errorLoadingTemplates', 'Error loading report templates')}</p>}
          {!isLoading && !error && templateEntries.length === 0 && (
            <p className={styles.empty}>{t('noTemplatesFound', 'No templates match your search.')}</p>
          )}
          {templateEntries.map((template) => (
            <Tile
              key={template.uuid}
              className={`${styles.templateTile} ${selected === template.uuid ? styles.selected : ''}`}
              onClick={() => setSelected(template.uuid)}>
              {template.name}
            </Tile>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleApply} disabled={!selected}>
          {t('useTemplate', 'Use template')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default TemplatePickerModal;
