import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Autosuggest } from '../../locations/auto-suggest/autosuggest.component';
import { fetchProvidersByName, type ProviderSearchResult } from './provider-search.resource';

const SEARCH_DEBOUNCE_MS = 300;

interface ProviderAutosuggestProps {
  onProviderSelected: (providerData: ProviderSearchResult) => void;
  labelText?: string;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: string;
}

export const ProviderAutosuggest: React.FC<ProviderAutosuggestProps> = ({
  onProviderSelected,
  labelText,
  placeholder,
  invalid = false,
  invalidText,
}) => {
  const [searchResults, setSearchResults] = useState<ProviderSearchResult[]>([]);
  const [hasSelectedProvider, setHasSelectedProvider] = useState(false);
  const { t } = useTranslation();

  const getDisplayValue = useCallback((item: ProviderSearchResult) => {
    return item.person?.display ?? item.identifier ?? '';
  }, []);

  const getFieldValue = useCallback((item: ProviderSearchResult) => {
    return item.uuid ?? '';
  }, []);

  const handleSuggestionSelected = useCallback(
    (field: string, value: string) => {
      if (value) {
        const selected = searchResults.find((item) => item.uuid === value);
        if (selected) {
          setHasSelectedProvider(true);
          onProviderSelected(selected);
        }
      } else {
        setHasSelectedProvider(false);
      }
    },
    [onProviderSelected, searchResults],
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousResolveRef = useRef<((results: ProviderSearchResult[]) => void) | null>(null);

  const handleSearchResults = useCallback((query: string) => {
    return new Promise<ProviderSearchResult[]>((resolve, reject) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        previousResolveRef.current?.([]);
      }
      previousResolveRef.current = resolve;
      timeoutRef.current = setTimeout(async () => {
        try {
          const abortController = new AbortController();
          const results = await fetchProvidersByName(query, abortController);
          setSearchResults(results);
          previousResolveRef.current?.(results);
        } catch (err) {
          reject(err);
        } finally {
          timeoutRef.current = null;
          previousResolveRef.current = null;
        }
      }, SEARCH_DEBOUNCE_MS);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const renderSuggestionItem = useCallback((item: ProviderSearchResult) => {
    return <div>{item.person?.display ?? item.identifier ?? ''}</div>;
  }, []);

  const renderEmptyState = useCallback(
    (value: string) => {
      if (!value || hasSelectedProvider) {
        return null;
      }
      return (
        <div style={{ padding: '1rem' }}>
          <p>{t('providerNotFound', 'No matching provider found')}</p>
        </div>
      );
    },
    [t, hasSelectedProvider],
  );

  return (
    <Autosuggest
      id="provider-autosuggest"
      labelText={labelText ?? t('searchForProvider', 'Search for existing provider')}
      placeholder={placeholder ?? t('searchProviderPlaceholder', 'Search by provider name')}
      getDisplayValue={getDisplayValue}
      getFieldValue={getFieldValue}
      getSearchResults={handleSearchResults}
      onSuggestionSelected={handleSuggestionSelected}
      renderSuggestionItem={renderSuggestionItem}
      renderEmptyState={renderEmptyState}
      invalid={invalid}
      invalidText={invalidText}
    />
  );
};
