import { type ReactNode } from 'react';

interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: Record<string, unknown>) => ReactNode;
}

interface DataTableProps {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

export function DataTable({ columns, rows, emptyMessage = 'No data available' }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm border border-slate-200 rounded-lg bg-white">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold text-slate-600 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 text-slate-700 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
