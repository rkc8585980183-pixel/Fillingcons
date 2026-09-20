import { useState } from 'react';
import { UploadComponent, exportToExcel, type UploadColumn } from '@/components/UploadComponent';
import { usePurchases } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

const CHUNK_SIZE = 500;

// Date and Quantity come from the PO itself (PurchaseOrder Date / PO
// Confirmed Qty), not Received Date / Received Qty, so every placed
// order counts even before the source system marks it "Received".
const PURCHASE_COLUMNS: UploadColumn[] = [
  { fieldName: 'date', label: 'Date', aliases: ['purchaseorder date', 'purchase order date', 'po date'], required: true, type: 'date' },
  { fieldName: 'outlet', label: 'Outlet', aliases: ['delivery location', 'delivery location code'], required: true },
  { fieldName: 'item', label: 'Item', aliases: ['item name', 'sku code'], required: true },
  { fieldName: 'sku_code', label: 'Sku Code', aliases: ['sku code'], required: false },
  { fieldName: 'po_no', label: 'PO No.', aliases: ['po no.', 'po no', 'ponumber'], required: false },
  { fieldName: 'uom', label: 'UOM', aliases: ['uom'], required: false },
  { fieldName: 'qty', label: 'Quantity', aliases: ['po confirmed qty', 'poconfirmedqty'], required: true, type: 'number' },
];

export function PurchaseUploadPage() {
  const { rows, refetch } = usePurchases();
  const [downloading, setDownloading] = useState(false);

  const handleSave = async (
    data: Record<string, string | number>[],
    onProgress?: (msg: string) => void
  ) => {
    const dates = [...new Set(data.map((r) => String(r.date)))];

    onProgress?.('Clearing existing data for the selected date(s)...');
    const { error: delError } = await supabase.from('purchases').delete().in('date', dates);
    if (delError) return { error: delError.message };

    const total = data.length;
    let done = 0;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const { error: insError } = await supabase.from('purchases').insert(chunk);
      if (insError) return { error: insError.message };
      done += chunk.length;
      onProgress?.(`Saved ${done} of ${total} rows...`);
    }

    await refetch();
    return { error: null };
  };

  const handleClearAll = async () => {
    const { error } = await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return { error: error.message };
    await refetch();
    return { error: null };
  };

  const handleDownload = async () => {
    setDownloading(true);
    const { data, error } = await supabase.from('purchases').select('*').order('date');
    if (!error && data) {
      exportToExcel(
        data as unknown as Record<string, string | number>[],
        'purchase_data.xlsx',
        'Purchases'
      );
    }
    setDownloading(false);
  };

  return (
    <UploadComponent
      title="Purchase Upload"
      columns={PURCHASE_COLUMNS}
      onSave={handleSave}
      onClearAll={handleClearAll}
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Purchase Data'}
      existingCount={rows.length}
    />
  );
}
