export type LocationBulkImportRowStatus = 'ERROR' | 'VALID' | 'CREATED';

export type LocationBulkImportRowResult = {
  rowNumber: number;
  name: string | null;
  status: LocationBulkImportRowStatus;
  errors: string[];
  uuid: string | null;
};

export type LocationBulkImportResult = {
  dryRun: boolean;
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  rows: Array<LocationBulkImportRowResult>;
};
