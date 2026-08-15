import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

const TYPE_LABEL = {
  BANK: 'Bank',
  CASH: 'Cash',
  EWALLET: 'E-Wallet',
  SAVINGS: 'Tabungan',
  OTHER: 'Lainnya',
};

const TYPE_STYLE = {
  BANK: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
    icon: '🏦',
  },
  CASH: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    icon: '💵',
  },
  EWALLET: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-100',
    icon: '📱',
  },
  SAVINGS: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    icon: '🎯',
  },
  OTHER: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: '💳',
  },
};

const EMPTY_FORM = {
  name: '',
  type: 'BANK',
  accountNumber: '',
  initialBalance: '',
  description: '',
};

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  const clean = String(value).replace(/\D/g, '');

  if (!clean) return '';

  return Number(clean).toLocaleString('id-ID');
}

function parseNumber(value) {
  if (!value) return 0;

  return Number(
    String(value)
      .replace(/\./g, '')
      .replace(/,/g, '')
      .replace(/\D/g, '')
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [accessAccount, setAccessAccount] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get('/accounts');

      setAccounts(res.data || []);
    } catch (err) {
      console.error('Gagal memuat rekening:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    setError('');
    setSaving(true);

    try {
      await api.post('/accounts', {
        ...form,
        initialBalance: parseNumber(
          form.initialBalance
        ),
        initialBalanceDate:
          new Date().toISOString(),
      });

      setShowForm(false);
      setForm(EMPTY_FORM);

      await load(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menambahkan rekening.'
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        !keyword ||
        account.name
          ?.toLowerCase()
          .includes(keyword) ||
        account.accountNumber
          ?.toLowerCase()
          .includes(keyword);

      const matchesType =
        !typeFilter ||
        account.type === typeFilter;

      return (
        matchesSearch &&
        matchesType
      );
    });
  }, [
    accounts,
    search,
    typeFilter,
  ]);

  const summary = useMemo(() => {
    const activeAccounts =
      accounts.filter(
        (account) =>
          account.isActive !== false
      );

    const totalBalance =
      activeAccounts.reduce(
        (sum, account) =>
          sum +
          Number(
            account.currentBalance || 0
          ),
        0
      );

    const positiveAccounts =
      activeAccounts.filter(
        (account) =>
          Number(
            account.currentBalance || 0
          ) > 0
      ).length;

    return {
      totalBalance,
      totalAccounts:
        activeAccounts.length,
      positiveAccounts,
    };
  }, [accounts]);

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">

        <div className="relative p-6 lg:p-7">

          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-50/70 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Rekening & Dompet
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Kelola rekening, dompet,
                e-wallet, dan akses anggota
                keluarga dalam satu tempat.
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  load(true)
                }
                disabled={refreshing}
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-blue-600
                  transition
                  hover:bg-blue-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {refreshing
                  ? 'Memuat...'
                  : 'Refresh'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(
                    !showForm
                  );
                  setError('');
                }}
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:bg-blue-700
                  hover:shadow-md
                "
              >
                {showForm
                  ? 'Tutup Form'
                  : '+ Tambah Rekening'}
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <SummaryCard
          label="Total Saldo"
          value={summary.totalBalance}
          description="Saldo seluruh rekening aktif"
          type="balance"
        />

        <SummaryCard
          label="Rekening Aktif"
          value={summary.totalAccounts}
          description="Rekening yang sedang digunakan"
          type="accounts"
          isCurrency={false}
        />

        <SummaryCard
          label="Ada Saldo"
          value={summary.positiveAccounts}
          description="Rekening dengan saldo di atas Rp0"
          type="positive"
          isCurrency={false}
        />

      </section>

      {/* =====================================================
          FORM
      ===================================================== */}

      {showForm && (
        <form
          onSubmit={submit}
          className="
            overflow-hidden
            rounded-[1.75rem]
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg">
                +
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Tambah Rekening
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Masukkan informasi rekening
                  yang ingin digunakan.
                </p>
              </div>

            </div>

          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            {/* NAMA */}

            <FormField
              label="Nama Rekening"
              required
              hint="Contoh: BCA Utama"
            >
              <input
                required
                className="
                  form-input
                "
                placeholder="Masukkan nama rekening"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </FormField>

            {/* TYPE */}

            <FormField
              label="Jenis Rekening"
              required
            >
              <select
                className="form-input"
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
              >
                {Object.entries(
                  TYPE_LABEL
                ).map(
                  ([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </FormField>

            {/* ACCOUNT NUMBER */}

            <FormField
              label="Nomor Rekening"
              hint="Opsional"
            >
              <input
                className="form-input"
                placeholder="Masukkan nomor rekening"
                value={
                  form.accountNumber
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    accountNumber:
                      e.target.value,
                  })
                }
              />
            </FormField>

            {/* INITIAL BALANCE */}

            <FormField
              label="Saldo Awal"
              required
              hint="Masukkan angka tanpa Rp"
            >
              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  Rp
                </span>

                <input
                  required
                  inputMode="numeric"
                  className="
                    form-input
                    pl-11
                  "
                  placeholder="0"
                  value={
                    form.initialBalance
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      initialBalance:
                        formatNumber(
                          e.target.value
                        ),
                    })
                  }
                />

              </div>
            </FormField>

            {/* DESCRIPTION */}

            <div className="lg:col-span-2">

              <FormField
                label="Deskripsi"
                hint="Opsional"
              >
                <textarea
                  rows={3}
                  className="
                    form-input
                    h-auto
                    resize-none
                    py-3
                  "
                  placeholder="Tambahkan keterangan rekening..."
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value,
                    })
                  }
                />
              </FormField>

            </div>

            {/* ERROR */}

            {error && (
              <div className="lg:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* ACTION */}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                className="
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                "
              >
                Batal
              </button>

              <button
                disabled={saving}
                className="
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving
                  ? 'Menyimpan...'
                  : 'Simpan Rekening'}
              </button>

            </div>

          </div>

        </form>
      )}

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div className="flex-1">

            <p className="text-sm font-semibold text-slate-800">
              Daftar Rekening
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Cari rekening atau filter
              berdasarkan jenis.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[500px]">

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Cari rekening
              </label>

              <input
                type="text"
                placeholder="Nama atau nomor rekening..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                className="
                  form-input
                "
              />

            </div>

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Jenis
              </label>

              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value
                  )
                }
                className="form-input"
              >

                <option value="">
                  Semua Jenis
                </option>

                {Object.entries(
                  TYPE_LABEL
                ).map(
                  ([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

        </div>

        {/* =================================================
            ACCOUNT GRID
        ================================================= */}

        <div className="mt-6">

          {loading ? (
            <AccountSkeleton />
          ) : filteredAccounts.length ===
            0 ? (
            <EmptyAccounts
              hasFilter={
                !!search ||
                !!typeFilter
              }
              onReset={() => {
                setSearch('');
                setTypeFilter('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

              {filteredAccounts.map(
                (account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onAccess={() =>
                      setAccessAccount(
                        account
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          ACCESS MODAL
      ===================================================== */}

      {accessAccount && (
        <AccountAccessPanel
          account={accessAccount}
          onClose={() =>
            setAccessAccount(null)
          }
        />
      )}

    </div>
  );
}
// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  description,
  type,
  isCurrency = true,
}) {
  const styles = {
    balance: {
      icon: 'Rp',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
    },
    accounts: {
      icon: '▣',
      iconBg: 'bg-violet-50',
      iconText: 'text-violet-600',
    },
    positive: {
      icon: '✓',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
    },
  };

  const style = styles[type] || styles.balance;

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-[1.5rem]
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-50 transition group-hover:scale-125" />

      <div className="relative flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {isCurrency
              ? formatRupiah(value)
              : value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-2xl
            text-sm
            font-bold
            ${style.iconBg}
            ${style.iconText}
          `}
        >
          {style.icon}
        </div>

      </div>
    </div>
  );
}


// =========================================================
// FORM FIELD
// =========================================================

function FormField({
  label,
  required = false,
  hint,
  children,
}) {
  return (
    <div>

      <div className="mb-1.5 flex items-center justify-between gap-3">

        <label className="text-xs font-semibold text-slate-600">
          {label}

          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="text-[11px] text-slate-400">
            {hint}
          </span>
        )}

      </div>

      {children}

    </div>
  );
}


// =========================================================
// ACCOUNT CARD
// =========================================================

function AccountCard({
  account,
  onAccess,
}) {
  const style =
    TYPE_STYLE[account.type] ||
    TYPE_STYLE.OTHER;

  const balance = Number(
    account.currentBalance || 0
  );

  const isNegative = balance < 0;

  return (
    <article
      className="
        group
        relative
        overflow-hidden
        rounded-[1.5rem]
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-1
        hover:border-slate-300
        hover:shadow-lg
      "
    >

      {/* Decorative background */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-28
          w-28
          rounded-full
          bg-slate-50
          transition
          duration-300
          group-hover:scale-150
        "
      />

      {/* Header */}

      <div className="relative flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div
            className={`
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              text-lg
              ${style.bg}
              ${style.border}
            `}
          >
            {style.icon}
          </div>

          <div className="min-w-0">

            <h3 className="truncate text-sm font-bold text-slate-900">
              {account.name}
            </h3>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {TYPE_LABEL[account.type] ||
                'Lainnya'}
              {account.accountNumber
                ? ` · ${account.accountNumber}`
                : ''}
            </p>

          </div>

        </div>

        {!account.isActive && (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            Nonaktif
          </span>
        )}

      </div>


      {/* Balance */}

      <div className="relative mt-6">

        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Saldo saat ini
        </p>

        <p
          className={`
            mt-1
            truncate
            text-2xl
            font-bold
            tracking-tight
            sm:text-[26px]
            ${
              isNegative
                ? 'text-red-600'
                : 'text-slate-900'
            }
          `}
        >
          {formatRupiah(balance)}
        </p>

      </div>


      {/* Divider */}

      <div className="relative my-5 border-t border-slate-100" />


      {/* Footer */}

      <div className="relative flex items-center justify-between gap-3">

        <div className="min-w-0">

          {account.description ? (
            <p className="truncate text-xs text-slate-400">
              {account.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Rekening aktif
            </p>
          )}

        </div>

        <button
          type="button"
          onClick={onAccess}
          className="
            inline-flex
            shrink-0
            items-center
            gap-1.5
            rounded-xl
            border
            border-blue-100
            bg-blue-50
            px-3
            py-2
            text-xs
            font-semibold
            text-blue-600
            transition
            hover:border-blue-200
            hover:bg-blue-100
          "
        >
          Kelola Akses
          <span className="text-sm">
            →
          </span>
        </button>

      </div>

    </article>
  );
}


// =========================================================
// LOADING SKELETON
// =========================================================

function AccountSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="
            animate-pulse
            rounded-[1.5rem]
            border
            border-slate-200
            bg-white
            p-5
          "
        >

          <div className="flex items-center gap-3">

            <div className="h-11 w-11 rounded-2xl bg-slate-100" />

            <div className="flex-1 space-y-2">

              <div className="h-3 w-28 rounded bg-slate-100" />

              <div className="h-2.5 w-20 rounded bg-slate-100" />

            </div>

          </div>

          <div className="mt-6 h-2.5 w-24 rounded bg-slate-100" />

          <div className="mt-2 h-7 w-40 rounded bg-slate-100" />

          <div className="my-5 border-t border-slate-100" />

          <div className="flex justify-between">

            <div className="h-3 w-24 rounded bg-slate-100" />

            <div className="h-8 w-24 rounded-xl bg-slate-100" />

          </div>

        </div>
      ))}

    </div>
  );
}


// =========================================================
// EMPTY STATE
// =========================================================

function EmptyAccounts({
  hasFilter,
  onReset,
}) {
  return (
    <div
      className="
        flex
        min-h-[280px]
        flex-col
        items-center
        justify-center
        rounded-[1.5rem]
        border
        border-dashed
        border-slate-200
        bg-slate-50/50
        px-6
        py-12
        text-center
      "
    >

      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
        {hasFilter ? '⌕' : '💳'}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">

        {hasFilter
          ? 'Rekening tidak ditemukan'
          : 'Belum ada rekening'}

      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">

        {hasFilter
          ? 'Tidak ada rekening yang sesuai dengan pencarian atau filter yang dipilih.'
          : 'Tambahkan rekening pertama untuk mulai mengelola keuangan keluarga.'}

      </p>

      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="
            mt-5
            rounded-xl
            bg-blue-600
            px-4
            py-2
            text-xs
            font-semibold
            text-white
            transition
            hover:bg-blue-700
          "
        >
          Reset Filter
        </button>
      )}

    </div>
  );
}


// =========================================================
// ACCOUNT ACCESS PANEL
// =========================================================

function AccountAccessPanel({
  account,
  onClose,
}) {
  const [members, setMembers] =
    useState([]);

  const [access, setAccess] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(null);

  const [error, setError] =
    useState('');

  useEffect(() => {

    let mounted = true;

    Promise.all([
      api.get('/members'),
      api.get(
        `/accounts/${account.id}/access`
      ),
    ])
      .then(
        ([
          membersRes,
          accessRes,
        ]) => {

          if (!mounted) return;

          setMembers(
            membersRes.data.filter(
              (m) =>
                m.role !== 'OWNER' &&
                m.status === 'ACTIVE'
            )
          );

          const map = {};

          accessRes.data.forEach(
            (item) => {
              map[item.userId] = item;
            }
          );

          setAccess(map);
        }
      )
      .catch((err) => {

        console.error(
          'Gagal memuat akses:',
          err
        );

        if (mounted) {
          setError(
            err.response?.data
              ?.message ||
              'Gagal memuat data akses rekening.'
          );
        }

      })
      .finally(() => {

        if (mounted) {
          setLoading(false);
        }

      });

    return () => {
      mounted = false;
    };

  }, [account.id]);


  const toggle = async (
    userId,
    field,
    currentValue
  ) => {

    setSaving(userId);
    setError('');

    const current =
      access[userId] || {
        canView: true,
        canCreateTx: false,
        canEditTx: false,
        canDeleteTx: false,
        canManage: false,
      };

    const updated = {
      ...current,
      [field]: !currentValue,
    };

    try {

      const { data } =
        await api.put(
          `/accounts/${account.id}/access/${userId}`,
          updated
        );

      setAccess({
        ...access,
        [userId]: data,
      });

    } catch (err) {

      console.error(
        'Gagal update akses:',
        err
      );

      setError(
        err.response?.data
          ?.message ||
          'Gagal memperbarui akses.'
      );

    } finally {

      setSaving(null);

    }
  };


  const fields = [
    {
      key: 'canView',
      label: 'Lihat',
      description:
        'Melihat rekening',
    },
    {
      key: 'canCreateTx',
      label: 'Buat',
      description:
        'Membuat transaksi',
    },
    {
      key: 'canEditTx',
      label: 'Edit',
      description:
        'Mengubah transaksi',
    },
    {
      key: 'canDeleteTx',
      label: 'Hapus',
      description:
        'Menghapus transaksi',
    },
    {
      key: 'canManage',
      label: 'Kelola',
      description:
        'Mengelola rekening',
    },
  ];


  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-sm
      "
      onClick={onClose}
    >

      <div
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-[1.75rem]
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* Modal Header */}

        <div className="border-b border-slate-100 bg-white p-5 sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg">
                🔐
              </div>

              <div className="min-w-0">

                <p className="text-xs font-medium text-slate-400">
                  Pengaturan Akses
                </p>

                <h2 className="truncate text-base font-bold text-slate-900">
                  {account.name}
                </h2>

              </div>

            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
              "
              aria-label="Tutup"
            >
              ×
            </button>

          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">

            <p className="text-xs leading-5 text-blue-700">
              Atur hak akses setiap anggota
              keluarga untuk rekening ini.
              Perubahan akan langsung
              tersimpan.
            </p>

          </div>

        </div>


        {/* Modal Body */}

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">

          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <AccessSkeleton />
          ) : members.length === 0 ? (
            <EmptyMembers />
          ) : (
            <div className="space-y-3">

              {members.map((member) => {

                const user =
                  member.user;

                const userAccess =
                  access[user.id] || {};

                return (
                  <div
                    key={user.id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-4
                      transition
                      hover:border-slate-300
                      hover:shadow-sm
                    "
                  >

                    {/* Member */}

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                        {(
                          user.name ||
                          '?'
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-slate-800">
                          {user.name}
                        </p>

                        {user.email && (
                          <p className="truncate text-xs text-slate-400">
                            {user.email}
                          </p>
                        )}

                      </div>

                    </div>


                    {/* Permissions */}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">

                      {fields.map(
                        (field) => {

                          const checked =
                            !!userAccess[
                              field.key
                            ];

                          const disabled =
                            saving ===
                            user.id;

                          return (
                            <label
                              key={
                                field.key
                              }
                              className={`
                                cursor-pointer
                                rounded-xl
                                border
                                px-3
                                py-2.5
                                transition
                                ${
                                  checked
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                }
                                ${
                                  disabled
                                    ? 'cursor-not-allowed opacity-50'
                                    : ''
                                }
                              `}
                            >

                              <div className="flex items-center gap-2">

                                <input
                                  type="checkbox"
                                  disabled={
                                    disabled
                                  }
                                  checked={
                                    checked
                                  }
                                  onChange={() =>
                                    toggle(
                                      user.id,
                                      field.key,
                                      checked
                                    )
                                  }
                                  className="
                                    h-4
                                    w-4
                                    rounded
                                    border-slate-300
                                    text-blue-600
                                    focus:ring-blue-500
                                  "
                                />

                                <span
                                  className={`
                                    text-xs
                                    font-semibold
                                    ${
                                      checked
                                        ? 'text-blue-700'
                                        : 'text-slate-600'
                                    }
                                  `}
                                >
                                  {
                                    field.label
                                  }
                                </span>

                              </div>

                            </label>
                          );
                        }
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>


        {/* Modal Footer */}

        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[11px] leading-5 text-slate-400">
              Owner selalu memiliki akses
              penuh ke semua rekening.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl
                bg-slate-900
                px-4
                py-2.5
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-slate-800
              "
            >
              Selesai
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
// =========================================================
// ACCESS SKELETON
// =========================================================

function AccessSkeleton() {
  return (
    <div className="space-y-3">

      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="
            animate-pulse
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
          "
        >

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-full bg-slate-100" />

            <div className="space-y-2">

              <div className="h-3 w-28 rounded bg-slate-100" />

              <div className="h-2.5 w-40 rounded bg-slate-100" />

            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">

            {Array.from({
              length: 5,
            }).map((_, permissionIndex) => (
              <div
                key={permissionIndex}
                className="h-10 rounded-xl bg-slate-100"
              />
            ))}

          </div>

        </div>
      ))}

    </div>
  );
}


// =========================================================
// EMPTY MEMBERS
// =========================================================

function EmptyMembers() {
  return (
    <div
      className="
        flex
        min-h-[260px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-slate-200
        bg-slate-50/50
        px-6
        py-10
        text-center
      "
    >

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        👥
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        Belum ada anggota lain
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Saat ini belum ada anggota keluarga
        aktif selain Owner yang dapat diberikan
        akses ke rekening ini.
      </p>

    </div>
  );
}


// =========================================================
// GLOBAL FORM INPUT STYLE
// =========================================================

/*
  Class ini dipakai oleh input/select/textarea
  pada form tambah rekening.
*/

const formInputStyle = `
  mt-0
  w-full
  rounded-xl
  border
  border-slate-200
  bg-white
  px-4
  py-2.5
  text-sm
  text-slate-800
  outline-none
  transition

  placeholder:text-slate-400

  hover:border-slate-300

  focus:border-blue-500
  focus:ring-4
  focus:ring-blue-50

  disabled:cursor-not-allowed
  disabled:bg-slate-50
  disabled:text-slate-400
`;


// =========================================================
// NOTE
// =========================================================
//
// Kalau project lo sudah punya Tailwind global,
// tambahkan utility berikut ke file CSS global:
//
// .form-input {
//   @apply mt-0 w-full rounded-xl border border-slate-200
//   bg-white px-4 py-2.5 text-sm text-slate-800
//   outline-none transition;
// }
//
// .form-input::placeholder {
//   @apply text-slate-400;
// }
//
// .form-input:hover {
//   @apply border-slate-300;
// }
//
// .form-input:focus {
//   @apply border-blue-500 ring-4 ring-blue-50;
// }


// =========================================================
// IMPORTANT
// =========================================================
//
// Karena Batch 1 menggunakan:
//
// className="form-input"
//
// maka kalau class .form-input belum ada di CSS,
// tambahkan CSS di bawah ini ke:
//
// src/index.css
//
// atau file CSS global yang dipakai project.
//
// =========================================================