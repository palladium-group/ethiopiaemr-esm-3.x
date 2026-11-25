import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fetchCurrentPatient,
  getConfigStore,
  launchWorkspace2,
  navigate,
  useConfig,
  type Visit,
} from '@openmrs/esm-framework';
import { type Encounter } from '@openmrs/esm-service-queues-app/src/types/index';
import { useVitalsConceptMetadata, useVitalsFromObs } from '../hooks/useVitalsConceptMetadata';
import { invalidateVisitCache } from '../../../../triage/triage.resource';
import CurrentVisitDetails from './current-visit-details.component';
import Vitals from './vitals.component';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  fetchCurrentPatient: jest.fn(),
  formatTime: jest.fn((date: Date) => `${date.getUTCHours()}:${String(date.getUTCMinutes()).padStart(2, '0')}`),
  getConfigStore: jest.fn(),
  launchWorkspace2: jest.fn(),
  navigate: jest.fn(),
  parseDate: jest.fn((value: string) => new Date(value)),
  showSnackbar: jest.fn(),
  useConfig: jest.fn(),
}));

jest.mock('../hooks/useVitalsConceptMetadata', () => ({
  ...jest.requireActual('../hooks/useVitalsConceptMetadata'),
  useVitalsConceptMetadata: jest.fn(),
}));

jest.mock('../../../../triage/triage.resource', () => ({
  getCurrentVisitForPatient: jest.fn(),
  invalidateVisitCache: jest.fn(),
}));

const SERVICE_QUEUES_CONFIG = {
  concepts: {
    pulseUuid: 'pulse-uuid',
    oxygenSaturationUuid: 'spo2-uuid',
    respiratoryRateUuid: 'rr-uuid',
    temperatureUuid: 'temp-uuid',
    systolicBloodPressureUuid: 'sbp-uuid',
    diastolicBloodPressureUuid: 'dbp-uuid',
    weightUuid: 'weight-uuid',
    heightUuid: 'height-uuid',
  },
  biometrics: {
    bmiUnit: 'kg/m2',
  },
};

const mockVisit = {
  uuid: 'visit-1',
  visitType: { uuid: 'visit-type-1', display: 'Outpatient' },
  startDatetime: '2026-11-25T08:00:00.000Z',
  encounters: [],
} as unknown as Visit;

describe('CurrentVisitDetails & Vitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue(SERVICE_QUEUES_CONFIG);
    (useVitalsConceptMetadata as jest.Mock).mockReturnValue({
      data: new Map([
        ['temp-uuid', '°C'],
        ['sbp-uuid', 'mmHg'],
        ['pulse-uuid', 'bpm'],
      ]),
      conceptMetadata: [],
    });
    (getConfigStore as jest.Mock).mockReturnValue({
      getState: () => ({
        config: {
          vitals: {
            formUuid: '4d4f4e54-947b-5dcd-bad8-6c9f2e2ab969',
            formName: 'Vital Signs (Adult & Pediatric)',
          },
        },
      }),
    });
  });

  it('removes the Triage note section and renders Vitals with the latest recorded values', () => {
    const encounters = [
      // Newest encounter first (OpenMRS default ordering)
      {
        uuid: 'enc-new',
        encounterDatetime: '2026-11-25T11:30:00.000Z',
        encounterProviders: [{ provider: { person: { display: 'Nurse New' } }, encounterRole: { display: 'Nurse' } }],
        obs: [
          { concept: { uuid: 'temp-uuid' }, value: 38.4, obsDatetime: '2026-11-25T11:30:00.000Z' },
          { concept: { uuid: 'pulse-uuid' }, value: 96, obsDatetime: '2026-11-25T11:30:00.000Z' },
        ],
      },
      // Older encounter second
      {
        uuid: 'enc-old',
        encounterDatetime: '2026-11-25T09:00:00.000Z',
        encounterProviders: [{ provider: { person: { display: 'Nurse Old' } }, encounterRole: { display: 'Nurse' } }],
        obs: [
          { concept: { uuid: 'temp-uuid' }, value: 36.5, obsDatetime: '2026-11-25T09:00:00.000Z' },
          { concept: { uuid: 'pulse-uuid' }, value: 72, obsDatetime: '2026-11-25T09:00:00.000Z' },
        ],
      },
    ] as unknown as Array<Encounter>;

    const visitWithEncounters = {
      ...mockVisit,
      encounters,
    } as unknown as Visit;

    render(<CurrentVisitDetails patientUuid="patient-1" visit={visitWithEncounters} />);

    expect(screen.queryByText('Triage note')).not.toBeInTheDocument();
    expect(screen.queryByText('Triage form')).not.toBeInTheDocument();
    expect(screen.getByText('Vitals')).toBeInTheDocument();
    expect(screen.getByText('38.4')).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument();
    expect(screen.queryByText('36.5')).not.toBeInTheDocument();
    expect(screen.queryByText('72')).not.toBeInTheDocument();
    expect(screen.getByText(/Nurse New/)).toBeInTheDocument();
    expect(screen.getByText(/11:30/)).toBeInTheDocument();
    // Record vital button remains visible even after vitals are recorded
    expect(screen.getByRole('button', { name: 'Record vital' })).toBeInTheDocument();
  });

  it('orders observations chronologically inside useVitalsFromObs so latest obs wins within an encounter', () => {
    const TestHarness = ({ encounters }: { encounters: Array<Encounter> }) => {
      const vitals = useVitalsFromObs(encounters);
      const merged = vitals.reduce((acc, item) => Object.assign(acc, item), {});
      return <span data-testid="temp">{merged.temperature}</span>;
    };

    const encounters = [
      {
        uuid: 'enc-1',
        encounterDatetime: '2026-11-25T10:00:00.000Z',
        encounterProviders: [],
        obs: [
          { concept: { uuid: 'temp-uuid' }, value: 39.1, obsDatetime: '2026-11-25T10:45:00.000Z' },
          { concept: { uuid: 'temp-uuid' }, value: 36.2, obsDatetime: '2026-11-25T10:00:00.000Z' },
        ],
      },
    ] as unknown as Array<Encounter>;

    render(<TestHarness encounters={encounters} />);
    expect(screen.getByTestId('temp')).toHaveTextContent('39.1');
  });

  it('shows Record vital button when no vitals are recorded for currentVisit and hides it for pastVisit', () => {
    const { rerender } = render(
      <Vitals vitals={[]} patientUuid="patient-1" visitType="currentVisit" visit={mockVisit} />,
    );
    expect(screen.getByRole('button', { name: 'Record vital' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vitals form' })).not.toBeInTheDocument();

    rerender(<Vitals vitals={[]} patientUuid="patient-1" visitType="pastVisit" />);
    expect(screen.queryByRole('button', { name: 'Record vital' })).not.toBeInTheDocument();
    expect(screen.getByText('No vitals found')).toBeInTheDocument();
  });

  it('launches the vitals form workspace without navigating away when Record vital is clicked', async () => {
    const user = userEvent.setup();
    const mockPatient = { id: 'patient-1', resourceType: 'Patient' };
    const mutateVisit = jest.fn();
    (fetchCurrentPatient as jest.Mock).mockResolvedValue(mockPatient);
    (launchWorkspace2 as jest.Mock).mockResolvedValue(true);

    render(
      <Vitals
        vitals={[{ temperature: 37.0, time: '10:00', provider: { name: 'Nurse A', role: 'Nurse' } }]}
        patientUuid="patient-1"
        visitType="currentVisit"
        visit={mockVisit}
        mutateVisit={mutateVisit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Record vital' }));

    await waitFor(() => {
      expect(launchWorkspace2).toHaveBeenCalledWith(
        'clinical-workflow-patient-form-entry-workspace',
        expect.objectContaining({
          formEntryWorkspaceName: 'Vital Signs (Adult & Pediatric)',
          patient: mockPatient,
          visitContext: mockVisit,
          form: {
            visitUuid: 'visit-1',
            uuid: '4d4f4e54-947b-5dcd-bad8-6c9f2e2ab969',
            visitTypeUuid: 'visit-type-1',
          },
          encounterUuid: '',
          handlePostResponse: expect.any(Function),
        }),
        {
          patient: mockPatient,
          patientUuid: 'patient-1',
          visitContext: mockVisit,
          mutateVisitContext: mutateVisit,
        },
      );
    });

    expect(navigate).not.toHaveBeenCalled();

    const workspaceData = (launchWorkspace2 as jest.Mock).mock.calls[0][1];
    workspaceData.handlePostResponse();
    expect(mutateVisit).toHaveBeenCalled();
    expect(invalidateVisitCache).toHaveBeenCalledWith('patient-1');
  });
});
