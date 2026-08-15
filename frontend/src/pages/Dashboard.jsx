import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
];

const DEFAULT_DATA = {
  totalSaldo: 0,
  totalIncome: 0,
  totalExpense: 0,
  cashFlow: 0,

  accounts: [],
  recentTransactions: [],
  expenseByCategory: [],
  expenseByAccount: [],

  budgets: [],
  savingGoals: [],

  statistics: {
    categoryCount: 0,
    transactionCount: 0,
    budgetCount: 0,
  },
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

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

      setData({
        ...DEFAULT_DATA,
        ...(res.data || {}),

        accounts: res.data?.accounts || [],
        recentTransactions: res.data?.recentTransactions || [],
        expenseByCategory: res.data?.expenseByCategory || [],
        expenseByAccount: res.data?.expenseByAccount || [],

        budgets: res.data?.budgets || [],
        savingGoals: res.data?.savingGoals || [],

        statistics: {
          ...DEFAULT_DATA.statistics,
          ...(res.data?.statistics || {}),
        },
      });
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.response?.data?.message ||
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
     HELPERS
  ======================================================= */

  const getTransactionCategory = (trx) => {
    if (typeof trx.category === "string") {
      return trx.category;
    }

    if (trx.category?.name) {
      return trx.category.name;
    }

    return "Tanpa Kategori";
  };

  const getTransactionDescription = (trx) => {
    return (
      trx.description ||
      trx.note ||
      trx.title ||
      "Transaksi"
    );
  };

  const getTransactionDate = (trx) => {
    if (trx.date) return trx.date;

    if (trx.transactionDate) {
      return trx.transactionDate;
    }

    if (trx.createdAt) {
      return new Date(trx.createdAt).toLocaleDateString(
        "id-ID"
      );
    }

    return "-";
  };

  const getExpenseCategoryName = (item) => {
    if (item.name) return item.name;

    if (item.category?.name) {
      return item.category.name;
    }

    if (item.categoryName) {
      return item.categoryName;
    }

    return "Tanpa Kategori";
  };

  const getExpenseCategoryValue = (item) => {
    return Number(
      item.total ??
        item.amount ??
        item.value ??
        item.expense ??
        0
    );
  };

  const getExpenseAccountName = (item) => {
    if (item.name) return item.name;

    if (item.account?.name) {
      return item.account.name;
    }

    if (item.accountName) {
      return item.accountName;
    }

    return "Rekening";
  };

  const getExpenseAccountValue = (item) => {
    return Number(
      item.total ??
        item.amount ??
        item.value ??
        item.expense ??
        0
    );
  };

  /* =======================================================
     NORMALIZE CHART DATA
  ======================================================= */

  const expenseCategoryChartData =
    (data.expenseByCategory || [])
      .map((item) => ({
        name: getExpenseCategoryName(item),
        total: getExpenseCategoryValue(item),
      }))
      .filter((item) => item.total > 0);

  const expenseAccountChartData =
    (data.expenseByAccount || [])
      .map((item) => ({
        name: getExpenseAccountName(item),
        total: getExpenseAccountValue(item),
      }))
      .filter((item) => item.total > 0);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6 pb-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div>

                <h1 className="text-2xl font-bold text-slate-00 sm:text-3xl">
                  Dashboard
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Ringkasan kondisi keuangan keluarga Anda.
                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* PERIOD */}

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

            {/* REFRESH */}

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

              {loading ? "Memuat..." : "Refresh"}

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
          value={data.totalSaldo}
          color="bg-blue-500"
          description="Saldo seluruh rekening"
        />

        <KpiCard
          icon={TrendingUp}
          title="Total Pemasukan"
          value={data.totalIncome}
          color="bg-emerald-500"
          description="Pemasukan periode ini"
        />

        <KpiCard
          icon={TrendingDown}
          title="Total Pengeluaran"
          value={data.totalExpense}
          color="bg-red-500"
          description="Pengeluaran periode ini"
        />

        <KpiCard
          icon={Landmark}
          title="Cash Flow"
          value={data.cashFlow}
          color={
            data.cashFlow >= 0
              ? "bg-violet-500"
              : "bg-orange-500"
          }
          description={
            data.cashFlow >= 0
              ? "Arus kas positif"
              : "Arus kas negatif"
          }
        />

      </div>

      {/* =====================================================
          INCOME VS EXPENSE + CASH FLOW
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
                  income: Number(data.totalIncome || 0),
                  expense: Number(data.totalExpense || 0),
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
                Ringkasan arus kas periode terpilih.
              </p>

            </div>

            <div
              className={`rounded-xl p-2 ${
                data.cashFlow >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >

              {data.cashFlow >= 0 ? (
                <ArrowUpRight size={19} />
              ) : (
                <ArrowDownRight size={19} />
              )}

            </div>

          </div>

          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <AreaChart
              data={[
                {
                  name: "Cash Flow",
                  value: Number(data.cashFlow || 0),
                },
              ]}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 10,
              }}
            >

              <defs>

                <linearGradient
                  id="cashFlowGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.35}
                  />

                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />

                </linearGradient>

              </defs>

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

              <Area
                type="monotone"
                dataKey="value"
                name="Cash Flow"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#cashFlowGradient)"
              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* =====================================================
          EXPENSE DISTRIBUTION
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* EXPENSE BY CATEGORY */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-semibold text-slate-900">
              Distribusi Pengeluaran
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kategori yang paling banyak menyerap pengeluaran.
            </p>

          </div>

          {expenseCategoryChartData.length === 0 ? (

            <EmptyState
              icon={Receipt}
              text="Belum ada data pengeluaran."
            />

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {/* PIE */}

              <div className="h-[280px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={expenseCategoryChartData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={100}
                      paddingAngle={3}
                    >

                      {expenseCategoryChartData.map(
                        (_, index) => (

                          <Cell
                            key={`category-${index}`}
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

              {/* CATEGORY LIST */}

              <div className="flex flex-col justify-center space-y-2">

                {expenseCategoryChartData
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
                        transition
                        hover:bg-slate-100
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
                        {formatRupiah(item.total)}
                      </span>

                    </div>

                  ))}

              </div>

            </div>

          )}

        </div>

        {/* EXPENSE BY ACCOUNT */}

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
              text="Belum ada data pengeluaran per rekening."
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
                    width={90}
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

      </div>

      {/* =====================================================
          RECENT TRANSACTIONS + STATISTICS
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">

        {/* RECENT TRANSACTION */}

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

          </div>

          {!data.recentTransactions ||
          data.recentTransactions.length === 0 ? (

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
                    trx.type === "INCOME";

                  return (

                    <div
                      key={trx.id}
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
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              isIncome
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-red-100 text-red-600"
                            }
                          `}
                        >

                          {isIncome ? (
                            <ArrowUpRight size={19} />
                          ) : (
                            <ArrowDownRight size={19} />
                          )}

                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-slate-800">
                            {getTransactionDescription(trx)}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {getTransactionCategory(trx)}
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
                          {isIncome ? "+" : "-"}
                          {formatRupiah(
                            trx.amount || 0
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {getTransactionDate(trx)}
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
              value={
                data.accounts?.length || 0
              }
            />

            <StatisticCard
              icon={Receipt}
              title="Kategori"
              value={
                data.statistics
                  ?.categoryCount || 0
              }
            />

            <StatisticCard
              icon={TrendingUp}
              title="Transaksi"
              value={
                data.statistics
                  ?.transactionCount || 0
              }
            />

            <StatisticCard
              icon={Target}
              title="Budget Aktif"
              value={
                data.statistics
                  ?.budgetCount || 0
              }
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          BUDGET + SAVING GOALS
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* BUDGET */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Budget Bulan Ini
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

          {!data.budgets ||
          data.budgets.length === 0 ? (

            <EmptyState
              icon={Target}
              text="Belum ada budget."
            />

          ) : (

            <div className="space-y-5">

              {data.budgets.map((budget) => {

                const limit = Number(
                  budget.limit ??
                    budget.amount ??
                    0
                );

                const used = Number(
                  budget.used || 0
                );

                const percent =
                  limit > 0
                    ? Math.min(
                        100,
                        (used / limit) * 100
                      )
                    : 0;

                const isDanger =
                  percent >= 90;

                return (

                  <div key={budget.id}>

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <span className="truncate font-medium text-slate-800">
                        {budget.name ||
                          budget.category?.name ||
                          "Budget"}
                      </span>

                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          isDanger
                            ? "text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {Math.round(percent)}%
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
                          width: `${percent}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 flex justify-between text-xs text-slate-500">

                      <span>
                        Terpakai{" "}
                        {formatRupiah(used)}
                      </span>

                      <span>
                        dari{" "}
                        {formatRupiah(limit)}
                      </span>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

        {/* SAVING GOALS */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Target Tabungan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Pantau progress target tabungan keluarga.
              </p>

            </div>

            <PiggyBank
              size={20}
              className="text-emerald-600"
            />

          </div>

          {!data.savingGoals ||
          data.savingGoals.length === 0 ? (

            <EmptyState
              icon={PiggyBank}
              text="Belum ada target tabungan."
            />

          ) : (

            <div className="space-y-5">

              {data.savingGoals.map((goal) => {

                const target = Number(
                  goal.target ??
                    goal.targetAmount ??
                    0
                );

                const saved = Number(
                  goal.saved ??
                    goal.currentAmount ??
                    0
                );

                const percent =
                  target > 0
                    ? Math.min(
                        100,
                        (saved / target) * 100
                      )
                    : 0;

                return (

                  <div key={goal.id}>

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <span className="truncate font-medium text-slate-800">
                        {goal.name ||
                          "Target Tabungan"}
                      </span>

                      <span className="shrink-0 text-sm font-semibold text-emerald-600">
                        {Math.round(percent)}%
                      </span>

                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${percent}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 flex justify-between text-xs text-slate-500">

                      <span>
                        Terkumpul{" "}
                        {formatRupiah(saved)}
                      </span>

                      <span>
                        dari{" "}
                        {formatRupiah(target)}
                      </span>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

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
            {formatRupiah(value || 0)}
          </h2>

          {description && (
            <p className="mt-2 text-xs text-slate-400">
              {description}
            </p>
          )}

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