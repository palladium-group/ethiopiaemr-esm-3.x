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
  reportUuid: string;
  dataSets: Array<ReportDataSet>;
  columnOrderByUuid: Record<string, Array<string>>;
  hiddenDatasets: Array<string>;
}

/**
 * Renders run-report results, one table per (visible) dataset. Columns are
 * ordered using the configured per-report column order, with any unlisted columns
 * appended afterwards — porting the legacy GSP's orderColumns()/HIDDEN_DATASETS.
 */
const ReportResults: React.FC<ReportResultsProps> = ({ reportUuid, dataSets, columnOrderByUuid, hiddenDatasets }) => {
  const { t } = useTranslation();
  const hidden = new Set(hiddenDatasets);
  const visible = dataSets.filter((ds) => !hidden.has(ds.name));

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

        const columns = orderColumns(reportUuid, Object.keys(ds.rows[0]), columnOrderByUuid);
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

function orderColumns(
  uuid: string,
  availableCols: Array<string>,
  columnOrderByUuid: Record<string, Array<string>>,
): Array<string> {
  const preferred = columnOrderByUuid?.[uuid];
  if (!preferred) {
    return availableCols;
  }
  const present = new Set(availableCols);
  const ordered: Array<string> = [];
  preferred.forEach((c) => {
    if (present.has(c)) {
      ordered.push(c);
      present.delete(c);
    }
  });
  // append any data columns not in the preferred list
  availableCols.forEach((c) => {
    if (present.has(c)) {
      ordered.push(c);
    }
  });
  return ordered;
}

export default ReportResults;
