/** Sorting of the loaded lists in the browser (REQ-020). */

export type SortDirection = 'asc' | 'desc';

export interface SortState<Column extends string> {
  column: Column;
  direction: SortDirection;
}

/** A value to sort by: text, a number, an ISO date such as 2026-08-19, or nothing. */
export type SortValue = string | number | null | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Compares two values in ascending order. Texts ignore upper and lower case, numbers compare as numbers,
 * ISO dates by time. Empty values come last in both directions, so an active loan without a return date
 * never jumps to the top of a sorted history.
 */
export function compareValues(a: SortValue, b: SortValue): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) {
    return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  const aText = String(a);
  const bText = String(b);
  if (ISO_DATE.test(aText) && ISO_DATE.test(bText)) {
    return aText < bText ? -1 : aText > bText ? 1 : 0;
  }

  return aText.localeCompare(bText, undefined, { sensitivity: 'base', numeric: true });
}

/** Returns a sorted copy. Equal values keep their order from the backend. */
export function sortItems<Item, Column extends string>(
  items: readonly Item[],
  state: SortState<Column> | null,
  valueOf: (item: Item, column: Column) => SortValue,
): Item[] {
  if (!state) {
    return [...items];
  }

  const factor = state.direction === 'asc' ? 1 : -1;
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const a = valueOf(left.item, state.column);
      const b = valueOf(right.item, state.column);
      const aEmpty = a === null || a === undefined || a === '';
      const bEmpty = b === null || b === undefined || b === '';
      // Empty values stay at the end, also when the direction is reversed.
      const result = aEmpty || bEmpty ? compareValues(a, b) : factor * compareValues(a, b);
      return result !== 0 ? result : left.index - right.index;
    })
    .map((entry) => entry.item);
}

/** Choosing a header sorts ascending; choosing the same header again reverses the order. */
export function nextSort<Column extends string>(current: SortState<Column> | null, column: Column): SortState<Column> {
  return current?.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: 'asc' };
}

/** The value for aria-sort on a header cell. */
export function ariaSort<Column extends string>(
  current: SortState<Column> | null,
  column: Column,
): 'ascending' | 'descending' | 'none' {
  if (current?.column !== column) {
    return 'none';
  }

  return current.direction === 'asc' ? 'ascending' : 'descending';
}
