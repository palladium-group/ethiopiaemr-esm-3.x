import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type LocationBulkImportResult } from './location-bulk-import.types';

export const LOCATION_BULK_IMPORT_URL = `${restBaseUrl}/ethiopiaemrcore/locations/bulk-import`;

/**
 * Uploads a CSV/XLSX location file for dry-run validation or all-or-nothing create.
 * Privilege required: Manage Location Bulk Import.
 */
export async function bulkImportLocations(file: File, dryRun: boolean): Promise<LocationBulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dryRun', String(dryRun));

  const response = await openmrsFetch<LocationBulkImportResult>(LOCATION_BULK_IMPORT_URL, {
    method: 'POST',
    body: formData,
  });

  return response.data;
}
