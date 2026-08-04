/**
 * Template matching ethiopiaemr-core docs/samples/location-bulk-import-template.csv
 *
 * Required columns: name, tags
 * Optional: parentName, parentUuid, uuid, description,
 *   attribute.8a845a89-6aa5-4111-81d3-0af31c45c002 (Master Facility Code, 8 digits),
 *   attribute.54686249-2c26-4dd9-be90-fc7868dedd8f (Ethio MFC),
 *   attribute.f369dbaa-3a0a-416e-97d1-cac1a230824f (Facility Type),
 *   attribute.d4e54a2f-39bf-4b0a-8000-f2048eddbe12 (Operational Status)
 *
 * tags: one or more tag names/UUIDs separated by |, ;, or ,
 * Use either parentName or parentUuid, not both on the same row.
 */
export const LOCATION_BULK_IMPORT_TEMPLATE_CSV = `name,tags,parentName,parentUuid,uuid,description,attribute.8a845a89-6aa5-4111-81d3-0af31c45c002,attribute.54686249-2c26-4dd9-be90-fc7868dedd8f,attribute.f369dbaa-3a0a-416e-97d1-cac1a230824f,attribute.d4e54a2f-39bf-4b0a-8000-f2048eddbe12
Example Hospital,Visit Location|Login Location,,,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1,Facility root / visit location,12345678,12345678,General Hospital,Operational
OPD Clinic,Visit Location|Login Location,Example Hospital,,,Outpatient department,,,,
Surgical Ward,Admission Location|Surgical Ward|Visit Location,,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1,,Inpatient surgical ward,,,,
Cash Point Desk,Payment Point|Login Location,Example Hospital,,,Billing cash point,,,,
Emergency Triage,Emergency|Visit Location|Login Location,Example Hospital,,,Emergency department,,,,
`;

export const LOCATION_BULK_IMPORT_TEMPLATE_FILENAME = 'location-bulk-import-template.csv';

export const MAX_LOCATION_IMPORT_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export const ACCEPTED_LOCATION_IMPORT_EXTENSIONS = ['.csv', '.xlsx'];

export function getFileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function isAcceptedLocationImportFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_LOCATION_IMPORT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export function downloadLocationBulkImportTemplate(): void {
  const blob = new Blob([LOCATION_BULK_IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = LOCATION_BULK_IMPORT_TEMPLATE_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}
