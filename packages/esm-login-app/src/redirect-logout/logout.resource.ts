import { mutate } from 'swr';
import { clearCurrentUser, openmrsFetch, refetchCurrentUser, restBaseUrl } from '@openmrs/esm-framework';

export async function performLogout() {
  await openmrsFetch(`${restBaseUrl}/session`, {
    method: 'DELETE',
  });

  // clear the SWR cache on logout, do not revalidate
  // taken from the SWR docs
  mutate(() => true, undefined, { revalidate: false });

  clearCurrentUser();
  try {
    await refetchCurrentUser();
  } catch (_) {
    // do nothing, silence the user-visible error
  }
}

// A full page load drops in-memory frontend state from the previous user. The pinned core
// (10.0.1-pre.5263) leaks one user's extension display conditions into the next login otherwise.
export function reloadToLogin() {
  window.location.assign(`${window.getOpenmrsSpaBase()}login`);
}
