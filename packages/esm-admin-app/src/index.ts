import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';
import Root from './root.component';
import ManageUserWorkspace from './components/users/manage-users/user-management.workspace';
import { createLeftPanelLink } from './left-pannel-link.component';
import HWRConfirmModal from './components/modal/hwr-confirmation.modal';
import HWREmptyModal from './components/modal/hwr-empty.modal.component';
import UserRoleScopeWorkspace from './components/users/manage-users/manage-user-role-scope/user-role-scope-workspace/user-role-scope.workspace';
import HWRSyncModal from './components/modal/hwr-sync.modal';
import AddLocationWorkspace from './components/locations/forms/add-location/add-location.workspace';
import SearchLocationWorkspace from './components/locations/forms/search-location/search-location.workspace';
import LocationBulkImportModal from './components/locations/bulk-import/location-bulk-import.modal';
import UserLoginLocationsWorkspace from './components/users/manage-users/user-login-locations/user-login-locations.workspace';
import ProviderBannerTag from './components/provider-banner/provider-banner.component';

const options = {
  featureName: 'esm-admin-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const root = getSyncLifecycle(Root, options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const manageUserWorkspace = getSyncLifecycle(ManageUserWorkspace, options);

// keys used only in user-login-locations.workspace.tsx, which the i18next extractor does not scan
// t('loginLocations', 'Login locations')
// t('loginLocationsHelper', 'A user with no mapped locations can log in at any login location.')
// t('loginLocationsSaveError', 'Error saving login locations')
// t('loginLocationsUpdated', 'Login locations for {{userName}} were updated successfully.')
// t('selectLoginLocations', 'Select login location(s)')
// t('selectLoginLocationsPlaceholder', 'Search for a login location')
export const userLoginLocationsWorkspace = getSyncLifecycle(UserLoginLocationsWorkspace, options);
export const userRoleScopeWorkspace = getSyncLifecycle(UserRoleScopeWorkspace, options);

export const userManagementLeftPannelLink = getSyncLifecycle(
  createLeftPanelLink({ title: 'Manage Users', name: 'user-management' }),
  options,
);

export const locationsLeftPanelLink = getSyncLifecycle(
  createLeftPanelLink({ title: 'Locations', name: 'locations' }),
  options,
);
export const facilitySetupLeftPanelLink = getSyncLifecycle(
  createLeftPanelLink({ title: 'Facility Details', name: 'facility-setup' }),
  options,
);

export const hwrConfirmationModal = getSyncLifecycle(HWRConfirmModal, options);
export const hwrEmptyModal = getSyncLifecycle(HWREmptyModal, options);
export const hwrSyncModal = getSyncLifecycle(HWRSyncModal, options);

export const addLocation = getSyncLifecycle(AddLocationWorkspace, options);
export const searchLocationWorkspace = getSyncLifecycle(SearchLocationWorkspace, options);

// t('importLocations', 'Import locations')
// Privilege: Manage Location Bulk Import (AdminPermissions.ManageLocationBulkImport)
// t('locationImportDescription', 'Bulk-import locations for new hospital or facility setup. Existing location names are rejected (exact match) and are never updated. The server validates the entire file; any row error means nothing is created.')
// t('locationImportColumnsHelp', 'Required columns: name, tags. Optional: parentName or parentUuid (not both), uuid, description, and attribute.* columns (e.g. Master Facility Code). Separate tags with |, ;, or ,.')
// t('downloadTemplate', 'Download template')
// t('chooseFile', 'Choose file')
// t('noFileSelected', 'No file selected')
// t('locationImportFileHint', 'Accepted formats: .csv or .xlsx, up to 2 MB.')
// t('validate', 'Validate')
// t('validating', 'Validating...')
// t('import', 'Import')
// t('importing', 'Importing...')
// t('validationSucceeded', 'Validation succeeded')
// t('validationFailed', 'Validation failed')
// t('importSucceeded', 'Import succeeded')
// t('importFailed', 'Import failed')
// t('locationImportReadyToImport', '{{validRows}} of {{totalRows}} rows are valid. You can import now.')
// t('locationImportValidationErrors', '{{errorRows}} of {{totalRows}} rows have errors. Nothing was created.')
// t('locationImportCreatedCount', 'Created {{count}} location(s).')
// t('locationImportCommitErrors', 'The file could not be imported. Fix the row errors and validate again.')
// t('locationImportRequestError', 'The import request failed. Check that the file is not empty and includes the required columns (name, tags).')
// t('invalidFileType', 'Invalid file type')
// t('locationImportFileTypeHint', 'Upload a .csv or .xlsx file.')
// t('fileTooBig', 'File too large')
// t('locationImportMaxSize', 'Maximum file size is 2 MB.')
// t('totalRows', 'Total')
// t('validRows', 'Valid')
// t('errorRows', 'Errors')
// t('createdCount', 'Created')
// t('rowResults', 'Row results')
// t('rowNumber', 'Row')
// t('status', 'Status')
// t('errors', 'Errors')
// t('requestError', 'Request error')
// t('locationImportExcludeHint', 'Remove errored rows from this batch, then we re-validate. Existing locations are never updated — remove those rows to import the rest.')
// t('removeAlreadyExists', 'Remove already-existing ({{count}})')
// t('removeRow', 'Remove row')
// t('downloadRemainingRows', 'Download remaining rows')
// t('rowsRemoved', 'Rows removed')
// t('locationImportRowsRemoved', 'Removed {{count}} row(s). Re-validating the remaining file.')
// t('locationImportNoRowsRemaining', 'Cannot remove those rows — no location rows would remain. Choose a different file or keep at least one row.')
// t('updatingFile', 'Updating file...')
export const locationBulkImportModal = getSyncLifecycle(LocationBulkImportModal, options);

// t('providerBanner', 'Provider banner')
export const providerBanner = getSyncLifecycle(ProviderBannerTag, options);
