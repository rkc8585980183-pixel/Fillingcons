import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useWeights } from '@/hooks/useTable';
import type { Weight } from '@/types';

export function WeightMappingPage() {
  const { rows: weights, insert, update, remove } = useWeights();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ unit: '', factor: 1 });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = weights.filter((w) =>
    w.unit.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.unit.trim()) {
      setError('Unit name is required.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm({ unit: '', factor: 1 });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (w: Weight) => {
    setForm({ unit: w.unit, factor: w.factor });
    setEditingId(w.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ unit: '', factor: 1 });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Weight Mapping"
        subtitle="Manage unit-to-KG conversion factors"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Unit</>}
          </Button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3">
            {editingId ? 'Edit Unit' : 'Add New Unit'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. gram"
            />
            <Input
              label="Factor (to KG)"
              type="number"
              step="0.001"
              value={form.factor}
              onChange={(e) => setForm({ ...form, factor: parseFloat(e.target.value) || 0 })}
            />
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Unit</Button>
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search units..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Factor (to KG)</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No weight units found. Add one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{w.unit}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{w.factor}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(w)} className="text-slate-500 hover:text-blue-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(w.id)} className="text-slate-500 hover:text-red-600">
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
