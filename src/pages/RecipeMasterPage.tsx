import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Plus, Pencil, Trash2, X, Search, Download } from 'lucide-react';
import { useRecipes } from '@/hooks/useTable';
import { exportToExcel } from '@/lib/excel';
import type { Recipe } from '@/types';

export function RecipeMasterPage() {
  const { rows: recipes, insert, update, remove } = useRecipes();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ item_name: '', filled_qty_gram: 0 });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = recipes.filter((r) =>
    r.item_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.item_name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (form.filled_qty_gram <= 0) {
      setError('Filled Qty (Gram) must be greater than 0.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm({ item_name: '', filled_qty_gram: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (r: Recipe) => {
    setForm({ item_name: r.item_name, filled_qty_gram: r.filled_qty_gram });
    setEditingId(r.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ item_name: '', filled_qty_gram: 0 });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleDownload = () => {
    const data = recipes.map((r) => ({
      'Item Name': r.item_name,
      'Filled Qty (Gram per Piece)': r.filled_qty_gram,
    }));
    exportToExcel(data, 'recipe_master.xlsx', 'Recipes');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Recipe Master"
        subtitle="Manage recipe entries. Filled Qty (Gram per Piece) is used to calculate Ideal Consumption."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownload}>
              <Download size={16} />
              Download
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Recipe</>}
            </Button>
          </div>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Formula:</strong> Ideal Consumption (KG) = Sales Qty x Recipe Filled Qty (Gram) / 1000
        </p>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader title={editingId ? 'Edit Recipe' : 'Add New Recipe'} />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Item Name"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="e.g. Chicken Burger"
              />
              <Input
                label="Filled Qty (Gram per Piece)"
                type="number"
                step="0.001"
                value={form.filled_qty_gram}
                onChange={(e) => setForm({ ...form, filled_qty_gram: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Recipe</Button>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Filled Qty (Gram/Piece)</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No recipes found. Add one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{r.item_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.filled_qty_gram}</td>
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
  );
}
