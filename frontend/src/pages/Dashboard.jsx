import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  CalendarDays,
  RefreshCw,
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

export default function Dashboard() {
  const [data, setData] = useState({
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
  });

  const [period, setPeriod] = useState("this_month");
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const res = await api.get("/dashboard", {
        params: {
          period,
        },
      });

      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [period]);

  if (!data && loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-slate-500">
          Memuat Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Ringkasan kondisi keuangan keluarga Anda.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="relative">

              <CalendarDays
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  py-2.5
                  pl-10
                  pr-4
                  text-sm
                  outline-none
                  transition
                  focus:border-brand-500
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
                text-white
                transition
                hover:bg-brand-700
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />

              Refresh

            </button>

          </div>

        </div>

      </div>

      {/* ================= KPI ================= */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          icon={Wallet}
          title="Total Saldo"
          value={data.totalSaldo}
          color="bg-blue-500"
        />

        <KpiCard
          icon={TrendingUp}
          title="Total Pemasukan"
          value={data.totalIncome}
          color="bg-emerald-500"
        />

        <KpiCard
          icon={TrendingDown}
          title="Total Pengeluaran"
          value={data.totalExpense}
          color="bg-red-500"
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
        />

      </div>
      
{/* ================= CHART ================= */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* Income vs Expense */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Income vs Expense
            </h2>

            <p className="text-sm text-slate-500">
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
                  income: data.totalIncome,
                  expense: data.totalExpense,
                },
              ]}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip
                formatter={(v) => formatRupiah(v)}
              />

              <Legend />

              <Bar
                dataKey="income"
                radius={[8,8,0,0]}
                fill="#10b981"
              />

              <Bar
                dataKey="expense"
                radius={[8,8,0,0]}
                fill="#ef4444"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* Cash Flow */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Cash Flow
            </h2>

            <p className="text-sm text-slate-500">
              Ringkasan arus kas.
            </p>

          </div>

          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <AreaChart
              data={[
                {
                  name: "Cash Flow",
                  value: data.cashFlow,
                },
              ]}
            >

              <defs>

                <linearGradient
                  id="cash"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.8}
                  />

                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />

                </linearGradient>

              </defs>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip
                formatter={(v) => formatRupiah(v)}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                fill="url(#cash)"
              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

      </div>

{/* ================= LOWER SECTION ================= */}

      <div className="grid gap-6 xl:grid-cols-3">

        {/* Recent Transaction */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-lg font-semibold">
              Transaksi Terakhir
            </h2>

            <button className="text-sm font-medium text-brand-600 hover:underline">
              Lihat Semua
            </button>

          </div>

          {!data.recentTransactions ||
          data.recentTransactions.length === 0 ? (

            <EmptyState text="Belum ada transaksi." />

          ) : (

            <div className="space-y-3">

              {data.recentTransactions.map((trx) => (

                <div
                  key={trx.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >

                  <div>

                    <p className="font-semibold">
                      {trx.description}
                    </p>

                    <p className="text-sm text-slate-500">
                      {trx.category}
                    </p>

                  </div>

                  <div className="text-right">

                    <p
                      className={`font-semibold ${
                        trx.type === "INCOME"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {trx.type === "INCOME" ? "+" : "-"}
                      {formatRupiah(trx.amount)}
                    </p>

                    <p className="text-xs text-slate-400">
                      {trx.date}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* Quick Statistic */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold">
            Statistik
          </h2>

          <div className="space-y-4">

            <StatisticCard
              title="Total Rekening"
              value={data.accounts?.length || 0}
            />

            <StatisticCard
              title="Kategori"
              value={data.statistics?.categoryCount || 0}
            />

            <StatisticCard
              title="Transaksi"
              value={data.statistics?.transactionCount || 0}
            />

            <StatisticCard
              title="Budget Aktif"
              value={data.statistics?.budgetCount || 0}
            />

          </div>

        </div>

      </div>

{/* ================= BUDGET & SAVING ================= */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* Budget */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold">
            Budget Bulan Ini
          </h2>

          {!data.budgets ||
          data.budgets.length === 0 ? (

            <EmptyState text="Belum ada budget." />

          ) : (

            <div className="space-y-5">

              {data.budgets.map((budget) => {

                const percent =
                  Math.min(
                    100,
                    (budget.used / budget.limit) * 100
                  );

                return (

                  <div key={budget.id}>

                    <div className="mb-2 flex justify-between">

                      <span className="font-medium">
                        {budget.name}
                      </span>

                      <span className="text-sm text-slate-500">
                        {Math.round(percent)}%
                      </span>

                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{
                          width: `${percent}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 text-sm text-slate-500">

                      {formatRupiah(budget.used)} /
                      {" "}
                      {formatRupiah(budget.limit)}

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

        {/* Saving */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold">
            Target Tabungan
          </h2>

          {!data.savingGoals ||
          data.savingGoals.length === 0 ? (

            <EmptyState text="Belum ada target tabungan." />

          ) : (

            <div className="space-y-5">

              {data.savingGoals.map((goal) => {

                const percent =
                  Math.min(
                    100,
                    (goal.saved / goal.target) * 100
                  );

                return (

                  <div key={goal.id}>

                    <div className="mb-2 flex justify-between">

                      <span className="font-medium">
                        {goal.name}
                      </span>

                      <span className="text-sm text-slate-500">
                        {Math.round(percent)}%
                      </span>

                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${percent}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 text-sm text-slate-500">

                      {formatRupiah(goal.saved)} /
                      {" "}
                      {formatRupiah(goal.target)}

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

function KpiCard({
  icon: Icon,
  title,
  value,
  color,
}) {
  return (
    <div
      className="
        group
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {formatRupiah(value || 0)}
          </h2>

        </div>

        <div
          className={`
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            text-white
            ${color}
          `}
        >
          <Icon size={26} />
        </div>

      </div>

    </div>
  );
}
function StatisticCard({
  title,
  value,
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">

      <p className="text-slate-600">
        {title}
      </p>

      <span className="text-xl font-bold text-brand-600">
        {value}
      </span>

    </div>
  );
}
function EmptyState({ text }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
      <p className="text-sm text-slate-400">
        {text}
      </p>
    </div>
  );
}