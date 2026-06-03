import { useEffect, useRef } from 'react';

const SLOT_NAME = 'service-queues-dashboard-slot';

function findSlot(): HTMLElement | null {
  return (
    document.getElementById(SLOT_NAME) ??
    document.querySelector<HTMLElement>(`[data-extension-slot-name="${SLOT_NAME}"]`)
  );
}

function moveExtensionToSlotEnd(root: HTMLElement) {
  const slot = findSlot();
  if (!slot) {
    return;
  }

  let extensionWrapper: HTMLElement | null = root;
  while (extensionWrapper.parentElement && extensionWrapper.parentElement !== slot) {
    extensionWrapper = extensionWrapper.parentElement;
  }

  if (extensionWrapper?.parentElement === slot && slot.lastElementChild !== extensionWrapper) {
    slot.appendChild(extensionWrapper);
  }
}

/**
 * Ensures this extension renders last inside the dashboard slot (below the default service queues UI).
 * Extension mount order is not reliable when modules load asynchronously.
 */
export function useAppendExtensionToSlotEnd() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const move = () => moveExtensionToSlotEnd(root);
    move();

    const slot = findSlot();
    const observer =
      slot &&
      new MutationObserver(() => {
        move();
      });

    observer?.observe(slot, { childList: true });

    return () => observer?.disconnect();
  }, []);

  return rootRef;
}
