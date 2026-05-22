import { renderHook } from '@testing-library/react';
import { userHasAccess, useConfig, useSession } from '@openmrs/esm-framework';
import { ConsultationPermissions } from '../permissions/permissions.constants';
import { useConsultationPrivileges } from './useConsultationPrivileges';

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn(),
  useSession: jest.fn(),
  userHasAccess: jest.fn(),
}));

const mockedUseConfig = useConfig as jest.MockedFunction<typeof useConfig>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockedUserHasAccess = userHasAccess as jest.MockedFunction<typeof userHasAccess>;

describe('useConsultationPrivileges', () => {
  beforeEach(() => {
    mockedUseConfig.mockReturnValue({
      viewConsultationPrivilege: ConsultationPermissions.ViewConsultations,
      requestConsultationPrivilege: ConsultationPermissions.RequestConsultation,
      respondConsultationPrivilege: ConsultationPermissions.RespondConsultation,
    });
    mockedUseSession.mockReturnValue({ user: { uuid: 'user-uuid' } } as ReturnType<typeof useSession>);
    mockedUserHasAccess.mockImplementation((privilege) => privilege === ConsultationPermissions.ViewConsultations);
  });

  it('returns privilege booleans from configured privilege names', () => {
    const { result } = renderHook(() => useConsultationPrivileges());

    expect(result.current.canViewConsultations).toBe(true);
    expect(result.current.canRequestConsultation).toBe(false);
    expect(result.current.canRespondToConsultation).toBe(false);
  });
});
