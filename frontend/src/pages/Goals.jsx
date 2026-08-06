import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({ name: '', targetAmount: '', initialAmount: '', targetDate: '', accountId: '', description: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/goals').then((res) => setGoals(res.data));
    api.get('/accounts').then((res) => setAccounts(res.data));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Goals.submit', form, { editingGoal });
    try {
      if (editingGoal) {
        await api.patch(`/goals/${editingGoal.id}`, {
          name: form.name,
          targetAmount: Number(form.targetAmount),
          targetDate: form.targetDate,
          accountId: form.accountId,
          description: form.description,
        });
      } else {
        await api.post('/goals', {
          ...form,
          targetAmount: Number(form.targetAmount),
          initialAmount: Number(form.initialAmount || 0),
        });
      }
      setShowForm(false);
      setEditingGoal(null);
      setForm({ name: '', targetAmount: '', initialAmount: '', targetDate: '', accountId: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Gagal ${editingGoal ? 'memperbarui' : 'membuat'} target tabungan.`);
    }
  };

  const contribute = async (id) => {
    const amount = window.prompt('Masukkan nominal tambahan tabungan:');
    if (!amount || Number(amount) <= 0) return;
    await api.patch(`/goals/${id}/contribute`, { amount: Number(amount) });
    load();
  };

  const editGoal = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      initialAmount: goal.initialAmount,
      targetDate: goal.targetDate.slice(0, 10),
      accountId: goal.accountId,
      description: goal.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingGoal(null);
    setShowForm(false);
    setForm({ name: '', targetAmount: '', initialAmount: '', targetDate: '', accountId: '', description: '' });
    setError('');
  };

  const removeGoal = async (id) => {
    if (!window.confirm('Hapus target tabungan ini?')) return;
    await api.delete(`/goals/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Target Tabungan</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola target tabungan keluarga dengan cepat.</p>
        </div>
        <button onClick={() => {
          if (showForm) {
            setShowForm(false);
            cancelEdit();
          } else {
            // open form for creating new goal: clear fields then show
            setEditingGoal(null);
            setForm({ name: '', targetAmount: '', initialAmount: '', targetDate: '', accountId: '', description: '' });
            setError('');
            setShowForm(true);
          }
        }} className="rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          {showForm ? 'Tutup Form' : '+ Buat Target'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Nama Target</label>
            <input
              required
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Rekening Tujuan</label>
            <select
              required
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              <option value="">Pilih rekening</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Target Nominal</label>
            <input
              type="number"
              min="1"
              required
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            />
          </div>
          {!editingGoal && (
            <div>
              <label className="text-xs text-slate-500">Nominal Awal (opsional)</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                value={form.initialAmount}
                onChange={(e) => setForm({ ...form, initialAmount: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500">Target Tanggal</label>
            <input
              type="date"
              required
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-500">Deskripsi (opsional)</label>
            <textarea
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="lg:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            {editingGoal && (
              <button type="button" onClick={cancelEdit} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Batalkan
              </button>
            )}
            <button type="submit" className="rounded-3xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              {editingGoal ? 'Perbarui Target' : 'Simpan Target'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 && <p className="text-sm text-slate-400">Belum ada target tabungan. Yuk buat target pertama Anda.</p>}
        {goals.map((g) => (
          <div key={g.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{g.name}</p>
                <p className="text-xs text-slate-500">Target pada {new Date(g.targetDate).toLocaleDateString('id-ID')}</p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{g.progressPercentage}%</span>
            </div>
            <div className="mb-4 rounded-full bg-slate-100 h-3 overflow-hidden">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(g.progressPercentage, 100)}%` }} />
            </div>
            <div className="space-y-2 text-sm text-slate-600 mb-5">
              <p>Rekening: {g.account?.name || '-'}</p>
              <p>Terkumpul: {formatRupiah(g.currentAmount)} / {formatRupiah(g.targetAmount)}</p>
              <p>Kurang: {formatRupiah(g.shortfall)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => contribute(g.id)} className="rounded-3xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                + Tambah Tabungan
              </button>
              <button onClick={() => editGoal(g)} className="rounded-3xl border border-brand-600 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                Edit
              </button>
              <button onClick={() => removeGoal(g.id)} className="rounded-3xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
