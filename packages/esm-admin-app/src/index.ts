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

// t('providerBanner', 'Provider banner')
export const providerBanner = getSyncLifecycle(ProviderBannerTag, options);
