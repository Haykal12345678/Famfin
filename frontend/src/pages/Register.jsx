import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', familyName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-slate-200/70">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="p-10">
            <div className="mb-8">
              <h1 className="mt-6 text-3xl font-bold text-slate-900">Buat Akun Baru</h1>
              <p className="mt-2 text-sm text-slate-500">Bergabung dan mulai atur budget keluarga dengan cepat.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'name', label: 'Nama Lengkap', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'familyName', label: 'Nama Keluarga / Workspace', type: 'text' },
                { key: 'password', label: 'Password', type: 'password' },
                { key: 'confirmPassword', label: 'Konfirmasi Password', type: 'password' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-slate-700">{f.label}</label>
                  <input
                    type={f.type} required
                    className="mt-2 w-full border border-slate-200 rounded-3xl px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Sudah punya akun? <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Masuk</Link>
            </p>
          </div>

          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 to-cyan-500 p-10 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/80">Mulai hari ini</p>
              <h2 className="mt-6 text-3xl font-bold">Urus keuangan keluarga dengan percaya diri</h2>
              <p className="mt-4 text-sm leading-7 text-white/85">Catat pengeluaran, target tabungan, dan kontrol akses keluarga dalam satu aplikasi yang rapi.</p>
            </div>
            <div className="mt-8 space-y-3 text-sm text-white/90">
              <p className="flex items-start gap-2">✅ Dashboard ringkas dan mudah dipahami</p>
              <p className="flex items-start gap-2">✅ Atur kategori, akun, dan anggota keluarga</p>
              <p className="flex items-start gap-2">✅ Laporan lengkap dengan export CSV</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
