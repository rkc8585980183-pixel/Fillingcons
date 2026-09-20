import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { parseExcelFile, findColumn, parseDate, parseNumber, exportToExcel, exportToCSV, type ParsedRow } from '@/lib/excel';

export interface UploadColumn {
  fieldName: string;
  label: string;
  aliases: string[];
  required: boolean;
  type?: 'text' | 'number' | 'date';
}

interface UploadComponentProps {
  title: string;
  columns: UploadColumn[];
  /** onProgress lets onSave report status while chunking large saves. */
  onSave: (rows: Record<string, string | number>[], onProgress?: (msg: string) => void) => Promise<{ error: string | null }>;
  onDownload: () => void;
  downloadLabel: string;
  existingCount: number;
  /** If provided, shows a "Clear All Data" button that wipes every stored record for this table. */
  onClearAll?: () => Promise<{ error: string | null }>;
}

interface PreviewRow {
  values: Record<string, string | number>;
  _valid: boolean;
  _error: string;
}

export function UploadComponent({ title, columns, onSave, onDownload, downloadLabel, existingCount, onClearAll }: UploadComponentProps) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const requiredLabels = columns.filter((c) => c.required).map((c) => c.label).join(', ');

  const processFile = useCallback(async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      setFileName(file.name);
      setMessage(null);

      const firstRow = rows[0] || {};
      const sourceKeyByField = new Map<string, string | undefined>();
      columns.forEach((col) => {
        sourceKeyByField.set(col.fieldName, findColumn(firstRow, col.aliases));
      });

      const processed: PreviewRow[] = rows.map((row) => {
        const values: Record<string, string | number> = {};
        let error = '';

        for (const col of columns) {
          const sourceKey = sourceKeyByField.get(col.fieldName);
          const raw = sourceKey ? row[sourceKey] : '';

          if (col.type === 'number') {
            values[col.fieldName] = parseNumber(raw);
          } else if (col.type === 'date') {
            const parsed = parseDate(raw);
            values[col.fieldName] = parsed || '';
            if (col.required && !parsed && !error) error = `Missing or invalid ${col.label}`;
          } else {
            const text = String(raw ?? '').trim();
            values[col.fieldName] = text;
            if (col.required && !text && !error) error = `Missing ${col.label}`;
          }
        }

        return { values, _valid: !error, _error: error };
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
    const validRows = preview.filter((r) => r._valid).map((r) => r.values);
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'No valid rows to upload. Please check your file.' });
      return;
    }

    setUploading(true);
    setMessage(null);
    setProgress(`Preparing to save ${validRows.length} rows...`);
    const result = await onSave(validRows, (msg) => setProgress(msg));
    setUploading(false);
    setProgress('');

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Successfully uploaded ${validRows.length} rows.` });
      setPreview([]);
      setFileName('');
    }
  };

  const handleClearAll = async () => {
    if (!onClearAll) return;
    const confirmed = window.confirm(
      `This will permanently delete ALL ${existingCount} stored records for "${title}". This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setClearing(true);
    setMessage(null);
    const result = await onClearAll();
    setClearing(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'All data cleared.' });
    }
  };

  const validCount = preview.filter((r) => r._valid).length;
  const invalidCount = preview.length - validCount;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">
            Upload Excel or CSV files. Required columns: {requiredLabels}. {existingCount} records currently stored.
          </p>
        </div>
        <div className="flex gap-2">
          {onClearAll && (
            <Button variant="danger" onClick={handleClearAll} disabled={clearing || existingCount === 0}>
              <Trash2 size={16} />
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          )}
          <Button variant="secondary" onClick={onDownload}>
            <Download size={16} />
            {downloadLabel}
          </Button>
        </div>
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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
              {uploading && progress && (
                <span className="text-blue-600 font-medium">{progress}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setPreview([]); setFileName(''); }} disabled={uploading}>
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
                  {columns.map((col) => (
                    <th
                      key={col.fieldName}
                      className={`px-4 py-2 font-semibold text-slate-600 ${col.type === 'number' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
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
                    {columns.map((col) => (
                      <td
                        key={col.fieldName}
                        className={`px-4 py-2 text-slate-700 ${col.type === 'number' ? 'text-right' : 'text-left'}`}
                      >
                        {row.values[col.fieldName] === '' || row.values[col.fieldName] === undefined
                          ? '-'
                          : row.values[col.fieldName]}
                      </td>
                    ))}
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
