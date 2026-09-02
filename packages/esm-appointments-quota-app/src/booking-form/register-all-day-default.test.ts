import { getConfig, getGlobalStore } from '@openmrs/esm-framework';
import { APPOINTMENTS_FORM_WORKSPACE } from '../constants';
import { registerBookingFormAllDayDefault } from './register-all-day-default';

jest.mock('@openmrs/esm-framework', () => ({
  getConfig: jest.fn(),
  getGlobalStore: jest.fn(),
}));

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockedGetGlobalStore = getGlobalStore as jest.MockedFunction<typeof getGlobalStore>;

interface WorkspaceState {
  openedWindows: Array<{ openedWorkspaces: Array<{ workspaceName: string; uuid: string }> }>;
}

const noBookingForm: WorkspaceState = { openedWindows: [] };

function bookingFormOpen(uuid: string): WorkspaceState {
  return { openedWindows: [{ openedWorkspaces: [{ workspaceName: APPOINTMENTS_FORM_WORKSPACE, uuid }] }] };
}

function createFakeStore(initialState: WorkspaceState) {
  let state = initialState;
  const listeners = new Set<(state: WorkspaceState) => void>();

  return {
    getState: () => state,
    subscribe: (listener: (state: WorkspaceState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState: (next: WorkspaceState) => {
      state = next;
      listeners.forEach((listener) => listener(state));
    },
  };
}

/** Stands in for the Carbon Toggle, which flips `aria-checked` when clicked. */
function renderAllDayToggle(isOn: boolean) {
  document.body.innerHTML = `<button id="allDayToggle" role="switch" aria-checked="${isOn}"></button>`;

  const toggle = document.querySelector<HTMLButtonElement>('#allDayToggle');
  const onClick = jest.fn(() => {
    toggle.setAttribute('aria-checked', toggle.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
  });

  toggle.addEventListener('click', onClick);

  return { toggle, onClick };
}

/** Lets the `getConfig` promise settle. Timer-free so it works under fake timers. */
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('registerBookingFormAllDayDefault', () => {
  let store: ReturnType<typeof createFakeStore>;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    store = createFakeStore(noBookingForm);
    mockedGetGlobalStore.mockReturnValue(store as unknown as ReturnType<typeof getGlobalStore>);
    mockedGetConfig.mockResolvedValue({ defaultAllDayToggleOff: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('switches the toggle off when the booking form opens', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    const { toggle } = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-1'));

    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('switches the toggle off when the form is already open as the module loads', async () => {
    const { toggle } = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-1'));

    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('waits for the toggle to render before switching it off', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    store.setState(bookingFormOpen('form-1'));
    const { toggle } = renderAllDayToggle(true);

    jest.advanceTimersByTime(100);

    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('leaves an already-off toggle untouched', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    const { onClick } = renderAllDayToggle(false);
    store.setState(bookingFormOpen('form-1'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fight the user turning the toggle back on within the same form', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    const { toggle } = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-1'));
    toggle.click();

    // Unrelated workspace updates should not re-apply the default.
    store.setState(bookingFormOpen('form-1'));
    jest.advanceTimersByTime(1000);

    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('applies the default again for the next booking form instance', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    const first = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-1'));
    expect(first.toggle.getAttribute('aria-checked')).toBe('false');

    store.setState(noBookingForm);

    const second = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-2'));

    expect(second.toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('stops polling once the toggle never appears', async () => {
    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    store.setState(bookingFormOpen('form-1'));
    jest.advanceTimersByTime(5000);

    expect(jest.getTimerCount()).toBe(0);
  });

  it('does nothing when the default is disabled by config', async () => {
    mockedGetConfig.mockResolvedValue({ defaultAllDayToggleOff: false });

    registerBookingFormAllDayDefault();
    await flushMicrotasks();

    const { toggle, onClick } = renderAllDayToggle(true);
    store.setState(bookingFormOpen('form-1'));

    expect(onClick).not.toHaveBeenCalled();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });
});
