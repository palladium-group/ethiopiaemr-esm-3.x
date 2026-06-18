import React from 'react';
import { render } from '@testing-library/react';
import { navigate, useSession } from '@openmrs/esm-framework';
import Root from './root.component';

const mockUseSession = jest.mocked(useSession);
const mockNavigate = jest.mocked(navigate);

jest.mock('@openmrs/esm-framework', () => ({
  navigate: jest.fn(),
  useSession: jest.fn(),
  userHasAccess: jest.fn(
    (privilege: string, user: { privileges?: Array<{ display: string }> }) =>
      user?.privileges?.some((p) => p.display === privilege) ?? false,
  ),
  setLeftNav: jest.fn(),
  unsetLeftNav: jest.fn(),
  WorkspaceContainer: jest.fn(() => null),
}));

jest.mock('./components/side-menu/left-pannel.component', () => ({ default: () => null }));
jest.mock('./components/users/manage-users/manage-user.component', () => ({ default: () => null }));
jest.mock('./components/facility-setup/facility-setup.component', () => ({ default: () => null }));
jest.mock('./components/locations/home/home-locations.component', () => ({ default: () => null }));

window.getOpenmrsSpaBase = () => '/openmrs/spa/';

describe('Root admin access guard', () => {
  it('redirects to home when authenticated user lacks Manage Users privilege', () => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      user: { privileges: [], roles: [], display: 'Nurse', uuid: 'nurse-uuid' },
    } as any);

    render(<Root />);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: expect.stringContaining('/home'),
    });
  });

  it('does not redirect when user has Manage Users privilege', () => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      user: {
        privileges: [{ display: 'Add Users' }],
        roles: [],
        display: 'Admin',
        uuid: 'admin-uuid',
      },
    } as any);

    render(<Root />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders nothing when session is not yet authenticated', () => {
    mockUseSession.mockReturnValue({ authenticated: false, user: null } as any);

    const { container } = render(<Root />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
