import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import useSwrImmutable from 'swr/immutable';
import {
  fhirBaseUrl,
  restBaseUrl,
  type FetchResponse,
  openmrsFetch,
  setUserProperties,
  showSnackbar,
  useSession,
} from '@openmrs/esm-framework';
import { useValidateLocationUuid } from '../login.resource';
import { type LocationResponse } from '../types';

export function useDefaultLocation(isUpdateFlow: boolean) {
  const { t } = useTranslation();
  const { user } = useSession();
  const { userUuid, userProperties } = useMemo(
    () => ({
      userUuid: user?.uuid,
      userProperties: user?.userProperties,
    }),
    [user],
  );
  const [savePreference, setSavePreference] = useState(false);

  const defaultLocation = useMemo(() => userProperties?.defaultLocation, [userProperties?.defaultLocation]);

  const { isLocationValid, defaultLocation: defaultLocationFhir } = useValidateLocationUuid(defaultLocation);

  useEffect(() => {
    if (defaultLocation) {
      setSavePreference(true);
    }
  }, [setSavePreference, defaultLocation]);

  const updateUserPropsWithDefaultLocation = useCallback(
    async (locationUuid: string, saveDefaultLocation: boolean) => {
      if (saveDefaultLocation) {
        // If the user checks the checkbox for saving the preference
        const updatedUserProperties = {
          ...userProperties,
          defaultLocation: locationUuid,
        };
        await setUserProperties(userUuid, updatedUserProperties);
      } else if (!!userProperties?.defaultLocation) {
        // If the user doesn't want to save the preference,
        // the old preference should be deleted
        const updatedUserProperties = { ...userProperties };
        delete updatedUserProperties.defaultLocation;
        await setUserProperties(userUuid, updatedUserProperties);
      }
    },
    [userProperties, userUuid],
  );

  const updateDefaultLocation = useCallback(
    async (locationUuid: string, saveDefaultLocation: boolean) => {
      if (savePreference && locationUuid === defaultLocation) {
        return;
      }

      try {
        await updateUserPropsWithDefaultLocation(locationUuid, saveDefaultLocation);
      } catch (error) {
        // Persisting the preference writes to the user's own account (POST /user/{uuid}), which
        // clinical roles lack the privilege to do → 403. That's a non-fatal degradation: they just
        // can't remember a default location. Swallow it so it isn't an uncaught rejection at login,
        // and don't show a "saved" snackbar for a save that didn't happen.
        console.warn('Could not save login-location preference:', error);
        return;
      }

      if (saveDefaultLocation) {
        showSnackbar({
          title: !isUpdateFlow ? t('locationSaved', 'Location saved') : t('locationUpdated', 'Location updated'),
          subtitle: !isUpdateFlow
            ? t('locationSaveMessage', 'Your preferred location has been saved for future logins')
            : t('locationUpdateMessage', 'Your preferred login location has been updated'),
          kind: 'success',
          isLowContrast: true,
        });
      } else if (defaultLocation) {
        showSnackbar({
          title: t('locationPreferenceRemoved', 'Location preference removed'),
          subtitle: t('locationPreferenceRemovedMessage', 'You will need to select a location on each login'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    },
    [savePreference, defaultLocation, updateUserPropsWithDefaultLocation, t, isUpdateFlow],
  );

  return {
    defaultLocationFhir,
    defaultLocation: isLocationValid ? defaultLocation : null,
    updateDefaultLocation,
    savePreference,
    setSavePreference,
  };
}

export interface LoginLocation {
  uuid: string;
  name: string;
}

interface LoginLocationRestResponse {
  results: Array<{ uuid: string; display: string }>;
}

const shouldRetryOnServerErrorOnly = (err: { response?: { status: number } }) => {
  const status = err?.response?.status;
  if (status) {
    // 401 immediately after login is a transient race — the session cookie isn't authenticated on the
    // backend yet — so retry it (SWR caps at errorRetryCount) along with 5xx. A truly expired session
    // just exhausts the retries. 403 (privilege denied) is permanent and not retried.
    return status >= 500 || status === 401;
  }
  return false;
};

/**
 * GET /userlocation/loginlocation — the already-resolved set of locations the *authenticated* user
 * may log in at (their user_location mappings intersected with the "Login Location" tag, or every
 * tagged location when unmapped). Server-scoped to the current user (no uuid), so it needs only an
 * authenticated session — unlike /user/{uuid}/location, which is GET_USERS-gated and 403s ordinary
 * clinical users. Enforcement is server-side (UserLocationEnforcementFilter).
 *
 * Right after login the session cookie isn't attached to the next request yet, so the first fetch can
 * transiently 401; shouldRetryOnServerErrorOnly retries those (and 5xx) via SWR's native error-retry.
 */
const MAX_LOGIN_LOCATION_RETRIES = 8;
const LOGIN_LOCATION_RETRY_INTERVAL = 500;

function useResolvedLoginLocations(enabled: boolean) {
  const url = enabled ? `${restBaseUrl}/userlocation/loginlocation` : null;

  const { data, error, isLoading, isValidating } = useSWR<FetchResponse<LoginLocationRestResponse>>(url, openmrsFetch, {
    shouldRetryOnError: shouldRetryOnServerErrorOnly,
    errorRetryCount: MAX_LOGIN_LOCATION_RETRIES,
    errorRetryInterval: LOGIN_LOCATION_RETRY_INTERVAL,
  });

  return useMemo(
    () => ({
      locations: (data?.data?.results ?? []).map((result) => ({ uuid: result.uuid, name: result.display })),
      // keep the transient post-login 401 hidden while SWR is still retrying; surface only once it gives up
      error: error && !isValidating ? error : undefined,
      isLoading: isLoading || (!!error && isValidating && !data),
    }),
    [data, error, isLoading, isValidating],
  );
}

/**
 * GET /ws/fhir2/R4/Location?_tag=Login Location — every location tagged as a login location,
 * unfiltered by user.
 */
function useAllTaggedLoginLocations(enabled: boolean) {
  const url = enabled ? `${fhirBaseUrl}/Location?_tag=Login+Location&_count=1000` : null;

  const { data, error, isLoading } = useSwrImmutable<FetchResponse<LocationResponse>>(url, openmrsFetch, {
    shouldRetryOnError: shouldRetryOnServerErrorOnly,
  });

  return useMemo(
    () => ({
      locations: (data?.data?.entry ?? []).map((entry) => ({ uuid: entry.resource.id, name: entry.resource.name })),
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );
}

/**
 * The locations a user may pick at login: the per-user resolved set when {@code restrictByUser} is on,
 * else every tagged login location (unfiltered FHIR search).
 */
export function useLoginLocations(restrictByUser: boolean) {
  const tagged = useAllTaggedLoginLocations(!restrictByUser);
  const resolved = useResolvedLoginLocations(restrictByUser);

  return restrictByUser ? resolved : tagged;
}
