import React, { useMemo, useState } from 'react';
import { ComboBox, InlineLoading } from '@carbon/react';
import type { TFunction } from 'i18next';
import { useCbhiSearch } from '../hooks';
import type { CbhiRecord } from '../cbhi-mock-data';

import styles from '../billing-information.scss';

type CbhiMemberOption = {
  id: string;
  label: string;
  cbhiId: string;
  expiryDate: string;
};

type CbhiMemberSearchProps = {
  t: TFunction;
  onMemberSelected: (cbhiId: string, expiryDate: string) => void;
};

const flattenMembers = (records: CbhiRecord[]): CbhiMemberOption[] => {
  const options: CbhiMemberOption[] = [];

  records.forEach((record) => {
    const expiry = record.validity_period.end_date;
    const cbhiId = record.identification_number;

    // Household head
    options.push({
      id: `${cbhiId}-head`,
      label: `${cbhiId} - ${record.household_head.name} (${record.household_head.gender}, HH)`,
      cbhiId,
      expiryDate: expiry,
    });

    // Family members
    record.family_members.forEach((member, index) => {
      options.push({
        id: `${cbhiId}-member-${index}`,
        label: `${cbhiId} - ${member.name} (${member.relation})`,
        cbhiId,
        expiryDate: expiry,
      });
    });
  });

  return options;
};

export const CbhiMemberSearch: React.FC<CbhiMemberSearchProps> = ({ t, onMemberSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState<CbhiMemberOption | null>(null);
  const { results, isLoading } = useCbhiSearch(searchTerm);

  const items = useMemo(() => flattenMembers(results), [results]);

  return (
    <>
      <ComboBox
        className={styles.cbhiSearchInput}
        id="cbhi-member-search"
        titleText={t('cbhiIdSearch', 'Search With CBHI ID')}
        placeholder={t('searchCbhiIdAndSelectMember', 'Search CBHI ID and select a family member')}
        items={items}
        itemToString={(item: CbhiMemberOption | null) => (item ? item.label : '')}
        selectedItem={selectedOption}
        onChange={({ selectedItem }) => {
          const option = selectedItem as CbhiMemberOption | null;
          setSelectedOption(option || null);
          if (option) {
            onMemberSelected(option.cbhiId, option.expiryDate);
          }
        }}
        onInputChange={(value: string) => {
          setSearchTerm(value);
        }}
      />
      {isLoading && <InlineLoading description={t('searchingCbhi', 'Searching CBHI records...')} />}
    </>
  );
};
