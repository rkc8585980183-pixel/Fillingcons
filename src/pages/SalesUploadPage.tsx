import { useState } from 'react';
import { UploadComponent, exportToExcel, type UploadColumn } from '@/components/UploadComponent';
import { useSales } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

const CHUNK_SIZE = 500;

// Maps to the real Sale CSV export headers.
const SALE_COLUMNS: UploadColumn[] = [
  { fieldName: 'date', label: 'Date', aliases: ['date'], required: true, type: 'date' },
  { fieldName: 'outlet', label: 'Outlet', aliases: ['restaurant_name', 'restaurant name', 'outlet'], required: true },
  { fieldName: 'item', label: 'Item', aliases: ['item_name', 'item name'], required: true },
  { fieldName: 'category', label: 'Category', aliases: ['category_name', 'category name', 'category'], required: false },
  { fieldName: 'sap_code', label: 'SAP Code', aliases: ['sap_code', 'sap code'], required: false },
  { fieldName: 'invoice_no', label: 'Invoice No.', aliases: ['invoice_no', 'invoice no', 'invoice number'], required: false },
  { fieldName: 'qty', label: 'Quantity', aliases: ['item_quantity', 'item quantity', 'quantity', 'qty'], required: true, type: 'number' },
];

export function SalesUploadPage() {
  const { rows, refetch } = useSales();
  const [downloading, setDownloading] = useState(false);

  // Fast path for large files: ONE delete covering every date in the file,
  // then insert in fixed-size chunks (avoids one round-trip per date and
  // avoids sending one giant payload for the whole file at once).
  const handleSave = async (
    data: Record<string, string | number>[],
    onProgress?: (msg: string) => void
  ) => {
    const dates = [...new Set(data.map((r) => String(r.date)))];

    onProgress?.('Clearing existing data for the selected date(s)...');
    const { error: delError } = await supabase.from('sales').delete().in('date', dates);
    if (delError) return { error: delError.message };

    const total = data.length;
    let done = 0;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const { error: insError } = await supabase.from('sales').insert(chunk);
      if (insError) return { error: insError.message };
      done += chunk.length;
      onProgress?.(`Saved ${done} of ${total} rows...`);
    }

    await refetch();
    return { error: null };
  };

  const handleClearAll = async () => {
    const { error } = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return { error: error.message };
    await refetch();
    return { error: null };
  };

  const handleDownload = async () => {
    setDownloading(true);
    const { data, error } = await supabase.from('sales').select('*').order('date');
    if (!error && data) {
      exportToExcel(
        data as unknown as Record<string, string | number>[],
        'sales_data.xlsx',
        'Sales'
      );
    }
    setDownloading(false);
  };

  return (
    <UploadComponent
      title="Sales Upload"
      columns={SALE_COLUMNS}
      onSave={handleSave}
      onClearAll={handleClearAll}
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Sales Data'}
      existingCount={rows.length}
    />
  );
}
