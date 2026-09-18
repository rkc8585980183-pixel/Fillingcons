import { useState } from 'react';
import { UploadComponent, exportToExcel, type UploadColumn } from '@/components/UploadComponent';
import { useSales } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

// Maps to the real Sale CSV export headers:
// restaurant_name, invoice_no, date, ..., item_name, category_name, sap_code, ..., item_quantity, ...
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

  // Multiple sale rows per Date + Outlet + Item are valid (separate invoices).
  // Date-wise replace: for every date in the file, wipe that date's existing
  // rows and re-insert the freshly parsed ones. Other dates are untouched.
  const handleSave = async (data: Record<string, string | number>[]) => {
    const dates = [...new Set(data.map((r) => String(r.date)))];

    for (const d of dates) {
      const rowsForDate = data.filter((r) => String(r.date) === d);

      const { error: delError } = await supabase.from('sales').delete().eq('date', d);
      if (delError) return { error: delError.message };

      const { error: insError } = await supabase.from('sales').insert(rowsForDate);
      if (insError) return { error: insError.message };
    }

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
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Sales Data'}
      existingCount={rows.length}
    />
  );
}
