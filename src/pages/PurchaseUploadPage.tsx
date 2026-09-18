import { useState } from 'react';
import { UploadComponent, exportToExcel, type UploadColumn } from '@/components/UploadComponent';
import { usePurchases } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

// Maps to the real Purchase Excel export headers.
// Date and Quantity are taken from the PO itself (PurchaseOrder Date /
// PO Confirmed Qty) rather than Received Date / Received Qty, because
// many POs are physically received before the source system marks them
// as "Received" — using the confirmed PO fields means every placed
// order is counted, not just the ones already flagged received there.
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

  // Multiple purchase rows per Date + Outlet + Item are valid (separate POs).
  // Date-wise replace: for every date in the file, wipe that date's existing
  // rows and re-insert the freshly parsed ones. Other dates are untouched.
  const handleSave = async (data: Record<string, string | number>[]) => {
    const dates = [...new Set(data.map((r) => String(r.date)))];

    for (const d of dates) {
      const rowsForDate = data.filter((r) => String(r.date) === d);

      const { error: delError } = await supabase.from('purchases').delete().eq('date', d);
      if (delError) return { error: delError.message };

      const { error: insError } = await supabase.from('purchases').insert(rowsForDate);
      if (insError) return { error: insError.message };
    }

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
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Purchase Data'}
      existingCount={rows.length}
    />
  );
}
