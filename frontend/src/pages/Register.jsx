import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WalletCards } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    familyName: '',
  });

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
      setError(
        err.response?.data?.message ||
          'Gagal mendaftar. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-slate-100 px-4 py-10">

      {/* Existing Loading Overlay */}
      <LoadingOverlay loading={loading} />

      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-2xl">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">

          {/* Form */}
          <div className="p-10">

            {/* ============================================================
                LOGO
            ============================================================ */}

            <div className="mb-8 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
                <WalletCards
                  size={25}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-brand-700">
                  FamFin
                </h2>

                <p className="text-xs font-medium text-slate-500">
                  Family Finance Management
                </p>
              </div>

            </div>

            {/* ============================================================
                TITLE
            ============================================================ */}

            <div className="mb-8">

              <h1 className="text-3xl font-bold text-slate-900">
                Buat Akun Baru
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Bergabung dan mulai atur budget keluarga dengan cepat.
              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {[
                {
                  key: 'name',
                  label: 'Nama Lengkap',
                  type: 'text',
                },
                {
                  key: 'email',
                  label: 'Email',
                  type: 'email',
                },
                {
                  key: 'familyName',
                  label: 'Nama Keluarga / Workspace',
                  type: 'text',
                },
                {
                  key: 'password',
                  label: 'Password',
                  type: 'password',
                },
                {
                  key: 'confirmPassword',
                  label: 'Konfirmasi Password',
                  type: 'password',
                },
              ].map((f) => (
                <div key={f.key}>

                  <label className="text-sm font-medium text-slate-700">
                    {f.label}
                  </label>

                  <input
                    type={f.type}
                    required
                    disabled={loading}
                    className="
                      mt-2
                      w-full
                      rounded-3xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      focus:border-brand-500
                      focus:ring-2
                      focus:ring-brand-100
                      disabled:cursor-not-allowed
                      disabled:bg-slate-50
                    "
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]: e.target.value,
                      })
                    }
                  />

                </div>
              ))}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Register */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full
                  rounded-3xl
                  bg-brand-600
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  hover:bg-brand-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                Daftar
              </button>

            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Sudah punya akun?{' '}

              <Link
                to="/login"
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Masuk
              </Link>
            </p>

          </div>

          {/* Right Panel */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-cyan-500 p-10 text-white lg:flex">

            <div>

              <p className="text-sm uppercase tracking-[0.24em] text-white/80">
                Mulai hari ini
              </p>

              <h2 className="mt-6 text-3xl font-bold">
                Urus keuangan keluarga dengan percaya diri
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/85">
                Catat pengeluaran, target tabungan, dan kontrol akses
                keluarga dalam satu aplikasi yang rapi.
              </p>

            </div>

            <div className="mt-8 space-y-3 text-sm text-white/90">

              <p className="flex items-start gap-2">
                ✅ Dashboard ringkas dan mudah dipahami
              </p>

              <p className="flex items-start gap-2">
                ✅ Atur kategori, akun, dan anggota keluarga
              </p>

              <p className="flex items-start gap-2">
                ✅ Laporan lengkap dengan export CSV
              </p>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
