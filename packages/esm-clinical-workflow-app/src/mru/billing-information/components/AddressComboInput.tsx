import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { Layer, TextInput, type TextInputProps } from '@carbon/react';
import { Checkmark } from '@carbon/react/icons';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import styles from '../billing-information.scss';

interface AddressComboInputProps {
  entries: Array<string> | null;
  name: string;
  fieldProps: Omit<TextInputProps, 'id'> & {
    id?: string;
    value: string;
    labelText: string;
  };
  handleInputChange: (newValue: string) => void;
  handleSelection: (newSelection: string) => void;
  onDropdownClose?: () => void;
}

/**
 * Searchable address dropdown matching the Contact Details ComboInput from patient registration.
 */
export const AddressComboInput: React.FC<AddressComboInputProps> = ({
  entries,
  name,
  fieldProps,
  handleInputChange,
  handleSelection,
  onDropdownClose,
}) => {
  const [highlightedEntry, setHighlightedEntry] = useState(-1);
  const { value = '' } = fieldProps;
  const [showEntries, setShowEntries] = useState(false);
  const comboInputRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);

  const filteredEntries = (entries ?? []).filter((entry) => entry.toLowerCase().includes(value.toLowerCase()));

  const closeDropdown = () => {
    setShowEntries(false);
    setHighlightedEntry(-1);
  };

  const handleOptionClick = (newSelection: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    handleSelection(newSelection);
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = filteredEntries.length - 1;
    if (e.key === 'Tab' || e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'ArrowUp') {
      setHighlightedEntry((prev) => (prev <= 0 ? totalResults : prev - 1));
    } else if (e.key === 'ArrowDown') {
      setHighlightedEntry((prev) => (prev >= totalResults ? 0 : prev + 1));
    } else if (e.key === 'Enter' && highlightedEntry > -1) {
      handleOptionClick(filteredEntries[highlightedEntry], e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboInputRef.current && !comboInputRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showEntries && hasOpenedRef.current) {
      hasOpenedRef.current = false;
      onDropdownClose?.();
    }
  }, [showEntries, onDropdownClose]);

  return (
    <div ref={comboInputRef}>
      <Layer>
        <TextInput
          {...fieldProps}
          id={fieldProps.id ?? name}
          value={value}
          onChange={(e) => {
            setHighlightedEntry(-1);
            hasOpenedRef.current = true;
            setShowEntries(true);
            handleInputChange(e.target.value);
          }}
          onFocus={() => {
            hasOpenedRef.current = true;
            setShowEntries(true);
            setHighlightedEntry(-1);
          }}
          autoComplete="off"
          onKeyDown={handleKeyDown}
        />
      </Layer>
      <div className={styles.comboInputEntries}>
        {showEntries && filteredEntries.length > 0 && (
          <div className="cds--combo-box cds--list-box cds--list-box--expanded">
            <div id={`${name}-menu`} role="listbox" className="cds--list-box__menu">
              {filteredEntries.map((entry, indx) => (
                <div
                  key={entry}
                  id={`${name}-item-${indx}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={value === entry}
                  className={`cds--list-box__menu-item ${
                    highlightedEntry === indx ? 'cds--list-box__menu-item--highlighted' : ''
                  }`}
                  onClick={(e) => handleOptionClick(entry, e)}>
                  <div className={`cds--list-box__menu-item__option ${styles.comboInputItemOption}`}>
                    {entry}
                    {value === entry && <Checkmark size={16} className="cds--list-box__menu-item__selected-icon" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Fetches child address hierarchy entries for a given search prefix (`""` for Region,
 * `"Region"` for Zone, `"Region|Zone"` for Woreda).
 */
export function useAddressEntries(fetchResults: boolean, searchString: string) {
  const { data } = useSWRImmutable<FetchResponse<Array<{ name: string }>>>(
    fetchResults
      ? `/module/addresshierarchy/ajax/getChildAddressHierarchyEntries.form?searchString=${encodeURIComponent(
          searchString,
        )}`
      : null,
    openmrsFetch,
  );

  return useMemo(() => data?.data?.map((item) => item.name) ?? null, [data?.data]);
}
