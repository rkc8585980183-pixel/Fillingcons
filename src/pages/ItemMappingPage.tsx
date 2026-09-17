import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useItems } from '@/hooks/useTable';
import type { Item } from '@/types';

export function ItemMappingPage() {
  const { rows: items, insert, update, remove } = useItems();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: '' });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.unit.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm({ name: '', category: '', unit: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (i: Item) => {
    setForm({ name: i.name, category: i.category, unit: i.unit });
    setEditingId(i.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ name: '', category: '', unit: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Item Mapping"
        subtitle="Manage item names, categories, and units"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Item</>}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader title={editingId ? 'Edit Item' : 'Add New Item'} />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Item Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chicken Burger"
              />
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Food"
              />
              <Input
                label="Unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. KG"
              />
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Item</Button>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No items found. Add one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{i.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.category || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.unit || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(i)} className="text-slate-500 hover:text-blue-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(i.id)} className="text-slate-500 hover:text-red-600">
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
