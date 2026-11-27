import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthIdDiffModal } from './health-id-diff-modal.component';
import { type HealthIdPatient } from './health-id.resource';
import { type FormValues } from '../patient-registration.types';

describe('HealthIdDiffModal', () => {
  const mockCurrentValues: Partial<FormValues> = {
    givenName: 'OldGiven',
    middleName: 'OldMiddle',
    familyName: 'OldFamily',
    gender: 'female',
    birthdate: new Date('1985-05-20'),
    telephoneNumber: '0911000000',
    address: {
      countyDistrict: 'OldRegion',
      stateProvince: 'OldZone',
      address4: 'OldWoreda',
    },
    identifiers: {},
  };

  const mockHealthIdPatient: HealthIdPatient = {
    success: true,
    message: 'Found',
    fhir: {
      healthId: 'HID-12345',
      person: {
        names: [{ givenName: 'NewGiven', middleName: 'OldMiddle', familyName: 'NewFamily' }],
        gender: 'male',
        birthdate: '1990-01-01',
        addresses: [
          {
            countyDistrict: 'NewRegion',
            stateProvince: 'OldZone',
            address4: 'NewWoreda',
            address2: 'House 123',
          },
        ],
      },
      phone: '0922111111',
      email: 'patient@example.com',
    },
  };

  it('renders diff modal with comparison table and values', () => {
    render(
      <HealthIdDiffModal
        open={true}
        onClose={jest.fn()}
        onConfirmOverwrite={jest.fn()}
        searchedHealthId="HID-12345"
        healthIdPatient={mockHealthIdPatient}
        currentFormValues={mockCurrentValues as FormValues}
      />,
    );

    expect(screen.getByText(/Health ID Found — Review & Confirm Overwrite/i)).toBeInTheDocument();
    expect(screen.getByText('HID-12345')).toBeInTheDocument();

    // Check current values
    expect(screen.getByText('OldGiven')).toBeInTheDocument();
    expect(screen.getByText('NewGiven')).toBeInTheDocument();

    // Changed vs Identical tags
    const changedTags = screen.getAllByText('Changed');
    expect(changedTags.length).toBeGreaterThan(0);

    const identicalTags = screen.getAllByText('Identical');
    expect(identicalTags.length).toBeGreaterThan(0);
  });

  it('calls onConfirmOverwrite when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const mockConfirm = jest.fn();
    const mockClose = jest.fn();

    render(
      <HealthIdDiffModal
        open={true}
        onClose={mockClose}
        onConfirmOverwrite={mockConfirm}
        searchedHealthId="HID-12345"
        healthIdPatient={mockHealthIdPatient}
        currentFormValues={mockCurrentValues as FormValues}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: /confirm and overwrite/i });
    await user.click(confirmButton);

    expect(mockConfirm).toHaveBeenCalledWith(mockHealthIdPatient);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockConfirm = jest.fn();
    const mockClose = jest.fn();

    render(
      <HealthIdDiffModal
        open={true}
        onClose={mockClose}
        onConfirmOverwrite={mockConfirm}
        searchedHealthId="HID-12345"
        healthIdPatient={mockHealthIdPatient}
        currentFormValues={mockCurrentValues as FormValues}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    render(
      <HealthIdDiffModal
        open={false}
        onClose={jest.fn()}
        onConfirmOverwrite={jest.fn()}
        searchedHealthId="HID-12345"
        healthIdPatient={mockHealthIdPatient}
        currentFormValues={mockCurrentValues as FormValues}
      />,
    );

    expect(screen.queryByText(/Health ID Found — Review & Confirm Overwrite/i)).not.toBeInTheDocument();
  });
});
