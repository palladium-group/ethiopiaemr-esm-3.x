import React, { type ReactElement } from 'react';
import { Route, Routes, MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { type RenderOptions, render, screen, waitForElementToBeRemoved } from '@testing-library/react';

import {
  mockPatient,
  mockPatientWithLongName,
  mockPatientWithoutFormattedName,
  patientChartBasePath,
} from '../__mocks__/patient.mock';

const swrWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        provider: () => new Map(),
      }}>
      {children}
    </SWRConfig>
  );
};

const withSwr = (ui: ReactElement) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{ui}</SWRConfig>
);

const renderWithSwr = (ui: ReactElement, options?: Omit<RenderOptions, 'queries'>) =>
  render(ui, { wrapper: swrWrapper, ...options });

const renderWithContext = <T,>(
  ui: ReactElement,
  ContextProvider: React.ComponentType<{ value: T; children: React.ReactNode }>,
  contextValue: T,
) => {
  return render(<ContextProvider value={contextValue}>{ui}</ContextProvider>);
};

const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={component} />
      </Routes>
    </MemoryRouter>,
  );
};

function waitForLoadingToFinish() {
  return waitForElementToBeRemoved(() => [...screen.queryAllByRole('progressbar')], {
    timeout: 4000,
  });
}

// Custom matcher that queries elements split up by multiple HTML elements by text
function getByTextWithMarkup(text: RegExp | string) {
  try {
    return screen.getByText((content, node) => {
      const hasText = (node: Element) => node.textContent === text || node.textContent.match(text);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child as HTMLElement));
      return hasText(node) && childrenDontHaveText;
    });
  } catch (error) {
    throw new Error(`Text '${text}' not found. ${error}`);
  }
}

export {
  getByTextWithMarkup,
  mockPatient,
  mockPatientWithLongName,
  mockPatientWithoutFormattedName,
  patientChartBasePath,
  renderWithContext,
  renderWithSwr,
  renderWithRouter,
  waitForLoadingToFinish,
  withSwr,
};
