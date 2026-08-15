import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';

const ROLE_LABEL = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const STATUS_LABEL = {
  ACTIVE: 'Aktif',
  PENDING: 'Menunggu',
  INACTIVE: 'Nonaktif',
};

function generatePassword() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

  let pass = '';

  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }

  return pass;
}

export default function Members() {
  const [members, setMembers] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: generatePassword(),
    role: 'MEMBER',
  });

  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (requestedPage = page) => {
    setLoading(true);

    try {
      const res = await api.get('/members', {
        params: {
          page: requestedPage,
          pageSize,
        },
      });

      setMembers(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || requestedPage);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal memuat daftar anggota.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const submit = async (e) => {
    e.preventDefault();

    setError('');
    setSaving(true);

    try {
      const { data } = await api.post('/members', form);

      setCreatedInfo({
        name: data.user.name,
        email: data.user.email,
        password: data.temporaryPassword,
      });

      setForm({
        name: '',
        email: '',
        password: generatePassword(),
        role: 'MEMBER',
      });

      setShowForm(false);

      await load(1);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menambahkan anggota.'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (membershipId, role) => {
    try {
      await api.patch(`/members/${membershipId}/role`, {
        role,
      });

      await load(page);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal mengubah role anggota.'
      );
    }
  };

  const remove = async (membershipId) => {
    if (
      !window.confirm(
        'Keluarkan anggota ini dari keluarga?'
      )
    ) {
      return;
    }

    try {
      await api.delete(`/members/${membershipId}`);

      await load(page);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal mengeluarkan anggota.'
      );
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      password: generatePassword(),
      role: 'MEMBER',
    });

    setError('');
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Anggota Keluarga
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Kelola anggota, role, dan akses keluarga.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              setShowForm(true);
              setError('');
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          {showForm ? (
            <>
              <span>×</span>
              Tutup Form
            </>
          ) : (
            <>
              <span className="text-lg leading-none">
                +
              </span>
              Tambah Anggota
            </>
          )}
        </button>
      </div>

      {/* CREATED ACCOUNT */}
      {createdInfo && (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-800">
                    Akun berhasil dibuat
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    Akun untuk{' '}
                    <strong>
                      {createdInfo.name}
                    </strong>{' '}
                    berhasil dibuat.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCreatedInfo(null)
                  }
                  className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {createdInfo.email}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Password Awal
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                    {createdInfo.password}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-emerald-700">
                Password ini hanya ditampilkan sekali.
                Sarankan anggota mengganti password
                setelah login.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            !
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Terjadi kesalahan
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Tambah Anggota Baru
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Buat akun dan tentukan hak akses anggota
              keluarga.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* NAME */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Nama Anggota
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                required
                type="text"
                placeholder="Contoh: Budi"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-50"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Email
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                required
                type="email"
                placeholder="nama@email.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-50"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            {/* ROLE */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Role
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-50"
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                  })
                }
              >
                <option value="ADMIN">
                  Admin
                </option>

                <option value="MEMBER">
                  Member
                </option>

                <option value="VIEWER">
                  Viewer
                </option>
              </select>

              <p className="mt-1.5 text-[10px] text-slate-400">
                Tentukan kemampuan anggota dalam
                mengakses sistem.
              </p>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Password Awal
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="mt-2 flex gap-2">
                <input
                  required
                  type="text"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-50"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      password: generatePassword(),
                    })
                  }
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Acak
                </button>
              </div>

              <p className="mt-1.5 text-[10px] text-slate-400">
                Minimal 8 karakter dan mengandung huruf
                serta angka.
              </p>
            </div>
          </div>

          {/* FORM ACTION */}
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Membuat Akun...'
                : 'Buat Akun Anggota'}
            </button>
          </div>
        </form>
      )}

      {/* MEMBERS LIST */}
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">

        {/* LIST HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Daftar Anggota
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Kelola anggota keluarga, role, dan status
              akses.
            </p>
          </div>

          <div className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {total} anggota
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  Anggota
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  Email
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  Role
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-14 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />

                      <p className="mt-3 text-xs text-slate-400">
                        Memuat anggota...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                        <svg
                          className="h-6 w-6 text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                          />

                          <circle
                            cx="9"
                            cy="7"
                            r="4"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                          />
                        </svg>
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-700">
                        Belum ada anggota
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Tambahkan anggota keluarga
                        menggunakan tombol di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.membershipId}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                  >
                    {/* NAME */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
                          {(m.user?.name || '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {m.user?.name || '-'}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Anggota keluarga
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">
                        {m.user?.email || '-'}
                      </span>
                    </td>

                    {/* ROLE */}
                    <td className="px-5 py-4">
                      {m.role === 'OWNER' ? (
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                          Owner
                        </span>
                      ) : (
                        <select
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          value={m.role}
                          onChange={(e) =>
                            updateRole(
                              m.membershipId,
                              e.target.value
                            )
                          }
                        >
                          {Object.entries(ROLE_LABEL)
                            .filter(
                              ([key]) =>
                                key !== 'OWNER'
                            )
                            .map(([key, label]) => (
                              <option
                                key={key}
                                value={key}
                              >
                                {label}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : m.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : m.status === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />

                        {STATUS_LABEL[m.status] ||
                          m.status ||
                          '-'}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="px-5 py-4 text-right">
                      {m.role !== 'OWNER' ? (
                        <button
                          type="button"
                          onClick={() =>
                            remove(
                              m.membershipId
                            )
                          }
                          className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Keluarkan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Pemilik
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            className="mt-0"
          />
        </div>
      </div>
    </div>
  );
}