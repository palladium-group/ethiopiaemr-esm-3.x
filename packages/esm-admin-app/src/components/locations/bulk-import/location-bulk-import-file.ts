import * as XLSX from 'xlsx';

/** Backend message prefix for exact-name collisions (LocationBulkImportServiceImpl). */
export const ALREADY_EXISTS_ERROR_PREFIX = 'location already exists with name:';

export type ParsedImportRecord = {
  /** 1-based row number matching the backend bulk-import response */
  rowNumber: number;
  values: string[];
};

export type ParsedImportFile = {
  header: string[];
  records: ParsedImportRecord[];
};

export function isAlreadyExistsError(errors: string[] | undefined | null): boolean {
  if (!errors?.length) {
    return false;
  }
  return errors.some((error) => error.toLowerCase().startsWith(ALREADY_EXISTS_ERROR_PREFIX));
}

function isBlankRow(values: unknown[]): boolean {
  return values.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}

function toStringCells(values: unknown[], columnCount: number): string[] {
  const cells: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    const value = values[i];
    cells.push(value === null || value === undefined ? '' : String(value));
  }
  return cells;
}

async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return new Uint8Array(await file.arrayBuffer());
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read import file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses CSV/XLSX into records with the same rowNumber semantics as ethiopiaemrcore:
 * - CSV: header is row 1; data rows are sequential 2..n (empty lines skipped)
 * - XLSX: header is row 1; data rowNumber is Excel row index + 1 (blank Excel rows skipped)
 */
export async function parseLocationImportFile(file: File): Promise<ParsedImportFile> {
  const bytes = await readFileAsUint8Array(file);
  const lowerName = file.name.toLowerCase();
  const workbook = lowerName.endsWith('.csv')
    ? XLSX.read(bytes, { type: 'array', raw: false, codepage: 65001 })
    : XLSX.read(bytes, { type: 'array', raw: false });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Import workbook has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error('Import file is missing a header row');
  }

  const header = toStringCells(rows[0], rows[0].length);
  const columnCount = header.length;
  const records: ParsedImportRecord[] = [];

  if (lowerName.endsWith('.csv')) {
    // Match Commons CSV ignoreEmptyLines + recordNumber+1 (header = row 1)
    let nextRowNumber = 2;
    for (let i = 1; i < rows.length; i++) {
      const values = toStringCells(rows[i], columnCount);
      if (isBlankRow(values)) {
        continue;
      }
      records.push({ rowNumber: nextRowNumber, values });
      nextRowNumber += 1;
    }
  } else {
    // Match POI loop: Excel row index r (0-based data at r) → rowNumber r+1; blank rows skipped
    // sheet_to_json with blankrows:false drops blanks, so rebuild numbering from original sheet range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let r = 1; r <= range.e.r; r++) {
      const values: string[] = [];
      for (let c = 0; c < columnCount; c++) {
        const address = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[address];
        values.push(cell == null ? '' : String(cell.w ?? cell.v ?? ''));
      }
      if (isBlankRow(values)) {
        continue;
      }
      records.push({ rowNumber: r + 1, values });
    }
  }

  if (!records.length) {
    throw new Error('Import file contains no location rows');
  }

  return { header, records };
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function recordsToCsv(header: string[], records: ParsedImportRecord[]): string {
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...records.map((record) => record.values.map(escapeCsvCell).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

export function buildFilteredCsvFile(header: string[], records: ParsedImportRecord[], originalFileName: string): File {
  const csv = recordsToCsv(header, records);
  const baseName = originalFileName.replace(/\.(csv|xlsx|xls)$/i, '') || 'locations';
  return new File([csv], `${baseName}-filtered.csv`, { type: 'text/csv;charset=utf-8;' });
}

export async function excludeRowsFromImportFile(file: File, rowNumbersToExclude: number[]): Promise<File> {
  const excludeSet = new Set(rowNumbersToExclude);
  if (!excludeSet.size) {
    return file;
  }

  const parsed = await parseLocationImportFile(file);
  const remaining = parsed.records.filter((record) => !excludeSet.has(record.rowNumber));

  if (!remaining.length) {
    throw new Error('NO_ROWS_REMAINING');
  }

  return buildFilteredCsvFile(parsed.header, remaining, file.name);
}

export function downloadCsvContent(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

export async function downloadRemainingImportRows(file: File): Promise<void> {
  const parsed = await parseLocationImportFile(file);
  const csv = recordsToCsv(parsed.header, parsed.records);
  const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, '') || 'locations';
  downloadCsvContent(csv, `${baseName}-remaining.csv`);
}
