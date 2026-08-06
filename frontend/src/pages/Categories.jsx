import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });
  const [error, setError] = useState('');

  const load = () => api.get('/categories').then((res) => setCategories(res.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categories', form);
      setForm({ name: '', type: 'EXPENSE' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan kategori.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Nonaktifkan kategori ini?')) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  const income = categories.filter((c) => c.type === 'INCOME');
  const expense = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Kategori</h1>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-gray-500">Nama Kategori</label>
          <input required className="mt-1 border rounded-lg px-3 py-2 text-sm" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Jenis</label>
          <select className="mt-1 border rounded-lg px-3 py-2 text-sm" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
          </select>
        </div>
        <button className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg">+ Tambah</button>
        {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CategoryList title="Pemasukan" items={income} onRemove={remove} />
        <CategoryList title="Pengeluaran" items={expense} onRemove={remove} />
      </div>
    </div>
  );
}

function CategoryList({ title, items, onRemove }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="space-y-1">
        {items.map((c) => (
          <div key={c.id} className="flex justify-between items-center py-1.5 text-sm">
            <span className="text-gray-700">{c.name} {c.isDefault && <span className="text-xs text-gray-400">(default)</span>}</span>
            <button onClick={() => onRemove(c.id)} className="text-xs text-red-500 hover:underline">Nonaktifkan</button>
          </div>
        ))}
      </div>
    </div>
  );
}
