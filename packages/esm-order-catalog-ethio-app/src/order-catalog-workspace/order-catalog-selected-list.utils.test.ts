import { resolveExpandedSelection } from './order-catalog-selected-list.utils';

describe('resolveExpandedSelection', () => {
  it('expands the item that was just selected', () => {
    expect(resolveExpandedSelection(['panel-a'], ['panel-a', 'glucose'], 'panel-a')).toBe('glucose');
  });

  it('expands the last item when several become selected together', () => {
    expect(resolveExpandedSelection([], ['panel', 'child-a', 'child-b'], null)).toBe('child-b');
  });

  it('collapses every other row by replacing the previous expanded uuid', () => {
    expect(resolveExpandedSelection(['cbc'], ['cbc', 'esr'], 'cbc')).toBe('esr');
  });

  it('keeps the open row when the selection does not gain an item', () => {
    expect(resolveExpandedSelection(['cbc', 'esr'], ['cbc', 'esr'], 'esr')).toBe('esr');
  });

  it('closes the open row when that item is removed', () => {
    expect(resolveExpandedSelection(['cbc', 'esr'], ['cbc'], 'esr')).toBeNull();
  });

  it('leaves the list collapsed when nothing is selected', () => {
    expect(resolveExpandedSelection([], [], null)).toBeNull();
  });
});
