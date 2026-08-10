import React, { useState } from 'react';
import { InlineLoading, Search, Tag } from '@carbon/react';
import type { TFunction } from 'i18next';
import { useCbhiSearch, type CbhiEligibilityMember, type CbhiPersistFields } from '../hooks/useCbhiSearch';

import styles from '../billing-information.scss';

type CbhiMemberSearchProps = {
  t: TFunction;
  selectedMember: CbhiPersistFields | null;
  onMemberSelected: (member: CbhiPersistFields) => void;
};

const toPersistFields = (member: CbhiEligibilityMember): CbhiPersistFields => ({
  id: member.id,
  fullName: member.fullName,
  accountNo: member.accountNo,
  membershipType: member.membershipType,
  cbhiId: member.cbhiId,
  insuredId: member.insuredId,
});

const ResultCard: React.FC<{
  member: CbhiEligibilityMember;
  isSelected: boolean;
  onSelect: () => void;
  t: TFunction;
}> = ({ member, isSelected, onSelect, t }) => (
  <button
    type="button"
    className={`${styles.cbhiResultCard} ${isSelected ? styles.cbhiResultCardSelected : ''}`}
    onClick={onSelect}
    aria-pressed={isSelected}>
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

export const CbhiMemberSearch: React.FC<CbhiMemberSearchProps> = ({ t, selectedMember, onMemberSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { results, isLoading } = useCbhiSearch(searchTerm);
  const showResults = searchTerm.trim().length >= 2;

  return (
    <div className={styles.cbhiSearchSection}>
      <Search
        className={styles.cbhiSearchInput}
        id="cbhi-member-search"
        labelText={t('cbhiIdSearch', 'Search With CBHI ID')}
        placeholder={t('searchCbhiIdAndSelectMember', 'Search CBHI ID and select a member')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value ?? '')}
        size="md"
      />

      {isLoading && <InlineLoading description={t('searchingCbhi', 'Searching CBHI records...')} />}

      {!isLoading && showResults && results.length === 0 && (
        <p className={styles.cbhiEmptyState}>{t('noCbhiResults', 'No CBHI members found')}</p>
      )}

      {!isLoading && results.length > 0 && (
        <div
          className={styles.cbhiResultsList}
          role="listbox"
          aria-label={t('cbhiSearchResults', 'CBHI search results')}>
          {results.map((member) => (
            <ResultCard
              key={member.id}
              member={member}
              isSelected={selectedMember?.id === member.id}
              onSelect={() => onMemberSelected(toPersistFields(member))}
              t={t}
            />
          ))}
        </div>
      )}

      {selectedMember && (
        <div className={styles.cbhiSelectedCard}>
          <p className={styles.cbhiSelectedTitle}>{t('selectedCbhiMember', 'Selected CBHI Member')}</p>
          <div className={styles.cbhiSelectedGrid}>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('id', 'ID')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.id || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('fullName', 'Full Name')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.fullName || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('accountNo', 'Account No')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.accountNo || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('membershipType', 'Membership Type')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.membershipType || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('cbhiId', 'CBHI ID')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.cbhiId || '—'}</span>
            </div>
            <div>
              <span className={styles.cbhiFieldLabel}>{t('insuredId', 'Insured ID')}</span>
              <span className={styles.cbhiFieldValue}>{selectedMember.insuredId || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
