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

export function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  const parts = str.split(/[/\-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number);
    if (c < 100) c += 2000;
    if (a > 31) {
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
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

export function dedupeRows(rows: { date: string; outlet: string; item: string; qty: number }[]) {
  const map = new Map<string, { date: string; outlet: string; item: string; qty: number }>();
  for (const row of rows) {
    const key = `${row.date}|${row.outlet.trim().toLowerCase()}|${row.item.trim().toLowerCase()}`;
    map.set(key, row);
  }
  return [...map.values()];
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
