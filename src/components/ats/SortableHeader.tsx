import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { SortDir } from '../../lib/tableSort';

/** Same chevron ShortlistingPage's original SortIndicator rendered. */
export function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return dir === 'asc' ? (
    <ChevronUp className="size-3.5 inline ml-1" />
  ) : (
    <ChevronDown className="size-3.5 inline ml-1" />
  );
}

interface SortableHeaderProps<K extends string> {
  label: ReactNode;
  sortKey: K;
  activeKey: K;
  dir: SortDir;
  onSort: (key: K) => void;
  className?: string;
}

/** One sortable <th>, the single sorting idiom used across every table in the product. */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: SortableHeaderProps<K>) {
  return (
    <th
      className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <SortIndicator active={activeKey === sortKey} dir={dir} />
    </th>
  );
}

/**
 * Same idiom (click a label, see the chevron) for a card grid with no table
 * to put a <th> on — CandidatesPage is the one page in the product shaped
 * that way. Behaviour and look (label + chevron) match SortableHeader; only
 * the DOM element differs, out of necessity, not choice.
 */
export function SortButton<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: SortableHeaderProps<K>) {
  const active = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
        active
          ? 'bg-autumn-primary/10 text-autumn-primary border-autumn-primary/30'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      } ${className ?? ''}`}
    >
      {label}
      <SortIndicator active={active} dir={dir} />
    </button>
  );
}
