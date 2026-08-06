import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';
import Pagination from '../components/Pagination';

const TX_LABEL = { INCOME: 'Pemasukan', EXPENSE: 'Pengeluaran', TRANSFER: 'Transfer' };
const TX_COLOR = { INCOME: 'text-emerald-600', EXPENSE: 'text-red-600', TRANSFER: 'text-blue-600' };

export default function Transactions() {
  const [tab, setTab] = useState(null); // 'income' | 'expense' | 'transfer'
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ type: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/accounts'),
      api.get('/categories'),
      api.get('/transactions', { params: { ...filter, page, pageSize } }),
    ]).then(([acc, cat, tx]) => {
      setAccounts(acc.data);
      setCategories(cat.data);
      setItems(tx.data.items);
      setTotal(tx.data.total || 0);
      setPage(tx.data.page || page);
    }).finally(() => setLoading(false));
  };

  useEffect(loadAll, [filter, page]);

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
            <p className="mt-1 text-sm text-slate-500">Tambah dan tinjau transaksi keluarga Anda dengan cepat.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickBtn label="+ Pemasukan" color="bg-emerald-600" onClick={() => setTab('income')} />
            <QuickBtn label="+ Pengeluaran" color="bg-red-600" onClick={() => setTab('expense')} />
            <QuickBtn label="↔ Transfer" color="bg-blue-600" onClick={() => setTab('transfer')} />
          </div>
        </div>
      </div>

      {tab && (
        <TransactionForm
          type={tab}
          accounts={accounts}
          categories={categories}
          onClose={() => setTab(null)}
          onSaved={() => { setTab(null); loadAll(); }}
        />
      )}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Riwayat Transaksi</h2>
            <p className="text-sm text-slate-500">Filter dan lihat semua aktivitas keuangan keluarga.</p>
          </div>
          <select
            className="w-full max-w-xs rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 shadow-sm"
            value={filter.type}
            onChange={(e) => { setFilter({ ...filter, type: e.target.value }); setPage(1); }}
          >
            <option value="">Semua Jenis</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Belum ada transaksi. Yuk catat transaksi pertama Anda.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-3 pr-4">Tanggal</th>
                    <th className="py-3 pr-4">Jenis</th>
                    <th className="py-3 pr-4">Kategori</th>
                    <th className="py-3 pr-4">Rekening</th>
                    <th className="py-3 pr-4">Catatan</th>
                    <th className="py-3 pr-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="rounded-[1.25rem] bg-slate-50">
                      <td className="py-3 pr-4">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                      <td className={`py-3 pr-4 font-medium ${TX_COLOR[t.type]}`}>{TX_LABEL[t.type]}</td>
                      <td className="py-3 pr-4">{t.category?.name || '-'}</td>
                      <td className="py-3 pr-4">{t.account?.name}</td>
                      <td className="py-3 pr-4 text-slate-500">{t.note || '-'}</td>
                      <td className={`py-3 pr-4 text-right font-semibold ${TX_COLOR[t.type]}`}>{formatRupiah(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} className="mt-4" />
          </>
        )}
      </div>
    </div>
  );
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className={`${color} text-white text-sm font-medium px-3 py-2 rounded-lg hover:opacity-90`}>
      {label}
    </button>
  );
}

function TransactionForm({ type, accounts, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountId: '', toAccountId: '', categoryId: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const catType = type === 'income' ? 'INCOME' : 'EXPENSE';
  const filteredCategories = categories.filter((c) => c.type === catType);

  const submit = async (e, confirmLowBalance = false) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (type === 'income') {
        await api.post('/transactions/income', { ...form, amount: Number(form.amount) });
      } else if (type === 'expense') {
        await api.post('/transactions/expense', { ...form, amount: Number(form.amount), confirmLowBalance });
      } else {
        await api.post('/transactions/transfer', {
          fromAccountId: form.accountId, toAccountId: form.toAccountId, amount: Number(form.amount), date: form.date, note: form.note,
        });
      }
      onSaved();
    } catch (err) {
      if (err.response?.data?.code === 'LOW_BALANCE_WARNING') {
        if (window.confirm('Saldo rekening tidak mencukupi. Tetap simpan transaksi ini?')) {
          return submit(e, true);
        }
      } else {
        setError(err.response?.data?.message || 'Gagal menyimpan transaksi.');
      }
    } finally {
      setSaving(false);
    }
  };

  const title = { income: 'Tambah Pemasukan', expense: 'Tambah Pengeluaran', transfer: 'Pindahkan Uang' }[type];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">Nominal</label>
          <input type="number" min="1" required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>

        {type !== 'transfer' && (
          <div>
            <label className="text-xs text-gray-500">Kategori</label>
            <select required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Pilih kategori</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500">{type === 'transfer' ? 'Rekening Sumber' : 'Rekening'}</label>
          <select required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            <option value="">Pilih rekening</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {type === 'transfer' && (
          <div>
            <label className="text-xs text-gray-500">Rekening Tujuan</label>
            <select required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}>
              <option value="">Pilih rekening</option>
              {accounts.filter((a) => a.id !== form.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500">Tanggal</label>
          <input type="date" required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs text-gray-500">Catatan (opsional)</label>
          <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border">Batal</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
