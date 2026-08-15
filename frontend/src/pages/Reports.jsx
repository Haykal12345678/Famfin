import { useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

export default function Reports() {
  const [range, setRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [cashflow, setCashflow] = useState(null);
  const [topCategory, setTopCategory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // =========================================================
  // RUN REPORT
  // =========================================================

  const runReport = async () => {
    if (
      range.startDate &&
      range.endDate &&
      range.startDate > range.endDate
    ) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const [cf, top] = await Promise.all([
        api.get('/reports/cashflow', {
          params: range,
        }),
        api.get('/reports/top-expense-category', {
          params: range,
        }),
      ]);

      setCashflow(cf.data);
      setTopCategory(top.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal mengambil data laporan.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const downloadCsv = async () => {
    if (
      range.startDate &&
      range.endDate &&
      range.startDate > range.endDate
    ) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    setError('');
    setExporting(true);

    try {
      const res = await api.get('/export/transactions', {
        params: range,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;
      link.setAttribute(
        'download',
        `transaksi-${Date.now()}.csv`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal melakukan export transaksi.'
      );
    } finally {
      setExporting(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetReport = () => {
    setRange({
      startDate: '',
      endDate: '',
    });

    setCashflow(null);
    setTopCategory([]);
    setError('');
  };

  // =========================================================
  // PERIOD LABEL
  // =========================================================

  const periodLabel = useMemo(() => {
    if (!range.startDate && !range.endDate) {
      return 'Semua periode';
    }

    if (range.startDate && !range.endDate) {
      return `Mulai ${formatDate(range.startDate)}`;
    }

    if (!range.startDate && range.endDate) {
      return `Sampai ${formatDate(range.endDate)}`;
    }

    return `${formatDate(range.startDate)} - ${formatDate(
      range.endDate
    )}`;
  }, [range]);

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

        <div className="relative p-7">

          {/* decorative background */}

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-indigo-50 blur-3xl" />

          <div className="relative">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Laporan Keuangan
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Pantau cash flow, pengeluaran terbesar, dan
                  performa keuangan keluarga berdasarkan periode.
                </p>

              </div>


              {/* HEADER ACTION */}

              <div className="flex flex-col gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={resetReport}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-xs
                    font-semibold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                  "
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={exporting}
                  className="
                    rounded-xl
                    border
                    border-blue-200
                    bg-blue-50
                    px-4
                    py-3
                    text-xs
                    font-bold
                    text-blue-700
                    transition
                    hover:bg-blue-100
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {exporting
                    ? 'Exporting...'
                    : '↓ Export CSV'}
                </button>

                <button
                  type="button"
                  onClick={runReport}
                  disabled={loading}
                  className="
                    rounded-xl
                    bg-blue-600
                    px-5
                    py-3
                    text-xs
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-blue-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading
                    ? 'Memuat...'
                    : 'Tampilkan Laporan'}
                </button>

              </div>

            </div>


            {/* =================================================
                PERIOD FILTER
            ================================================= */}

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

                {/* START DATE */}

                <div className="flex-1">

                  <label className="text-[11px] font-semibold text-slate-600">
                    Dari Tanggal
                  </label>

                  <input
                    type="date"
                    value={range.startDate}
                    onChange={(e) =>
                      setRange({
                        ...range,
                        startDate: e.target.value,
                      })
                    }
                    className="
                      mt-2
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-50
                    "
                  />

                </div>


                {/* ARROW */}

                <div className="hidden pb-3 text-slate-300 lg:block">
                  →
                </div>


                {/* END DATE */}

                <div className="flex-1">

                  <label className="text-[11px] font-semibold text-slate-600">
                    Sampai Tanggal
                  </label>

                  <input
                    type="date"
                    value={range.endDate}
                    onChange={(e) =>
                      setRange({
                        ...range,
                        endDate: e.target.value,
                      })
                    }
                    className="
                      mt-2
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-50
                    "
                  />

                </div>


                {/* PERIOD INFO */}

                <div className="flex-1 rounded-xl bg-white px-4 py-3">

                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Periode aktif
                  </p>

                  <p className="mt-1 truncate text-xs font-bold text-slate-700">
                    {periodLabel}
                  </p>

                </div>

              </div>

            </div>


            {/* ERROR */}

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs text-red-600">
                  !
                </div>

                <p className="text-xs font-medium leading-6 text-red-600">
                  {error}
                </p>

              </div>
            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!cashflow && !loading && (
        <ReportEmptyState
          periodLabel={periodLabel}
          onRun={runReport}
        />
      )}


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <ReportSkeleton />
      )}


      {/* =====================================================
          REPORT CONTENT
      ===================================================== */}

      {!loading && cashflow && (
        <>
          <CashflowSection
            cashflow={cashflow}
            periodLabel={periodLabel}
          />

          <TopCategorySection
            categories={topCategory}
          />
        </>
      )}

    </div>
  );
}


// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
// =========================================================
// CASHFLOW SECTION
// =========================================================

function CashflowSection({ cashflow, periodLabel }) {
  const income = Number(cashflow?.totalIncome || 0);
  const expense = Number(cashflow?.totalExpense || 0);
  const net = Number(cashflow?.netCashFlow || 0);

  const totalFlow = income + expense;

  const incomePercentage =
    totalFlow > 0
      ? Math.round((income / totalFlow) * 100)
      : 0;

  const expensePercentage =
    totalFlow > 0
      ? Math.round((expense / totalFlow) * 100)
      : 0;

  return (
    <section className="space-y-4">

      {/* SECTION HEADER */}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Ringkasan Cash Flow
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Kondisi keuangan berdasarkan periode yang dipilih.
          </p>
        </div>

        <div className="text-xs font-medium text-slate-400">
          {periodLabel}
        </div>

      </div>


      {/* KPI GRID */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <KpiCard
          label="Total Pemasukan"
          value={income}
          type="income"
          percentage={incomePercentage}
          description="Dana masuk"
        />

        <KpiCard
          label="Total Pengeluaran"
          value={expense}
          type="expense"
          percentage={expensePercentage}
          description="Dana keluar"
        />

        <KpiCard
          label="Net Cash Flow"
          value={net}
          type={net >= 0 ? 'positive' : 'negative'}
          description={
            net >= 0
              ? 'Keuangan surplus'
              : 'Keuangan defisit'
          }
        />

      </div>


      {/* FLOW COMPARISON */}

      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs font-semibold text-slate-700">
              Perbandingan Arus Dana
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Pemasukan dibandingkan dengan pengeluaran.
            </p>

          </div>


          <div className="flex items-center gap-5">

            <FlowLegend
              label="Pemasukan"
              value={income}
              type="income"
            />

            <FlowLegend
              label="Pengeluaran"
              value={expense}
              type="expense"
            />

          </div>

        </div>


        {/* BAR */}

        <div className="mt-6">

          <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">

            {income > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${incomePercentage}%`,
                }}
              />
            )}

            {expense > 0 && (
              <div
                className="h-full bg-red-400 transition-all duration-700"
                style={{
                  width: `${expensePercentage}%`,
                }}
              />
            )}

          </div>


          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">

            <span>
              Pemasukan {incomePercentage}%
            </span>

            <span>
              Pengeluaran {expensePercentage}%
            </span>

          </div>

        </div>

      </div>

    </section>
  );
}


// =========================================================
// KPI CARD
// =========================================================

function KpiCard({
  label,
  value,
  type,
  percentage,
  description,
}) {
  const config = {
    income: {
      icon: '↗',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      valueText: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700',
    },

    expense: {
      icon: '↘',
      iconBg: 'bg-red-50',
      iconText: 'text-red-500',
      valueText: 'text-red-600',
      badge: 'bg-red-50 text-red-700',
    },

    positive: {
      icon: '✓',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      valueText: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700',
    },

    negative: {
      icon: '!',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-600',
      valueText: 'text-orange-600',
      badge: 'bg-orange-50 text-orange-700',
    },
  };

  const style = config[type] || config.positive;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

      {/* DECORATIVE */}

      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-slate-50 blur-2xl transition group-hover:scale-125" />


      <div className="relative">

        {/* TOP */}

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-3">

            <div
              className={`
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                text-lg
                font-bold
                ${style.iconBg}
                ${style.iconText}
              `}
            >
              {style.icon}
            </div>

            <div>

              <p className="text-xs font-semibold text-slate-500">
                {label}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {description}
              </p>

            </div>

          </div>

          {percentage !== undefined && (
            <span
              className={`
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-bold
                ${style.badge}
              `}
            >
              {percentage}%
            </span>
          )}

        </div>


        {/* VALUE */}

        <div className="mt-6">

          <p
            className={`
              break-all
              text-xl
              font-bold
              tracking-tight
              ${style.valueText}
            `}
          >
            {formatRupiah(value)}
          </p>

        </div>


        {/* FOOTER */}

        <div className="mt-5 border-t border-slate-100 pt-4">

          <div className="flex items-center justify-between">

            <span className="text-[10px] text-slate-400">
              Periode laporan
            </span>

            <span className="text-[10px] font-semibold text-slate-600">
              Terpilih
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}


// =========================================================
// FLOW LEGEND
// =========================================================

function FlowLegend({
  label,
  value,
  type,
}) {
  const isIncome = type === 'income';

  return (
    <div className="flex items-center gap-2">

      <span
        className={`
          h-2.5
          w-2.5
          rounded-full
          ${isIncome ? 'bg-emerald-500' : 'bg-red-400'}
        `}
      />

      <div>

        <p className="text-[10px] text-slate-400">
          {label}
        </p>

        <p
          className={`
            text-xs
            font-bold
            ${isIncome ? 'text-emerald-600' : 'text-red-500'}
          `}
        >
          {formatRupiah(value)}
        </p>

      </div>

    </div>
  );
}


// =========================================================
// TOP CATEGORY SECTION
// =========================================================

function TopCategorySection({ categories }) {
  const maxValue =
    categories.length > 0
      ? Math.max(
          ...categories.map((item) =>
            Number(item.total || 0)
          )
        )
      : 0;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

      {/* HEADER */}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h2 className="text-lg font-bold text-slate-900">
            Top Kategori Pengeluaran
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Kategori dengan total pengeluaran terbesar.
          </p>

        </div>

        {categories.length > 0 && (
          <span className="w-fit rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600">
            {categories.length} kategori
          </span>
        )}

      </div>


      {/* CONTENT */}

      {categories.length === 0 ? (
        <div className="mt-8">

          <EmptyCategory />

        </div>
      ) : (
        <div className="mt-6 space-y-3">

          {categories.map((category, index) => (
            <CategoryRow
              key={`${category.name}-${index}`}
              category={category}
              index={index}
              maxValue={maxValue}
            />
          ))}

        </div>
      )}

    </section>
  );
}


// =========================================================
// CATEGORY ROW
// =========================================================

function CategoryRow({
  category,
  index,
  maxValue,
}) {
  const total = Number(category.total || 0);

  const percentage =
    maxValue > 0
      ? Math.max(
          4,
          Math.round((total / maxValue) * 100)
        )
      : 0;

  return (
    <div className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-sm">

      <div className="flex items-center gap-4">

        {/* RANK */}

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-xs
            font-bold
            ${
              index === 0
                ? 'bg-red-50 text-red-600'
                : index === 1
                  ? 'bg-orange-50 text-orange-600'
                  : index === 2
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-slate-100 text-slate-500'
            }
          `}
        >
          #{index + 1}
        </div>


        {/* INFO */}

        <div className="min-w-0 flex-1">

          <div className="flex items-center justify-between gap-4">

            <p className="truncate text-xs font-bold text-slate-800">
              {category.name}
            </p>

            <p className="shrink-0 text-xs font-bold text-slate-900">
              {formatRupiah(total)}
            </p>

          </div>


          {/* PROGRESS */}

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">

            <div
              className={`
                h-full
                rounded-full
                transition-all
                duration-700
                ${
                  index === 0
                    ? 'bg-red-500'
                    : index === 1
                      ? 'bg-orange-400'
                      : 'bg-slate-400'
                }
              `}
              style={{
                width: `${percentage}%`,
              }}
            />

          </div>

        </div>

      </div>

    </div>
  );
}


// =========================================================
// EMPTY CATEGORY
// =========================================================

function EmptyCategory() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        📊
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        Belum ada pengeluaran
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Belum terdapat data kategori pengeluaran
        untuk periode yang dipilih.
      </p>

    </div>
  );
}


// =========================================================
// EMPTY REPORT STATE
// =========================================================

function ReportEmptyState({
  periodLabel,
  onRun,
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-2xl">
        📈
      </div>

      <h2 className="mt-5 text-base font-bold text-slate-900">
        Siap melihat laporan?
      </h2>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
        Pilih periode yang ingin dianalisis, kemudian
        klik <span className="font-semibold text-slate-600">
          Tampilkan Laporan
        </span>{' '}
        untuk melihat ringkasan keuangan.
      </p>

      <div className="mt-4 inline-flex rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
        {periodLabel}
      </div>

      <div className="mt-5">

        <button
          type="button"
          onClick={onRun}
          className="
            rounded-xl
            bg-blue-600
            px-5
            py-3
            text-xs
            font-bold
            text-white
            shadow-sm
            transition
            hover:bg-blue-700
          "
        >
          Tampilkan Laporan
        </button>

      </div>

    </section>
  );
}


// =========================================================
// REPORT SKELETON
// =========================================================

function ReportSkeleton() {
  return (
    <div className="space-y-6">

      {/* KPI SKELETON */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >

            <div className="flex items-center gap-3">

              <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />

              <div className="space-y-2">

                <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />

                <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />

              </div>

            </div>

            <div className="mt-6 h-6 w-40 animate-pulse rounded bg-slate-100" />

            <div className="mt-5 border-t border-slate-100 pt-4">

              <div className="h-2 w-24 animate-pulse rounded bg-slate-100" />

            </div>

          </div>
        ))}

      </div>


      {/* FLOW SKELETON */}

      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />

        <div className="mt-2 h-2.5 w-64 animate-pulse rounded bg-slate-100" />

        <div className="mt-6 h-4 animate-pulse rounded-full bg-slate-100" />

      </div>


      {/* CATEGORY SKELETON */}

      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

        <div className="h-5 w-52 animate-pulse rounded bg-slate-100" />

        <div className="mt-6 space-y-3">

          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"
            >

              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />

              <div className="flex-1 space-y-3">

                <div className="flex justify-between">

                  <div className="h-2.5 w-28 animate-pulse rounded bg-slate-200" />

                  <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200" />

                </div>

                <div className="h-2 animate-pulse rounded-full bg-slate-200" />

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}
// =========================================================
// QUICK SUMMARY
// =========================================================

function QuickSummary({ cashflow, categories }) {
  const income = Number(cashflow?.totalIncome || 0);
  const expense = Number(cashflow?.totalExpense || 0);
  const net = Number(cashflow?.netCashFlow || 0);

  const expenseRatio =
    income > 0
      ? Math.round((expense / income) * 100)
      : 0;

  let healthLabel = 'Belum cukup data';
  let healthClass = 'bg-slate-100 text-slate-600';

  if (income > 0) {
    if (expenseRatio < 60) {
      healthLabel = 'Sangat baik';
      healthClass = 'bg-emerald-50 text-emerald-700';
    } else if (expenseRatio < 80) {
      healthLabel = 'Cukup baik';
      healthClass = 'bg-blue-50 text-blue-700';
    } else if (expenseRatio <= 100) {
      healthLabel = 'Perlu diperhatikan';
      healthClass = 'bg-yellow-50 text-yellow-700';
    } else {
      healthLabel = 'Defisit';
      healthClass = 'bg-red-50 text-red-700';
    }
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Insight Keuangan
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Ringkasan sederhana untuk membantu membaca kondisi keuangan.
          </p>
        </div>

        <span
          className={`
            w-fit
            rounded-full
            px-3
            py-1.5
            text-[10px]
            font-bold
            ${healthClass}
          `}
        >
          {healthLabel}
        </span>

      </div>


      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

        <InsightItem
          label="Rasio Pengeluaran"
          value={`${expenseRatio}%`}
          description={
            income > 0
              ? 'dari total pemasukan'
              : 'belum tersedia'
          }
        />

        <InsightItem
          label="Saldo Bersih"
          value={formatRupiah(net)}
          description={
            net >= 0
              ? 'surplus periode ini'
              : 'defisit periode ini'
          }
          negative={net < 0}
        />

        <InsightItem
          label="Kategori Aktif"
          value={categories.length}
          description="kategori pengeluaran"
        />

      </div>

    </section>
  );
}


// =========================================================
// INSIGHT ITEM
// =========================================================

function InsightItem({
  label,
  value,
  description,
  negative = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`
          mt-2
          truncate
          text-lg
          font-bold
          ${
            negative
              ? 'text-red-600'
              : 'text-slate-900'
          }
        `}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {description}
      </p>

    </div>
  );
}


// =========================================================
// ERROR STATE
// =========================================================

function ReportError({
  message,
  onRetry,
}) {
  return (
    <section className="rounded-[24px] border border-red-100 bg-red-50/50 p-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-bold text-red-600">
            !
          </div>

          <div>

            <p className="text-sm font-bold text-red-800">
              Laporan gagal dimuat
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              {message || 'Terjadi kesalahan saat mengambil data laporan.'}
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={onRetry}
          className="
            rounded-xl
            border
            border-red-200
            bg-white
            px-4
            py-2.5
            text-xs
            font-bold
            text-red-700
            shadow-sm
            transition
            hover:bg-red-50
          "
        >
          Coba Lagi
        </button>

      </div>

    </section>
  );
}


// =========================================================
// REPORT FOOTER NOTE
// =========================================================

function ReportNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs shadow-sm">
        💡
      </div>

      <div>

        <p className="text-xs font-semibold text-slate-700">
          Tips membaca laporan
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          Gunakan periode yang konsisten untuk membandingkan
          pemasukan dan pengeluaran keluarga dari waktu ke waktu.
        </p>

      </div>

    </div>
  );
}