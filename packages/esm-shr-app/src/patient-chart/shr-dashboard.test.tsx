import React from 'react';
import { SWRConfig } from 'swr';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, showModal, type FetchResponse } from '@openmrs/esm-framework';
import { launchStartVisitPrompt } from '@openmrs/esm-patient-common-lib';
import ShrDashboard from './shr-dashboard.component';

jest.mock('@openmrs/esm-patient-common-lib', () => ({ launchStartVisitPrompt: jest.fn() }));

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockShowModal = jest.mocked(showModal);
const mockLaunchStartVisitPrompt = jest.mocked(launchStartVisitPrompt);

const PATIENT = '85062570-1bbf-418c-a812-43cd34aa7eef';

const ok = (data: unknown) => Promise.resolve({ data } as FetchResponse<unknown>);
const refused = (status: number, code: string) =>
  Promise.reject({
    response: { status },
    responseBody: { resourceType: 'OperationOutcome', issue: [{ details: { text: code } }] },
  });

const summary = {
  resourceType: 'Bundle',
  entry: [
    {
      resource: {
        resourceType: 'Composition',
        section: [{ code: { coding: [{ code: '11450-4' }] }, entry: [{ reference: 'Condition/10' }] }],
      },
    },
    { resource: { resourceType: 'Condition', id: '10', code: { text: 'Hypertension' } } },
    {
      resource: {
        resourceType: 'Provenance',
        target: [{ reference: 'Condition/10' }],
        agent: [{ who: { display: 'Geda Health Center' } }],
      },
    },
  ],
};

const noPending = { resourceType: 'Bundle', entry: [] };

function serve(routes: {
  status?: () => Promise<unknown>;
  summary?: () => Promise<unknown>;
  pending?: () => Promise<unknown>;
}) {
  mockOpenmrsFetch.mockImplementation(((url: string) => {
    if (url.endsWith('/shrclient/status')) {
      return (routes.status ?? (() => ok({ enabled: true })))();
    }
    if (url.endsWith('/summary')) {
      return (routes.summary ?? (() => ok(summary)))();
    }
    if (url.endsWith('/access-request')) {
      return (routes.pending ?? (() => ok(noPending)))();
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  }) as never);
}

function renderDashboard() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ShrDashboard patientUuid={PATIENT} />
    </SWRConfig>,
  );
}

describe('ShrDashboard', () => {
  it('reads nothing and says so while the SHR is switched off here', async () => {
    serve({ status: () => ok({ enabled: false }) });
    renderDashboard();

    expect(await screen.findByText(/not switched on at this facility/i)).toBeInTheDocument();
    expect(mockOpenmrsFetch.mock.calls.map(([url]) => url)).not.toContainEqual(expect.stringContaining('/summary'));
  });

  it('treats a module without the status endpoint as switched off', async () => {
    serve({ status: () => refused(404, 'not-found') });
    renderDashboard();

    expect(await screen.findByText(/not switched on at this facility/i)).toBeInTheDocument();
  });

  it('shows the shared records with the facility that shared them', async () => {
    serve({});
    renderDashboard();

    expect(await screen.findByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('Geda Health Center')).toBeInTheDocument();
    expect(screen.getAllByText('Nothing shared')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /request more access/i })).toBeInTheDocument();
  });

  it('asks for a visit, and offers to start one, when there is no active visit', async () => {
    serve({ summary: () => refused(409, 'no-active-visit') });
    renderDashboard();

    expect(await screen.findByText('A visit is needed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /start visit/i }));
    expect(mockLaunchStartVisitPrompt).toHaveBeenCalled();
  });

  it('offers a request for access when the patient has not shared their record', async () => {
    serve({ summary: () => refused(403, 'consent-required') });
    renderDashboard();

    expect(await screen.findByText('Not shared with this facility')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^request access$/i }));
    expect(mockShowModal).toHaveBeenCalledWith(
      'shr-request-access-modal',
      expect.objectContaining({ patientUuid: PATIENT }),
    );
  });

  it('shows a waiting request instead of offering another', async () => {
    serve({
      summary: () => refused(403, 'consent-required'),
      pending: () =>
        ok({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Task',
                id: '1041',
                authoredOn: '2026-10-14T07:24:45+00:00',
                restriction: { period: { end: '2026-10-21T07:24:45+00:00' } },
                input: [{ type: { coding: [{ code: 'resource-type' }] }, valueString: 'MedicationRequest' }],
              },
            },
          ],
        }),
    });
    renderDashboard();

    expect(await screen.findByText('Waiting for the patient to answer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request access/i })).not.toBeInTheDocument();
  });

  it('says the patient is not in the SHR yet rather than reporting an error', async () => {
    serve({ summary: () => refused(404, 'patient-not-found') });
    renderDashboard();

    expect(await screen.findByText('Not in the Shared Health Record yet')).toBeInTheDocument();
  });

  it('offers a retry when the SHR cannot be reached', async () => {
    serve({ summary: () => Promise.reject(new Error('Failed to fetch')) });
    renderDashboard();

    expect(await screen.findByText(/can't be reached right now/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
