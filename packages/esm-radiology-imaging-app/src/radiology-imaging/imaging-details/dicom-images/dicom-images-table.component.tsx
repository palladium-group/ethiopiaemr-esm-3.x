import {
  Button,
  ButtonSet,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  type DataTableHeader,
} from '@carbon/react';
import React from 'react';
import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import { useDicomImages } from '../../../resources/hooks/useDicomImages';
import { openDicomViewer, type DicomViewerName } from './dicom-viewer.utils';
import { useTranslation } from 'react-i18next';
import { ImageMedical, UserXRay, WatsonHealthInteractiveSegmentationCursor } from '@carbon/react/icons';
import { useRadiologyPrivileges } from '../../../resources/hooks/useRadiologyPrivileges';

type DicomImageTableProps = {
  orderNumber: string;
};

const DicomImagesTable: React.FC<DicomImageTableProps> = ({ orderNumber }) => {
  const { t } = useTranslation();
  const { studies } = useDicomImages(orderNumber);
  const { canViewImages } = useRadiologyPrivileges();

  const handleViewStudy = (studyId: string, viewerName: DicomViewerName) => {
    openDicomViewer(studyId, viewerName);
  };

  const headers: Array<DataTableHeader> = [
    { key: 'accessionNumber', header: 'Accession Number' },
    { key: 'studyDate', header: 'Study Date' },
    { key: 'actions', header: 'Actions' },
  ];

  const rows = studies.map((study) => ({
    id: study.uuid,
    accessionNumber: study.mainDicomTags.AccessionNumber,
    studyDate: formatDatetime(parseDate(study.mainDicomTags.StudyDate), { noToday: true }),
    actions: '',
  }));

  const studyInstanceUidByRowId = new Map(studies.map((study) => [study.uuid, study.mainDicomTags.StudyInstanceUID]));

  const renderViewerActions = (studyId: string) =>
    canViewImages ? (
      <div>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription={t('stoneWebViewer', 'Stone Web Viewer')}
          renderIcon={UserXRay}
          onClick={() => handleViewStudy(studyId, 'stone-webviewer')}
        />
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription={t('ohif', 'OHIF')}
          renderIcon={ImageMedical}
          onClick={() => handleViewStudy(studyId, 'ohif')}
        />
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription={t('ohifSegmentation', 'OHIF Segmentation')}
          renderIcon={WatsonHealthInteractiveSegmentationCursor}
          onClick={() => handleViewStudy(studyId, 'ohif-segmentation')}
        />
      </div>
    ) : null;

  return (
    <div>
      <DataTable size="lg" rows={rows} headers={headers} useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const studyId = studyInstanceUidByRowId.get(row.id);

                  return (
                    <TableRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.info.header === 'actions' && studyId ? renderViewerActions(studyId) : cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default DicomImagesTable;
