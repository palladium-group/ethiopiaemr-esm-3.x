import {
  ALREADY_EXISTS_ERROR_PREFIX,
  escapeCsvCell,
  excludeRowsFromImportFile,
  isAlreadyExistsError,
  parseLocationImportFile,
  recordsToCsv,
} from './location-bulk-import-file';

describe('location-bulk-import-file', () => {
  const sampleCsv = `name,tags,parentName
Facility A,Visit Location,
Facility B,Login Location,Facility A
Facility C,Visit Location,
`;

  it('detects already-exists errors from the backend message', () => {
    expect(isAlreadyExistsError([`${ALREADY_EXISTS_ERROR_PREFIX} Facility A`])).toBe(true);
    expect(isAlreadyExistsError(['missing tags'])).toBe(false);
    expect(isAlreadyExistsError([])).toBe(false);
  });

  it('escapes CSV cells that contain commas or quotes', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('parses CSV with backend-compatible row numbers', async () => {
    const file = new File([sampleCsv], 'locations.csv', { type: 'text/csv' });
    const parsed = await parseLocationImportFile(file);

    expect(parsed.header[0]).toBe('name');
    expect(parsed.records.map((r) => r.rowNumber)).toEqual([2, 3, 4]);
    expect(parsed.records[1].values[0]).toBe('Facility B');
  });

  it('excludes rows and rebuilds a CSV file', async () => {
    const file = new File([sampleCsv], 'locations.csv', { type: 'text/csv' });
    const filtered = await excludeRowsFromImportFile(file, [3]);
    const parsed = await parseLocationImportFile(filtered);

    expect(filtered.name).toContain('filtered');
    expect(parsed.records).toHaveLength(2);
    expect(parsed.records.map((r) => r.values[0])).toEqual(['Facility A', 'Facility C']);
  });

  it('throws when excluding would leave no rows', async () => {
    const file = new File([sampleCsv], 'locations.csv', { type: 'text/csv' });
    await expect(excludeRowsFromImportFile(file, [2, 3, 4])).rejects.toThrow('NO_ROWS_REMAINING');
  });

  it('serializes records back to CSV', async () => {
    const file = new File([sampleCsv], 'locations.csv', { type: 'text/csv' });
    const parsed = await parseLocationImportFile(file);
    const csv = recordsToCsv(parsed.header, parsed.records.slice(0, 1));
    expect(csv.split('\n')[0]).toContain('name');
    expect(csv).toContain('Facility A');
  });
});
