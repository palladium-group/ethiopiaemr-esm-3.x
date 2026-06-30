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
  /**
   * Names of datasets that exist only to feed a ReportDesign template (derived
   * from each design's `repeatingSections`), and so should not be shown on
   * screen. Authoritative signal — not a name heuristic.
   */
  feederDatasets: Set<string>;
}

/**
 * Renders run-report results, one table per (visible) dataset. Columns are
 * rendered in the dataset's server-declared order (`ds.columns`, i.e. the SQL
 * SELECT order), so no per-report column-order config is needed. Template feeder
 * datasets (named in a ReportDesign's `repeatingSections`) are hidden.
 */
const ReportResults: React.FC<ReportResultsProps> = ({ dataSets, feederDatasets }) => {
  const { t } = useTranslation();
  const visible = dataSets.filter((ds) => !feederDatasets.has(ds.name));

  if (visible.length === 0) {
    return <p className={styles.empty}>{t('noData', 'No data returned.')}</p>;
  }

  return (
    <div className={styles.results}>
      {visible.map((ds, idx) => {
        if (ds.rows.length === 0) {
          return (
            <div key={`${ds.name}-${idx}`}>
              <h4 className={styles.dsTitle}>{ds.name}</h4>
              <p className={styles.empty}>{t('noRows', 'No rows.')}</p>
            </div>
          );
        }

        // Server-declared SELECT order; fall back to row keys if columns are absent.
        const columns = ds.columns.length > 0 ? ds.columns : Object.keys(ds.rows[0]);
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
          <div key={`${ds.name}-${idx}`} className={styles.dataset}>
            <h4 className={styles.dsTitle}>{ds.name}</h4>
            <DataTable
              rows={tableRows as Array<{ id: string } & Record<string, string>>}
              headers={headers}
              size="sm"
              useZebraStyles>
              {({ rows, headers: hdrs, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <div className={styles.scroll}>
                    <Table {...getTableProps()}>
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
