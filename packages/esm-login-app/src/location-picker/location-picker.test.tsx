import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  navigate,
  openmrsFetch,
  setSessionLocation,
  setUserProperties,
  showSnackbar,
  useConfig,
  useConnectivity,
  useSession,
  type LoggedInUser,
  type Session,
  type FetchResponse,
} from '@openmrs/esm-framework';
import {
  mockUserLoginLocationsResponse,
  validatingLocationFailureResponse,
  validatingLocationSuccessResponse,
} from '../../__mocks__/locations.mock';
import { mockConfig } from '../../__mocks__/config.mock';
import renderWithRouter from '../test-helpers/render-with-router';
import LocationPickerView, { isSafeReturnUrl } from './location-picker-view.component';

const firstLocation = mockUserLoginLocationsResponse.data.results[0];
const secondLocation = mockUserLoginLocationsResponse.data.results[1];

const invalidLocationUuid = '2gf1b7d4-c865-4178-82b0-5932e51503d6';
const userUuid = '90bd24b3-e700-46b0-a5ef-c85afdfededd';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);
const mockUseSession = jest.mocked(useSession);
const mockSetSessionLocation = jest.mocked(setSessionLocation);
const mockSetUserProperties = jest.mocked(setUserProperties);
const mockUseConnectivity = jest.mocked(useConnectivity);
const mockShowSnackbar = jest.mocked(showSnackbar);
const mockNavigate = jest.mocked(navigate);

function sessionWithDefaultLocation(defaultLocation?: string) {
  return {
    user: {
      display: 'Testy McTesterface',
      uuid: userUuid,
      userProperties: defaultLocation ? { defaultLocation } : {},
    } as LoggedInUser,
  } as Session;
}

describe('LocationPickerView', () => {
  beforeEach(() => {
    mockUseConnectivity.mockReturnValue(true);
    mockUseConfig.mockReturnValue(mockConfig);
    mockUseSession.mockReturnValue(sessionWithDefaultLocation());

    const urlResponseMap: Record<string, FetchResponse<unknown>> = {
      [`/ws/fhir2/R4/Location?_id=${firstLocation.uuid}`]: validatingLocationSuccessResponse as FetchResponse<unknown>,
      [`/ws/fhir2/R4/Location?_id=${invalidLocationUuid}`]: validatingLocationFailureResponse as FetchResponse<unknown>,
    };

    mockOpenmrsFetch.mockImplementation(
      async (url) => urlResponseMap[url as string] ?? (mockUserLoginLocationsResponse as FetchResponse<unknown>),
    );

    mockSetSessionLocation.mockResolvedValue(undefined);
  });

  it('renders the welcome message and location selection form', () => {
    renderWithRouter(LocationPickerView, {
      currentLocationUuid: 'some-location-uuid',
      hideWelcomeMessage: false,
    });

    expect(screen.getByText(/welcome testy mctesterface/i)).toBeInTheDocument();
    expect(
      screen.getByText(/select your location from the list below. use the search bar to find your location/i),
    ).toBeInTheDocument();
  });

  it('only renders the locations returned for this user', async () => {
    renderWithRouter(LocationPickerView, {});

    await screen.findByRole('radio', { name: firstLocation.display });
    expect(screen.getByRole('radio', { name: secondLocation.display })).toBeInTheDocument();
  });

  it('disables the confirm button when no location is selected', () => {
    renderWithRouter(LocationPickerView, {});

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeDisabled();
  });

  it('enables the confirm button when a location is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(LocationPickerView, {});

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeDisabled();

    const location = await screen.findByRole('radio', { name: firstLocation.display });
    await user.click(location);

    expect(confirmButton).toBeEnabled();
  });

  describe('Saving location preference', () => {
    it('allows user to save their preferred location for future logins', async () => {
      const user = userEvent.setup();

      renderWithRouter(LocationPickerView, {});

      const location = await screen.findByRole('radio', { name: firstLocation.display });
      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      const submitButton = screen.getByRole('button', { name: /confirm/i });

      await user.click(location);
      expect(submitButton).toBeEnabled();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
      });

      expect(mockSetUserProperties).toHaveBeenCalledWith(userUuid, {
        defaultLocation: firstLocation.uuid,
      });

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            kind: 'success',
            title: 'Location saved',
            subtitle: 'Your preferred location has been saved for future logins',
          }),
        );
      });
    });

    it('does not save preference when user submits without checking the checkbox', async () => {
      const user = userEvent.setup();

      renderWithRouter(LocationPickerView, {});

      const location = await screen.findByRole('radio', { name: firstLocation.display });
      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      const submitButton = screen.getByRole('button', { name: /confirm/i });

      await user.click(location);
      expect(checkbox).not.toBeChecked();

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
      });

      expect(mockSetUserProperties).not.toHaveBeenCalled();
      expect(mockShowSnackbar).not.toHaveBeenCalled();
    });

    it('automatically redirects when user has a valid saved location preference', async () => {
      mockUseSession.mockReturnValue(sessionWithDefaultLocation(firstLocation.uuid));

      renderWithRouter(LocationPickerView, {});

      await waitFor(() => {
        expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
      });

      expect(mockSetUserProperties).not.toHaveBeenCalled();
    });

    it('shows location picker when saved location preference is invalid', async () => {
      mockUseSession.mockReturnValue(sessionWithDefaultLocation(invalidLocationUuid));

      renderWithRouter(LocationPickerView, {});

      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      expect(checkbox).toBeChecked();

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(mockSetSessionLocation).not.toHaveBeenCalled();
    });
  });

  describe('Updating location preference', () => {
    it('shows location picker when update=true is in URL params', () => {
      mockUseSession.mockReturnValue(sessionWithDefaultLocation(firstLocation.uuid));

      renderWithRouter(LocationPickerView, {}, { routes: ['?update=true'] });

      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      expect(checkbox).toBeChecked();

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(mockSetSessionLocation).not.toHaveBeenCalled();
    });

    it('allows user to update their preferred location', async () => {
      const user = userEvent.setup();

      mockUseSession.mockReturnValue(sessionWithDefaultLocation(firstLocation.uuid));

      renderWithRouter(LocationPickerView, {}, { routes: ['?update=true'] });

      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      expect(checkbox).toBeChecked();

      const location = await screen.findByRole('radio', { name: secondLocation.display });
      const submitButton = screen.getByRole('button', { name: /confirm/i });

      await user.click(location);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetSessionLocation).toHaveBeenCalledWith(secondLocation.uuid, expect.anything());
      });

      expect(mockSetUserProperties).toHaveBeenCalledWith(userUuid, {
        defaultLocation: secondLocation.uuid,
      });

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            kind: 'success',
            title: 'Location updated',
            subtitle: 'Your preferred login location has been updated',
          }),
        );
      });
    });

    it('does not update preference when user selects the same location', async () => {
      const user = userEvent.setup();

      mockUseSession.mockReturnValue(sessionWithDefaultLocation(firstLocation.uuid));

      renderWithRouter(LocationPickerView, {}, { routes: ['?update=true'] });

      const checkbox = screen.getByLabelText(/remember my location for future logins/i);
      expect(checkbox).toBeChecked();

      const location = await screen.findByRole('radio', { name: firstLocation.display });
      const submitButton = screen.getByRole('button', { name: /confirm/i });

      await user.click(location);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
      });

      expect(mockSetUserProperties).not.toHaveBeenCalled();
    });
  });
});

describe('isSafeReturnUrl', () => {
  it('rejects an absolute external URL', () => {
    expect(isSafeReturnUrl('https://evil.com/openmrs/spa/home')).toBe(false);
  });

  it('accepts an absolute same-origin SPA URL', () => {
    const sameOriginSpaUrl = `${window.location.origin}/openmrs/spa/home`;
    expect(isSafeReturnUrl(sameOriginSpaUrl)).toBe(true);
  });

  it('rejects a protocol-relative external URL', () => {
    expect(isSafeReturnUrl('//evil.com/openmrs/spa/home')).toBe(false);
  });

  it('accepts a same-origin URL outside the SPA base', () => {
    expect(isSafeReturnUrl('/openmrs/admin/index.htm')).toBe(true);
  });

  it('rejects a javascript: URL', () => {
    expect(isSafeReturnUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isSafeReturnUrl('')).toBe(false);
  });

  it('accepts a valid same-origin SPA path', () => {
    expect(isSafeReturnUrl('/openmrs/spa/home')).toBe(true);
  });

  it('accepts a valid same-origin SPA sub-path', () => {
    expect(isSafeReturnUrl('/openmrs/spa/patient/123/chart')).toBe(true);
  });
});

describe('returnToUrl open-redirect protection', () => {
  beforeEach(() => {
    mockUseConnectivity.mockReturnValue(true);
    mockUseConfig.mockReturnValue(mockConfig);
    mockUseSession.mockReturnValue(sessionWithDefaultLocation());
    mockOpenmrsFetch.mockResolvedValue(mockUserLoginLocationsResponse as FetchResponse<unknown>);
    mockSetSessionLocation.mockResolvedValue(undefined);
    mockNavigate.mockClear();
  });

  it('rejects an external returnToUrl and falls back to loginSuccess', async () => {
    const user = userEvent.setup();

    renderWithRouter(LocationPickerView, {}, { routes: ['?returnToUrl=https://evil.com/steal-creds'] });

    const location = await screen.findByRole('radio', { name: firstLocation.display });
    await user.click(location);

    const submitButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: mockConfig.links.loginSuccess });
    });

    expect(mockNavigate).not.toHaveBeenCalledWith({ to: 'https://evil.com/steal-creds' });
  });

  it('accepts a valid same-origin SPA returnToUrl', async () => {
    const user = userEvent.setup();

    renderWithRouter(LocationPickerView, {}, { routes: ['?returnToUrl=/openmrs/spa/home'] });

    const location = await screen.findByRole('radio', { name: firstLocation.display });
    await user.click(location);

    const submitButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetSessionLocation).toHaveBeenCalledWith(firstLocation.uuid, expect.anything());
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/openmrs/spa/home' });
    });
  });
});
