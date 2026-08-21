import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WalletCards } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal login. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-slate-100 px-4 py-10">

      {/* Existing Loading Overlay */}
      <LoadingOverlay loading={loading} />

      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-2xl">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Form */}
          <div className="p-10">

            {/* ============================================================
                LOGO
            ============================================================ */}

            <div className="mb-8 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
                <WalletCards size={25} strokeWidth={2.2} />
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
                Masuk ke Akun Anda
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Kelola keuangan keluarga dengan lebih tenang dan rapi.
              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
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
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Password
                </label>

                <input
                  type="password"
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
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Login */}
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
                Masuk
              </button>

            </form>

            <div className="mt-6 text-center text-sm text-slate-500">

              <p>
                Belum punya akun?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  Daftar
                </Link>
              </p>

              <p className="mt-2">
                <Link
                  to="/forgot-password"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Lupa password?
                </Link>
              </p>

            </div>

          </div>

          {/* Right Panel */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-cyan-500 p-10 text-white lg:flex">

            <div>

              <p className="text-sm uppercase tracking-[0.24em] text-white/80">
                Aplikasi Keluarga
              </p>

              <h2 className="mt-6 text-3xl font-bold">
                Urus keuangan keluarga dengan nyaman
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/85">
                Dashboard yang mudah dipahami, pencatatan transaksi,
                target tabungan, dan laporan ringkas dalam satu tempat.
              </p>

            </div>

            <div className="mt-8 space-y-3 text-sm text-white/90">

              <p className="flex items-start gap-2">
                ✅ Desain modern dan responsif
              </p>

              <p className="flex items-start gap-2">
                ✅ Catatan transaksi cepat
              </p>

              <p className="flex items-start gap-2">
                ✅ Kontrol akses anggota keluarga
              </p>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
