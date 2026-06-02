import { fetchCurrentPatient, type Visit } from '@openmrs/esm-framework';
import { CONSULTATION_FORM_UUID } from '../constants';
import { pendingConsultationEncounter } from '../resources/consultation.fixture';
import { buildConsultationFormWorkspaceData } from './consultation-form.workspace';

type OpenmrsPatient = Awaited<ReturnType<typeof fetchCurrentPatient>>;

const mockVisit = {
  uuid: 'visit-uuid-1',
  visitType: {
    uuid: 'visit-type-uuid-1',
    display: 'Outpatient',
  },
  startDatetime: '2026-05-20T08:00:00.000+0000',
  stopDatetime: null,
} as Visit;

describe('consultation-form.workspace', () => {
  it('builds workspace data for creating a new consultation', () => {
    const patient = {
      uuid: 'patient-uuid-1',
      display: 'Test Patient',
    } as OpenmrsPatient;

    const workspaceData = buildConsultationFormWorkspaceData(
      patient,
      mockVisit,
      CONSULTATION_FORM_UUID,
      'Consultation',
    );

    expect(workspaceData).toEqual({
      formEntryWorkspaceName: 'Consultation',
      patient,
      visitContext: mockVisit,
      form: {
        visitUuid: 'visit-uuid-1',
        uuid: CONSULTATION_FORM_UUID,
        visitTypeUuid: 'visit-type-uuid-1',
      },
      encounterUuid: '',
      handlePostResponse: undefined,
    });
  });

  it('builds workspace data for editing an existing consultation', () => {
    const patient = {
      uuid: pendingConsultationEncounter.patient?.uuid ?? '',
      display: pendingConsultationEncounter.patient?.display ?? '',
    } as OpenmrsPatient;

    const workspaceData = buildConsultationFormWorkspaceData(
      patient,
      mockVisit,
      CONSULTATION_FORM_UUID,
      'Consultation',
      pendingConsultationEncounter.uuid,
    );

    expect(workspaceData.encounterUuid).toBe('encounter-uuid-1');
  });

  it('throws when visit data is invalid', () => {
    const patient = {
      uuid: 'patient-uuid-1',
      display: 'Test Patient',
    } as OpenmrsPatient;

    expect(() =>
      buildConsultationFormWorkspaceData(
        patient,
        { uuid: 'visit-uuid-1', startDatetime: '', stopDatetime: null } as Visit,
        CONSULTATION_FORM_UUID,
        'Consultation',
      ),
    ).toThrow('Invalid visit data received');
  });
});
