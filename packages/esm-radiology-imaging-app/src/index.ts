import { getAsyncLifecycle, getSyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import {
  Calendar,
  DocumentPreliminary,
  ImageMedical,
  InProgress,
  Misuse,
  OrderDetails,
  Search,
  Send,
  TaskComplete,
} from '@carbon/react/icons';
import { configSchema } from './config-schema';
import { createHomeDashboardLink } from './radiology-imaging/create-dashboard-link.component';
import { createLeftPanelLink } from './radiology-imaging/create-left-panel-link.component';

const moduleName = '@palladium-ethiopia/esm-radiology-imaging-app';

const options = {
  featureName: 'root-world',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

// Radiology Imaging — page root
export const radiologyImagingRoot = getAsyncLifecycle(
  () => import('./radiology-imaging/radiology-imaging-root.component'),
  options,
);

// Homepage sidebar link (appears in the home page left nav)
// t('Radiology Imaging', 'Radiology Imaging')
export const radiologyImagingDashboardLink = getSyncLifecycle(
  createHomeDashboardLink({ name: 'radiology-imaging', title: 'Radiology Imaging' }),
  options,
);

// Radiology Imaging page left nav links (registered in radiology-imaging-left-panel-slot)
// t('Incoming Orders', 'Incoming Orders')
export const radiologyImagingHomeLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'incoming-orders', title: 'Incoming Orders', icon: OrderDetails }),
  options,
);

// t('Scheduled Orders', 'Scheduled Orders')
export const radiologyImagingScheduledOrdersLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'scheduled-orders', title: 'Scheduled Orders', icon: Calendar }),
  options,
);

// t('In Progress', 'In Progress')
export const radiologyImagingInProgressLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'in-progress', title: 'In Progress', icon: InProgress }),
  options,
);

// t('Image Acquired', 'Image Acquired')
export const radiologyImagingImageAcquiredLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'image-acquired', title: 'Image Acquired', icon: ImageMedical }),
  options,
);

// t('Preliminary Report', 'Preliminary Report')
export const radiologyImagingPreliminaryReportLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'preliminary-report', title: 'Preliminary Report', icon: DocumentPreliminary }),
  options,
);

// t('Finalized Report', 'Finalized Report')
export const radiologyImagingFinalizedReportLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'finalized-report', title: 'Finalized Report', icon: TaskComplete }),
  options,
);

// t('Referred Out', 'Referred Out')
export const radiologyImagingReferredOutLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'referred-out', title: 'Referred Out', icon: Send }),
  options,
);

// t('Not Done', 'Not Done')
export const radiologyImagingNotDoneLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'not-done', title: 'Not Done', icon: Misuse }),
  options,
);

// t('Imaging Search', 'Imaging Search')
export const radiologyImagingSearchLink = getSyncLifecycle(
  createLeftPanelLink({ name: 'imaging-search', title: 'Imaging Search', icon: Search }),
  options,
);

export const preliminaryWorkspace = getAsyncLifecycle(
  () => import('./radiology-imaging/workspace/preliminary-workspace'),
  options,
);

export const radiologyAppointmentWorkspace = getAsyncLifecycle(
  () => import('./radiology-imaging/workspace/radiology-appointment-workspace'),
  options,
);

export const rejectPreliminaryReportModal = getAsyncLifecycle(
  () => import('./radiology-imaging/reports/reject-report-modal.component'),
  options,
);

export const printPreviewModal = getAsyncLifecycle(
  () => import('./radiology-imaging/reports/print-preview/print-preview.modal'),
  options,
);

export const customDateRangeModal = getAsyncLifecycle(
  () => import('./components/filters/custom-date-range-modal.component'),
  options,
);

export const referOrderExternalModal = getAsyncLifecycle(
  () => import('./radiology-imaging/orders/refer-order-external-modal.component'),
  options,
);

export const rejectOrderModal = getAsyncLifecycle(
  () => import('./radiology-imaging/orders/reject-order-modal.component'),
  options,
);

export const radiologyImagingNavLink = getAsyncLifecycle(
  () => import('./radiology-imaging/radiology-imaging-nav-link.component'),
  options,
);
