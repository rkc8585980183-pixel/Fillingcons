import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useOutlets, useAreaManagers } from '@/hooks/useTable';
import type { Outlet } from '@/types';

export function OutletMappingPage() {
  const { rows: outlets, insert, update, remove } = useOutlets();
  const { rows: managers } = useAreaManagers();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', area_manager: '', category: '' });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = outlets.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.area_manager.toLowerCase().includes(search.toLowerCase()) ||
      o.category.toLowerCase().includes(search.toLowerCase())
  );

  const managerOptions = managers.map((m) => ({ value: m.name, label: m.name }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Outlet name is required.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm({ name: '', area_manager: '', category: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (o: Outlet) => {
    setForm({ name: o.name, area_manager: o.area_manager, category: o.category });
    setEditingId(o.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ name: '', area_manager: '', category: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Outlet Mapping"
        subtitle="Manage outlet names, assign area managers and categories"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Outlet</>}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader title={editingId ? 'Edit Outlet' : 'Add New Outlet'} />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Outlet Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Downtown Store"
              />
              <Select
                label="Area Manager"
                value={form.area_manager}
                onChange={(e) => setForm({ ...form, area_manager: e.target.value })}
                options={managerOptions}
                placeholder="Select manager"
              />
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Restaurant"
              />
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Outlet</Button>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search outlets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Outlet Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Area Manager</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No outlets found. Add one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{o.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{o.area_manager || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{o.category || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(o)} className="text-slate-500 hover:text-blue-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(o.id)} className="text-slate-500 hover:text-red-600">
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
