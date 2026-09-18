import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useAreaManagers } from '@/hooks/useTable';
import type { AreaManager } from '@/types';

export function ManagerMappingPage() {
  const { rows: managers, insert, update, remove } = useAreaManagers();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = managers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Manager name is required.');
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await insert(form);
      if (result.error) { setError(result.error); return; }
    }
    setForm({ name: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (m: AreaManager) => {
    setForm({ name: m.name });
    setEditingId(m.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ name: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Area Manager Mapping"
        subtitle="Manage area manager names"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Manager</>}
          </Button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3">
            {editingId ? 'Edit Manager' : 'Add New Manager'}
          </h3>
          <Input
            label="Manager Name"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
            placeholder="e.g. John Smith"
          />
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Manager</Button>
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search managers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Manager Name</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                  No managers found. Add one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{m.name}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(m)} className="text-slate-500 hover:text-blue-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(m.id)} className="text-slate-500 hover:text-red-600">
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
