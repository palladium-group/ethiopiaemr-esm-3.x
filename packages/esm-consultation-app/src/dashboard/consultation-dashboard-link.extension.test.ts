import { resolvePatientChartBasePath } from './consultation-dashboard-link.extension';

describe('consultation-dashboard-link.extension', () => {
  const patientUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('falls back to the patient chart base path when basePath is missing', () => {
    const resolvedBasePath = resolvePatientChartBasePath(
      undefined,
      `/openmrs/spa/patient/${patientUuid}/chart/consultation`,
    );

    expect(resolvedBasePath).toBe(`/openmrs/spa/patient/${patientUuid}/chart`);
  });

  it('prefers a patient chart basePath from the extension host', () => {
    expect(
      resolvePatientChartBasePath(
        `/openmrs/spa/patient/${patientUuid}/chart`,
        `/openmrs/spa/patient/${patientUuid}/chart`,
      ),
    ).toBe(`/openmrs/spa/patient/${patientUuid}/chart`);
  });

  it('does not treat the homepage base path as a patient chart base path', () => {
    expect(resolvePatientChartBasePath('/openmrs/spa/home', '/openmrs/spa/home/consultation-inbox')).toBeUndefined();
  });
});
