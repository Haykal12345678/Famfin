import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';

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
  const [successMessage, setSuccessMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [accessAccount, setAccessAccount] = useState(null);

  /*
   * =========================================================
   * CONFIRM ACTION
   * =========================================================
   *
   * CREATE
   * DEACTIVATE
   * REACTIVATE
   *
   * ConfirmModal menggunakan:
   *
   * variant="default"
   * variant="danger"
   *
   * BUKAN:
   *
   * danger={true}
   * danger={false}
   */
  const [confirmAction, setConfirmAction] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // =========================================================
  // LOAD ACCOUNTS
  // =========================================================

  const load = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const res = await api.get('/accounts');

      setAccounts(res.data || []);
    } catch (err) {
      console.error('Gagal memuat rekening:', err);

      setError(
        err.response?.data?.message ||
          'Gagal memuat rekening.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================================================
  // SUCCESS POPUP
  // =========================================================

  const showSuccess = (message) => {
    setSuccessMessage(message);
  };

  /*
   * SUCCESS POPUP
   *      ↓
   * USER CLICK SELESAI
   *      ↓
   * POPUP CLOSE
   *      ↓
   * REFRESH DATA
   */
  const closeSuccess = () => {
    setSuccessMessage('');
    load(true);
  };

  // =========================================================
  // ERROR
  // =========================================================

  const showError = (message) => {
    setError(
      message ||
        'Terjadi kesalahan. Silakan coba lagi.'
    );
  };

  const closeError = () => {
    setError('');
  };

  // =========================================================
  // CREATE VALIDATION
  // =========================================================

  const submit = (e) => {
    e.preventDefault();

    setError('');

    const accountName = form.name.trim();

    if (!accountName) {
      showError('Nama rekening wajib diisi.');
      return;
    }

    if (!form.type) {
      showError('Jenis rekening wajib dipilih.');
      return;
    }

    const balance = parseNumber(
      form.initialBalance
    );

    if (balance < 0) {
      showError(
        'Saldo awal tidak boleh negatif.'
      );
      return;
    }

    /*
     * JANGAN LANGSUNG POST.
     *
     * Semua proses create harus melewati
     * ConfirmModal.
     */
    setConfirmAction({
      type: 'CREATE',
      account: null,
    });
  };

  // =========================================================
  // CREATE API
  // =========================================================

  const confirmSubmit = async () => {
    /*
     * Simpan action terlebih dahulu,
     * kemudian tutup confirm modal.
     */
    setConfirmAction(null);

    setActionLoading(true);
    setError('');

    try {
      await api.post('/accounts', {
        name: form.name.trim(),

        type: form.type,

        accountNumber:
          form.accountNumber.trim() || null,

        initialBalance: parseNumber(
          form.initialBalance
        ),

        initialBalanceDate:
          new Date().toISOString(),

        description:
          form.description.trim() || null,
      });

      setActionLoading(false);

      setShowForm(false);
      setForm(EMPTY_FORM);

      showSuccess(
        'Rekening berhasil ditambahkan.'
      );
    } catch (err) {
      console.error(
        'Gagal menambahkan rekening:',
        err
      );

      setActionLoading(false);

      showError(
        err.response?.data?.message ||
          'Gagal menambahkan rekening.'
      );
    }
  };

  // =========================================================
  // DEACTIVATE REQUEST
  // =========================================================

  const requestDeactivate = (account) => {
    setError('');

    /*
     * DEACTIVATE = DANGER ACTION
     *
     * ConfirmModal akan menerima:
     *
     * variant="danger"
     */
    setConfirmAction({
      type: 'DEACTIVATE',
      account,
    });
  };

  // =========================================================
  // DEACTIVATE API
  // =========================================================

  const confirmDeactivate = async () => {
    const account =
      confirmAction?.account;

    if (!account) {
      setConfirmAction(null);
      return;
    }

    setConfirmAction(null);

    setActionLoading(true);
    setError('');

    try {
      await api.delete(
        `/accounts/${account.id}`
      );

      setActionLoading(false);

      if (
        accessAccount?.id === account.id
      ) {
        setAccessAccount(null);
      }

      showSuccess(
        `Rekening "${account.name}" berhasil dinonaktifkan.`
      );
    } catch (err) {
      console.error(
        'Gagal menonaktifkan rekening:',
        err
      );

      setActionLoading(false);

      showError(
        err.response?.data?.message ||
          'Gagal menonaktifkan rekening.'
      );
    }
  };

  // =========================================================
  // REACTIVATE REQUEST
  // =========================================================

  const requestReactivate = (account) => {
    setError('');

    setConfirmAction({
      type: 'REACTIVATE',
      account,
    });
  };

  // =========================================================
  // REACTIVATE API
  // =========================================================

  const confirmReactivate = async () => {
    const account =
      confirmAction?.account;

    if (!account) {
      setConfirmAction(null);
      return;
    }

    setConfirmAction(null);

    setActionLoading(true);
    setError('');

    try {
      await api.patch(
        `/accounts/${account.id}`,
        {
          isActive: true,
        }
      );

      setActionLoading(false);

      showSuccess(
        `Rekening "${account.name}" berhasil diaktifkan kembali.`
      );
    } catch (err) {
      console.error(
        'Gagal mengaktifkan rekening:',
        err
      );

      setActionLoading(false);

      showError(
        err.response?.data?.message ||
          'Gagal mengaktifkan kembali rekening.'
      );
    }
  };

  // =========================================================
  // CONFIRM ACTION
  // =========================================================

  const handleConfirmAction = () => {
    /*
     * Guard supaya tidak double submit.
     */
    if (!confirmAction || actionLoading) {
      return;
    }

    switch (confirmAction.type) {
      case 'CREATE':
        return confirmSubmit();

      case 'DEACTIVATE':
        return confirmDeactivate();

      case 'REACTIVATE':
        return confirmReactivate();

      default:
        setConfirmAction(null);
    }
  };

  // =========================================================
  // FILTER
  // =========================================================

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

  // =========================================================
  // SUMMARY
  // =========================================================

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

  // =========================================================
  // CONFIRM CONTENT
  // =========================================================

  const getConfirmContent = () => {
    if (!confirmAction) {
      return {
        title: '',
        message: '',
        confirmText: '',
        cancelText: 'Batal',
        variant: 'default',
      };
    }

    // =======================================================
    // CREATE
    // =======================================================

    if (
      confirmAction.type ===
      'CREATE'
    ) {
      return {
        title: 'Tambah Rekening?',
        message: `Apakah Anda yakin ingin menambahkan rekening "${form.name.trim()}" dengan saldo awal ${formatRupiah(
          parseNumber(
            form.initialBalance
          )
        )}?`,
        confirmText: 'Ya, Tambahkan',
        cancelText: 'Batal',

        /*
         * CREATE BUKAN DANGER
         */
        variant: 'default',
      };
    }

    // =======================================================
    // DEACTIVATE
    // =======================================================

    if (
      confirmAction.type ===
      'DEACTIVATE'
    ) {
      return {
        title: 'Nonaktifkan Rekening?',

        message: `Rekening "${confirmAction.account?.name}" akan dinonaktifkan. Rekening yang nonaktif tidak dapat digunakan untuk transaksi atau pengelolaan akses.`,

        confirmText: 'Ya, Nonaktifkan',
        cancelText: 'Batal',

        /*
         * DEACTIVATE = DANGER
         *
         * ConfirmModal.jsx akan membaca:
         *
         * variant === 'danger'
         *
         * kemudian mengubah warna tombol
         * menjadi mode danger.
         */
        variant: 'danger',
      };
    }

    // =======================================================
    // REACTIVATE
    // =======================================================

    if (
      confirmAction.type ===
      'REACTIVATE'
    ) {
      return {
        title: 'Aktifkan Rekening?',

        message: `Apakah Anda yakin ingin mengaktifkan kembali rekening "${confirmAction.account?.name}"?`,

        confirmText: 'Ya, Aktifkan',
        cancelText: 'Batal',

        /*
         * REACTIVATE BUKAN DANGER
         */
        variant: 'default',
      };
    }

    return {
      title: '',
      message: '',
      confirmText: '',
      cancelText: 'Batal',
      variant: 'default',
    };
  };

  const confirmContent =
    getConfirmContent();

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          ACTION LOADING
      ===================================================== */}

      <LoadingOverlay
        loading={actionLoading}
        title={
          confirmAction?.type ===
          'CREATE'
            ? 'Menambahkan Rekening'
            : confirmAction?.type ===
              'DEACTIVATE'
            ? 'Menonaktifkan Rekening'
            : confirmAction?.type ===
              'REACTIVATE'
            ? 'Mengaktifkan Rekening'
            : 'Memproses Data'
        }
        message="Sedang memproses perubahan rekening. Mohon tunggu sebentar..."
      />

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {successMessage && (
        <SuccessPopup
          title="Berhasil"
          message={successMessage}
          onClose={closeSuccess}
        />
      )}

      {/* =====================================================
          ERROR POPUP
      ===================================================== */}

      {error && (
        <ErrorPopup
          title="Terjadi Kesalahan"
          message={error}
          onClose={closeError}
        />
      )}

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
                disabled={
                  refreshing ||
                  actionLoading
                }
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
                disabled={actionLoading}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
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

            <FormField
              label="Nama Rekening"
              required
              hint="Contoh: BCA Utama"
            >
              <input
                required
                className="form-input"
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

            <FormField
              label="Saldo Awal"
              required
              hint="Masukkan angka tanpa Rp"
            >
              <input
                required
                inputMode="numeric"
                className="form-input"
                placeholder="Masukkan saldo awal"
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
            </FormField>

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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">

              <button
                type="button"
                disabled={actionLoading}
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
                  disabled:opacity-50
                "
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={actionLoading}
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
                  disabled:opacity-50
                "
              >
                Simpan Rekening
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
                className="form-input"
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
                    onDeactivate={() =>
                      requestDeactivate(
                        account
                      )
                    }
                    onReactivate={() =>
                      requestReactivate(
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
          ACCESS PANEL
      ===================================================== */}

      {accessAccount &&
        accessAccount.isActive !==
          false && (
          <AccountAccessPanel
            account={accessAccount}
            onClose={() =>
              setAccessAccount(null)
            }
          />
        )}

      {/* =====================================================
          CONFIRM MODAL - FULL SCHEMA
      ===================================================== */}

      <ConfirmModal
        open={
          !!confirmAction &&
          !actionLoading
        }

        title={confirmContent.title}

        message={confirmContent.message}

        confirmText={
          confirmContent.confirmText
        }

        cancelText={
          confirmContent.cancelText
        }

        /*
         * =====================================================
         * PENTING
         * =====================================================
         *
         * CREATE:
         * variant="default"
         *
         * DEACTIVATE:
         * variant="danger"
         *
         * REACTIVATE:
         * variant="default"
         *
         * ConfirmModal.jsx membaca prop variant ini
         * untuk menentukan warna / style tombol confirm.
         */
        variant={
          confirmContent.variant
        }

        onConfirm={
          handleConfirmAction
        }

        onCancel={() => {
          if (!actionLoading) {
            setConfirmAction(null);
          }
        }}

        loading={actionLoading}
      />

    </div>
  );
}

// =========================================================
// SUCCESS POPUP
// =========================================================

function SuccessPopup({
  title,
  message,
  onClose,
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const showTimer = requestAnimationFrame(() => {
      setVisible(true);
    });

    const startTime = performance.now();
    const duration = 2200;

    let animationFrame;

    const animateProgress = (currentTime) => {
      const elapsed =
        currentTime - startTime;

      const percentage = Math.min(
        elapsed / duration,
        1
      );

      setProgress(percentage * 100);

      if (percentage < 1) {
        animationFrame =
          requestAnimationFrame(
            animateProgress
          );
      }
    };

    animationFrame =
      requestAnimationFrame(
        animateProgress
      );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      cancelAnimationFrame(
        showTimer
      );
    };
  }, []);

  return (
    <div
      className={`
        fixed
        inset-0
        z-[10000]
        flex
        items-center
        justify-center
        bg-slate-950/30
        px-4
        backdrop-blur-[3px]
        transition-all
        duration-300
        ${
          visible
            ? 'opacity-100'
            : 'opacity-0'
        }
      `}
    >
      <div
        className={`
          w-full
          max-w-md
          overflow-hidden
          rounded-[1.5rem]
          border
          border-slate-200
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
          transition-all
          duration-300
          ${
            visible
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-3 scale-95 opacity-0'
          }
        `}
      >

        <div className="p-6 sm:p-7">

          <div className="flex justify-center">

            <div
              className={`
                relative
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-emerald-50
                text-emerald-600
                transition-all
                duration-500
                ${
                  visible
                    ? 'scale-100 opacity-100'
                    : 'scale-50 opacity-0'
                }
              `}
            >

              <div
                className={`
                  absolute
                  inset-0
                  rounded-full
                  border-2
                  border-emerald-100
                  transition-all
                  duration-700
                  ${
                    visible
                      ? 'scale-100 opacity-100'
                      : 'scale-75 opacity-0'
                  }
                `}
              />

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="relative h-8 w-8"
              >
                <path
                  d="M5 12.5l4 4L19 6.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  className={`
                    transition-all
                    duration-700
                    ${
                      visible
                        ? 'opacity-100'
                        : 'opacity-0'
                    }
                  `}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset:
                      visible ? 0 : 1,
                  }}
                />
              </svg>

            </div>

          </div>

          <div
            className={`
              mt-5
              text-center
              transition-all
              delay-100
              duration-500
              ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0'
              }
            `}
          >

            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {message}
            </p>

          </div>

          <div
            className={`
              mt-5
              flex
              items-center
              justify-center
              gap-2
              transition-all
              delay-200
              duration-500
              ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0'
              }
            `}
          >

            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-3 w-3 text-emerald-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12.5l4 4L19 6.5"
                />
              </svg>

            </span>

            <span className="text-xs font-semibold text-emerald-600">
              Perubahan berhasil disimpan
            </span>

          </div>

          <button
            type="button"
            onClick={onClose}
            className={`
              mt-6
              w-full
              rounded-xl
              bg-emerald-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-emerald-700
              hover:shadow-md
              active:translate-y-0
              ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0'
              }
            `}
          >
            Selesai
          </button>

        </div>

        <div className="h-1.5 bg-emerald-50">

          <div
            className="h-full origin-left bg-emerald-500 transition-none"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>
    </div>
  );
}

// =========================================================
// ERROR POPUP
// =========================================================

function ErrorPopup({
  title,
  message,
  onClose,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => {
      cancelAnimationFrame(timer);
    };
  }, []);

  return (
    <div
      className={`
        fixed
        inset-0
        z-[10001]
        flex
        items-center
        justify-center
        bg-slate-950/30
        px-4
        backdrop-blur-[3px]
        transition-all
        duration-300
        ${
          visible
            ? 'opacity-100'
            : 'opacity-0'
        }
      `}
    >

      <div
        className={`
          w-full
          max-w-md
          overflow-hidden
          rounded-[1.5rem]
          border
          border-red-100
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
          transition-all
          duration-300
          ${
            visible
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-3 scale-95 opacity-0'
          }
        `}
      >

        <div className="p-6 sm:p-7">

          <div className="flex justify-center">

            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">

              <div className="absolute inset-0 animate-pulse rounded-full border-2 border-red-100" />

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                className="relative h-8 w-8"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />

              </svg>

            </div>

          </div>

          <div className="mt-5 text-center">

            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {message}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              mt-6
              w-full
              rounded-xl
              bg-red-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:bg-red-700
              hover:shadow-md
              active:translate-y-0
            "
          >
            Tutup
          </button>

        </div>

        <div className="h-1.5 bg-red-50">

          <div className="h-full w-full bg-red-500" />

        </div>

      </div>

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

  const style =
    styles[type] || styles.balance;

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

      <div
        className="
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          bg-slate-50
          transition
          group-hover:scale-125
        "
      />

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
  onDeactivate,
  onReactivate,
}) {
  const style =
    TYPE_STYLE[account.type] ||
    TYPE_STYLE.OTHER;

  const balance = Number(
    account.currentBalance || 0
  );

  const isNegative = balance < 0;

  const isActive =
    account.isActive !== false;

  return (
    <article
      className={`
        group
        relative
        overflow-hidden
        rounded-[1.5rem]
        border
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        ${
          isActive
            ? 'border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg'
            : 'border-slate-200 bg-slate-50/70'
        }
      `}
    >

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
              ${
                !isActive
                  ? 'grayscale opacity-70'
                  : ''
              }
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

        {!isActive && (
          <span
            className="
              shrink-0
              rounded-full
              border
              border-slate-200
              bg-slate-100
              px-2.5
              py-1
              text-[10px]
              font-semibold
              text-slate-500
            "
          >
            Nonaktif
          </span>
        )}

      </div>

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
            ${
              !isActive
                ? 'opacity-50'
                : ''
            }
          `}
        >
          {formatRupiah(balance)}
        </p>

      </div>

      <div className="relative my-5 border-t border-slate-100" />

      <div className="relative flex items-center justify-between gap-3">

        <div className="min-w-0">

          {account.description ? (
            <p className="truncate text-xs text-slate-400">
              {account.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {isActive
                ? 'Rekening aktif'
                : 'Rekening nonaktif'}
            </p>
          )}

        </div>

        <div className="flex shrink-0 items-center gap-2">

          {isActive ? (
            <>

              <button
                type="button"
                onClick={onAccess}
                className="
                  inline-flex
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

              <button
                type="button"
                onClick={onDeactivate}
                className="
                  rounded-xl
                  border
                  border-red-100
                  bg-red-50
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-red-600
                  transition
                  hover:border-red-200
                  hover:bg-red-100
                "
              >
                Nonaktifkan
              </button>

            </>
          ) : (

            <button
              type="button"
              onClick={onReactivate}
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                border
                border-emerald-100
                bg-emerald-50
                px-3
                py-2
                text-xs
                font-semibold
                text-emerald-600
                transition
                hover:border-emerald-200
                hover:bg-emerald-100
              "
            >
              Aktifkan Kembali
            </button>

          )}

        </div>

      </div>

    </article>
  );
}

// =========================================================
// ACCOUNT ACCESS PANEL
// =========================================================

function AccountAccessPanel({
  account,
  onClose,
}) {
  const [members, setMembers] = useState([]);
  const [access, setAccess] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  // =========================================================
  // LOAD ACCESS
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadAccess = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(
          `/accounts/${account.id}/access`
        );

        if (!mounted) return;

        const data = Array.isArray(response.data)
          ? response.data
          : [];

        const availableMembers = data.filter(
          (item) => !item.isOwner
        );

        setMembers(availableMembers);

        const accessMap = {};

        data.forEach((item) => {
          accessMap[item.userId] = {
            id: item.id || null,
            accountId: item.accountId,
            userId: item.userId,

            user: item.user,

            role: item.role,

            canView:
              item.canView === true,

            canCreateTx:
              item.canCreateTx === true,

            canEditTx:
              item.canEditTx === true,

            canDeleteTx:
              item.canDeleteTx === true,

            canManage:
              item.canManage === true,

            isOwner:
              item.isOwner === true,

            isCurrentUser:
              item.isCurrentUser === true,
          };
        });

        setAccess(accessMap);
      } catch (err) {
        console.error(
          'Gagal memuat akses rekening:',
          err
        );

        if (!mounted) return;

        setError(
          err.response?.data?.message ||
            'Gagal memuat data akses rekening.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAccess();

    return () => {
      mounted = false;
    };
  }, [account.id]);

  // =========================================================
  // UPDATE PERMISSION
  // =========================================================

  const togglePermission = async (
    userId,
    field
  ) => {
    if (saving === userId) return;

    const current =
      access[userId] || {
        userId,
        canView: false,
        canCreateTx: false,
        canEditTx: false,
        canDeleteTx: false,
        canManage: false,
      };

    const nextValue = !current[field];

    const updated = {
      canView:
        field === 'canView'
          ? nextValue
          : current.canView === true,

      canCreateTx:
        field === 'canCreateTx'
          ? nextValue
          : current.canCreateTx === true,

      canEditTx:
        field === 'canEditTx'
          ? nextValue
          : current.canEditTx === true,

      canDeleteTx:
        field === 'canDeleteTx'
          ? nextValue
          : current.canDeleteTx === true,

      canManage:
        field === 'canManage'
          ? nextValue
          : current.canManage === true,
    };

    if (!updated.canView) {
      updated.canCreateTx = false;
      updated.canEditTx = false;
      updated.canDeleteTx = false;
      updated.canManage = false;
    }

    setSaving(userId);
    setError('');

    try {
      const response = await api.put(
        `/accounts/${account.id}/access/${userId}`,
        updated
      );

      const saved = response.data;

      setAccess((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          ...saved,

          canView:
            saved.canView === true,

          canCreateTx:
            saved.canCreateTx === true,

          canEditTx:
            saved.canEditTx === true,

          canDeleteTx:
            saved.canDeleteTx === true,

          canManage:
            saved.canManage === true,
        },
      }));

      setMembers((prev) =>
        prev.map((member) => {
          if (member.userId !== userId) {
            return member;
          }

          return {
            ...member,
            ...saved,
          };
        })
      );
    } catch (err) {
      console.error(
        'Gagal memperbarui akses:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Gagal memperbarui akses rekening.'
      );
    } finally {
      setSaving(null);
    }
  };

  // =========================================================
  // PERMISSION CONFIG
  // =========================================================

  const permissions = [
    {
      key: 'canView',
      label: 'Lihat',
      description:
        'Melihat saldo & transaksi',
      icon: '◉',
      primary: true,
    },

    {
      key: 'canCreateTx',
      label: 'Buat',
      description:
        'Membuat transaksi',
      icon: '+',
    },

    {
      key: 'canEditTx',
      label: 'Edit',
      description:
        'Mengubah transaksi',
      icon: '✎',
    },

    {
      key: 'canDeleteTx',
      label: 'Hapus',
      description:
        'Menghapus transaksi',
      icon: '×',
    },

    {
      key: 'canManage',
      label: 'Kelola',
      description:
        'Mengatur akses rekening',
      icon: '⚙',
    },
  ];

  // =========================================================
  // ROLE STYLE
  // =========================================================

  const getRoleStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Admin',
          className:
            'bg-violet-50 text-violet-700 border-violet-100',
        };

      case 'MEMBER':
        return {
          label: 'Member',
          className:
            'bg-blue-50 text-blue-700 border-blue-100',
        };

      case 'VIEWER':
        return {
          label: 'Viewer',
          className:
            'bg-slate-100 text-slate-600 border-slate-200',
        };

      default:
        return {
          label: role || 'Member',
          className:
            'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (saving) return;

    onClose();
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[999]
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-3
        backdrop-blur-sm
        sm:p-5
      "
      onClick={handleClose}
    >

      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
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

        {/* HEADER */}

        <div className="shrink-0 border-b border-slate-100 bg-white">

          <div className="p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="flex min-w-0 items-center gap-3">

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-blue-50
                    text-xl
                  "
                >
                  🔐
                </div>

                <div className="min-w-0">

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Kelola Akses Rekening
                  </p>

                  <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900">
                    {account.name}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Atur siapa saja yang dapat menggunakan rekening ini.
                  </p>

                </div>

              </div>

              <button
                type="button"
                disabled={!!saving}
                onClick={handleClose}
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-xl
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                ×
              </button>

            </div>

            <div
              className="
                mt-5
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-blue-100
                bg-blue-50/70
                px-4
                py-3.5
              "
            >

              <div className="mt-0.5 shrink-0 text-sm">
                💡
              </div>

              <div>

                <p className="text-xs font-semibold text-blue-800">
                  Pengaturan akses langsung tersimpan
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-blue-600">
                  Aktifkan <b>Lihat</b> terlebih dahulu sebelum memberikan
                  akses Buat, Edit, Hapus, atau Kelola.
                </p>

              </div>

            </div>

          </div>

          {!loading &&
            members.length > 0 && (
              <div
                className="
                  hidden
                  border-t
                  border-slate-100
                  bg-slate-50/70
                  px-6
                  py-2.5
                  sm:grid
                  sm:grid-cols-[minmax(220px,1fr)_repeat(5,80px)]
                  sm:items-center
                  sm:gap-2
                "
              >

                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Anggota
                </div>

                {permissions.map(
                  (permission) => (
                    <div
                      key={
                        permission.key
                      }
                      className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {permission.label}
                    </div>
                  )
                )}

              </div>
            )}

        </div>

        {/* BODY */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">

          {error && (
            <div
              className="
                mb-4
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-red-100
                bg-red-50
                px-4
                py-3
              "
            >

              <div className="mt-0.5 shrink-0">
                ⚠️
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-semibold text-red-700">
                  Gagal memperbarui akses
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-red-600">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setError('')
                }
                className="
                  shrink-0
                  text-sm
                  font-bold
                  text-red-400
                  hover:text-red-600
                "
              >
                ×
              </button>

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
                  member.user || {};

                const userAccess =
                  access[user.id] || {
                    canView: false,
                    canCreateTx: false,
                    canEditTx: false,
                    canDeleteTx: false,
                    canManage: false,
                  };

                const isSaving =
                  saving === user.id;

                const roleStyle =
                  getRoleStyle(
                    member.role
                  );

                return (
                  <div
                    key={user.id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-4
                      shadow-sm
                      transition
                      hover:border-slate-300
                      hover:shadow-md
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div
                          className="
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-gradient-to-br
                            from-blue-50
                            to-blue-100
                            text-sm
                            font-bold
                            text-blue-600
                            ring-1
                            ring-blue-100
                          "
                        >
                          {(
                            user.name ||
                            user.email ||
                            '?'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="truncate text-sm font-bold text-slate-800">
                              {user.name ||
                                'Tanpa Nama'}
                            </p>

                            <span
                              className={`
                                inline-flex
                                shrink-0
                                items-center
                                rounded-full
                                border
                                px-2
                                py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-wide
                                ${roleStyle.className}
                              `}
                            >
                              {roleStyle.label}
                            </span>

                          </div>

                          {user.email && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {user.email}
                            </p>
                          )}

                        </div>

                      </div>

                      {isSaving && (
                        <div
                          className="
                            flex
                            shrink-0
                            items-center
                            gap-1.5
                            rounded-full
                            bg-blue-50
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            text-blue-600
                          "
                        >

                          <span
                            className="
                              h-2.5
                              w-2.5
                              animate-spin
                              rounded-full
                              border-2
                              border-blue-200
                              border-t-blue-600
                            "
                          />

                          Menyimpan

                        </div>
                      )}

                    </div>

                    <div
                      className="
                        mt-4
                        grid
                        grid-cols-2
                        gap-2
                        sm:grid-cols-5
                      "
                    >

                      {permissions.map(
                        (permission) => {

                          const checked =
                            userAccess[
                              permission.key
                            ] === true;

                          const disabledByView =
                            permission.key !==
                              'canView' &&
                            !userAccess.canView;

                          const disabled =
                            isSaving ||
                            disabledByView;

                          return (
                            <PermissionToggle
                              key={
                                permission.key
                              }
                              permission={
                                permission
                              }
                              checked={
                                checked
                              }
                              disabled={
                                disabled
                              }
                              disabledByView={
                                disabledByView
                              }
                              onChange={() =>
                                togglePermission(
                                  user.id,
                                  permission.key
                                )
                              }
                            />
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

        {/* FOOTER */}

        <div
          className="
            shrink-0
            border-t
            border-slate-100
            bg-white
            px-5
            py-4
            sm:px-6
          "
        >

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div className="flex items-center gap-2">

              <div
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  bg-slate-100
                  text-xs
                "
              >
                🔒
              </div>

              <p className="text-[11px] leading-5 text-slate-400">
                Owner memiliki akses penuh dan
                tidak dapat diubah dari menu ini.
              </p>

            </div>

            <button
              type="button"
              disabled={!!saving}
              onClick={handleClose}
              className="
                rounded-xl
                bg-slate-900
                px-5
                py-2.5
                text-xs
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-slate-800
                disabled:cursor-not-allowed
                disabled:opacity-50
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
// PERMISSION TOGGLE
// =========================================================

function PermissionToggle({
  permission,
  checked,
  disabled,
  disabledByView,
  onChange,
}) {
  return (
    <label
      title={
        disabledByView
          ? 'Aktifkan Lihat terlebih dahulu.'
          : permission.description
      }
      className={`
        group
        relative
        rounded-xl
        border
        px-3
        py-3
        transition-all
        ${
          disabled
            ? 'cursor-not-allowed opacity-45'
            : 'cursor-pointer'
        }
        ${
          checked
            ? 'border-blue-200 bg-blue-50'
            : 'border-slate-200 bg-slate-50/60'
        }
        ${
          !disabled
            ? 'hover:border-blue-200 hover:bg-blue-50/60'
            : ''
        }
      `}
    >

      <div className="flex items-center gap-2.5">

        <div className="relative flex shrink-0">

          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="
              h-4
              w-4
              cursor-pointer
              rounded
              border-slate-300
              text-blue-600
              focus:ring-2
              focus:ring-blue-500/20
              disabled:cursor-not-allowed
            "
          />

        </div>

        <div className="min-w-0">

          <div
            className={`
              flex
              items-center
              gap-1.5
              text-xs
              font-bold
              ${
                checked
                  ? 'text-blue-700'
                  : 'text-slate-600'
              }
            `}
          >

            <span className="text-[11px]">
              {permission.icon}
            </span>

            <span>
              {permission.label}
            </span>

          </div>

          <p
            className="
              mt-0.5
              hidden
              truncate
              text-[9px]
              leading-4
              text-slate-400
              sm:block
            "
          >
            {permission.description}
          </p>

        </div>

      </div>

      {checked && (
        <div
          className="
            absolute
            right-2
            top-2
            h-1.5
            w-1.5
            rounded-full
            bg-blue-500
          "
        />
      )}

    </label>
  );
}

// =========================================================
// ACCESS SKELETON
// =========================================================

function AccessSkeleton() {
  return (
    <div className="space-y-3">

      {Array.from({ length: 3 }).map(
        (_, index) => (
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

              <div className="h-11 w-11 rounded-full bg-slate-100" />

              <div className="flex-1 space-y-2">

                <div className="h-3 w-32 rounded bg-slate-100" />

                <div className="h-2.5 w-48 rounded bg-slate-100" />

              </div>

            </div>

            <div
              className="
                mt-4
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-5
              "
            >

              {Array.from({
                length: 5,
              }).map(
                (_, permissionIndex) => (
                  <div
                    key={permissionIndex}
                    className="
                      h-12
                      rounded-xl
                      bg-slate-100
                    "
                  />
                )
              )}

            </div>

          </div>
        )
      )}

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
        min-h-[300px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-slate-200
        bg-white
        px-6
        py-12
        text-center
      "
    >

      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-3xl
          bg-blue-50
          text-2xl
          shadow-sm
        "
      >
        👥
      </div>

      <h3 className="mt-5 text-sm font-bold text-slate-800">
        Belum ada anggota lain
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Belum ada anggota keluarga aktif selain
        Owner yang dapat diberikan akses ke
        rekening ini.
      </p>

    </div>
  );
}

// =========================================================
// EMPTY ACCOUNTS
// =========================================================

function EmptyAccounts({
  hasFilter,
  onReset,
}) {
  return (
    <div
      className="
        flex
        min-h-[300px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-slate-200
        bg-slate-50/50
        px-6
        py-12
        text-center
      "
    >

      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-3xl
          bg-blue-50
          text-2xl
          shadow-sm
        "
      >
        💳
      </div>

      <h3 className="mt-5 text-sm font-bold text-slate-800">
        {hasFilter
          ? 'Rekening tidak ditemukan'
          : 'Belum ada rekening'}
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilter
          ? 'Tidak ada rekening yang sesuai dengan pencarian atau filter.'
          : 'Tambahkan rekening pertama untuk mulai mengelola keuangan keluarga.'}
      </p>

      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="
            mt-5
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-2
            text-xs
            font-semibold
            text-slate-600
            shadow-sm
            transition
            hover:bg-slate-50
          "
        >
          Reset Filter
        </button>
      )}

    </div>
  );
}

// =========================================================
// ACCOUNT SKELETON
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

          <div className="flex items-center justify-between gap-3">

            <div className="h-3 w-24 rounded bg-slate-100" />

            <div className="flex gap-2">

              <div className="h-8 w-24 rounded-xl bg-slate-100" />

              <div className="h-8 w-20 rounded-xl bg-slate-100" />

            </div>

          </div>

        </div>
      ))}

    </div>
  );
}