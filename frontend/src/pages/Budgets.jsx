import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

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
  const numeric = String(value || '')
    .replace(/\D/g, '');

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
  if (percentage > 100) {
    return 'bg-red-500';
  }

  if (percentage >= 90) {
    return 'bg-orange-500';
  }

  if (percentage >= 70) {
    return 'bg-yellow-500';
  }

  return 'bg-emerald-500';
}

function getProgressText(percentage) {
  if (percentage > 100) {
    return 'text-red-600';
  }

  if (percentage >= 90) {
    return 'text-orange-600';
  }

  if (percentage >= 70) {
    return 'text-yellow-600';
  }

  return 'text-emerald-600';
}

export default function Budgets() {
  const [period, setPeriod] = useState(
    getDefaultPeriod()
  );

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [editingBudget, setEditingBudget] =
    useState(null);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        budgetsRes,
        categoriesRes,
      ] = await Promise.all([
        api.get('/budgets', {
          params: { period },
        }),

        api.get('/categories', {
          params: {
            type: 'EXPENSE',
          },
        }),
      ]);

      setBudgets(
        budgetsRes.data || []
      );

      setCategories(
        categoriesRes.data || []
      );

      setError('');
    } catch (err) {
      console.error(
        'Gagal memuat budget:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Gagal memuat data budget.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const submit = async (e) => {
    e.preventDefault();

    setError('');

    const amount = parseAmount(
      form.amount
    );

    if (!form.categoryId) {
      setError(
        'Silakan pilih kategori terlebih dahulu.'
      );
      return;
    }

    if (!amount || amount <= 0) {
      setError(
        'Nominal budget harus lebih dari 0.'
      );
      return;
    }

    setSaving(true);

    try {
      if (editingBudget) {
        await api.patch(
          `/budgets/${editingBudget.id}`,
          {
            amount,
          }
        );
      } else {
        await api.post('/budgets', {
          categoryId: form.categoryId,
          period,
          amount,
        });
      }

      setForm(EMPTY_FORM);
      setEditingBudget(null);

      await load(true);
    } catch (err) {
      console.error(
        'Gagal menyimpan budget:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Gagal menyimpan budget.'
      );
    } finally {
      setSaving(false);
    }
  };

  const editBudget = (budget) => {
    setEditingBudget(budget);

    setForm({
      categoryId: budget.categoryId,
      amount: formatAmountInput(
        budget.amount
      ),
    });

    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const cancelEdit = () => {
    setEditingBudget(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const removeBudget = async (id) => {
    const confirmed = window.confirm(
      'Hapus budget ini? Data budget akan dihapus dari periode tersebut.'
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/budgets/${id}`
      );

      await load(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menghapus budget.'
      );
    }
  };

  const filteredBudgets = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return budgets;
    }

    return budgets.filter((budget) =>
      budget.category?.name
        ?.toLowerCase()
        .includes(keyword)
    );
  }, [budgets, search]);

  const summary = useMemo(() => {
    const totalBudget = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.amount || 0),
      0
    );

    const totalUsed = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.used || 0),
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

    const exceeded = budgets.filter(
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
    <div className="space-y-6">

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
                "
              />

              <button
                type="button"
                onClick={() =>
                  load(true)
                }
                disabled={refreshing}
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
          description="Kategori yang sudah melebihi batas"
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
                  ? `Perbarui batas budget untuk ${editingBudget.category?.name || 'kategori ini'}.`
                  : 'Tentukan batas pengeluaran untuk kategori pada periode yang dipilih.'}
              </p>

            </div>

          </div>

        </div>


        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr_auto] lg:items-end">

          {/* Category */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Kategori
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              required
              disabled={!!editingBudget}
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


          {/* Amount */}

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


          {/* Actions */}

          <div className="flex gap-2 lg:pb-0">

            {editingBudget && (
              <button
                type="button"
                onClick={cancelEdit}
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
                "
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
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
              {saving
                ? 'Menyimpan...'
                : editingBudget
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
          BUDGET LIST HEADER
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
                  setSearch(e.target.value)
                }
                placeholder="Cari budget..."
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
                "
              />

            </div>

          </div>

        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="mt-6">

          {loading ? (
            <BudgetSkeleton />
          ) : filteredBudgets.length === 0 ? (
            <EmptyBudgets
              hasSearch={!!search}
              onReset={() => setSearch('')}
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
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>

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


// =========================================================
// BUDGET CARD
// =========================================================

function BudgetCard({
  budget,
  onEdit,
  onRemove,
}) {
  const percentage = Number(
    budget.percentage || 0
  );

  const progressWidth = Math.min(
    Math.max(percentage, 0),
    100
  );

  const statusStyle =
    STATUS_STYLE[budget.status] ||
    STATUS_STYLE.AMAN;

  const statusLabel =
    STATUS_LABEL[budget.status] ||
    budget.status ||
    'Aman';

  const progressColor =
    getProgressColor(percentage);

  const progressText =
    getProgressText(percentage);

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

      {/* =================================================
          CARD HEADER
      ================================================= */}

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


      {/* =================================================
          PROGRESS
      ================================================= */}

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


        {/* =================================================
            AMOUNT DETAILS
        ================================================= */}

        <div className="mt-5 space-y-3">

          <AmountRow
            label="Budget"
            value={formatRupiah(
              budget.amount
            )}
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


        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mt-5 flex gap-2">

          <button
            type="button"
            onClick={() =>
              onEdit(budget)
            }
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
            "
          >
            Edit Budget
          </button>

          <button
            type="button"
            onClick={() =>
              onRemove(budget.id)
            }
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
            "
          >
            Hapus
          </button>

        </div>

      </div>

    </div>
  );
}


// =========================================================
// AMOUNT ROW
// =========================================================

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


// =========================================================
// BUDGET SKELETON
// =========================================================

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
// =========================================================
// EMPTY BUDGETS
// =========================================================

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

      {/* Icon */}

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


      {/* Title */}

      <h3 className="mt-4 text-sm font-bold text-slate-800">

        {hasSearch
          ? 'Budget tidak ditemukan'
          : 'Belum ada budget'}

      </h3>


      {/* Description */}

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">

        {hasSearch
          ? 'Tidak ada budget yang sesuai dengan pencarian kategori yang kamu masukkan.'
          : 'Belum ada budget untuk periode ini. Buat budget pertama untuk mulai mengontrol pengeluaran.'}

      </p>


      {/* Reset */}

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


// =========================================================
// END OF BUDGETS.JSX
// =========================================================