import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthIdSearch } from './health-id-search.component';
import { type FormValues } from '../patient-registration.types';

describe('HealthIdSearch', () => {
  const originalFetch = window.fetch;

  const mockCurrentValues: Partial<FormValues> = {
    givenName: 'TestGiven',
    middleName: 'TestMiddle',
    familyName: 'TestFamily',
    gender: 'male',
    birthdate: new Date('1990-01-01'),
    identifiers: {},
  };

  afterEach(() => {
    window.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('renders search input and button', () => {
    render(
      <HealthIdSearch
        lookupUrl="/mpi"
        currentFormValues={mockCurrentValues as FormValues}
        onOverwriteConfirm={jest.fn()}
      />,
    );

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByText(/Health ID Search/i)).toBeInTheDocument();
  });

  it('shows not found notification when patient is not in MPI', async () => {
    const user = userEvent.setup();
    window.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({
        success: false,
        patientNotFound: true,
        message: 'Patient not found',
      }),
    } as any);

    render(
      <HealthIdSearch
        lookupUrl="/mpi"
        currentFormValues={mockCurrentValues as FormValues}
        onOverwriteConfirm={jest.fn()}
      />,
    );

    const input = screen.getByRole('searchbox');
    await user.type(input, 'HID-NOTFOUND');

    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Patient not found/i)).toBeInTheDocument();
    });
  });

  it('opens diff modal when patient is found', async () => {
    const user = userEvent.setup();
    const mockFoundPatient = {
      success: true,
      message: 'Found',
      fhir: {
        healthId: 'HID-999',
        person: {
          names: [{ givenName: 'RegistryGiven', middleName: 'RegistryMiddle', familyName: 'RegistryFamily' }],
          gender: 'female',
          birthdate: '1995-02-14',
        },
      },
    };

    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFoundPatient),
    } as any);

    render(
      <HealthIdSearch
        lookupUrl="/mpi"
        currentFormValues={mockCurrentValues as FormValues}
        onOverwriteConfirm={jest.fn()}
      />,
    );

    const input = screen.getByRole('searchbox');
    await user.type(input, 'HID-999');

    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Health ID Found — Review & Confirm Overwrite/i)).toBeInTheDocument();
    });
    expect(screen.getByText('RegistryGiven')).toBeInTheDocument();
    expect(screen.getByText('TestGiven')).toBeInTheDocument();
  });
});
