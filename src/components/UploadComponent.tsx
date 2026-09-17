import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/Button';
import { parseExcelFile, findColumn, parseDate, parseNumber, exportToExcel, exportToCSV, type ParsedRow } from '@/lib/excel';

export interface UploadColumn {
  aliases: string[];
  required: boolean;
  fieldName: string;
}

interface UploadComponentProps {
  title: string;
  columns: UploadColumn[];
  onSave: (rows: { date: string; outlet: string; item: string; qty: number }[]) => Promise<{ error: string | null }>;
  onDownload: () => void;
  downloadLabel: string;
  existingCount: number;
}

interface PreviewRow {
  date: string;
  outlet: string;
  item: string;
  qty: number;
  _valid: boolean;
  _error: string;
}

export function UploadComponent({ title, columns, onSave, onDownload, downloadLabel, existingCount }: UploadComponentProps) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      setFileName(file.name);
      setMessage(null);

      const dateCol = findColumn(rows[0] || {}, columns.find((c) => c.fieldName === 'date')!.aliases);
      const outletCol = findColumn(rows[0] || {}, columns.find((c) => c.fieldName === 'outlet')!.aliases);
      const itemCol = findColumn(rows[0] || {}, columns.find((c) => c.fieldName === 'item')!.aliases);
      const qtyCol = findColumn(rows[0] || {}, columns.find((c) => c.fieldName === 'qty')!.aliases);

      const processed: PreviewRow[] = rows.map((row) => {
        const date = dateCol ? parseDate(row[dateCol]) : null;
        const outlet = outletCol ? String(row[outletCol] || '').trim() : '';
        const item = itemCol ? String(row[itemCol] || '').trim() : '';
        const qty = qtyCol ? parseNumber(row[qtyCol]) : 0;

        let error = '';
        if (!date) error = 'Missing or invalid date';
        else if (!outlet) error = 'Missing outlet';
        else if (!item) error = 'Missing item';

        return {
          date: date || '',
          outlet,
          item,
          qty,
          _valid: !error,
          _error: error,
        };
      });

      setPreview(processed);
    } catch {
      setMessage({ type: 'error', text: 'Failed to parse file. Please check the file format.' });
      setPreview([]);
    }
  }, [columns]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    const validRows = preview.filter((r) => r._valid);
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'No valid rows to upload. Please check your file.' });
      return;
    }

    setUploading(true);
    setMessage(null);
    const result = await onSave(validRows.map(({ date, outlet, item, qty }) => ({ date, outlet, item, qty })));
    setUploading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Successfully uploaded ${validRows.length} rows.` });
      setPreview([]);
      setFileName('');
    }
  };

  const validCount = preview.filter((r) => r._valid).length;
  const invalidCount = preview.length - validCount;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">
            Upload Excel or CSV files with Date, Outlet, Item, and Qty columns. {existingCount} records currently stored.
          </p>
        </div>
        <Button variant="secondary" onClick={onDownload}>
          <Download size={16} />
          {downloadLabel}
        </Button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
        }`}
      >
        <FileSpreadsheet size={40} className="mx-auto text-slate-400 mb-3" />
        <p className="text-slate-600 text-sm mb-2">Drag and drop your Excel/CSV file here, or</p>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <Upload size={16} />
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        {fileName && <p className="text-slate-500 text-sm mt-3">Selected: {fileName}</p>}
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {preview.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-slate-800">{preview.length}</span> rows parsed
              </span>
              <span className="text-green-600">
                <span className="font-semibold">{validCount}</span> valid
              </span>
              {invalidCount > 0 && (
                <span className="text-red-600">
                  <span className="font-semibold">{invalidCount}</span> invalid
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setPreview([]); setFileName(''); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={uploading || validCount === 0}>
                {uploading ? 'Saving...' : `Save ${validCount} Rows`}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Outlet</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Item</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Qty</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-2">
                      {row._valid ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <span className="text-red-500 text-xs">{row._error}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{row.date || '-'}</td>
                    <td className="px-4 py-2 text-slate-700">{row.outlet || '-'}</td>
                    <td className="px-4 py-2 text-slate-700">{row.item || '-'}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 100 && (
            <p className="text-slate-400 text-xs mt-2 text-center">
              Showing first 100 rows of {preview.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function downloadData(rows: ParsedRow[], filename: string) {
  exportToExcel(rows as Record<string, string | number>[], filename);
}

export { exportToExcel, exportToCSV };
