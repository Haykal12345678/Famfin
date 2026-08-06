import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

const TYPE_LABEL = { BANK: 'Bank', CASH: 'Cash', EWALLET: 'E-Wallet', SAVINGS: 'Tabungan', OTHER: 'Lainnya' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'BANK', accountNumber: '', initialBalance: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [accessAccount, setAccessAccount] = useState(null); // account yang sedang dikelola aksesnya

  const load = () => api.get('/accounts').then((res) => setAccounts(res.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/accounts', { ...form, initialBalance: Number(form.initialBalance || 0), initialBalanceDate: new Date().toISOString() });
      setShowForm(false);
      setForm({ name: '', type: 'BANK', accountNumber: '', initialBalance: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan rekening.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekening & Dompet</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar rekening keuangan dan akses mudah untuk keluarga.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          + Tambah Rekening
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Nama Rekening</label>
            <input required className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Jenis</label>
            <select className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Nomor Rekening (opsional)</label>
            <input className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900" value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Saldo Awal</label>
            <input type="number" min="0" className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900" value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 lg:col-span-2">{error}</p>}
          <div className="lg:col-span-2">
            <button disabled={saving} className="w-full rounded-3xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan Rekening'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">{TYPE_LABEL[a.type]}{a.accountNumber ? ` · ${a.accountNumber}` : ''}</p>
              </div>
              {!a.isActive && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Nonaktif</span>}
            </div>
            <p className="text-2xl font-bold text-brand-700 mt-5">{formatRupiah(a.currentBalance)}</p>
            <button onClick={() => setAccessAccount(a)} className="mt-5 inline-flex items-center justify-center rounded-3xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-100">
              Kelola Akses
            </button>
          </div>
        ))}
        {accounts.length === 0 && <p className="text-sm text-slate-400">Belum ada rekening. Yuk tambahkan rekening pertama Anda.</p>}
      </div>

      {accessAccount && (
        <AccountAccessPanel account={accessAccount} onClose={() => setAccessAccount(null)} />
      )}
    </div>
  );
}

function AccountAccessPanel({ account, onClose }) {
  const [members, setMembers] = useState([]);
  const [access, setAccess] = useState({}); // userId -> access object
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // userId yang sedang disimpan

  useEffect(() => {
    Promise.all([
      api.get('/members'),
      api.get(`/accounts/${account.id}/access`),
    ]).then(([membersRes, accessRes]) => {
      setMembers(membersRes.data.filter((m) => m.role !== 'OWNER' && m.status === 'ACTIVE'));
      const map = {};
      accessRes.data.forEach((a) => { map[a.userId] = a; });
      setAccess(map);
    }).finally(() => setLoading(false));
  }, [account.id]);

  const toggle = async (userId, field, currentValue) => {
    setSaving(userId);
    const current = access[userId] || { canView: true, canCreateTx: false, canEditTx: false, canDeleteTx: false, canManage: false };
    const updated = { ...current, [field]: !currentValue };
    try {
      const { data } = await api.put(`/accounts/${account.id}/access/${userId}`, updated);
      setAccess({ ...access, [userId]: data });
    } finally {
      setSaving(null);
    }
  };

  const fields = [
    { key: 'canView', label: 'Lihat' },
    { key: 'canCreateTx', label: 'Buat Transaksi' },
    { key: 'canEditTx', label: 'Edit Transaksi' },
    { key: 'canDeleteTx', label: 'Hapus Transaksi' },
    { key: 'canManage', label: 'Kelola Rekening' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Akses Rekening — {account.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Memuat...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada anggota lain selain Owner.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="py-2 pr-4">Anggota</th>
                  {fields.map((f) => <th key={f.key} className="py-2 pr-4 text-center">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const userAccess = access[m.user.id] || {};
                  return (
                    <tr key={m.user.id} className="border-b last:border-0 border-gray-50">
                      <td className="py-2 pr-4">{m.user.name}</td>
                      {fields.map((f) => (
                        <td key={f.key} className="py-2 pr-4 text-center">
                          <input
                            type="checkbox"
                            disabled={saving === m.user.id}
                            checked={!!userAccess[f.key]}
                            onChange={() => toggle(m.user.id, f.key, !!userAccess[f.key])}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Owner selalu memiliki akses penuh ke semua rekening secara otomatis.</p>
      </div>
    </div>
  );
}
