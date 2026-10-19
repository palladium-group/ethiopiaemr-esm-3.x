import { InlineLoading, Layer, Search } from '@carbon/react';
import classNames from 'classnames';
import React, { type HTMLAttributes, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './autosuggest.scss';

type InputPropsBase = Omit<HTMLAttributes<HTMLInputElement>, 'onChange'>;

interface SearchProps extends InputPropsBase {
  autoComplete?: string;
  className?: string;
  closeButtonLabelText?: string;
  defaultValue?: string | number;
  disabled?: boolean;
  isExpanded?: boolean;
  id?: string;
  labelText: React.ReactNode;
  onChange?(e: { target: HTMLInputElement; type: 'change' }): void;
  onClear?(): void;
  onExpand?(e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>): void;
  placeholder?: string;
  renderIcon?: React.ComponentType | React.FunctionComponent;
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: string;
  value?: string | number;
}

interface AutosuggestProps extends SearchProps {
  getDisplayValue: (item: any) => string;
  getFieldValue: (item: any) => string;
  getSearchResults: (query: string) => Promise<any>;
  onSuggestionSelected: (field: string, value: string) => void;
  invalid?: boolean;
  invalidText?: string;
  renderSuggestionItem?: (item: any) => React.ReactNode;
  renderEmptyState?: (value: any) => React.ReactNode;
  /** Wait this long after the last keystroke before searching. */
  debounceMs?: number;
}

export const AUTOSUGGEST_DEBOUNCE_MS = 400;

export const Autosuggest: React.FC<AutosuggestProps> = ({
  getDisplayValue,
  getFieldValue,
  getSearchResults,
  onSuggestionSelected,
  invalid,
  invalidText,
  renderSuggestionItem,
  renderEmptyState,
  debounceMs = AUTOSUGGEST_DEBOUNCE_MS,
  ...searchProps
}) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // The empty state only makes sense once a search has run, not for a prefilled value.
  const [hasSearched, setHasSearched] = useState(false);
  const searchBox = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const { id: name, labelText } = searchProps;

  useEffect(() => {
    const handleClickOutsideComponent = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideComponent);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideComponent);
    };
  }, [wrapper]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the newest request may update the list, so slow responses for older input are dropped.
  const latestRequest = useRef(0);

  const cancelPendingSearch = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    latestRequest.current += 1;
  };

  useEffect(() => cancelPendingSearch, []);

  const handleChange = (e) => {
    const query = e.target.value;
    onSuggestionSelected(name, undefined);
    cancelPendingSearch();

    if (!query || !query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      const requestId = latestRequest.current;
      getSearchResults(query.trim())
        .then((results) => {
          if (requestId === latestRequest.current) {
            setSuggestions(results || []);
            setIsLoading(false);
            setHasSearched(true);
          }
        })
        .catch(() => {
          if (requestId === latestRequest.current) {
            setSuggestions([]);
            setIsLoading(false);
            setHasSearched(true);
          }
        });
    }, debounceMs);
  };

  const handleClear = () => {
    cancelPendingSearch();
    onSuggestionSelected(name, undefined);
    setSuggestions([]);
    setIsLoading(false);
    setHasSearched(false);
  };

  const handleClick = (index: number) => {
    const selectedSuggestion = suggestions[index];
    if (selectedSuggestion) {
      const fieldValue = getFieldValue(selectedSuggestion);
      const displayValue = getDisplayValue(selectedSuggestion);
      if (searchBox.current) {
        searchBox.current.value = displayValue;
      }
      cancelPendingSearch();
      onSuggestionSelected(name, fieldValue);
      setSuggestions([]);
      setHasSearched(false);
    }
  };

  return (
    <div className={styles.autocomplete} ref={wrapper}>
      <label className="cds--label">{labelText}</label>
      <Layer className={classNames({ [styles.invalid]: invalid })}>
        <Search
          id="autosuggest"
          onChange={handleChange}
          onClear={handleClear}
          ref={searchBox}
          className={styles.autocompleteSearch}
          {...searchProps}
        />
      </Layer>
      {isLoading && (
        <div className={styles.loading}>
          <InlineLoading status="active" description={t('loading', 'Loading' + '...')} />
        </div>
      )}
      {suggestions.length > 0 ? (
        <ul className={styles.suggestions}>
          {suggestions.map((suggestion, index) => {
            return (
              <li
                key={getFieldValue(suggestion) || index}
                onClick={() => handleClick(index)}
                role="presentation"
                style={{ cursor: 'pointer' }}>
                {renderSuggestionItem ? renderSuggestionItem(suggestion) : getDisplayValue(suggestion)}
              </li>
            );
          })}
        </ul>
      ) : (
        !isLoading && hasSearched && renderEmptyState && renderEmptyState(searchBox.current?.value || '')
      )}
      {invalid && <label className={classNames(styles.invalidMsg)}>{invalidText}</label>}
    </div>
  );
};
