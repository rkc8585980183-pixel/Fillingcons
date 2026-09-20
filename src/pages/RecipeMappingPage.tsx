import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { UploadComponent, exportToExcel, type UploadColumn } from '@/components/UploadComponent';
import { Plus, Pencil, Trash2, X, Search, Download } from 'lucide-react';
import { useRecipeMapping } from '@/hooks/useTable';
import { supabase } from '@/lib/supabase';
import type { RecipeMapping } from '@/types';

const CHUNK_SIZE = 500;

const RECIPE_COLUMNS: UploadColumn[] = [
  { fieldName: 'sale_item', label: 'Sale Item', aliases: ['sale item name', 'sale item'], required: true },
  { fieldName: 'category', label: 'Category', aliases: ['category'], required: false },
  { fieldName: 'ingredient_code', label: 'Ingredient Code', aliases: ['ingredients code', 'ingredient code'], required: false },
  { fieldName: 'ingredient_name', label: 'Filling / Ingredient', aliases: ['filling in sale itme', 'filling in sale item'], required: true },
  { fieldName: 'filling_weight', label: 'Unit of Filling (g)', aliases: ['unit of filling'], required: true, type: 'number' },
  { fieldName: 'uom', label: 'UOM', aliases: ['uom'], required: false },
  { fieldName: 'qty_use_gram', label: 'Qty Used (g)', aliases: ['qty of use in item in gram', 'qty of use in item in grams'], required: true, type: 'number' },
];

const emptyForm = {
  sale_item: '', category: '', ingredient_code: '', ingredient_name: '',
  filling_weight: 0, uom: '', qty_use_gram: 0,
};

export function RecipeMappingPage() {
  const { rows, refetch, insert, update, remove } = useRecipeMapping();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = rows.filter(
    (r) =>
      r.sale_item.toLowerCase().includes(search.toLowerCase()) ||
      r.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.ingredient_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleBulkSave = async (
    data: Record<string, string | number>[],
    onProgress?: (msg: string) => void
  ) => {
    const total = data.length;
    let done = 0;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('recipe_mapping')
        .upsert(chunk, { onConflict: 'sale_item,ingredient_code' });
      if (error) return { error: error.message };
      done += chunk.length;
      onProgress?.(`Saved ${done} of ${total} rows...`);
    }
    await refetch();
    return { error: null };
  };

  const handleClearAll = async () => {
    const { error } = await supabase.from('recipe_mapping').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return { error: error.message };
    await refetch();
    return { error: null };
  };

  const handleDownload = () => {
    const data = rows.map((r) => ({
      'Sale Item': r.sale_item,
      'Category': r.category,
      'Ingredient Code': r.ingredient_code,
      'Filling / Ingredient': r.ingredient_name,
      'Unit of Filling (g)': r.filling_weight,
      'UOM': r.uom,
      'Qty Used (g)': r.qty_use_gram,
    }));
    exportToExcel(data, 'recipe_mapping.xlsx', 'Recipe Mapping');
  };

  const handleSave = async () => {
    setError(null);
    if (!form.sale_item.trim()) { setError('Sale Item is required.'); return; }
    if (!form.ingredient_name.trim()) { setError('Filling/Ingredient is required.'); return; }
    if (form.filling_weight <= 0) { setError('Unit of Filling must be greater than 0.'); return; }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (r: RecipeMapping) => {
    setForm({
      sale_item: r.sale_item,
      category: r.category,
      ingredient_code: r.ingredient_code,
      ingredient_name: r.ingredient_name,
      filling_weight: r.filling_weight,
      uom: r.uom,
      qty_use_gram: r.qty_use_gram,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="p-6 pb-0">
        <PageHeader
          title="Filling / Recipe Mapping"
          subtitle="Maps each sale item to the raw material filling(s) it uses. Combo items can have multiple rows (one per ingredient) — each contributes its full sale quantity to that ingredient's Ideal Consumption."
        />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Formula:</strong> Ideal Consumption (per ingredient, per outlet) = SUM over every matching row of
            (Sale Qty of that Sale Item on the previous day × Qty Used (g) / Unit of Filling (g))
          </p>
        </div>
      </div>

      <div className="px-6">
        <UploadComponent
          title="Bulk Upload Recipe Mapping"
          columns={RECIPE_COLUMNS}
          onSave={handleBulkSave}
          onClearAll={handleClearAll}
          onDownload={handleDownload}
          downloadLabel="Download Recipe Mapping"
          existingCount={rows.length}
        />
      </div>

      <div className="p-6 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">All Mappings</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownload}>
              <Download size={16} />
              Download
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Row</>}
            </Button>
          </div>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader title={editingId ? 'Edit Recipe Mapping Row' : 'Add Recipe Mapping Row'} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Sale Item"
                  value={form.sale_item}
                  onChange={(e) => setForm({ ...form, sale_item: e.target.value })}
                  placeholder="e.g. Eggless Biscoff Brownie"
                />
                <Input
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Brownies"
                />
                <Input
                  label="Ingredient Code"
                  value={form.ingredient_code}
                  onChange={(e) => setForm({ ...form, ingredient_code: e.target.value })}
                  placeholder="e.g. FL017"
                />
                <Input
                  label="Filling / Ingredient Name"
                  value={form.ingredient_name}
                  onChange={(e) => setForm({ ...form, ingredient_name: e.target.value })}
                  placeholder="e.g. Lotus Biscoff Spread (400 Gm)"
                />
                <Input
                  label="Unit of Filling (g)"
                  type="number"
                  value={form.filling_weight}
                  onChange={(e) => setForm({ ...form, filling_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 400"
                />
                <Input
                  label="UOM"
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                  placeholder="e.g. Gms"
                />
                <Input
                  label="Qty Used per piece (g)"
                  type="number"
                  value={form.qty_use_gram}
                  onChange={(e) => setForm({ ...form, qty_use_gram: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 10"
                />
              </div>
              {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Row</Button>
                <Button variant="secondary" onClick={cancel}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by sale item, ingredient name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sale Item</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Filling / Ingredient</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Unit (g)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">UOM</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty Used (g)</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No recipe mapping rows found. Upload a file or add one manually.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{r.sale_item}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.category || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.ingredient_code || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.ingredient_name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.filling_weight}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.uom || '-'}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.qty_use_gram}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => startEdit(r)} className="text-slate-500 hover:text-blue-600">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-red-600">
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
      </div>
    </div>
  );
}
