import { useState } from 'react';
import { UploadComponent, exportToExcel } from '@/components/UploadComponent';
import { useSales } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';

export function SalesUploadPage() {
  const { rows, refetch } = useSales();
  const [downloading, setDownloading] = useState(false);

  const handleSave = async (data: { date: string; outlet: string; item: string; qty: number }[]) => {
    const { error } = await supabase
      .from('sales')
      .upsert(data, { onConflict: 'date,outlet,item' });
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
      columns={[
        { aliases: ['date', 'sale date', 'sales date'], required: true, fieldName: 'date' },
        { aliases: ['outlet', 'store', 'shop', 'location'], required: true, fieldName: 'outlet' },
        { aliases: ['item', 'item name', 'product', 'product name'], required: true, fieldName: 'item' },
        { aliases: ['qty', 'quantity', 'sales qty', 'sale qty', 'sales quantity'], required: true, fieldName: 'qty' },
      ]}
      onSave={handleSave}
      onDownload={handleDownload}
      downloadLabel={downloading ? 'Downloading...' : 'Download Sales Data'}
      existingCount={rows.length}
    />
  );
}
