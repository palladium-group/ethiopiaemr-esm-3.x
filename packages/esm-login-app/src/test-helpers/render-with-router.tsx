import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { SWRConfig } from 'swr';

export default function renderWithRouter<T = unknown>(
  Component: React.JSXElementConstructor<T>,
  props: T = {} as unknown as T,
  { route = '/', routes = [route], routeParams = {} } = {},
) {
  return {
    // Fresh SWR cache per render so a key (e.g. /userlocation/loginlocation) isn't served a previous
    // test's data — non-immutable useSWR shares the global cache otherwise.
    ...render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={routes} initialIndex={(route && routes?.indexOf(route)) || undefined}>
          <Component {...props} />
        </MemoryRouter>
      </SWRConfig>,
    ),
  };
}
