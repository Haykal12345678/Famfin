import { useEffect, useMemo, useState } from "react";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  CalendarDays,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PiggyBank,
  Receipt,
  Target,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CircleDollarSign,
  Percent,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import api from "../api/client";
import { formatRupiah } from "../utils/format";

/* =========================================================
   CONSTANTS
========================================================= */

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

const DEFAULT_DATA = {
  summary: {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0,
    totalAccountBalance: 0,
    accountCount: 0,
  },

  accounts: [],

  recentTransactions: [],

  expenseByCategory: [],

  incomeByCategory: [],

  budgets: [],

  goals: [],

  filters: {
    startDate: null,
    endDate: null,
  },
};

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCategoryName = (item) => {
  return (
    item?.categoryName ||
    item?.category?.name ||
    item?.name ||
    "Tanpa Kategori"
  );
};

const getAccountName = (item) => {
  return (
    item?.accountName ||
    item?.account?.name ||
    item?.name ||
    "Rekening"
  );
};

const getCategoryValue = (item) => {
  return toNumber(
    item?.amount ??
      item?.total ??
      item?.value ??
      item?.expense ??
      item?.income
  );
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const [data, setData] = useState(DEFAULT_DATA);

  const [period, setPeriod] = useState("this_month");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/dashboard", {
        params: {
          period,
        },
      });

      const responseData = res?.data || {};

      setData({
        ...DEFAULT_DATA,
        ...responseData,

        summary: {
          ...DEFAULT_DATA.summary,
          ...(responseData.summary || {}),
        },

        accounts: Array.isArray(responseData.accounts)
          ? responseData.accounts
          : [],

        recentTransactions: Array.isArray(
          responseData.recentTransactions
        )
          ? responseData.recentTransactions
          : [],

        expenseByCategory: Array.isArray(
          responseData.expenseByCategory
        )
          ? responseData.expenseByCategory
          : [],

        incomeByCategory: Array.isArray(
          responseData.incomeByCategory
        )
          ? responseData.incomeByCategory
          : [],

        budgets: Array.isArray(responseData.budgets)
          ? responseData.budgets
          : [],

        goals: Array.isArray(responseData.goals)
          ? responseData.goals
          : [],
      });
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Gagal memuat dashboard. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [period]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = data.summary || DEFAULT_DATA.summary;

  const totalIncome = toNumber(summary.totalIncome);

  const totalExpense = toNumber(summary.totalExpense);

  const cashFlow = toNumber(summary.balance);

  const totalAccountBalance = toNumber(
    summary.totalAccountBalance
  );

  const transactionCount = toNumber(
    summary.transactionCount
  );

  const accountCount = toNumber(
    summary.accountCount
  );

  /* =======================================================
     FINANCIAL METRICS
  ======================================================= */

  const expenseRatio =
    totalIncome > 0
      ? (totalExpense / totalIncome) * 100
      : 0;

  const savingRatio =
    totalIncome > 0
      ? (cashFlow / totalIncome) * 100
      : 0;

  const averageTransaction =
    transactionCount > 0
      ? (totalIncome + totalExpense) /
        transactionCount
      : 0;

  /* =======================================================
     CHART DATA
  ======================================================= */

  const expenseCategoryChartData = useMemo(() => {
    return (data.expenseByCategory || [])
      .map((item) => ({
        name: getCategoryName(item),
        total: getCategoryValue(item),
      }))
      .filter((item) => item.total > 0);
  }, [data.expenseByCategory]);

  const incomeCategoryChartData = useMemo(() => {
    return (data.incomeByCategory || [])
      .map((item) => ({
        name: getCategoryName(item),
        total: getCategoryValue(item),
      }))
      .filter((item) => item.total > 0);
  }, [data.incomeByCategory]);

  /*
   * Backend yang kamu kirim sebelumnya belum mengirim
   * expenseByAccount.
   *
   * Jadi kita hitung dari recentTransactions sebagai
   * fallback sementara.
   */

  const expenseAccountChartData = useMemo(() => {
    const map = new Map();

    (data.recentTransactions || []).forEach(
      (transaction) => {
        if (
          String(transaction?.type).toUpperCase() !==
          "EXPENSE"
        ) {
          return;
        }

        const accountName = getAccountName(
          transaction
        );

        const amount = toNumber(
          transaction.amount
        );

        map.set(
          accountName,
          (map.get(accountName) || 0) + amount
        );
      }
    );

    return Array.from(map.entries())
      .map(([name, total]) => ({
        name,
        total,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [data.recentTransactions]);

  /* =======================================================
     INSIGHTS
  ======================================================= */

  const topExpenseCategory =
    expenseCategoryChartData[0];

  const topIncomeCategory =
    incomeCategoryChartData[0];

  const almostFinishedBudgets = (
    data.budgets || []
  ).filter((budget) => {
    const percentage = toNumber(
      budget.percentage
    );

    return percentage >= 70;
  });

  const activeGoals = (data.goals || []).filter(
    (goal) => !goal.isCompleted
  );

  const nearestGoal = [...activeGoals].sort(
    (a, b) => {
      const dateA = new Date(
        a.targetDate || "9999-12-31"
      );

      const dateB = new Date(
        b.targetDate || "9999-12-31"
      );

      return dateA - dateB;
    }
  )[0];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6 pb-10">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-3">

              <div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Dashboard
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Ringkasan kondisi keuangan keluarga Anda.
                </p>

              </div>

            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="relative">

              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value)
                }
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  py-2.5
                  pl-10
                  pr-8
                  text-sm
                  font-medium
                  text-slate-700
                  outline-none
                  transition
                  focus:border-brand-500
                  focus:ring-2
                  focus:ring-brand-100
                "
              >
                <option value="today">
                  Hari Ini
                </option>

                <option value="this_week">
                  Minggu Ini
                </option>

                <option value="this_month">
                  Bulan Ini
                </option>

                <option value="last_month">
                  Bulan Lalu
                </option>

                <option value="3_months">
                  3 Bulan
                </option>

                <option value="this_year">
                  Tahun Ini
                </option>
              </select>

            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                bg-brand-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-brand-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={17}
                className={
                  loading ? "animate-spin" : ""
                }
              />

              {loading
                ? "Memuat..."
                : "Refresh"}
            </button>

          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div className="flex-1">

            <p className="text-sm font-semibold text-red-800">
              Gagal memuat dashboard
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="text-sm font-semibold text-red-700 hover:underline"
          >
            Coba Lagi
          </button>

        </div>
      )}

      {/* =====================================================
          KPI
      ===================================================== */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          icon={Wallet}
          title="Total Saldo"
          value={totalAccountBalance}
          color="bg-blue-500"
          description={`${accountCount} rekening aktif`}
        />

        <KpiCard
          icon={TrendingUp}
          title="Pemasukan"
          value={totalIncome}
          color="bg-emerald-500"
          description="Total pemasukan periode"
        />

        <KpiCard
          icon={TrendingDown}
          title="Pengeluaran"
          value={totalExpense}
          color="bg-red-500"
          description={`${expenseRatio.toFixed(
            1
          )}% dari pemasukan`}
        />

        <KpiCard
          icon={Landmark}
          title="Cash Flow"
          value={cashFlow}
          color={
            cashFlow >= 0
              ? "bg-violet-500"
              : "bg-orange-500"
          }
          description={
            cashFlow >= 0
              ? `Saving rate ${savingRatio.toFixed(
                  1
                )}%`
              : "Arus kas negatif"
          }
        />

      </div>

      {/* =====================================================
          FINANCIAL INSIGHT
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <BarChart3 size={20} />
          </div>

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Ringkasan Keuangan
            </h2>

            <p className="text-sm text-slate-500">
              Insight singkat dari data periode terpilih.
            </p>

          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <InsightCard
            icon={Percent}
            title="Expense Ratio"
            value={`${expenseRatio.toFixed(1)}%`}
            description={
              expenseRatio > 100
                ? "Pengeluaran melebihi pemasukan"
                : expenseRatio >= 80
                ? "Pengeluaran cukup tinggi"
                : "Pengeluaran masih terkendali"
            }
            danger={expenseRatio >= 90}
          />

          <InsightCard
            icon={Receipt}
            title="Rata-rata Transaksi"
            value={formatRupiah(
              averageTransaction
            )}
            description={`${transactionCount} transaksi`}
          />

          <InsightCard
            icon={TrendingDown}
            title="Pengeluaran Terbesar"
            value={
              topExpenseCategory
                ? topExpenseCategory.name
                : "-"
            }
            description={
              topExpenseCategory
                ? formatRupiah(
                    topExpenseCategory.total
                  )
                : "Belum ada data"
            }
            danger
          />

          <InsightCard
            icon={TrendingUp}
            title="Pemasukan Terbesar"
            value={
              topIncomeCategory
                ? topIncomeCategory.name
                : "-"
            }
            description={
              topIncomeCategory
                ? formatRupiah(
                    topIncomeCategory.total
                  )
                : "Belum ada data"
            }
          />

        </div>
      </div>

      {/* =====================================================
          CASHFLOW CHART
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* INCOME VS EXPENSE */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-semibold text-slate-900">
              Income vs Expense
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Perbandingan pemasukan dan pengeluaran.
            </p>

          </div>

          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <BarChart
              data={[
                {
                  name: "Periode",
                  income: totalIncome,
                  expense: totalExpense,
                },
              ]}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 10,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
              />

              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  formatRupiah(value)
                }
              />

              <Tooltip
                formatter={(value) =>
                  formatRupiah(value)
                }
              />

              <Legend />

              <Bar
                dataKey="income"
                name="Pemasukan"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                maxBarSize={70}
              />

              <Bar
                dataKey="expense"
                name="Pengeluaran"
                fill="#ef4444"
                radius={[8, 8, 0, 0]}
                maxBarSize={70}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* CASH FLOW */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-start justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Cash Flow
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Kondisi arus kas periode terpilih.
              </p>

            </div>

            <div
              className={`rounded-xl p-2 ${
                cashFlow >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {cashFlow >= 0 ? (
                <ArrowUpRight size={19} />
              ) : (
                <ArrowDownRight size={19} />
              )}
            </div>

          </div>

          <div className="flex h-[260px] flex-col items-center justify-center">

            <p className="text-sm text-slate-500">
              Cash Flow
            </p>

            <p
              className={`mt-3 text-4xl font-bold ${
                cashFlow >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {formatRupiah(cashFlow)}
            </p>

            <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">

              <div className="rounded-2xl bg-emerald-50 p-4 text-center">

                <p className="text-xs text-emerald-600">
                  Pemasukan
                </p>

                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {formatRupiah(totalIncome)}
                </p>

              </div>

              <div className="rounded-2xl bg-red-50 p-4 text-center">

                <p className="text-xs text-red-600">
                  Pengeluaran
                </p>

                <p className="mt-1 text-sm font-bold text-red-700">
                  {formatRupiah(totalExpense)}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          EXPENSE / INCOME CATEGORY
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* EXPENSE */}

        <CategoryChart
          title="Distribusi Pengeluaran"
          description="Kategori yang paling banyak menyerap pengeluaran."
          data={expenseCategoryChartData}
          icon={TrendingDown}
          emptyText="Belum ada data pengeluaran."
        />

        {/* INCOME */}

        <CategoryChart
          title="Distribusi Pemasukan"
          description="Sumber pemasukan terbesar pada periode ini."
          data={incomeCategoryChartData}
          icon={TrendingUp}
          emptyText="Belum ada data pemasukan."
        />

      </div>

      {/* =====================================================
          ACCOUNTS
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Saldo Rekening
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Posisi saldo seluruh rekening yang dapat Anda akses.
            </p>

          </div>

          <CreditCard
            size={20}
            className="text-brand-600"
          />

        </div>

        {data.accounts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            text="Belum ada rekening."
          />
        ) : (

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {data.accounts.map((account) => {

              const balance = toNumber(
                account.balance
              );

              return (
                <div
                  key={account.id}
                  className="
                    rounded-2xl
                    border
                    border-slate-100
                    bg-slate-50
                    p-4
                    transition
                    hover:border-slate-200
                    hover:bg-white
                    hover:shadow-sm
                  "
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                      <Wallet size={19} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-slate-800">
                        {account.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {account.type || "REKENING"}
                      </p>

                    </div>

                  </div>

                  <p
                    className={`mt-4 text-xl font-bold ${
                      balance >= 0
                        ? "text-slate-900"
                        : "text-red-600"
                    }`}
                  >
                    {formatRupiah(balance)}
                  </p>

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* =====================================================
          EXPENSE BY ACCOUNT
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-slate-900">
            Pengeluaran per Rekening
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Rekening yang paling banyak digunakan untuk pengeluaran.
          </p>

        </div>

        {expenseAccountChartData.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            text="Belum cukup data transaksi untuk ditampilkan."
          />
        ) : (

          <div className="h-[320px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={expenseAccountChartData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) =>
                    formatRupiah(value)
                  }
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip
                  formatter={(value) =>
                    formatRupiah(value)
                  }
                />

                <Bar
                  dataKey="total"
                  name="Pengeluaran"
                  fill="#ef4444"
                  radius={[0, 8, 8, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================================
          TRANSACTIONS + STATISTICS
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">

        {/* TRANSACTIONS */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Transaksi Terakhir
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Aktivitas transaksi terbaru.
              </p>

            </div>

            <Receipt
              size={20}
              className="text-brand-600"
            />

          </div>

          {data.recentTransactions.length ===
          0 ? (
            <EmptyState
              icon={Receipt}
              text="Belum ada transaksi."
            />
          ) : (

            <div className="space-y-3">

              {data.recentTransactions
                .slice(0, 8)
                .map((trx) => {

                  const isIncome =
                    String(
                      trx?.type || ""
                    ).toUpperCase() ===
                    "INCOME";

                  return (
                    <div
                      key={
                        trx?.id ||
                        `${trx?.date}-${trx?.amount}`
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        rounded-2xl
                        border
                        border-slate-100
                        bg-slate-50
                        p-4
                        transition
                        hover:border-slate-200
                        hover:bg-white
                      "
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isIncome
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight size={19} />
                          ) : (
                            <ArrowDownRight size={19} />
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-slate-800">
                            {trx?.note ||
                              trx?.description ||
                              "Transaksi"}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">

                            {getCategoryName(
                              trx
                            )}

                            {" • "}

                            {getAccountName(
                              trx
                            )}

                          </p>

                        </div>

                      </div>

                      <div className="shrink-0 text-right">

                        <p
                          className={`font-semibold ${
                            isIncome
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {isIncome
                            ? "+"
                            : "-"}
                          {formatRupiah(
                            toNumber(
                              trx?.amount
                            )
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(
                            trx?.date
                          )}
                        </p>

                      </div>

                    </div>
                  );
                })}

            </div>
          )}

        </div>

        {/* STATISTICS */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Statistik
          </h2>

          <div className="space-y-3">

            <StatisticCard
              icon={CreditCard}
              title="Total Rekening"
              value={accountCount}
            />

            <StatisticCard
              icon={Receipt}
              title="Transaksi"
              value={transactionCount}
            />

            <StatisticCard
              icon={PieChartIcon}
              title="Kategori Expense"
              value={
                expenseCategoryChartData.length
              }
            />

            <StatisticCard
              icon={Target}
              title="Budget"
              value={data.budgets.length}
            />

            <StatisticCard
              icon={PiggyBank}
              title="Target Tabungan"
              value={data.goals.length}
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          BUDGET + GOALS
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* BUDGET */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Budget
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Pantau penggunaan budget keluarga.
              </p>

            </div>

            <Target
              size={20}
              className="text-brand-600"
            />

          </div>

          {data.budgets.length === 0 ? (
            <EmptyState
              icon={Target}
              text="Belum ada budget."
            />
          ) : (

            <div className="space-y-5">

              {data.budgets.slice(0, 6).map(
                (budget) => {

                  const limit = toNumber(
                    budget.amount
                  );

                  const used = toNumber(
                    budget.used
                  );

                  const percentage =
                    toNumber(
                      budget.percentage
                    );

                  const percent =
                    percentage ||
                    (limit > 0
                      ? (used / limit) * 100
                      : 0);

                  return (
                    <div
                      key={budget.id}
                    >

                      <div className="mb-2 flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-medium text-slate-800">
                            {budget.categoryName ||
                              budget.category?.name ||
                              "Budget"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {budget.period}
                          </p>

                        </div>

                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            percent >= 90
                              ? "text-red-600"
                              : percent >= 70
                              ? "text-orange-600"
                              : "text-brand-600"
                          }`}
                        >
                          {Math.round(
                            percent
                          )}
                          %
                        </span>

                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className={`h-full rounded-full transition-all ${
                            percent >= 100
                              ? "bg-red-500"
                              : percent >= 90
                              ? "bg-orange-500"
                              : percent >= 70
                              ? "bg-yellow-500"
                              : "bg-brand-600"
                          }`}
                          style={{
                            width: `${Math.min(
                              percent,
                              100
                            )}%`,
                          }}
                        />

                      </div>

                      <div className="mt-2 flex justify-between text-xs text-slate-500">

                        <span>
                          Terpakai{" "}
                          {formatRupiah(
                            used
                          )}
                        </span>

                        <span>
                          dari{" "}
                          {formatRupiah(
                            limit
                          )}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* GOALS */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Target Tabungan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Pantau progress target finansial keluarga.
              </p>

            </div>

            <PiggyBank
              size={20}
              className="text-emerald-600"
            />

          </div>

          {data.goals.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              text="Belum ada target tabungan."
            />
          ) : (

            <div className="space-y-5">

              {data.goals.slice(0, 6).map(
                (goal) => {

                  const target =
                    toNumber(
                      goal.targetAmount
                    );

                  const current =
                    toNumber(
                      goal.currentAmount
                    );

                  const percent =
                    toNumber(
                      goal.progressPercentage
                    ) ||
                    (target > 0
                      ? (current / target) *
                        100
                      : 0);

                  return (
                    <div
                      key={goal.id}
                    >

                      <div className="mb-2 flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-medium text-slate-800">
                            {goal.name}
                          </p>

                          {goal.targetDate && (
                            <p className="text-xs text-slate-400">
                              Target{" "}
                              {formatDate(
                                goal.targetDate
                              )}
                            </p>
                          )}

                        </div>

                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            goal.isCompleted
                              ? "text-emerald-600"
                              : "text-brand-600"
                          }`}
                        >
                          {goal.isCompleted
                            ? "Selesai"
                            : `${Math.round(
                                percent
                              )}%`}
                        </span>

                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className={`h-full rounded-full ${
                            goal.isCompleted
                              ? "bg-emerald-500"
                              : "bg-brand-600"
                          }`}
                          style={{
                            width: `${Math.min(
                              percent,
                              100
                            )}%`,
                          }}
                        />

                      </div>

                      <div className="mt-2 flex justify-between text-xs text-slate-500">

                        <span>
                          Terkumpul{" "}
                          {formatRupiah(
                            current
                          )}
                        </span>

                        <span>
                          dari{" "}
                          {formatRupiah(
                            target
                          )}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* =====================================================
          ALERTS / INSIGHTS
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-slate-900">
            Financial Insights
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Hal yang perlu diperhatikan dari kondisi keuangan saat ini.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {/* CASHFLOW */}

          <div
            className={`rounded-2xl border p-4 ${
              cashFlow >= 0
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50"
            }`}
          >

            <div className="flex gap-3">

              {cashFlow >= 0 ? (
                <CheckCircle2
                  className="shrink-0 text-emerald-600"
                  size={20}
                />
              ) : (
                <AlertTriangle
                  className="shrink-0 text-red-600"
                  size={20}
                />
              )}

              <div>

                <p
                  className={`text-sm font-semibold ${
                    cashFlow >= 0
                      ? "text-emerald-800"
                      : "text-red-800"
                  }`}
                >
                  Kondisi Cash Flow
                </p>

                <p
                  className={`mt-1 text-xs ${
                    cashFlow >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {cashFlow >= 0
                    ? "Pemasukan masih lebih besar daripada pengeluaran."
                    : "Pengeluaran periode ini lebih besar daripada pemasukan."}
                </p>

              </div>

            </div>

          </div>

          {/* BUDGET */}

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">

            <div className="flex gap-3">

              <AlertTriangle
                className="shrink-0 text-orange-600"
                size={20}
              />

              <div>

                <p className="text-sm font-semibold text-orange-800">
                  Budget Perlu Diperhatikan
                </p>

                <p className="mt-1 text-xs text-orange-700">

                  {almostFinishedBudgets.length > 0
                    ? `${almostFinishedBudgets.length} budget sudah mencapai 70% atau lebih.`
                    : "Belum ada budget yang mendekati batas."}

                </p>

              </div>

            </div>

          </div>

          {/* GOAL */}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

            <div className="flex gap-3">

              <Target
                className="shrink-0 text-blue-600"
                size={20}
              />

              <div>

                <p className="text-sm font-semibold text-blue-800">
                  Target Tabungan
                </p>

                <p className="mt-1 text-xs text-blue-700">

                  {nearestGoal
                    ? `Target berikutnya: ${nearestGoal.name}.`
                    : "Belum ada target tabungan aktif."}

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  icon: Icon,
  title,
  value,
  color,
  description,
}) {
  return (
    <div
      className="
        group
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-lg
      "
    >

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 truncate text-xl font-bold text-slate-900 sm:text-2xl">
            {formatRupiah(
              Number(value || 0)
            )}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div
          className={`
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-2xl
            text-white
            shadow-sm
            transition-transform
            group-hover:scale-105
            ${color}
          `}
        >
          <Icon size={23} />
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   INSIGHT CARD
========================================================= */

function InsightCard({
  icon: Icon,
  title,
  value,
  description,
  danger = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">

      <div className="flex items-start gap-3">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-100 text-red-600"
              : "bg-white text-brand-600"
          }`}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0">

          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   STATISTIC CARD
========================================================= */

function StatisticCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        rounded-2xl
        border
        border-slate-100
        bg-slate-50
        p-4
        transition
        hover:bg-slate-100
      "
    >

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <Icon size={17} />
        </div>

        <p className="text-sm font-medium text-slate-600">
          {title}
        </p>

      </div>

      <span className="text-xl font-bold text-brand-600">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   CATEGORY CHART
========================================================= */

function CategoryChart({
  title,
  description,
  data,
  icon: Icon,
  emptyText,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-start justify-between">

        <div>

          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>

        </div>

        <Icon
          size={20}
          className="text-brand-600"
        />

      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Icon}
          text={emptyText}
        />
      ) : (

        <div className="grid gap-5 md:grid-cols-2">

          <div className="h-[280px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={3}
                >

                  {data.map(
                    (_, index) => (
                      <Cell
                        key={`chart-${index}`}
                        fill={
                          CHART_COLORS[
                            index %
                              CHART_COLORS.length
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip
                  formatter={(value) =>
                    formatRupiah(value)
                  }
                />

                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{
                    fontSize: "12px",
                  }}
                />

              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="flex flex-col justify-center space-y-2">

            {data
              .slice(0, 6)
              .map((item, index) => (

                <div
                  key={`${item.name}-${index}`}
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    bg-slate-50
                    px-4
                    py-3
                  "
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[
                            index %
                              CHART_COLORS.length
                          ],
                      }}
                    />

                    <span className="truncate text-sm font-medium text-slate-700">
                      {item.name}
                    </span>

                  </div>

                  <span className="ml-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {formatRupiah(
                      item.total
                    )}
                  </span>

                </div>

              ))}

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon: Icon = Receipt,
  text,
}) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">

      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon size={21} />
      </div>

      <p className="text-sm text-slate-400">
        {text}
      </p>

    </div>
  );
}