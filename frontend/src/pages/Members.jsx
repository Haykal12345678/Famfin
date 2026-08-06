import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';

const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };
const STATUS_LABEL = { ACTIVE: 'Aktif', PENDING: 'Menunggu', INACTIVE: 'Nonaktif' };

function generatePassword() {
  // Password acak 10 karakter, mengandung huruf & angka (sesuai aturan validasi minimal 8 karakter + huruf + angka).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: generatePassword(), role: 'MEMBER' });
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null); // { name, email, password } - ditampilkan sekali setelah berhasil dibuat
  const [saving, setSaving] = useState(false);

  const load = (requestedPage = page) => api.get('/members', { params: { page: requestedPage, pageSize } }).then((res) => {
    setMembers(res.data.items);
    setTotal(res.data.total);
    setPage(res.data.page);
  });
  useEffect(() => { load(page); }, [page]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/members', form);
      setCreatedInfo({ name: data.user.name, email: data.user.email, password: data.temporaryPassword });
      setForm({ name: '', email: '', password: generatePassword(), role: 'MEMBER' });
      load(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan anggota.');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (membershipId, role) => {
    await api.patch(`/members/${membershipId}/role`, { role });
    load(page);
  };

  const remove = async (membershipId) => {
    if (!window.confirm('Keluarkan anggota ini dari keluarga?')) return;
    await api.delete(`/members/${membershipId}`);
    load(page);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Anggota Keluarga</h1>

      {createdInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-emerald-800">Akun berhasil dibuat untuk {createdInfo.name}</p>
              <p className="text-sm text-emerald-700 mt-1">
                Serahkan detail login berikut secara langsung/pribadi ke yang bersangkutan. Password ini <b>hanya ditampilkan sekali</b> dan tidak dikirim lewat email.
              </p>
              <div className="mt-3 bg-white rounded-lg border border-emerald-200 p-3 text-sm font-mono">
                <p>Email: {createdInfo.email}</p>
                <p>Password: {createdInfo.password}</p>
              </div>
              <p className="text-xs text-emerald-600 mt-2">Sarankan user untuk mengganti password setelah login pertama (lewat fitur Lupa Password).</p>
            </div>
            <button onClick={() => setCreatedInfo(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">Nama Anggota</label>
          <input required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Email</label>
          <input type="email" required className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Role</label>
          <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Password Awal</label>
          <div className="mt-1 flex gap-2">
            <input required className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })}
              className="text-xs px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">
              Acak Ulang
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimal 8 karakter, mengandung huruf dan angka.</p>
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2">
          <button disabled={saving} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Buat Akun Anggota'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.membershipId} className="border-b last:border-0 border-gray-50">
                <td className="py-2 pr-4">{m.user.name}</td>
                <td className="py-2 pr-4 text-gray-500">{m.user.email}</td>
                <td className="py-2 pr-4">
                  {m.role === 'OWNER' ? 'Owner' : (
                    <select className="border rounded px-2 py-1 text-xs" value={m.role} onChange={(e) => updateRole(m.membershipId, e.target.value)}>
                      {Object.entries(ROLE_LABEL).filter(([k]) => k !== 'OWNER').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </td>
                <td className="py-2 pr-4">{STATUS_LABEL[m.status]}</td>
                <td className="py-2 pr-4">
                  {m.role !== 'OWNER' && <button onClick={() => remove(m.membershipId)} className="text-xs text-red-500 hover:underline">Keluarkan</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} className="mt-4" />
      </div>
    </div>
  );
}
