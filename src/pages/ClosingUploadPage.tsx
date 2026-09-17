import { useState } from 'react';
import { UploadComponent, exportToExcel } from '@/components/UploadComponent';
import { useClosingStock } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { ClosingStockRecord } from '@/types';

export function ClosingUploadPage() {
  const { rows, refetch, insert, update, remove } = useClosingStock();
  const [downloading, setDownloading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', outlet: '', item: '', qty: 0 });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async (data: { date: string; outlet: string; item: string; qty: number }[]) => {
    const { error } = await supabase
      .from('closing_stock')
      .upsert(data, { onConflict: 'date,outlet,item' });
    if (error) return { error: error.message };
    await refetch();
    return { error: null };
  };

  const handleDownload = async () => {
    setDownloading(true);
    const { data, error } = await supabase.from('closing_stock').select('*').order('date');
    if (!error && data) {
      exportToExcel(
        data as unknown as Record<string, string | number>[],
        'closing_stock_data.xlsx',
        'Closing Stock'
      );
    }
    setDownloading(false);
  };

  const handleManualSave = async () => {
    setFormError(null);
    if (!form.date || !form.outlet || !form.item) {
      setFormError('Date, Outlet, and Item are required.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setFormError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setFormError(result.error); return; }
    }
    setForm({ date: '', outlet: '', item: '', qty: 0 });
    setEditingId(null);
    setShowManual(false);
  };

  const startEdit = (row: ClosingStockRecord) => {
    setForm({ date: row.date, outlet: row.outlet, item: row.item, qty: row.qty });
    setEditingId(row.id);
    setShowManual(true);
  };

  const cancelEdit = () => {
    setForm({ date: '', outlet: '', item: '', qty: 0 });
    setEditingId(null);
    setShowManual(false);
    setFormError(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <UploadComponent
        title="Closing Stock Upload"
        columns={[
          { aliases: ['date', 'closing date', 'stock date'], required: true, fieldName: 'date' },
          { aliases: ['outlet', 'store', 'shop', 'location'], required: true, fieldName: 'outlet' },
          { aliases: ['item', 'item name', 'product', 'product name'], required: true, fieldName: 'item' },
          { aliases: ['qty', 'quantity', 'closing qty', 'closing quantity', 'stock', 'stock qty'], required: true, fieldName: 'qty' },
        ]}
        onSave={handleSave}
        onDownload={handleDownload}
        downloadLabel={downloading ? 'Downloading...' : 'Download Closing Stock'}
        existingCount={rows.length}
      />

      <div className="mt-8">
        <PageHeader
          title="Manual Closing Stock"
          subtitle="Add or update individual closing stock entries by Date + Outlet + Item"
          actions={
            <Button variant={showManual ? 'secondary' : 'primary'} onClick={() => {
              if (showManual) cancelEdit();
              else setShowManual(true);
            }}>
              {showManual ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add / Edit Entry</>}
            </Button>
          }
        />

        {showManual && (
          <Card className="mb-6">
            <CardHeader title={editingId ? 'Edit Closing Stock Entry' : 'Add Closing Stock Entry'} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <Input
                  label="Outlet"
                  value={form.outlet}
                  onChange={(e) => setForm({ ...form, outlet: e.target.value })}
                  placeholder="Outlet name"
                />
                <Input
                  label="Item"
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                  placeholder="Item name"
                />
                <Input
                  label="Qty"
                  type="number"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {formError && <p className="text-red-600 text-sm mt-3">{formError}</p>}
              <div className="flex gap-2 mt-4">
                <Button onClick={handleManualSave}>
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </Button>
                <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Outlet</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Item</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No closing stock entries yet. Use the upload above or add manually.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 50).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{row.date}</td>
                    <td className="px-4 py-2.5 text-slate-700">{row.outlet}</td>
                    <td className="px-4 py-2.5 text-slate-700">{row.item}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.qty}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => startEdit(row)} className="text-slate-500 hover:text-blue-600">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => remove(row.id)} className="text-slate-500 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 50 && (
          <p className="text-slate-400 text-xs mt-2 text-center">
            Showing first 50 of {rows.length} entries
          </p>
        )}
      </div>
    </div>
  );
}
