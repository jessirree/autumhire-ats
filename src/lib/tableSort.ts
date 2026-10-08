import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortColumn<T> {
  /** Value to compare for this column. null/undefined sorts last in BOTH directions. */
  getValue: (item: T) => string | number | null | undefined;
  /** 'string' uses localeCompare (correct for accented names); defaults to numeric subtraction. */
  type?: 'string' | 'number';
}

/**
 * Extracted from ShortlistingPage's sortCandidateRows — behaviour must not
 * change: ascending and descending on every key, null/undefined values last
 * in both directions (checked before the asc/desc multiplier is applied, so
 * it can't be inverted by direction), and localeCompare for string columns
 * so accented names order correctly.
 */
export function sortRows<T, K extends string>(
  list: T[],
  columns: Record<K, SortColumn<T>>,
  key: K,
  dir: SortDir
): T[] {
  const column = columns[key];
  if (!column) return list;
  const mul = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = column.getValue(a);
    const bv = column.getValue(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (column.type === 'string') {
      return mul * String(av).localeCompare(String(bv));
    }
    return mul * ((av as number) - (bv as number));
  });
}

/**
 * Same toggle semantics as ShortlistingPage's original toggleSort: clicking
 * the already-active column flips direction; clicking a different column
 * selects it with a sensible default direction (ascending for columns named
 * in ascendingByDefaultKeys — names, by convention — descending otherwise,
 * since a fresh score/date/rating column reads best highest-or-latest-first).
 */
export function useTableSort<K extends string>(
  initialKey: K,
  initialDir: SortDir = 'desc',
  ascendingByDefaultKeys: K[] = []
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const toggleSort = (key: K) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(ascendingByDefaultKeys.includes(key) ? 'asc' : 'desc');
    }
  };

  return { sortKey, sortDir, toggleSort };
}
