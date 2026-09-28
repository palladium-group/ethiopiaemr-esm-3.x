import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComboBox, DismissibleTag, InlineLoading } from '@carbon/react';
import { useDebounce } from '@openmrs/esm-framework';
import { useBillableServices } from '../../service-catalog/billable-service.resource';
import { useCommodityItem } from '../../service-catalog/commodity/useCommodityItem';
import type { ExemptionItem, ExemptionSection } from '../exemption-rules.utils';
import styles from './exemption-rules.scss';

interface ExemptionItemPickerProps {
  section: ExemptionSection;
  selectedItems: Array<ExemptionItem>;
  onChange: (items: Array<ExemptionItem>) => void;
  invalid?: boolean;
  invalidText?: string;
}

const normalizeName = (name?: string) => (name ?? '').trim().toLowerCase();

/** Lets the user pick billable services or stock items; stores each item's concept UUID. */
const ExemptionItemPicker: React.FC<ExemptionItemPickerProps> = ({
  section,
  selectedItems,
  onChange,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  // Remounting the combobox clears the text of the item just picked
  const [pickerKey, setPickerKey] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { billableServices, isLoading: isLoadingServices } = useBillableServices();
  const { stockItems, isLoading: isLoadingStockItems } = useCommodityItem(
    section === 'commodities' ? debouncedSearchTerm : '',
  );

  const options = useMemo<Array<ExemptionItem>>(() => {
    const available =
      section === 'services'
        ? billableServices
            .filter((service) => service.concept?.uuid)
            .map((service) => ({ concept: service.concept.uuid, description: service.name }))
        : stockItems
            .filter((item) => item.conceptUuid)
            .map((item) => ({ concept: item.conceptUuid, description: item.commonName || item.drugName }));

    // Items saved with a legacy concept ID cannot be matched by UUID, so also match on name
    const selectedConcepts = new Set(selectedItems.map((item) => String(item.concept)));
    const selectedNames = new Set(selectedItems.map((item) => normalizeName(item.description)));
    return available.filter(
      (option) =>
        !selectedConcepts.has(String(option.concept)) && !selectedNames.has(normalizeName(option.description)),
    );
  }, [section, billableServices, stockItems, selectedItems]);

  const isLoading = section === 'services' ? isLoadingServices : isLoadingStockItems;

  const itemLabel = (item: ExemptionItem) =>
    typeof item.concept === 'number' || /^\d+$/.test(String(item.concept))
      ? t('legacyExemptionItem', '{{description}} (concept ID {{concept}})', {
          description: item.description || t('unnamed', 'Unnamed'),
          concept: item.concept,
          interpolation: { escapeValue: false },
        })
      : item.description;

  return (
    <div className={styles.itemPicker}>
      <ComboBox
        key={pickerKey}
        id="exemption-item-picker"
        titleText={
          section === 'services'
            ? t('exemptedServices', 'Exempted services')
            : t('exemptedCommodities', 'Exempted commodities')
        }
        placeholder={
          section === 'services'
            ? t('searchBillableServices', 'Search billable services')
            : t('searchStockItems', 'Search stock items')
        }
        items={options}
        itemToString={(item: ExemptionItem) => item?.description ?? ''}
        selectedItem={null}
        shouldFilterItem={
          section === 'services'
            ? ({ item, inputValue }) => item.description?.toLowerCase().includes((inputValue ?? '').toLowerCase())
            : () => true
        }
        onInputChange={(value: string) => setSearchTerm(value ?? '')}
        onChange={({ selectedItem }) => {
          if (selectedItem) {
            onChange([...selectedItems, selectedItem]);
            setSearchTerm('');
            setPickerKey((key) => key + 1);
          }
        }}
        invalid={invalid}
        invalidText={invalidText}
      />
      {isLoading && <InlineLoading description={t('loading', 'Loading...')} />}
      {selectedItems.length > 0 && (
        <div className={styles.selectedItems}>
          {selectedItems.map((item) => (
            <DismissibleTag
              key={String(item.concept)}
              type="blue"
              text={itemLabel(item)}
              title={t('remove', 'Remove')}
              onClose={() => onChange(selectedItems.filter((selected) => selected.concept !== item.concept))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExemptionItemPicker;
