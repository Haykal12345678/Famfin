import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';
import Pagination from '../components/Pagination';

/* =========================================================
   CONSTANT
========================================================= */

const TX_LABEL = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER: 'Transfer',
};

const TX_COLOR = {
  INCOME: 'text-emerald-600',
  EXPENSE: 'text-red-600',
  TRANSFER: 'text-blue-600',
};

const TX_BG = {
  INCOME: 'bg-emerald-50 border-emerald-100',
  EXPENSE: 'bg-red-50 border-red-100',
  TRANSFER: 'bg-blue-50 border-blue-100',
};

/* =========================================================
   HELPER
========================================================= */

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
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

function formatDate(date) {
  if (!date) return '-';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '-';
  }

  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateInput(date) {
  if (!date) return '';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/* =========================================================
   MAIN
========================================================= */

export default function Transactions() {
  const [tab, setTab] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [filter, setFilter] = useState({
    type: '',
    categoryId: '',
    accountId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadAll = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = {
        page,
        pageSize,
      };

      if (filter.type) {
        params.type = filter.type;
      }

      if (filter.categoryId) {
        params.categoryId = filter.categoryId;
      }

      if (filter.accountId) {
        params.accountId = filter.accountId;
      }

      if (filter.startDate) {
        params.startDate = filter.startDate;
      }

      if (filter.endDate) {
        params.endDate = filter.endDate;
      }

      const [acc, cat, tx] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/transactions', {
          params,
        }),
      ]);

      setAccounts(acc.data || []);
      setCategories(cat.data || []);

      setItems(tx.data?.items || []);
      setTotal(tx.data?.total || 0);

      if (tx.data?.page) {
        setPage(tx.data.page);
      }
    } catch (error) {
      console.error(
        'Gagal memuat transaksi:',
        error
      );

      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [
    filter.type,
    filter.categoryId,
    filter.accountId,
    filter.startDate,
    filter.endDate,
    page,
  ]);

  /* =======================================================
     FILTER HANDLER
  ======================================================= */

  const updateFilter = (key, value) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(1);
  };

  const resetFilter = () => {
    setFilter({
      type: '',
      categoryId: '',
      accountId: '',
      startDate: '',
      endDate: '',
      search: '',
    });

    setPage(1);
  };

  /* =======================================================
     QUICK DATE FILTER
  ======================================================= */

  const setQuickPeriod = (period) => {
    const today = new Date();

    let start = new Date(today);
    let end = new Date(today);

    if (period === 'today') {
      // nothing
    }

    if (period === '7days') {
      start.setDate(
        today.getDate() - 6
      );
    }

    if (period === 'thisMonth') {
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );
    }

    if (period === 'lastMonth') {
      start = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

      end = new Date(
        today.getFullYear(),
        today.getMonth(),
        0
      );
    }

    setFilter((prev) => ({
      ...prev,
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }));

    setPage(1);
  };

  /* =======================================================
     FILTER OPTIONS
     
     Hanya tampilkan kategori/rekening yang muncul
     pada data transaksi yang sedang ditampilkan.
  ======================================================= */

  const availableCategories = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      if (
        item.category?.id &&
        item.category?.name
      ) {
        map.set(
          item.category.id,
          item.category
        );
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );
  }, [items]);

  const availableAccounts = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      if (
        item.account?.id &&
        item.account?.name
      ) {
        map.set(
          item.account.id,
          item.account
        );
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );
  }, [items]);

  /* =======================================================
     CLIENT SEARCH
  ======================================================= */

  const displayedItems = useMemo(() => {
    if (!filter.search.trim()) {
      return items;
    }

    const keyword =
      filter.search
        .toLowerCase()
        .trim();

    return items.filter((item) => {
      const values = [
        item.note,
        item.description,
        item.category?.name,
        item.account?.name,
        TX_LABEL[item.type],
      ];

      return values.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [items, filter.search]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;

    items.forEach((item) => {
      const amount =
        Number(item.amount) || 0;

      if (item.type === 'INCOME') {
        income += amount;
      }

      if (item.type === 'EXPENSE') {
        expense += amount;
      }

      if (item.type === 'TRANSFER') {
        transfer += amount;
      }
    });

    return {
      income,
      expense,
      transfer,
      net: income - expense,
    };
  }, [items]);

  /* =======================================================
     ACTIVE FILTER
  ======================================================= */

  const activeFilters = [];

  if (filter.startDate) {
    activeFilters.push({
      key: 'startDate',
      label: `Mulai ${formatDate(
        filter.startDate
      )}`,
    });
  }

  if (filter.endDate) {
    activeFilters.push({
      key: 'endDate',
      label: `Sampai ${formatDate(
        filter.endDate
      )}`,
    });
  }

  if (filter.type) {
    activeFilters.push({
      key: 'type',
      label: TX_LABEL[filter.type],
    });
  }

  if (filter.categoryId) {
    const category =
      categories.find(
        (c) =>
          c.id ===
          filter.categoryId
      );

    if (category) {
      activeFilters.push({
        key: 'categoryId',
        label: category.name,
      });
    }
  }

  if (filter.accountId) {
    const account =
      accounts.find(
        (a) =>
          a.id ===
          filter.accountId
      );

    if (account) {
      activeFilters.push({
        key: 'accountId',
        label: account.name,
      });
    }
  }

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  const exportCSV = async () => {
    try {
      const params = {
        page: 1,
        pageSize: total || 1000,
      };

      if (filter.type) {
        params.type = filter.type;
      }

      if (filter.categoryId) {
        params.categoryId =
          filter.categoryId;
      }

      if (filter.accountId) {
        params.accountId =
          filter.accountId;
      }

      if (filter.startDate) {
        params.startDate =
          filter.startDate;
      }

      if (filter.endDate) {
        params.endDate =
          filter.endDate;
      }

      const response =
        await api.get(
          '/transactions',
          { params }
        );

      const exportItems =
        response.data?.items || [];

      if (!exportItems.length) {
        alert(
          'Tidak ada transaksi yang dapat diekspor.'
        );

        return;
      }

      const headers = [
        'Tanggal',
        'Jenis',
        'Kategori',
        'Rekening',
        'Catatan',
        'Nominal',
      ];

      const rows =
        exportItems.map((item) => [
          formatDate(item.date),
          TX_LABEL[item.type] ||
            item.type,
          item.category?.name ||
            '-',
          item.account?.name ||
            '-',
          item.note ||
            item.description ||
            '-',
          Number(item.amount) || 0,
        ]);

      const csv = [
        headers,
        ...rows,
      ]
        .map((row) =>
          row
            .map(escapeCsv)
            .join(',')
        )
        .join('\n');

      const blob = new Blob(
        ['\uFEFF' + csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;

      link.download =
        `famfin-transaksi-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        'Export error:',
        error
      );

      alert(
        'Gagal melakukan export CSV.'
      );
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">

        <div className="p-6 lg:p-7">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                Keuangan Keluarga
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Transaksi
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Catat pemasukan, pengeluaran,
                dan transfer dengan mudah.
              </p>

            </div>

            <div className="flex flex-wrap gap-2.5">

              <QuickBtn
                label="+ Pemasukan"
                color="bg-emerald-600 hover:bg-emerald-700"
                onClick={() =>
                  setTab('income')
                }
              />

              <QuickBtn
                label="+ Pengeluaran"
                color="bg-red-600 hover:bg-red-700"
                onClick={() =>
                  setTab('expense')
                }
              />

              <QuickBtn
                label="↔ Transfer"
                color="bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  setTab('transfer')
                }
              />

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          TRANSACTION FORM
      ================================================= */}

      {tab && (
        <TransactionForm
          type={tab}
          accounts={accounts}
          categories={categories}
          onClose={() =>
            setTab(null)
          }
          onSaved={() => {
            setTab(null);
            loadAll(true);
          }}
        />
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          label="Pemasukan"
          value={summary.income}
          color="emerald"
        />

        <SummaryCard
          label="Pengeluaran"
          value={summary.expense}
          color="red"
        />

        <SummaryCard
          label="Cash Flow"
          value={summary.net}
          color={
            summary.net >= 0
              ? 'blue'
              : 'red'
          }
        />

        <SummaryCard
          label="Transfer"
          value={summary.transfer}
          color="slate"
        />

      </section>

      {/* =================================================
          HISTORY
      ================================================= */}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        {/* HEADER */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Riwayat Transaksi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cari, filter, dan kelola
              aktivitas keuangan keluarga.
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                loadAll(true)
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
                disabled:opacity-50
              "
            >
              {refreshing
                ? 'Memuat...'
                : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
              "
            >
              Export CSV
            </button>

          </div>

        </div>

        {/* =================================================
            FILTER PANEL
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">

          <div className="mb-4 flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold text-slate-800">
                Filter transaksi
              </p>

              <p className="text-xs text-slate-500">
                Persempit data sesuai kebutuhan.
              </p>

            </div>

            <button
              type="button"
              onClick={resetFilter}
              disabled={
                activeFilters.length === 0 &&
                !filter.search
              }
              className="
                text-xs
                font-semibold
                text-blue-600
                transition
                hover:text-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Reset semua
            </button>

          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">

            {/* SEARCH */}

            <div className="xl:col-span-2">

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Cari transaksi
              </label>

              <input
                type="text"
                placeholder="Cari catatan, kategori, rekening..."
                value={filter.search}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    search:
                      e.target.value,
                  }))
                }
                className="
                  h-10
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:ring-2
                  focus:ring-blue-100
                "
              />

            </div>

            {/* JENIS */}

            <FilterSelect
              label="Jenis"
              value={filter.type}
              onChange={(value) =>
                updateFilter(
                  'type',
                  value
                )
              }
            >
              <option value="">
                Semua Jenis
              </option>

              <option value="INCOME">
                Pemasukan
              </option>

              <option value="EXPENSE">
                Pengeluaran
              </option>

              <option value="TRANSFER">
                Transfer
              </option>

            </FilterSelect>

            {/* KATEGORI */}

            <FilterSelect
              label="Kategori"
              value={filter.categoryId}
              onChange={(value) =>
                updateFilter(
                  'categoryId',
                  value
                )
              }
            >
              <option value="">
                Semua Kategori
              </option>

              {availableCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}

            </FilterSelect>

            {/* ACCOUNT */}

            <FilterSelect
              label="Rekening"
              value={filter.accountId}
              onChange={(value) =>
                updateFilter(
                  'accountId',
                  value
                )
              }
            >
              <option value="">
                Semua Rekening
              </option>

              {availableAccounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                  </option>
                )
              )}

            </FilterSelect>

          </div>

          {/* DATE */}

          <div className="mt-4">

            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <label className="text-xs font-semibold text-slate-500">
                Periode tanggal
              </label>

              <div className="flex flex-wrap gap-1.5">

                <QuickPeriodBtn
                  label="Hari ini"
                  onClick={() =>
                    setQuickPeriod(
                      'today'
                    )
                  }
                />

                <QuickPeriodBtn
                  label="7 hari"
                  onClick={() =>
                    setQuickPeriod(
                      '7days'
                    )
                  }
                />

                <QuickPeriodBtn
                  label="Bulan ini"
                  onClick={() =>
                    setQuickPeriod(
                      'thisMonth'
                    )
                  }
                />

                <QuickPeriodBtn
                  label="Bulan lalu"
                  onClick={() =>
                    setQuickPeriod(
                      'lastMonth'
                    )
                  }
                />

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <DateInput
                label="Tanggal mulai"
                value={
                  filter.startDate
                }
                onChange={(value) =>
                  updateFilter(
                    'startDate',
                    value
                  )
                }
              />

              <DateInput
                label="Tanggal akhir"
                value={
                  filter.endDate
                }
                min={
                  filter.startDate ||
                  undefined
                }
                onChange={(value) =>
                  updateFilter(
                    'endDate',
                    value
                  )
                }
              />

            </div>

          </div>

          {/* ACTIVE CHIPS */}

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">

              <span className="text-xs text-slate-400">
                Filter aktif:
              </span>

              {activeFilters.map(
                (item) => (
                  <span
                    key={item.key}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-blue-100
                      bg-blue-50
                      px-3
                      py-1
                      text-xs
                      font-medium
                      text-blue-600
                    "
                  >
                    {item.label}

                    <button
                      type="button"
                      onClick={() =>
                        updateFilter(
                          item.key,
                          ''
                        )
                      }
                      className="text-blue-400 hover:text-blue-700"
                    >
                      ×
                    </button>

                  </span>
                )
              )}

            </div>
          )}

        </div>

        {/* RESULT INFO */}

        <div className="mt-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            Menampilkan{' '}
            <span className="font-semibold text-slate-700">
              {displayedItems.length}
            </span>{' '}
            transaksi dari{' '}
            <span className="font-semibold text-slate-700">
              {total}
            </span>{' '}
            data
          </p>

          {(filter.startDate ||
            filter.endDate) && (
            <p className="text-xs text-slate-400">
              {filter.startDate
                ? formatDate(
                    filter.startDate
                  )
                : 'Awal'}
              {' — '}
              {filter.endDate
                ? formatDate(
                    filter.endDate
                  )
                : 'Sekarang'}
            </p>
          )}

        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="mt-3 overflow-x-auto">

          {loading ? (
            <TransactionSkeleton />
          ) : displayedItems.length ===
            0 ? (
            <EmptyState
              hasFilter={
                activeFilters.length >
                  0 ||
                filter.search
              }
              onReset={resetFilter}
            />
          ) : (
            <table className="w-full min-w-[850px] text-sm">

              <thead>

                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">

                  <th className="px-4 py-4">
                    Tanggal
                  </th>

                  <th className="px-4 py-4">
                    Jenis
                  </th>

                  <th className="px-4 py-4">
                    Kategori
                  </th>

                  <th className="px-4 py-4">
                    Rekening
                  </th>

                  <th className="px-4 py-4">
                    Catatan
                  </th>

                  <th className="px-4 py-4 text-right">
                    Nominal
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {displayedItems.map(
                  (item) => (
                    <TransactionRow
                      key={item.id}
                      item={item}
                    />
                  )
                )}

              </tbody>

            </table>
          )}

        </div>

        {/* PAGINATION */}

        {!loading &&
          displayedItems.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              className="mt-5"
            />
          )}

      </section>

    </div>
  );
}

/* =========================================================
   TRANSACTION ROW
========================================================= */

function TransactionRow({ item }) {
  const amount =
    Number(item.amount) || 0;

  let amountPrefix = '';

  if (item.type === 'INCOME') {
    amountPrefix = '+ ';
  }

  if (item.type === 'EXPENSE') {
    amountPrefix = '- ';
  }

  return (
    <tr className="group transition hover:bg-slate-50/80">

      <td className="px-4 py-4">

        <div className="font-medium text-slate-700">
          {formatDate(item.date)}
        </div>

      </td>

      <td className="px-4 py-4">

        <span
          className={`
            inline-flex
            rounded-full
            border
            px-3
            py-1
            text-xs
            font-semibold
            ${TX_COLOR[item.type]}
            ${TX_BG[item.type]}
          `}
        >
          {TX_LABEL[item.type] ||
            item.type}
        </span>

      </td>

      <td className="px-4 py-4 text-slate-700">
        {item.category?.name ||
          '-'}
      </td>

      <td className="px-4 py-4 text-slate-700">
        {item.account?.name ||
          '-'}
      </td>

      <td className="max-w-[260px] px-4 py-4 text-slate-500">

        <span
          className="block truncate"
          title={
            item.note ||
            item.description ||
            '-'
          }
        >
          {item.note ||
            item.description ||
            '-'}
        </span>

      </td>

      <td
        className={`
          px-4
          py-4
          text-right
          font-semibold
          ${TX_COLOR[item.type]}
        `}
      >
        {amountPrefix}
        {formatRupiah(amount)}
      </td>

    </tr>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  color,
}) {
  const colors = {
    emerald:
      'border-emerald-100 bg-emerald-50/70 text-emerald-600',

    red:
      'border-red-100 bg-red-50/70 text-red-600',

    blue:
      'border-blue-100 bg-blue-50/70 text-blue-600',

    slate:
      'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <div
      className={`
        rounded-[1.5rem]
        border
        p-5
        ${colors[color]}
      `}
    >

      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold">
        {formatRupiah(value)}
      </p>

    </div>
  );
}

/* =========================================================
   QUICK BUTTON
========================================================= */

function QuickBtn({
  label,
  color,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-xl
        px-4
        py-2.5
        text-sm
        font-semibold
        text-white
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
        ${color}
      `}
    >
      {label}
    </button>
  );
}

/* =========================================================
   QUICK PERIOD
========================================================= */

function QuickPeriodBtn({
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        rounded-lg
        border
        border-slate-200
        bg-white
        px-2.5
        py-1.5
        text-[11px]
        font-medium
        text-slate-500
        transition
        hover:border-blue-200
        hover:bg-blue-50
        hover:text-blue-600
      "
    >
      {label}
    </button>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <div>

      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="
          h-10
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          text-sm
          text-slate-700
          outline-none
          transition
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
        "
      >
        {children}
      </select>

    </div>
  );
}

/* =========================================================
   DATE INPUT
========================================================= */

function DateInput({
  label,
  value,
  min,
  onChange,
}) {
  return (
    <div>

      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>

      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="
          h-10
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          text-sm
          text-slate-700
          outline-none
          transition
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
        "
      />

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  hasFilter,
  onReset,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
        Rp
      </div>

      <h3 className="mt-4 font-semibold text-slate-700">
        {hasFilter
          ? 'Transaksi tidak ditemukan'
          : 'Belum ada transaksi'}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {hasFilter
          ? 'Coba ubah periode atau filter yang dipilih untuk menemukan transaksi lainnya.'
          : 'Belum ada transaksi yang tercatat. Yuk mulai catat transaksi pertama.'}
      </p>

      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="
            mt-4
            rounded-xl
            bg-blue-600
            px-4
            py-2
            text-sm
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

/* =========================================================
   SKELETON
========================================================= */

function TransactionSkeleton() {
  return (
    <div className="space-y-3 py-3">

      {[1, 2, 3, 4, 5].map(
        (item) => (
          <div
            key={item}
            className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 p-4"
          >

            <div className="h-4 w-24 rounded bg-slate-100" />

            <div className="h-6 w-24 rounded-full bg-slate-100" />

            <div className="h-4 w-28 rounded bg-slate-100" />

            <div className="h-4 w-32 rounded bg-slate-100" />

            <div className="h-4 flex-1 rounded bg-slate-100" />

            <div className="h-4 w-28 rounded bg-slate-100" />

          </div>
        )
      )}

    </div>
  );
}

/* =========================================================
   TRANSACTION FORM
========================================================= */

function TransactionForm({
  type,
  accounts,
  categories,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    accountId: '',
    toAccountId: '',
    categoryId: '',
    amount: '',
    date: new Date()
      .toISOString()
      .slice(0, 10),
    note: '',
  });

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const catType =
    type === 'income'
      ? 'INCOME'
      : 'EXPENSE';

  const filteredCategories =
    categories.filter(
      (category) =>
        category.type === catType
    );

  const title = {
    income: 'Tambah Pemasukan',
    expense: 'Tambah Pengeluaran',
    transfer: 'Pindahkan Uang',
  }[type];

  const description = {
    income:
      'Tambahkan uang yang masuk ke rekening keluarga.',
    expense:
      'Catat pengeluaran agar kondisi keuangan tetap terkontrol.',
    transfer:
      'Pindahkan dana dari satu rekening ke rekening lainnya.',
  }[type];

  /* =======================================================
     AMOUNT
  ======================================================= */

  const handleAmountChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm((prev) => ({
      ...prev,
      amount:
        formatNumber(value),
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async (
    event,
    confirmLowBalance = false
  ) => {
    event.preventDefault();

    setError('');

    const amount =
      parseNumber(form.amount);

    if (!amount || amount <= 0) {
      setError(
        'Nominal harus lebih dari 0.'
      );

      return;
    }

    if (
      type === 'transfer' &&
      form.accountId ===
        form.toAccountId
    ) {
      setError(
        'Rekening sumber dan tujuan harus berbeda.'
      );

      return;
    }

    setSaving(true);

    try {
      if (type === 'income') {
        await api.post(
          '/transactions/income',
          {
            ...form,
            amount,
          }
        );
      }

      if (type === 'expense') {
        await api.post(
          '/transactions/expense',
          {
            ...form,
            amount,
            confirmLowBalance,
          }
        );
      }

      if (type === 'transfer') {
        await api.post(
          '/transactions/transfer',
          {
            fromAccountId:
              form.accountId,

            toAccountId:
              form.toAccountId,

            amount,

            date: form.date,

            note: form.note,
          }
        );
      }

      onSaved();
    } catch (err) {
      if (
        err.response?.data?.code ===
        'LOW_BALANCE_WARNING'
      ) {
        const confirmed =
          window.confirm(
            'Saldo rekening tidak mencukupi. Tetap simpan transaksi ini?'
          );

        if (confirmed) {
          setSaving(false);

          return submit(
            event,
            true
          );
        }
      } else {
        setError(
          err.response?.data?.message ||
            'Gagal menyimpan transaksi.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* HEADER */}

      <div className="mb-6 flex items-start justify-between gap-4">

        <div>

          <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            {type === 'income'
              ? 'Uang Masuk'
              : type === 'expense'
              ? 'Uang Keluar'
              : 'Transfer Dana'}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>

        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-xl
            bg-slate-100
            text-slate-400
            transition
            hover:bg-slate-200
            hover:text-slate-700
          "
        >
          ×
        </button>

      </div>

      {/* FORM */}

      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >

        {/* NOMINAL */}

        <div>

          <label className="mb-1.5 block text-xs font-semibold text-slate-500">
            Nominal
          </label>

          <div className="relative">

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              Rp
            </span>

            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="0"
              value={form.amount}
              onChange={
                handleAmountChange
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-10
                pr-3
                text-sm
                font-semibold
                text-slate-800
                outline-none
                transition
                placeholder:font-normal
                placeholder:text-slate-300
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-100
              "
            />

          </div>

          <p className="mt-1.5 text-[11px] text-slate-400">
            Nominal otomatis menggunakan
            pemisah ribuan.
          </p>

        </div>

        {/* CATEGORY */}

        {type !== 'transfer' && (
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Kategori
            </label>

            <select
              required
              value={
                form.categoryId
              }
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  categoryId:
                    e.target.value,
                }))
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                text-slate-700
                outline-none
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-100
              "
            >

              <option value="">
                Pilih kategori
              </option>

              {filteredCategories.map(
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
        )}

        {/* ACCOUNT */}

        <div>

          <label className="mb-1.5 block text-xs font-semibold text-slate-500">
            {type === 'transfer'
              ? 'Rekening Sumber'
              : type === 'income'
              ? 'Rekening Tujuan'
              : 'Rekening Sumber'}
          </label>

          <select
            required
            value={
              form.accountId
            }
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                accountId:
                  e.target.value,
              }))
            }
            className="
              h-11
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              text-slate-700
              outline-none
              focus:border-blue-400
              focus:ring-2
              focus:ring-blue-100
            "
          >

            <option value="">
              Pilih rekening
            </option>

            {accounts.map(
              (account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              )
            )}

          </select>

        </div>

        {/* TARGET ACCOUNT */}

        {type === 'transfer' && (
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Rekening Tujuan
            </label>

            <select
              required
              value={
                form.toAccountId
              }
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  toAccountId:
                    e.target.value,
                }))
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                text-slate-700
                outline-none
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-100
              "
            >

              <option value="">
                Pilih rekening
              </option>

              {accounts
                .filter(
                  (account) =>
                    account.id !==
                    form.accountId
                )
                .map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name}
                    </option>
                  )
                )}

            </select>

          </div>
        )}

        {/* DATE */}

        <div>

          <label className="mb-1.5 block text-xs font-semibold text-slate-500">
            Tanggal
          </label>

          <input
            type="date"
            required
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
            className="
              h-11
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              text-slate-700
              outline-none
              focus:border-blue-400
              focus:ring-2
              focus:ring-blue-100
            "
          />

        </div>

        {/* NOTE */}

        <div className="md:col-span-2">

          <label className="mb-1.5 block text-xs font-semibold text-slate-500">
            Catatan
            <span className="ml-1 font-normal text-slate-400">
              (opsional)
            </span>
          </label>

          <input
            type="text"
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            placeholder="Contoh: Belanja bulanan, gaji Agustus..."
            className="
              h-11
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              text-slate-700
              outline-none
              placeholder:text-slate-300
              focus:border-blue-400
              focus:ring-2
              focus:ring-blue-100
            "
          />

        </div>

        {/* ERROR */}

        {error && (
          <div className="md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ACTION */}

        <div className="flex justify-end gap-2 md:col-span-2">

          <button
            type="button"
            onClick={onClose}
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
            type="submit"
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
              : 'Simpan Transaksi'}
          </button>

        </div>

      </form>

    </section>
  );
}