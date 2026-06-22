import { parseDtpReturnInfo, type EncounterObsResponse } from './dtp-return-obs';

const concepts = {
  groupConceptUuid: 'a438b7e7-4652-45ea-896b-b15775d476e6',
  categoryConceptUuid: '6307d0c0-d323-4b43-bdbf-4d15cdcb32bf',
  reasonConceptUuid: '1ddc0970-f488-4461-89af-4d3592f0ab11',
  noteConceptUuid: '768dc035-48f1-4a45-8087-12eee1fdbc14',
  responseConceptUuid: '83ab5a72-08de-48c4-94b5-e2587d722d45',
};

function buildReturnGroup(uuid: string, obsDatetime: string, dateCreated: string, reason: string, category = 'Dose') {
  return {
    uuid,
    obsDatetime,
    dateCreated,
    concept: { uuid: concepts.groupConceptUuid },
    groupMembers: [
      { concept: { uuid: concepts.categoryConceptUuid }, value: category },
      { concept: { uuid: concepts.reasonConceptUuid }, value: reason },
    ],
  };
}

describe('parseDtpReturnInfo', () => {
  test('uses dateCreated (not obsDatetime) to hide tag after resend when encounter restamps obs datetimes', () => {
    const sharedObsDatetime = '2026-06-22T09:41:33.000+0000';
    const encounter: EncounterObsResponse = {
      uuid: 'enc-1',
      obs: [
        buildReturnGroup('ret-1', sharedObsDatetime, '2026-06-22T09:41:51.000+0000', 'First return'),
        buildReturnGroup('ret-2', sharedObsDatetime, '2026-06-22T09:41:51.000+0000', 'First return 2', 'Interaction'),
        {
          uuid: 'resp-1',
          obsDatetime: sharedObsDatetime,
          dateCreated: '2026-06-22T09:42:39.000+0000',
          concept: { uuid: concepts.responseConceptUuid },
          value: { uuid: 'answer', display: 'Rejected' },
        },
      ],
    };

    expect(parseDtpReturnInfo(encounter, concepts).isReturned).toBe(false);
  });

  test('shows tag again when a newer return group is created after the latest response', () => {
    const sharedObsDatetime = '2026-06-22T09:41:33.000+0000';
    const encounter: EncounterObsResponse = {
      uuid: 'enc-1',
      obs: [
        buildReturnGroup('ret-1', sharedObsDatetime, '2026-06-22T09:41:51.000+0000', 'First return'),
        {
          uuid: 'resp-1',
          obsDatetime: sharedObsDatetime,
          dateCreated: '2026-06-22T09:42:39.000+0000',
          concept: { uuid: concepts.responseConceptUuid },
          value: { uuid: 'answer', display: 'Rejected' },
        },
        buildReturnGroup('ret-2', sharedObsDatetime, '2026-06-22T09:43:33.000+0000', 'Second return'),
      ],
    };

    const info = parseDtpReturnInfo(encounter, concepts);
    expect(info.isReturned).toBe(true);
    expect(info.reasons.map((r) => r.reason)).toEqual(['Second return', 'First return']);
  });

  test('sorts reason lines by dateCreated newest first', () => {
    const encounter: EncounterObsResponse = {
      uuid: 'enc-1',
      obs: [
        buildReturnGroup('older', '2026-06-22T09:00:00.000+0000', '2026-06-22T09:00:00.000+0000', 'Older'),
        buildReturnGroup('newer', '2026-06-22T09:00:00.000+0000', '2026-06-22T10:00:00.000+0000', 'Newer'),
      ],
    };

    const reasons = parseDtpReturnInfo(encounter, concepts).reasons;
    expect(reasons.map((r) => r.reason)).toEqual(['Newer', 'Older']);
  });
});
