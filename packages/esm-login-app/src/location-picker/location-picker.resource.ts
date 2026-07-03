import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

      updateUserPropsWithDefaultLocation(locationUuid, saveDefaultLocation).then(() => {
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
      });
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

interface UserLoginLocationRestResponse {
  results: Array<{ uuid: string; display: string }>;
}

const shouldRetryOnServerErrorOnly = (err: { response?: { status: number } }) => {
  if (err?.response?.status) {
    return err.response.status >= 500;
  }
  return false;
};

/**
 * GET /user/{uuid}/location?tag=Login Location, which resolves to the intersection of the tag
 * and the user's own login-location mappings (or every tag-matching location when the user has
 * no mappings, i.e. unrestricted by default).
 */
function useLoginLocationsForUser(userUuid: string | undefined, enabled: boolean) {
  const url =
    enabled && userUuid ? `${restBaseUrl}/user/${userUuid}/location?tag=Login+Location&v=default&limit=1000` : null;

  const { data, error, isLoading } = useSwrImmutable<FetchResponse<UserLoginLocationRestResponse>>(url, openmrsFetch, {
    shouldRetryOnError: shouldRetryOnServerErrorOnly,
  });

  return useMemo(
    () => ({
      locations: (data?.data?.results ?? []).map((result) => ({ uuid: result.uuid, name: result.display })),
      error,
      // still resolving the session's user uuid; keep the caller's loading state true
      isLoading: enabled && !userUuid ? true : isLoading,
    }),
    [data, error, isLoading, enabled, userUuid],
  );
}

/**
 * GET /ws/fhir2/R4/Location?_tag=Login Location, unfiltered by user. Used as a fallback when
 * chooseLocation.restrictByUser is turned off, matching upstream OpenMRS's default behavior.
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

export function useLoginLocations(restrictByUser: boolean) {
  const { user } = useSession();

  const restricted = useLoginLocationsForUser(user?.uuid, restrictByUser);
  const unrestricted = useAllTaggedLoginLocations(!restrictByUser);

  return restrictByUser ? restricted : unrestricted;
}
