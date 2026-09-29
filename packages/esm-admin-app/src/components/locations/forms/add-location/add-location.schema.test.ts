import { buildLocationFormSchema } from './add-location.workspace';

const DEPT_TAG = '74b3eb96-5301-4a4d-9b88-edda1a3da17c';
const OTHER_TAG = 'e2a1b3c4-d5e6-7890-1abc-def234567890';
const schema = buildLocationFormSchema(DEPT_TAG);
const base = { name: 'X', parentLocation: null, departmentType: null };
const issuePaths = (data) => {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('location form department rules', () => {
  it('does not require a department type for non-department locations', () => {
    expect(issuePaths({ ...base, tags: [{ uuid: OTHER_TAG, display: 'Visit Location' }] })).toEqual([]);
  });

  it('requires a department type when tagged Department', () => {
    expect(issuePaths({ ...base, tags: [{ uuid: DEPT_TAG, display: 'Department' }] })).toEqual(['departmentType']);
  });

  it('rejects a department nested under another department', () => {
    const data = {
      ...base,
      tags: [{ uuid: DEPT_TAG, display: 'Department' }],
      departmentType: 'type-uuid',
      parentLocation: { uuid: 'p', display: 'Surgery', isDepartment: true },
    };
    expect(issuePaths(data)).toEqual(['parentLocation']);
  });

  it('allows a room under a department', () => {
    const data = {
      ...base,
      tags: [{ uuid: OTHER_TAG, display: 'Visit Location' }],
      parentLocation: { uuid: 'p', display: 'Surgery', isDepartment: true },
    };
    expect(issuePaths(data)).toEqual([]);
  });
});
