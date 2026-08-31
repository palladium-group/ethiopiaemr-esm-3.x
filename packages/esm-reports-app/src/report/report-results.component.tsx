import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { type ReportDataSet } from '../api/report-request';
import styles from './report-results.component.scss';

interface ReportResultsProps {
  dataSets: Array<ReportDataSet>;
  /** Names of datasets that only feed a ReportDesign template, so are not displayed. */
  feederDatasets: Set<string>;
}

/**
 * Renders report results as one table per visible dataset, in the server-declared
 * column order. Feeder datasets are hidden.
 *
 * A blank-named dataset is treated as a banner: rendered without a heading and
 * sized to its content rather than the full width.
 */
/**
 * A dataset marks itself as a banner by declaring a blank name. Note the contract
 * with the server this implies: `runReport` maps a *missing* name to 'Dataset', so
 * the banner dataset must send an explicitly empty `definition.name`, not a null one.
 */
function isBannerName(name: string | undefined): boolean {
  return (name ?? '').trim() === '';
}

const ReportResults: React.FC<ReportResultsProps> = ({ dataSets, feederDatasets }) => {
  const { t } = useTranslation();
  const visible = dataSets.filter((ds) => !feederDatasets.has(ds.name));

  if (visible.length === 0) {
    return <p className={styles.empty}>{t('noData', 'No data returned.')}</p>;
  }

  // When a banner leads, the first titled dataset's heading is hoisted above it so
  // the banner and its table sit under one heading. Tracked by index, not by name:
  // two datasets can share a name, and only the hoisted one should lose its heading.
  const leadsWithBanner = isBannerName(visible[0].name);
  const hoistedIdx = leadsWithBanner ? visible.findIndex((ds) => !isBannerName(ds.name)) : -1;
  const hoistedTitle = hoistedIdx >= 0 ? visible[hoistedIdx].name : undefined;

  return (
    <div className={styles.results}>
      {hoistedTitle && <h4 className={styles.dsTitle}>{hoistedTitle}</h4>}
      {visible.map((ds, idx) => {
        // Blank name => a banner dataset: no heading, and shrink-wrapped below.
        const isBanner = isBannerName(ds.name);
        // The hoisted title is already rendered above; don't repeat it.
        const showTitle = !isBanner && idx !== hoistedIdx;

        if (ds.rows.length === 0) {
          // An empty banner has no heading to hang "No rows." off, so it would render
          // as an unattributed line of text. Drop it instead.
          if (isBanner) {
            return null;
          }
          return (
            <div key={`${ds.name}-${idx}`} className={styles.dataset}>
              {showTitle && <h4 className={styles.dsTitle}>{ds.name}</h4>}
              <p className={styles.empty}>{t('noRows', 'No rows.')}</p>
            </div>
          );
        }

        // Undeclared keys are appended rather than dropped, and row keys are used
        // outright when the dataset declares no columns.
        const rowKeys = Object.keys(ds.rows[0]);
        const columns =
          ds.columns.length > 0 ? [...ds.columns, ...rowKeys.filter((k) => !ds.columns.includes(k))] : rowKeys;
        const headers = columns.map((c) => ({ key: c, header: c }));
        const tableRows = ds.rows.map((row, rIdx) => {
          const r: Record<string, string> = { id: String(rIdx) };
          columns.forEach((c) => {
            const v = row[c];
            r[c] = v === null || v === undefined ? '-' : String(v);
          });
          return r;
        });

        return (
          <div key={`${ds.name}-${idx}`} className={`${styles.dataset} ${isBanner ? styles.banner : ''}`}>
            {showTitle && <h4 className={styles.dsTitle}>{ds.name}</h4>}
            <DataTable
              rows={tableRows as Array<{ id: string } & Record<string, string>>}
              headers={headers}
              size="sm"
              useZebraStyles>
              {({ rows, headers: hdrs, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <div className={styles.scroll}>
                    <Table {...getTableProps()}>
                      {/* Banner rows label themselves, so no header row. */}
                      {!isBanner && (
                        <TableHead>
                          <TableRow>
                            {hdrs.map((header) => {
                              const { key, ...rest } = getHeaderProps({ header });
                              return (
                                <TableHeader key={header.key} {...rest}>
                                  {header.header}
                                </TableHeader>
                              );
                            })}
                          </TableRow>
                        </TableHead>
                      )}
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>{String(cell.value)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TableContainer>
              )}
            </DataTable>
          </div>
        );
      })}
    </div>
  );
};

export default ReportResults;
