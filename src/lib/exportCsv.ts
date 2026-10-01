/**
 * Shared CSV export used by every "Export to CSV" button in the app.
 * Quotes every cell (so commas/quotes inside a value can't shift columns),
 * prefixes a UTF-8 BOM so Excel renders accented characters correctly
 * instead of mojibake, and uses \r\n line endings.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','));
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
