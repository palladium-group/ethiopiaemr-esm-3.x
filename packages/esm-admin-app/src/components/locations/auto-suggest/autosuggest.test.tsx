import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AUTOSUGGEST_DEBOUNCE_MS, Autosuggest } from './autosuggest.component';

const renderAutosuggest = (getSearchResults: jest.Mock) =>
  render(
    <Autosuggest
      id="parent"
      labelText="Parent location"
      placeholder="Search"
      getDisplayValue={(item) => item.name}
      getFieldValue={(item) => item.uuid}
      getSearchResults={getSearchResults}
      onSuggestionSelected={jest.fn()}
    />,
  );

describe('Autosuggest', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('searches once, after typing pauses', async () => {
    const getSearchResults = jest.fn().mockResolvedValue([{ uuid: '1', name: 'Main Store' }]);
    renderAutosuggest(getSearchResults);
    const input = screen.getByRole('searchbox');

    for (const value of ['M', 'Ma', 'Mai', 'Main']) {
      fireEvent.change(input, { target: { value } });
      act(() => jest.advanceTimersByTime(100));
    }
    expect(getSearchResults).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(AUTOSUGGEST_DEBOUNCE_MS);
    });

    expect(getSearchResults).toHaveBeenCalledTimes(1);
    expect(getSearchResults).toHaveBeenCalledWith('Main');
    expect(await screen.findByText('Main Store')).toBeInTheDocument();
  });

  it('ignores a slow response for input that has since changed', async () => {
    let resolveFirst: (value: unknown) => void;
    const getSearchResults = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([{ uuid: '2', name: 'Main Pharmacy' }]);
    renderAutosuggest(getSearchResults);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'Ma' } });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSUGGEST_DEBOUNCE_MS);
    });
    fireEvent.change(input, { target: { value: 'Main P' } });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSUGGEST_DEBOUNCE_MS);
    });
    await act(async () => resolveFirst([{ uuid: '1', name: 'Maternity' }]));

    expect(await screen.findByText('Main Pharmacy')).toBeInTheDocument();
    expect(screen.queryByText('Maternity')).not.toBeInTheDocument();
  });
});
