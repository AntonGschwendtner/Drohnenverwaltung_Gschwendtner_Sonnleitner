import { ariaSort, compareValues, nextSort, sortItems } from './sort';

describe('sort helper (REQ-020)', () => {
  it('sorts names ignoring upper and lower case', () => {
    expect(['TELLO-08', 'mavic-02', 'Anafi'].sort(compareValues)).toEqual(['Anafi', 'mavic-02', 'TELLO-08']);
  });

  it('sorts numbers as numbers and numbers inside names naturally', () => {
    expect([10, 9, 100].sort(compareValues)).toEqual([9, 10, 100]);
    expect(['Group 10', 'Group 9'].sort(compareValues)).toEqual(['Group 9', 'Group 10']);
  });

  it('sorts ISO dates by time', () => {
    expect(['2026-09-10', '2026-08-20', '2025-12-31'].sort(compareValues)).toEqual([
      '2025-12-31',
      '2026-08-20',
      '2026-09-10',
    ]);
  });

  it('treats names that only start like a date as text', () => {
    expect(['2026-01-01-b', '2026-01-01-A'].sort(compareValues)).toEqual(['2026-01-01-A', '2026-01-01-b']);
    expect(compareValues('2026-01-01-b', '2026-01-01-B')).toBe(0);
  });

  it('keeps empty values at the end in both directions', () => {
    const loans = [{ returnDate: null }, { returnDate: '2026-08-20' }, { returnDate: '2026-09-10' }];
    const value = (loan: { returnDate: string | null }) => loan.returnDate;

    expect(sortItems(loans, { column: 'returnDate', direction: 'asc' }, value).map(value)).toEqual([
      '2026-08-20',
      '2026-09-10',
      null,
    ]);
    expect(sortItems(loans, { column: 'returnDate', direction: 'desc' }, value).map(value)).toEqual([
      '2026-09-10',
      '2026-08-20',
      null,
    ]);
  });

  it('keeps the backend order for equal values and without a sort', () => {
    const drones = [
      { id: 1, status: 'Loaned' },
      { id: 2, status: 'Available' },
      { id: 3, status: 'Loaned' },
    ];
    const value = (drone: { status: string }) => drone.status;

    expect(sortItems(drones, { column: 'status', direction: 'asc' }, value).map((drone) => drone.id)).toEqual([2, 1, 3]);
    expect(sortItems(drones, null, value).map((drone) => drone.id)).toEqual([1, 2, 3]);
  });

  it('does not change the original list', () => {
    const names = ['b', 'a'];
    sortItems(names, { column: 'name', direction: 'asc' }, (name) => name);

    expect(names).toEqual(['b', 'a']);
  });

  it('sorts ascending first and reverses on the same header', () => {
    const first = nextSort(null, 'name');
    expect(first).toEqual({ column: 'name', direction: 'asc' });

    const second = nextSort(first, 'name');
    expect(second).toEqual({ column: 'name', direction: 'desc' });

    expect(nextSort(second, 'status')).toEqual({ column: 'status', direction: 'asc' });
  });

  it('describes the order for screen readers', () => {
    expect(ariaSort({ column: 'name', direction: 'asc' }, 'name')).toBe('ascending');
    expect(ariaSort({ column: 'name', direction: 'desc' }, 'name')).toBe('descending');
    expect(ariaSort({ column: 'name', direction: 'asc' }, 'status')).toBe('none');
    expect(ariaSort(null, 'name')).toBe('none');
  });
});
