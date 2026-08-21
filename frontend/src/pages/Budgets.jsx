import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';
import LoadingOverlay from '../components/LoadingOverlay';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_STYLE = {
  AMAN: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PERHATIAN: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  HAMPIR_HABIS: 'bg-orange-50 text-orange-700 border-orange-100',
  MELEBIHI_BUDGET: 'bg-red-50 text-red-700 border-red-100',
};

const STATUS_LABEL = {
  AMAN: 'Aman',
  PERHATIAN: 'Perhatian',
  HAMPIR_HABIS: 'Hampir Habis',
  MELEBIHI_BUDGET: 'Melebihi Budget',
};

const EMPTY_FORM = {
  categoryId: '',
  amount: '',
};

function getDefaultPeriod() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

function formatAmountInput(value) {
  const numeric = String(value || '').replace(/\D/g, '');

  if (!numeric) return '';

  return new Intl.NumberFormat('id-ID').format(
    Number(numeric)
  );
}

function parseAmount(value) {
  return Number(
    String(value || '').replace(/\D/g, '')
  );
}

function getProgressColor(percentage) {
  if (percentage > 100) return 'bg-red-500';
  if (percentage >= 90) return 'bg-orange-500';
  if (percentage >= 70) return 'bg-yellow-500';

  return 'bg-emerald-500';
}

function getProgressText(percentage) {
  if (percentage > 100) return 'text-red-600';
  if (percentage >= 90) return 'text-orange-600';
  if (percentage >= 70) return 'text-yellow-600';

  return 'text-emerald-600';
}

export default function Budgets() {
  const [period, setPeriod] = useState(
    getDefaultPeriod()
  );

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingBudget, setEditingBudget] = useState(null);

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  /*
   * =========================================================
   * PAGE LOADING
   * =========================================================
   */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * =========================================================
   * PROCESSING
   *
   * Semua CREATE / UPDATE / DELETE menggunakan
   * processing generic:
   *
   * "Memproses Data"
   *
   * Bukan:
   * - Membuat Budget
   * - Memperbarui Budget
   * - Menghapus Budget
   * =========================================================
   */

  const [processing, setProcessing] = useState(false);

  const processingTitle = 'Memproses Data';

  const processingMessage =
    'Sedang memproses perubahan data. Mohon tunggu sebentar...';

  const [currentAction, setCurrentAction] =
    useState('');

  /*
   * =========================================================
   * CONFIRM MODAL
   * =========================================================
   */

  const [showConfirm, setShowConfirm] = useState(false);

  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    type: '',
    budget: null,
  });

  /*
   * =========================================================
   * SUCCESS POPUP
   * =========================================================
   */

  const [showSuccess, setShowSuccess] = useState(false);

  const [successData, setSuccessData] = useState({
    title: '',
    message: '',
    shouldRefresh: false,
  });

  /*
   * =========================================================
   * ERROR POPUP
   * =========================================================
   */

  const [showErrorPopup, setShowErrorPopup] =
    useState(false);

  const [errorData, setErrorData] = useState({
    title: 'Gagal',
    message: '',
  });

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [budgetsRes, categoriesRes] =
        await Promise.all([
          api.get('/budgets', {
            params: {
              period,
            },
          }),

          api.get('/categories', {
            params: {
              type: 'EXPENSE',
            },
          }),
        ]);

      const loadedBudgets =
        Array.isArray(budgetsRes.data)
          ? budgetsRes.data
          : [];

      const loadedCategories =
        Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : [];

      setBudgets(loadedBudgets);
      setCategories(loadedCategories);
      setError('');
    } catch (err) {
      console.error(
        'Gagal memuat budget:',
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal memuat data budget.';

      setError(message);

      if (!isRefresh) {
        setErrorData({
          title: 'Gagal Memuat Budget',
          message,
        });

        setShowErrorPopup(true);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load(false);
  }, [period]);

  /*
   * =========================================================
   * PROCESSING
   * =========================================================
   */

  const startProcessing = (action) => {
    setCurrentAction(action);
    setProcessing(true);
  };

  const resetProcessing = () => {
    setProcessing(false);
    setCurrentAction('');
  };

  /*
   * =========================================================
   * SUCCESS
   * =========================================================
   */

  const showActionSuccess = (
    title,
    message,
    shouldRefresh = true
  ) => {
    setSuccessData({
      title,
      message,
      shouldRefresh,
    });

    setShowSuccess(true);
  };

  /*
   * =========================================================
   * CLOSE SUCCESS
   *
   * Popup ditutup terlebih dahulu.
   * Setelah itu baru refresh background.
   * =========================================================
   */

  const closeSuccess = () => {
    setShowSuccess(false);

    if (successData.shouldRefresh) {
      load(true);
    }
  };

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  const showActionError = (
    title,
    message
  ) => {
    setErrorData({
      title: title || 'Gagal',
      message:
        message ||
        'Terjadi kesalahan saat memproses data.',
    });

    setShowErrorPopup(true);
  };

  /*
   * =========================================================
   * SUBMIT FORM
   *
   * Validation
   * ↓
   * Confirm Modal
   * =========================================================
   */

  const submit = (e) => {
    e.preventDefault();

    if (processing) {
      return;
    }

    setError('');

    const amount = parseAmount(form.amount);

    /*
     * VALIDASI CATEGORY
     */

    if (!form.categoryId) {
      const message =
        'Silakan pilih kategori terlebih dahulu.';

      setError(message);

      setErrorData({
        title: 'Data Belum Lengkap',
        message,
      });

      setShowErrorPopup(true);

      return;
    }

    /*
     * VALIDASI NOMINAL
     */

    if (!amount || amount <= 0) {
      const message =
        'Nominal budget harus lebih dari 0.';

      setError(message);

      setErrorData({
        title: 'Nominal Tidak Valid',
        message,
      });

      setShowErrorPopup(true);

      return;
    }

    /*
     * =======================================================
     * UPDATE
     * =======================================================
     */

    if (editingBudget) {
      setConfirmData({
        title: 'Perbarui Budget?',
        message: `Apakah kamu yakin ingin memperbarui budget "${editingBudget.category?.name || 'kategori ini'}" menjadi ${formatRupiah(
          amount
        )}?`,
        type: 'UPDATE',
        budget: {
          ...editingBudget,
          newAmount: amount,
        },
      });

      setShowConfirm(true);

      return;
    }

    /*
     * =======================================================
     * CREATE
     * =======================================================
     */

    const category = categories.find(
      (item) =>
        String(item.id) ===
        String(form.categoryId)
    );

    setConfirmData({
      title: 'Buat Budget Baru?',
      message: `Apakah kamu yakin ingin membuat budget untuk kategori "${category?.name || 'kategori ini'}" sebesar ${formatRupiah(
        amount
      )}?`,
      type: 'CREATE',
      budget: {
        categoryId: form.categoryId,
        categoryName:
          category?.name || 'Kategori',
        amount,
      },
    });

    setShowConfirm(true);
  };

  /*
   * =========================================================
   * CONFIRM SUBMIT
   *
   * Confirm Modal
   * ↓
   * LoadingOverlay
   * ↓
   * API
   * ↓
   * Success / Error
   * =========================================================
   */

  const confirmSubmit = async () => {
    if (
      !confirmData?.type ||
      processing
    ) {
      return;
    }

    const type = confirmData.type;
    const budget = confirmData.budget;

    /*
     * Tutup Confirm Modal
     */

    setShowConfirm(false);

    /*
     * START PROCESSING
     *
     * Selalu generic:
     * "Memproses Data"
     */

    startProcessing(type);

    try {
      /*
       * =====================================================
       * CREATE
       * =====================================================
       */

      if (type === 'CREATE') {
        await api.post('/budgets', {
          categoryId: budget.categoryId,
          period,
          amount: budget.amount,
        });

        setForm(EMPTY_FORM);
        setEditingBudget(null);

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Budget "${budget.categoryName}" berhasil dibuat sebesar ${formatRupiah(
            budget.amount
          )}.`,
          true
        );

        return;
      }

      /*
       * =====================================================
       * UPDATE
       * =====================================================
       */

      if (type === 'UPDATE') {
        await api.patch(
          `/budgets/${budget.id}`,
          {
            amount: budget.newAmount,
          }
        );

        setForm(EMPTY_FORM);
        setEditingBudget(null);

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Budget "${budget.category?.name || 'kategori ini'}" berhasil diperbarui menjadi ${formatRupiah(
            budget.newAmount
          )}.`,
          true
        );

        return;
      }

      /*
       * =====================================================
       * DELETE
       * =====================================================
       */

      if (type === 'DELETE') {
        await api.delete(
          `/budgets/${budget.id}`
        );

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Budget "${budget.category?.name || 'kategori ini'}" berhasil dihapus.`,
          true
        );

        return;
      }

      resetProcessing();
    } catch (err) {
      console.error(
        'Budget action error:',
        err
      );

      resetProcessing();

      const status =
        err?.response?.status;

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal memproses budget.';

      let title =
        'Gagal Memproses Budget';

      if (status === 400) {
        title = 'Data Tidak Valid';
      } else if (status === 409) {
        title = 'Data Duplikat';
      } else if (status === 401) {
        title = 'Tidak Terautentikasi';
      } else if (status === 403) {
        title = 'Akses Ditolak';
      } else if (status === 404) {
        title = 'Data Tidak Ditemukan';
      } else if (status === 422) {
        title = 'Validasi Gagal';
      } else if (status >= 500) {
        title = 'Server Bermasalah';
      }

      showActionError(
        title,
        message
      );
    }
  };

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  const editBudget = (budget) => {
    if (processing) {
      return;
    }

    setEditingBudget(budget);

    setForm({
      categoryId:
        budget.categoryId,
      amount:
        formatAmountInput(
          budget.amount
        ),
    });

    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /*
   * =========================================================
   * CANCEL EDIT
   * =========================================================
   */

  const cancelEdit = () => {
    if (processing) {
      return;
    }

    setEditingBudget(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  const removeBudget = (budget) => {
    if (processing) {
      return;
    }

    setConfirmData({
      title: 'Hapus Budget?',
      message: `Apakah kamu yakin ingin menghapus budget "${budget.category?.name || 'kategori ini'}"? Data budget pada periode ${period} akan dihapus secara permanen.`,
      type: 'DELETE',
      budget,
    });

    setShowConfirm(true);
  };

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredBudgets = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return budgets;
    }

    return budgets.filter(
      (budget) =>
        budget.category?.name
          ?.toLowerCase()
          .includes(keyword)
    );
  }, [budgets, search]);

  /*
   * =========================================================
   * SUMMARY
   * =========================================================
   */

  const summary = useMemo(() => {
    const totalBudget =
      budgets.reduce(
        (sum, budget) =>
          sum +
          Number(
            budget.amount || 0
          ),
        0
      );

    const totalUsed =
      budgets.reduce(
        (sum, budget) =>
          sum +
          Number(
            budget.used || 0
          ),
        0
      );

    const totalRemaining =
      budgets.reduce(
        (sum, budget) =>
          sum +
          Number(
            budget.remaining || 0
          ),
        0
      );

    const exceeded =
      budgets.filter(
        (budget) =>
          budget.status ===
          'MELEBIHI_BUDGET'
      ).length;

    return {
      totalBudget,
      totalUsed,
      totalRemaining,
      exceeded,
    };
  }, [budgets]);

  return (
    <div className="relative space-y-6">

      {/* =====================================================
          PROCESSING OVERLAY
      ===================================================== */}

      <LoadingOverlay
        loading={processing}
        title={processingTitle}
        message={processingMessage}
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6 lg:p-7">

          <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-50/70 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Budget
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Atur batas pengeluaran setiap
                kategori dan pantau penggunaannya
                sepanjang periode.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

              <label className="text-xs font-semibold text-slate-500 sm:hidden">
                Periode Budget
              </label>

              <input
                type="month"
                value={period}
                onChange={(e) =>
                  setPeriod(
                    e.target.value
                  )
                }
                disabled={processing}
                className="
                  h-[44px]
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-slate-700
                  outline-none
                  transition
                  hover:border-slate-300
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
              />

              <button
                type="button"
                onClick={() =>
                  load(true)
                }
                disabled={
                  refreshing ||
                  processing
                }
                className="
                  inline-flex
                  h-[44px]
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
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

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          label="Total Budget"
          value={formatRupiah(
            summary.totalBudget
          )}
          description="Batas pengeluaran periode ini"
          icon="Rp"
          iconBg="bg-blue-50"
          iconText="text-blue-600"
        />

        <SummaryCard
          label="Sudah Terpakai"
          value={formatRupiah(
            summary.totalUsed
          )}
          description="Total pengeluaran dari budget"
          icon="↗"
          iconBg="bg-orange-50"
          iconText="text-orange-600"
        />

        <SummaryCard
          label="Sisa Budget"
          value={formatRupiah(
            summary.totalRemaining
          )}
          description="Budget yang masih tersedia"
          icon="✓"
          iconBg="bg-emerald-50"
          iconText="text-emerald-600"
        />

        <SummaryCard
          label="Melewati Budget"
          value={summary.exceeded}
          description="Kategori yang melebihi batas"
          icon="!"
          iconBg="bg-red-50"
          iconText="text-red-600"
        />

      </section>

      {/* =====================================================
          FORM
      ===================================================== */}

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

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-600">
              {editingBudget
                ? '✎'
                : '+'}
            </div>

            <div>

              <h2 className="font-semibold text-slate-900">
                {editingBudget
                  ? 'Edit Budget'
                  : 'Buat Budget Baru'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingBudget
                  ? `Perbarui batas budget untuk ${
                      editingBudget.category
                        ?.name ||
                      'kategori ini'
                    }.`
                  : 'Tentukan batas pengeluaran untuk kategori pada periode yang dipilih.'}
              </p>

            </div>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr_auto] lg:items-end">

          {/* CATEGORY */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Kategori
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              required
              disabled={
                !!editingBudget ||
                processing
              }
              className="
                h-[44px]
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                text-sm
                text-slate-700
                outline-none
                transition
                hover:border-slate-300
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-50
                disabled:cursor-not-allowed
                disabled:bg-slate-50
                disabled:text-slate-400
              "
              value={form.categoryId}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoryId:
                    e.target.value,
                })
              }
            >

              <option value="">
                Pilih kategori pengeluaran
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}

            </select>

          </div>

          {/* AMOUNT */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Nominal Budget
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <div className="relative">

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>

              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                disabled={processing}
                className="
                  h-[44px]
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  pl-11
                  pr-4
                  text-sm
                  font-semibold
                  text-slate-800
                  outline-none
                  transition
                  placeholder:font-normal
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount:
                      formatAmountInput(
                        e.target.value
                      ),
                  })
                }
              />

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex gap-2 lg:pb-0">

            {editingBudget && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={processing}
                className="
                  h-[44px]
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  text-sm
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={processing}
              className="
                h-[44px]
                whitespace-nowrap
                rounded-xl
                bg-blue-600
                px-5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:bg-blue-700
                hover:shadow-md
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {editingBudget
                ? 'Perbarui Budget'
                : '+ Buat Budget'}
            </button>

          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 lg:col-span-3">
              {error}
            </div>
          )}

        </div>

      </form>

      {/* =====================================================
          BUDGET LIST
      ===================================================== */}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-slate-800">
              Budget Periode {period}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Pantau penggunaan budget setiap kategori.
            </p>

          </div>

          <div className="w-full lg:w-72">

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Cari kategori
            </label>

            <div className="relative">

              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Cari budget..."
                disabled={processing}
                className="
                  h-[42px]
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  pl-10
                  pr-4
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
              />

            </div>

          </div>

        </div>

        <div className="mt-6">

          {loading ? (
            <BudgetSkeleton />
          ) : filteredBudgets.length === 0 ? (
            <EmptyBudgets
              hasSearch={!!search}
              onReset={() =>
                setSearch('')
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

              {filteredBudgets.map(
                (budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={editBudget}
                    onRemove={removeBudget}
                    processing={
                      processing
                    }
                    currentAction={
                      currentAction
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          CONFIRM MODAL
          
          FINAL SCHEMA:
          CREATE  -> variant="primary"
          UPDATE  -> variant="primary"
          DELETE  -> variant="danger"
      ===================================================== */}

      <ConfirmModal
        open={showConfirm}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={
          confirmData.type === 'DELETE'
            ? 'Ya, Hapus'
            : 'Ya, Lanjutkan'
        }
        cancelText="Batal"
        onConfirm={confirmSubmit}
        onCancel={() => {
          if (processing) {
            return;
          }

          setShowConfirm(false);
        }}
        loading={processing}
        variant={
          confirmData.type === 'DELETE'
            ? 'danger'
            : 'primary'
        }
      />

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {showSuccess && (
        <SuccessPopup
          title={successData.title}
          message={successData.message}
          onClose={closeSuccess}
        />
      )}

      {/* =====================================================
          ERROR POPUP
      ===================================================== */}

      {showErrorPopup && (
        <ErrorPopup
          title={errorData.title}
          message={errorData.message}
          onClose={() =>
            setShowErrorPopup(false)
          }
        />
      )}

    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconBg,
  iconText,
}) {
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
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      <div
        className="
          pointer-events-none
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          bg-slate-50
          transition-transform
          duration-300
          group-hover:scale-125
        "
      />

      <div className="relative flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
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
            ${iconBg}
            ${iconText}
          `}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   BUDGET CARD
========================================================= */

function BudgetCard({
  budget,
  onEdit,
  onRemove,
  processing,
  currentAction,
}) {
  const amount = Number(
    budget.amount || 0
  );

  const percentage = Number(
    budget.percentage || 0
  );

  const progressWidth = Math.min(
    Math.max(percentage, 0),
    100
  );

  const status =
    budget.status;

  const statusStyle =
    STATUS_STYLE[status] ||
    STATUS_STYLE.AMAN;

  const statusLabel =
    STATUS_LABEL[status] ||
    status ||
    'Aman';

  const progressColor =
    getProgressColor(
      percentage
    );

  const progressText =
    getProgressText(
      percentage
    );

  const isThisDelete =
    processing &&
    currentAction ===
      'DELETE';

  const isThisEdit =
    processing &&
    currentAction ===
      'UPDATE';

  return (
    <div
      className="
        group
        overflow-hidden
        rounded-[1.5rem]
        border
        border-slate-200
        bg-white
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      {/* HEADER */}

      <div className="border-b border-slate-100 p-5">

        <div className="flex items-start justify-between gap-3">

          <div className="flex min-w-0 items-center gap-3">

            <div
              className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${
                  percentage > 100
                    ? 'bg-red-50 text-red-600'
                    : percentage >= 90
                    ? 'bg-orange-50 text-orange-600'
                    : percentage >= 70
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'bg-emerald-50 text-emerald-600'
                }
                text-sm
                font-bold
              `}
            >
              Rp
            </div>

            <div className="min-w-0">

              <h3 className="truncate text-sm font-bold text-slate-800">
                {budget.category?.name ||
                  'Tanpa Kategori'}
              </h3>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Budget pengeluaran
              </p>

            </div>

          </div>

          <span
            className={`
              shrink-0
              rounded-full
              border
              px-2.5
              py-1
              text-[10px]
              font-semibold
              ${statusStyle}
            `}
          >
            {statusLabel}
          </span>

        </div>

      </div>

      {/* PROGRESS */}

      <div className="p-5">

        <div className="mb-2 flex items-end justify-between gap-3">

          <div>

            <p className="text-[11px] font-medium text-slate-400">
              Penggunaan
            </p>

            <p
              className={`
                mt-0.5
                text-xl
                font-bold
                ${progressText}
              `}
            >
              {percentage}%
            </p>

          </div>

          <p className="text-right text-[11px] text-slate-400">
            dari budget
          </p>

        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

          <div
            className={`
              h-full
              rounded-full
              transition-all
              duration-500
              ${progressColor}
            `}
            style={{
              width: `${progressWidth}%`,
            }}
          />

        </div>

        {/* AMOUNT */}

        <div className="mt-5 space-y-3">

          <AmountRow
            label="Budget"
            value={formatRupiah(amount)}
          />

          <AmountRow
            label="Terpakai"
            value={formatRupiah(
              budget.used
            )}
            valueClass={
              percentage > 100
                ? 'text-red-600'
                : 'text-slate-700'
            }
          />

          <div className="border-t border-dashed border-slate-100 pt-3">

            <AmountRow
              label="Sisa"
              value={formatRupiah(
                budget.remaining
              )}
              valueClass={
                Number(
                  budget.remaining || 0
                ) < 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }
              strong
            />

          </div>

        </div>

        {/* ACTIONS */}

        <div className="mt-5 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              onEdit(budget)
            }
            disabled={processing}
            className="
              flex-1
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              px-4
              py-2.5
              text-xs
              font-semibold
              text-blue-700
              transition
              hover:bg-blue-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isThisEdit
              ? 'Memproses...'
              : 'Edit Budget'}
          </button>

          <button
            type="button"
            onClick={() =>
              onRemove(budget)
            }
            disabled={processing}
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-4
              py-2.5
              text-xs
              font-semibold
              text-red-600
              transition
              hover:bg-red-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isThisDelete
              ? 'Menghapus...'
              : 'Hapus'}
          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   AMOUNT ROW
========================================================= */

function AmountRow({
  label,
  value,
  valueClass = 'text-slate-700',
  strong = false,
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <span className="text-xs text-slate-400">
        {label}
      </span>

      <span
        className={`
          text-xs
          ${
            strong
              ? 'font-bold'
              : 'font-semibold'
          }
          ${valueClass}
        `}
      >
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   BUDGET SKELETON
========================================================= */

function BudgetSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="
            overflow-hidden
            rounded-[1.5rem]
            border
            border-slate-200
            bg-white
          "
        >

          <div className="animate-pulse border-b border-slate-100 p-5">

            <div className="flex items-center gap-3">

              <div className="h-10 w-10 rounded-xl bg-slate-100" />

              <div className="flex-1 space-y-2">

                <div className="h-3 w-32 rounded bg-slate-100" />

                <div className="h-2.5 w-24 rounded bg-slate-100" />

              </div>

              <div className="h-6 w-16 rounded-full bg-slate-100" />

            </div>

          </div>

          <div className="animate-pulse space-y-4 p-5">

            <div className="flex justify-between">

              <div className="space-y-2">

                <div className="h-2.5 w-16 rounded bg-slate-100" />

                <div className="h-6 w-20 rounded bg-slate-100" />

              </div>

              <div className="h-3 w-12 rounded bg-slate-100" />

            </div>

            <div className="h-2.5 rounded-full bg-slate-100" />

            <div className="space-y-3">

              <div className="flex justify-between">

                <div className="h-2.5 w-16 rounded bg-slate-100" />

                <div className="h-2.5 w-28 rounded bg-slate-100" />

              </div>

              <div className="flex justify-between">

                <div className="h-2.5 w-16 rounded bg-slate-100" />

                <div className="h-2.5 w-28 rounded bg-slate-100" />

              </div>

              <div className="flex justify-between">

                <div className="h-2.5 w-16 rounded bg-slate-100" />

                <div className="h-2.5 w-28 rounded bg-slate-100" />

              </div>

            </div>

            <div className="flex gap-2">

              <div className="h-9 flex-1 rounded-xl bg-slate-100" />

              <div className="h-9 w-16 rounded-xl bg-slate-100" />

            </div>

          </div>

        </div>
      ))}

    </div>
  );
}

/* =========================================================
   EMPTY BUDGETS
========================================================= */

function EmptyBudgets({
  hasSearch,
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

      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-3xl
          bg-white
          text-xl
          font-bold
          text-blue-500
          shadow-sm
          ring-1
          ring-slate-100
        "
      >
        Rp
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">

        {hasSearch
          ? 'Budget tidak ditemukan'
          : 'Belum ada budget'}

      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">

        {hasSearch
          ? 'Tidak ada budget yang sesuai dengan pencarian kategori yang kamu masukkan.'
          : 'Belum ada budget untuk periode ini. Buat budget pertama untuk mulai mengontrol pengeluaran.'}

      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={onReset}
          className="
            mt-5
            rounded-xl
            bg-blue-600
            px-4
            py-2.5
            text-xs
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-blue-700
            hover:shadow-md
          "
        >
          Reset Pencarian
        </button>
      )}

    </div>
  );
}

/* =========================================================
   SUCCESS POPUP
 *
 * FINAL FAMFIN SUCCESS POPUP SCHEMA
 *
 * - White rounded modal
 * - Green circular check
 * - Animated check
 * - Dynamic title
 * - Dynamic message
 * - Status kecil:
 *     "Perubahan berhasil disimpan"
 * - Full width button:
 *     "Selesai"
 * - Bottom green progress bar
 * - Progress bergerak KIRI -> KANAN
 * - BUKAN countdown shrink
 * - Refresh hanya setelah popup ditutup
 * ========================================================= */

function SuccessPopup({
  title,
  message,
  onClose,
}) {
  return (
    <>
      <style>
        {`
          @keyframes famfinSuccessBackdrop {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes famfinSuccessModal {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.96);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes famfinSuccessIcon {
            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            65% {
              opacity: 1;
              transform: scale(1.08);
            }

            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes famfinSuccessCheck {
            from {
              stroke-dashoffset: 32;
            }

            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes famfinSuccessProgress {
            from {
              transform: scaleX(0);
            }

            to {
              transform: scaleX(1);
            }
          }
        `}
      </style>

      <div
        className="
          fixed
          inset-0
          z-[10000]
          flex
          items-center
          justify-center
          bg-slate-900/30
          px-4
          backdrop-blur-[2px]
        "
        style={{
          animation:
            'famfinSuccessBackdrop 180ms ease-out forwards',
        }}
      >

        <div
          className="
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
          "
          style={{
            animation:
              'famfinSuccessModal 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >

          <div className="px-6 pb-6 pt-7 sm:px-7">

            {/* SUCCESS ICON */}

            <div className="flex justify-center">

              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  ring-8
                  ring-emerald-50/50
                "
                style={{
                  animation:
                    'famfinSuccessIcon 420ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both',
                }}
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  className="h-8 w-8 text-emerald-600"
                >

                  <path
                    d="M5 12.5l4 4L19 6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="32"
                    strokeDashoffset="32"
                    style={{
                      animation:
                        'famfinSuccessCheck 420ms ease-out 220ms forwards',
                    }}
                  />

                </svg>

              </div>

            </div>

            {/* CONTENT */}

            <div className="mt-5 text-center">

              <h3 className="text-base font-bold text-slate-900">
                {title}
              </h3>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {message}
              </p>


              <div className="mt-3 inline-flex items-center gap-1.5">

                <span
                  className="
                    flex
                    h-4
                    w-4
                    items-center
                    justify-center
                    rounded-full
                    bg-emerald-100
                    text-emerald-600
                  "
                >

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="h-2.5 w-2.5"
                  >

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12.5l4 4L19 6.5"
                    />

                  </svg>

                </span>


                <span className="text-[11px] font-medium text-emerald-600">
                  Perubahan berhasil disimpan
                </span>

              </div>

            </div>

            {/* ACTION */}

            <button
              type="button"
              onClick={onClose}
              className="
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
                transition
                hover:bg-emerald-700
                hover:shadow-md
                active:scale-[0.99]
              "
            >
              Selesai
            </button>

          </div>

          {/* LEFT -> RIGHT PROGRESS */}

          <div className="h-1.5 bg-emerald-50">

            <div
              className="
                h-full
                w-full
                origin-left
                bg-emerald-500
              "
              style={{
                animation:
                  'famfinSuccessProgress 3s linear forwards',
              }}
            />

          </div>

        </div>

      </div>
    </>
  );
}

/* =========================================================
   ERROR POPUP
========================================================= */

function ErrorPopup({
  title,
  message,
  onClose,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[10001]
        flex
        items-center
        justify-center
        bg-slate-900/30
        px-4
        backdrop-blur-[2px]
      "
    >

      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
        "
      >

        <div className="p-6">

          <div className="flex justify-center">

            <div
              className="
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-red-50
                text-red-600
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-7 w-7"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />

              </svg>

            </div>

          </div>

          <div className="mt-4 text-center">

            <h3 className="text-base font-bold text-slate-900">
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
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-red-700
              hover:shadow-md
            "
          >
            Mengerti
          </button>

        </div>

        <div className="h-1 bg-red-50">

          <div className="h-full w-full bg-red-500" />

        </div>

      </div>

    </div>
  );
}