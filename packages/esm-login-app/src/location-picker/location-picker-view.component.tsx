import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button, Checkbox, InlineLoading } from '@carbon/react';
import { useLocation, type Location, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getCoreTranslation,
  navigate,
  setSessionLocation,
  useConfig,
  useConnectivity,
  useSession,
} from '@openmrs/esm-framework';
import { useDefaultLocation, useLoginLocations } from './location-picker.resource';
import UserLoginLocationPicker from './user-location-picker.component';
import type { ConfigSchema } from '../config-schema';
import type { LoginReferrer } from '../login/login.component';
import styles from './location-picker.scss';

/**
 * Validates that a returnToUrl is safe to navigate to.
 * Only same-origin URLs are permitted, preventing open-redirect attacks after login.
 */
export function isSafeReturnUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

interface LocationPickerProps {
  hideWelcomeMessage?: boolean;
  currentLocationUuid?: string;
}

const LocationPickerView: React.FC<LocationPickerProps> = ({ hideWelcomeMessage, currentLocationUuid }) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigSchema>();
  const { chooseLocation } = config;
  const isLoginEnabled = useConnectivity();
  const [searchParams] = useSearchParams();
  const checkboxId = useId();
  const isUpdateFlow = useMemo(() => searchParams.get('update') === 'true', [searchParams]);
  const { defaultLocation, updateDefaultLocation, savePreference, setSavePreference } =
    useDefaultLocation(isUpdateFlow);
  const {
    locations,
    isLoading: isLoadingLocations,
    error: locationsError,
  } = useLoginLocations(chooseLocation.restrictByUser);

  const { user, sessionLocation } = useSession();
  const { currentUser } = useMemo(
    () => ({
      currentUser: user?.display,
    }),
    [user],
  );

  const [activeLocation, setActiveLocation] = useState(() => {
    if (currentLocationUuid && hideWelcomeMessage) {
      return currentLocationUuid;
    }
    return sessionLocation?.uuid ?? defaultLocation;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { state } = useLocation() as unknown as Omit<Location, 'state'> & {
    state: LoginReferrer;
  };

  const changeLocation = useCallback(
    (locationUuid?: string, saveUserPreference?: boolean) => {
      setIsSubmitting(true);

      const referrer = state?.referrer;
      const returnToUrl = searchParams.get('returnToUrl');

      const sessionDefined = setSessionLocation(locationUuid, new AbortController());

      updateDefaultLocation(locationUuid, saveUserPreference);
      sessionDefined.then(() => {
        if (referrer && referrer.startsWith('/') && !['/', '/login', '/login/location'].includes(referrer)) {
          navigate({ to: '${openmrsSpaBase}' + referrer });
          return;
        }
        if (returnToUrl && isSafeReturnUrl(returnToUrl)) {
          navigate({ to: returnToUrl });
        } else {
          navigate({ to: config.links.loginSuccess });
        }
      });
    },
    [state?.referrer, config.links.loginSuccess, updateDefaultLocation, searchParams],
  );

  // Handle cases where the location picker is disabled, there is only one location, or there are no locations.
  useEffect(() => {
    if (isLoadingLocations) {
      return;
    }

    if (locations.length === 0) {
      changeLocation();
    } else if (locations.length === 1 || !chooseLocation.enabled) {
      changeLocation(locations[0].uuid, true);
    }
  }, [locations, isLoadingLocations]);

  // Handle cases where the login location is present in the userProperties.
  useEffect(() => {
    if (isUpdateFlow) {
      return;
    }
    if (defaultLocation && !isSubmitting) {
      setActiveLocation(defaultLocation);
      changeLocation(defaultLocation, true);
    }
  }, [changeLocation, isSubmitting, defaultLocation, isUpdateFlow]);

  const handleSubmit = useCallback(
    (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();

      if (!activeLocation) {
        return;
      }

      changeLocation(activeLocation, savePreference);
    },
    [activeLocation, changeLocation, savePreference],
  );

  return (
    <div className={styles.locationPickerContainer}>
      <form onSubmit={handleSubmit}>
        <div className={styles.locationCard}>
          <div className={styles.paddedContainer}>
            <p className={styles.welcomeTitle}>
              {t('welcome', 'Welcome')} {currentUser}
            </p>
            <p className={styles.welcomeMessage}>
              {t(
                'selectYourLocation',
                'Select your location from the list below. Use the search bar to find your location.',
              )}
            </p>
          </div>
          <UserLoginLocationPicker
            locations={locations}
            isLoading={isLoadingLocations}
            error={locationsError}
            selectedLocationUuid={activeLocation}
            onChange={(locationUuid) => setActiveLocation(locationUuid)}
          />
          <div className={styles.footerContainer}>
            <Checkbox
              className={styles.savePreferenceCheckbox}
              checked={savePreference}
              id={checkboxId}
              labelText={t('rememberLocationForFutureLogins', 'Remember my location for future logins')}
              onChange={(_, { checked }) => setSavePreference(checked)}
            />
            <Button
              className={styles.confirmButton}
              kind="primary"
              type="submit"
              disabled={!activeLocation || !isLoginEnabled || isSubmitting}>
              {isSubmitting ? (
                <InlineLoading className={styles.loader} description={t('submitting', 'Submitting')} />
              ) : (
                <span>{getCoreTranslation('confirm')}</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LocationPickerView;
