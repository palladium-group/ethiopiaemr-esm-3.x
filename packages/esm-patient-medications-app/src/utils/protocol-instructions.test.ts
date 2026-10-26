import {
  buildProtocolInstructions,
  getDistinctProtocolInstructions,
  parseProtocolInstructions,
  unescapeRestText,
} from './protocol-instructions';

describe('protocol-instructions', () => {
  it('round-trips the order set name and multi-line instructions', () => {
    const stamped = buildProtocolInstructions(' HL ABVD ', 'ANC >750 before starting.\n1. Hold if ANC < 500.\n');

    expect(stamped).toBe('Protocol: HL ABVD\nANC >750 before starting.\n1. Hold if ANC < 500.');
    expect(parseProtocolInstructions(stamped)).toEqual({
      name: 'HL ABVD',
      instructions: 'ANC >750 before starting.\n1. Hold if ANC < 500.',
    });
  });

  it('decodes server-encoded text before parsing', () => {
    expect(parseProtocolInstructions('Protocol: HL ABVD\nANC &gt;750 &amp; PLT &gt;75,000')).toEqual({
      name: 'HL ABVD',
      instructions: 'ANC >750 & PLT >75,000',
    });
    expect(unescapeRestText('ANC &amp;gt; 750')).toBe('ANC > 750');
  });

  it('ignores order instructions that were not stamped from an order set', () => {
    expect(parseProtocolInstructions('Take with food')).toBeNull();
    expect(parseProtocolInstructions('Protocol: ')).toBeNull();
    expect(parseProtocolInstructions(null)).toBeNull();
    expect(parseProtocolInstructions(undefined)).toBeNull();
  });

  it('returns each protocol once for a group of orders', () => {
    const abvd = buildProtocolInstructions('HL ABVD', 'ANC >750');
    const ewing = buildProtocolInstructions('Ewing VDC', 'Daycare');

    expect(
      getDistinctProtocolInstructions([
        { instructions: abvd },
        { instructions: null },
        { instructions: abvd },
        { instructions: ewing },
        { instructions: 'Take with food' },
      ]),
    ).toEqual([
      { name: 'HL ABVD', instructions: 'ANC >750' },
      { name: 'Ewing VDC', instructions: 'Daycare' },
    ]);
  });
});
