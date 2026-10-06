import { LineItem } from '../types';
import { distinctPriorities } from './order-priority';

const item = (orderUrgency?: string) => ({ orderUrgency } as LineItem);

describe('distinctPriorities', () => {
  it('returns each priority once, most urgent first', () => {
    expect(distinctPriorities([item('ROUTINE'), item('STAT'), item('ROUTINE'), item('ON_SCHEDULED_DATE')])).toEqual([
      'STAT',
      'ON_SCHEDULED_DATE',
      'ROUTINE',
    ]);
  });

  it('ignores line items that did not come from an order', () => {
    expect(distinctPriorities([item(), item('ROUTINE')])).toEqual(['ROUTINE']);
    expect(distinctPriorities([item()])).toEqual([]);
    expect(distinctPriorities()).toEqual([]);
  });
});
