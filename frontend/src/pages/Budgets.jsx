import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

const STATUS_STYLE = {
  AMAN: 'bg-emerald-100 text-emerald-700',
  PERHATIAN: 'bg-yellow-100 text-yellow-700',
  HAMPIR_HABIS: 'bg-orange-100 text-orange-700',
  MELEBIHI_BUDGET: 'bg-red-100 text-red-700',
};
const STATUS_LABEL = { AMAN: 'Aman', PERHATIAN: 'Perhatian', HAMPIR_HABIS: 'Hampir Habis', MELEBIHI_BUDGET: 'Melebihi Budget' };

export default function Budgets() {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ categoryId: '', amount: '' });
  const [editingBudget, setEditingBudget] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/budgets', { params: { period } }).then((res) => setBudgets(res.data));
    api.get('/categories', { params: { type: 'EXPENSE' } }).then((res) => setCategories(res.data));
  };
  useEffect(load, [period]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingBudget) {
        await api.patch(`/budgets/${editingBudget.id}`, { amount: Number(form.amount) });
      } else {
        await api.post('/budgets', { ...form, period, amount: Number(form.amount) });
      }
      setForm({ categoryId: '', amount: '' });
      setEditingBudget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan budget.');
    }
  };

  const editBudget = (b) => {
    setEditingBudget(b);
    setForm({ categoryId: b.categoryId, amount: b.amount });
  };

  const cancelEdit = () => {
    setEditingBudget(null);
    setForm({ categoryId: '', amount: '' });
    setError('');
  };

  const removeBudget = async (id) => {
    if (!window.confirm('Hapus budget ini?')) return;
    await api.delete(`/budgets/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola batas pengeluaran dengan lebih jelas.</p>
        </div>
        <input type="month" className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>

      <form onSubmit={submit} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <label className="text-xs text-slate-500">Kategori</label>
          <select required disabled={!!editingBudget} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Pilih kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Nominal Budget</label>
          <input type="number" min="1" required className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            {editingBudget && (
              <button type="button" onClick={cancelEdit} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Batalkan
              </button>
            )}
            <button className="w-full rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 sm:w-auto">
              {editingBudget ? 'Perbarui Budget' : '+ Buat Budget'}
            </button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((b) => (
          <div key={b.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="font-semibold text-slate-900">{b.category.name}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
            </div>
            <div className="mb-4 rounded-full bg-slate-100 h-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${b.percentage > 100 ? 'bg-red-500' : b.percentage >= 90 ? 'bg-orange-500' : b.percentage >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(b.percentage, 100)}%` }}
              />
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Budget: {formatRupiah(b.amount)}</p>
              <p>Terpakai: {formatRupiah(b.used)} ({b.percentage}%)</p>
              <p>Sisa: {formatRupiah(b.remaining)}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => editBudget(b)} className="rounded-3xl border border-brand-600 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                Edit
              </button>
              <button onClick={() => removeBudget(b.id)} className="rounded-3xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                Hapus
              </button>
            </div>
          </div>
        ))}
        {budgets.length === 0 && <p className="text-sm text-slate-400">Belum ada budget untuk periode ini.</p>}
      </div>
    </div>
  );
}
