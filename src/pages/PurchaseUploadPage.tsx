import { useState } from 'react';
import { UploadComponent, exportToExcel } from '@/components/UploadComponent';
import { usePurchases } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

export function PurchaseUploadPage() {
  const { rows, refetch } = usePurchases();
  const [downloading, setDownloading] = useState(false);

  const handleSave = async (data: { date: string; outlet: string; item: string; qty: number }[]) => {
    const { error } = await supabase
      .from('purchases')
      .upsert(data, { onConflict: 'date,outlet,item' });
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
      columns={[
        { aliases: ['date', 'purchase date'], required: true, fieldName: 'date' },
        { aliases: ['outlet', 'store', 'shop', 'location'], required: true, fieldName: 'outlet' },
        { aliases: ['item', 'item name', 'product', 'product name'], required: true, fieldName: 'item' },
        { aliases: ['qty', 'quantity', 'purchase qty', 'purchase quantity'], required: true, fieldName: 'qty' },
      ]}
      onSave={handleSave}
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Purchase Data'}
      existingCount={rows.length}
    />
  );
}
