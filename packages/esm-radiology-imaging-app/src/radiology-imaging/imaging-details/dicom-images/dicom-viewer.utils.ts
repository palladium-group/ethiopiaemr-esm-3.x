import { restBaseUrl } from '@openmrs/esm-framework';
import { openWindow } from './dicom-util';

export const dicomViewerMap = {
  'stone-webviewer': '/stone-webviewer/index.html?study=',
  ohif: '/ohif/viewer?StudyInstanceUIDs=',
  'ohif-segmentation': '/ohif/segmentation?StudyInstanceUIDs=',
} as const;

export type DicomViewerName = keyof typeof dicomViewerMap;

export function openDicomViewer(studyInstanceUid: string, viewerName: DicomViewerName) {
  const url = `/openmrs${restBaseUrl}/orthanc${dicomViewerMap[viewerName]}${studyInstanceUid}`;
  openWindow(url, { width: 1200, height: 800 });
}
