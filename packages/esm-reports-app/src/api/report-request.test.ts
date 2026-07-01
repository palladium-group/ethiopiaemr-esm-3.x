import { openmrsFetch } from '@openmrs/esm-framework';
import { runReport, fetchFeederDatasetNames } from './report-request';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

describe('runReport', () => {
  it('derives columns from metadata.columns in declared SELECT order, not row hash order', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        dataSets: [
          {
            definition: { name: 'immRegister' },
            metadata: { columns: [{ name: 'S.N' }, { name: 'MRN' }, { name: 'Name' }] },
            // Row keys deliberately in a different order than metadata.columns.
            rows: [{ Name: 'A', MRN: '123', 'S.N': '1' }],
          },
        ],
      },
    } as any);

    const [ds] = await runReport('report-uuid', {});

    expect(ds.name).toBe('immRegister');
    expect(ds.columns).toEqual(['S.N', 'MRN', 'Name']);
  });

  it('filters out columns whose name is missing or not a string', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        dataSets: [
          {
            definition: { name: 'ds' },
            metadata: { columns: [{ name: 'A' }, {}, { name: undefined }, { name: 'B' }] },
            rows: [{ A: '1', B: '2' }],
          },
        ],
      },
    } as any);

    const [ds] = await runReport('report-uuid', {});

    expect(ds.columns).toEqual(['A', 'B']);
  });

  it('returns empty columns when the server omits metadata (renderer falls back to row keys)', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { dataSets: [{ definition: { name: 'ds' }, rows: [{ A: '1' }] }] },
    } as any);

    const [ds] = await runReport('report-uuid', {});

    expect(ds.columns).toEqual([]);
    expect(ds.rows).toEqual([{ A: '1' }]);
  });

  it('defaults the dataset name and handles a missing dataSets array', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { dataSets: [{ rows: [] }] } } as any);

    const [ds] = await runReport('report-uuid', {});

    expect(ds.name).toBe('Dataset');
    expect(ds.columns).toEqual([]);

    mockOpenmrsFetch.mockResolvedValueOnce({ data: {} } as any);
    expect(await runReport('report-uuid', {})).toEqual([]);
  });

  it('encodes parameters into the query string', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { dataSets: [] } } as any);

    await runReport('report-uuid', { startDate: '2026-01-01', 'a b': 'x&y' });

    const url = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(url).toContain('/reportingrest/reportdata/report-uuid?');
    expect(url).toContain('startDate=2026-01-01');
    expect(url).toContain('a%20b=x%26y');
  });
});

describe('fetchFeederDatasetNames', () => {
  it('parses dataset:<name> tokens from repeatingSections across designs and dedupes', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        results: [
          { properties: { repeatingSections: 'sheet:1,row:5-10,dataset:immRegisterExcel' } },
          { properties: { repeatingSections: 'sheet:1,row:5-10,dataset:immRegisterExcel' } },
          { properties: { repeatingSections: 'sheet:2,row:3-4,dataset:ancRegisterExcel' } },
        ],
      },
    } as any);

    const feeders = await fetchFeederDatasetNames('report-uuid');

    expect([...feeders].sort()).toEqual(['ancRegisterExcel', 'immRegisterExcel']);
  });

  it('captures multiple dataset tokens within a single repeatingSections value', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { results: [{ properties: { repeatingSections: 'dataset:feederA,dataset:feederB' } }] },
    } as any);

    const feeders = await fetchFeederDatasetNames('report-uuid');

    expect([...feeders].sort()).toEqual(['feederA', 'feederB']);
  });

  it('requests the custom representation so properties are serialised', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: [] } } as any);

    await fetchFeederDatasetNames('report uuid/with&chars');

    const url = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(url).toContain('reportDefinitionUuid=report%20uuid%2Fwith%26chars');
    expect(url).toContain('v=custom:(uuid,name,properties)');
  });

  it('hides nothing for a report with no designs or no repeatingSections', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { results: [{ properties: {} }, { properties: { repeatingSections: '' } }, {}] },
    } as any);

    expect((await fetchFeederDatasetNames('report-uuid')).size).toBe(0);
  });

  it('returns an empty set rather than throwing when the designs cannot be read', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce(new Error('boom'));

    const feeders = await fetchFeederDatasetNames('report-uuid');

    expect(feeders.size).toBe(0);
  });
});
