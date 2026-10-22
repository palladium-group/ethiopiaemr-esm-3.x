/**
 * Which selected row should be open after the visible selection changes.
 * A newly added row becomes the only expanded row. Removing rows keeps the
 * current row open when it is still in the list.
 */
export function resolveExpandedSelection(
  previousUuids: ReadonlyArray<string>,
  nextUuids: ReadonlyArray<string>,
  currentExpandedUuid: string | null,
): string | null {
  const previous = new Set(previousUuids);
  const added = nextUuids.filter((uuid) => !previous.has(uuid));

  if (added.length > 0) {
    return added[added.length - 1];
  }

  if (currentExpandedUuid && nextUuids.includes(currentExpandedUuid)) {
    return currentExpandedUuid;
  }

  return null;
}
