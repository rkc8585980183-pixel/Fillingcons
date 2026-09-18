import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | number;
}

export function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findColumn(row: ParsedRow, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);
    const found = keys.find((k) => normalizeHeader(k) === normalized);
    if (found) return found;
  }
  return undefined;
}

/**
 * Parses dates from real-world exports, which mix formats:
 *  - "17-09-2026 07:12"        (Sale CSV: DD-MM-YYYY + time)
 *  - "16/09/2026"              (Purchase Excel: DD/MM/YYYY, no time)
 *  - Excel serial dates / JS Date objects (from cellDates: true)
 *  - "NA" / "-" / "" for not-yet-received rows -> treated as missing
 * Day-first (DD-MM/DD/-YYYY) is assumed throughout, since that's the
 * format used by these exports — this avoids native Date's MM/DD guess
 * silently swapping day and month.
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().split('T')[0];
  }

  let str = String(value).trim();
  if (!str || str.toUpperCase() === 'NA' || str === '-') return null;

  // Strip a trailing time component: "17-09-2026 07:12" -> "17-09-2026"
  const spaceIdx = str.search(/\s/);
  if (spaceIdx > -1) {
    str = str.slice(0, spaceIdx);
  }

  // Already ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD-MM-YYYY or DD/MM/YYYY (or 2-digit year)
  const dmy = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Last resort: let the engine try (handles odd but valid formats)
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function exportToExcel(
  rows: Record<string, string | number>[],
  filename: string,
  sheetName = 'Report'
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToCSV(
  rows: Record<string, string | number>[],
  filename: string
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
