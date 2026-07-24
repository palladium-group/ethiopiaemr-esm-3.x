import React, { useId, useMemo, useState } from 'react';
import { InlineNotification, RadioButton, RadioButtonGroup, RadioButtonSkeleton, Search } from '@carbon/react';
import { getCoreTranslation } from '@openmrs/esm-framework';
import { type LoginLocation } from './location-picker.resource';
import styles from './user-location-picker.module.scss';

interface UserLoginLocationPickerProps {
  locations: Array<LoginLocation>;
  isLoading: boolean;
  error?: unknown;
  selectedLocationUuid?: string;
  onChange: (locationUuid?: string) => void;
}

/**
 * A locally-owned replacement for @openmrs/esm-framework's <LocationPicker>, which always fetches
 * its own list from FHIR and has no way to accept a pre-filtered list. This renders a list of
 * already-fetched, per-user-filtered locations (see location-picker.resource.ts) instead.
 */
const UserLoginLocationPicker: React.FC<UserLoginLocationPickerProps> = ({
  locations,
  isLoading,
  error,
  selectedLocationUuid,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchId = useId();

  const filteredLocations = useMemo(() => {
    if (!searchTerm) {
      return locations;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return locations.filter((location) => location.name.toLowerCase().includes(lowerSearchTerm));
  }, [locations, searchTerm]);

  const handleSearchChange = (searchQuery: string) => {
    onChange();
    setSearchTerm(searchQuery.trim());
  };

  return (
    <>
      <Search
        aria-describedby={error ? `${searchId}-error` : undefined}
        labelText={getCoreTranslation('searchForLocation')}
        id={searchId}
        placeholder={getCoreTranslation('searchForLocation')}
        onChange={(event) => handleSearchChange(event.target.value)}
        size="lg"
      />
      {error ? (
        <div className={styles.errorNotification} id={`${searchId}-error`}>
          <InlineNotification
            kind="error"
            subtitle={getCoreTranslation(
              'errorLoadingLoginLocations',
              'Unable to load login locations. Please try again or contact support if the problem persists.',
            )}
            title={getCoreTranslation('error', 'Error')}
          />
        </div>
      ) : null}
      <div className={styles.searchResults}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            {Array.from({ length: 5 }).map((_, index) => (
              <RadioButtonSkeleton key={index} className={styles.radioButtonSkeleton} role="progressbar" />
            ))}
          </div>
        ) : (
          <div className={styles.locationResultsContainer}>
            {filteredLocations.length > 0 ? (
              <RadioButtonGroup
                name="loginLocations"
                onChange={(value) => onChange(value?.toString())}
                orientation="vertical"
                valueSelected={selectedLocationUuid}>
                {filteredLocations.map((location) => (
                  <RadioButton
                    className={styles.locationRadioButton}
                    id={location.uuid}
                    key={location.uuid}
                    labelText={location.name}
                    name={location.name}
                    value={location.uuid}
                  />
                ))}
              </RadioButtonGroup>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.locationNotFound}>{getCoreTranslation('noResultsToDisplay')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default UserLoginLocationPicker;
