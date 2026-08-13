import React, { useEffect, useState } from 'react';
import { Button, InlineLoading, Search, Tag } from '@carbon/react';
import type { TFunction } from 'i18next';
import { useCbhiSearch, type CbhiEligibilityMember, type CbhiPersistFields } from '../hooks/useCbhiSearch';

import styles from '../billing-information.scss';

type CbhiMemberSearchProps = {
  t: TFunction;
  selectedMember: CbhiPersistFields | null;
  onMemberSelected: (member: CbhiPersistFields) => void;
  onClearSelection?: () => void;
};

const toPersistFields = (member: CbhiEligibilityMember): CbhiPersistFields => ({
  id: member.id,
  fullName: member.fullName,
  accountNo: member.accountNo,
  membershipType: member.membershipType,
  cbhiId: member.cbhiId,
  // BE always sends insuredId as null; store eligibility id on the insuredId attribute
  insuredId: member.id,
});

const ResultCard: React.FC<{
  member: CbhiEligibilityMember;
  onSelect: () => void;
  t: TFunction;
}> = ({ member, onSelect, t }) => (
  <button type="button" className={styles.cbhiResultCard} onClick={onSelect}>
    <div className={styles.cbhiResultCardHeader}>
      <span className={styles.cbhiResultCardName}>{member.fullName}</span>
      {member.status && (
        <Tag size="sm" type={member.status === 'ACTIVE' ? 'green' : 'gray'}>
          {member.status}
        </Tag>
      )}
    </div>
    <div className={styles.cbhiResultCardMeta}>
      <span>
        <strong>{t('cbhiId', 'CBHI ID')}:</strong> {member.cbhiId}
      </span>
      {member.accountNo && (
        <span>
          <strong>{t('accountNo', 'Account No')}:</strong> {member.accountNo}
        </span>
      )}
      {member.membershipType && (
        <span>
          <strong>{t('membershipType', 'Membership')}:</strong> {member.membershipType}
        </span>
      )}
    </div>
    <div className={styles.cbhiResultCardMeta}>
      {[member.gender, member.relationshipType, member.age != null ? `${member.age} yrs` : null]
        .filter(Boolean)
        .join(' · ')}
    </div>
  </button>
);

export const CbhiMemberSearch: React.FC<CbhiMemberSearchProps> = ({
  t,
  selectedMember,
  onMemberSelected,
  onClearSelection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Local selection drives UI immediately so other cards hide on click
  const [pickedMember, setPickedMember] = useState<CbhiPersistFields | null>(selectedMember);
  const { results, isLoading } = useCbhiSearch(searchTerm);

  useEffect(() => {
    setPickedMember(selectedMember);
  }, [selectedMember]);

  const hasSelection = Boolean(pickedMember);
  const showResults = searchTerm.trim().length >= 2 && !hasSelection;

  const clearSelection = () => {
    setPickedMember(null);
    onClearSelection?.();
  };

  const handleSearchChange = (value: string) => {
    // Ignore no-op change events (e.g. Search blur after clicking a card)
    if (value === searchTerm) {
      return;
    }

    setSearchTerm(value);
    if (hasSelection) {
      clearSelection();
    }
  };

  const handleSelect = (member: CbhiEligibilityMember) => {
    const fields = toPersistFields(member);
    setPickedMember(fields);
    onMemberSelected(fields);
  };

  return (
    <div className={styles.cbhiSearchSection}>
      <Search
        className={styles.cbhiSearchInput}
        id="cbhi-member-search"
        labelText={t('cbhiIdSearch', 'Search With CBHI ID')}
        placeholder={t('searchCbhiIdAndSelectMember', 'Search CBHI ID and select a member')}
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value ?? '')}
        onClear={() => handleSearchChange('')}
        size="md"
      />

      {isLoading && !hasSelection && <InlineLoading description={t('searchingCbhi', 'Searching CBHI records...')} />}

      {!isLoading && showResults && results.length === 0 && (
        <p className={styles.cbhiEmptyState}>{t('noCbhiResults', 'No CBHI members found')}</p>
      )}

      {showResults && results.length > 0 && (
        <div
          className={styles.cbhiResultsList}
          role="listbox"
          aria-label={t('cbhiSearchResults', 'CBHI search results')}>
          {results.map((member) => (
            <ResultCard key={member.id} member={member} onSelect={() => handleSelect(member)} t={t} />
          ))}
        </div>
      )}

      {pickedMember && (
        <div className={`${styles.cbhiSelectedCard} ${styles.cbhiResultCardSelected}`}>
          <div className={styles.cbhiSelectedHeader}>
            <p className={styles.cbhiSelectedTitle}>{t('selectedCbhiMember', 'Selected CBHI Member')}</p>
            <Button kind="ghost" size="sm" onClick={clearSelection}>
              {t('changeSelection', 'Change')}
            </Button>
          </div>
          <div className={styles.cbhiSelectedGrid}>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('id', 'ID')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.id || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('fullName', 'Full Name')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.fullName || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('accountNo', 'Account No')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.accountNo || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('membershipType', 'Membership Type')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.membershipType || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('cbhiId', 'CBHI ID')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.cbhiId || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('insuredId', 'Insured ID')}</span>
              <span className={styles.cbhiFieldValue}>{pickedMember.insuredId || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
