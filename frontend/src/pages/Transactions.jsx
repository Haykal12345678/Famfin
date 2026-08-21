import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';

import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';
import Pagination from '../components/Pagination';
import { formatRupiah } from '../utils/format';


// =========================================================
// CONSTANT
// =========================================================

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


// =========================================================
// HELPER
// =========================================================

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  const clean = String(value).replace(/\D/g, '');

  if (!clean) {
    return '';
  }

  return Number(clean).toLocaleString('id-ID');
}


function parseNumber(value) {
  if (!value) {
    return 0;
  }

  return Number(
    String(value)
      .replace(/\./g, '')
      .replace(/,/g, '')
      .replace(/\D/g, '')
  );
}


function formatDate(date) {
  if (!date) {
    return '-';
  }

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
  if (!date) {
    return '';
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}


// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Transactions() {

  // =======================================================
  // DATA
  // =======================================================

  const [tab, setTab] = useState(null);

  const [accounts, setAccounts] = useState([]);

  const [categories, setCategories] = useState([]);

  const [items, setItems] = useState([]);


  // =======================================================
  // FILTER
  // =======================================================

  const [filter, setFilter] = useState({
    type: '',
    categoryId: '',
    accountId: '',
    startDate: '',
    endDate: '',
    search: '',
  });


  // =======================================================
  // LOADING
  // =======================================================

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);


  // =======================================================
  // PROCESSING
  // =======================================================

  const [processing, setProcessing] = useState(false);

  const [processingTitle, setProcessingTitle] =
    useState('Memproses Data');

  const [processingMessage, setProcessingMessage] =
    useState('Mohon tunggu sebentar...');


  // =======================================================
  // PAGINATION
  // =======================================================

  const [page, setPage] = useState(1);

  const [pageSize] = useState(10);

  const [total, setTotal] = useState(0);


  // =======================================================
  // CONFIRM MODAL
  // =======================================================

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [pendingTransaction, setPendingTransaction] =
    useState(null);


  // =======================================================
  // SUCCESS POPUP
  // =======================================================

  const [success, setSuccess] = useState({
    show: false,
    title: '',
    message: '',
  });


  // =======================================================
  // ERROR POPUP
  // =======================================================

  const [errorPopup, setErrorPopup] = useState({
    show: false,
    title: '',
    message: '',
  });


  // =======================================================
  // ERROR
  // =======================================================

  const [error, setError] = useState('');


  // =======================================================
  // SUCCESS TIMER
  // =======================================================

  const successTimerRef = useRef(null);


  useEffect(() => {

    return () => {

      if (successTimerRef.current) {
        clearTimeout(
          successTimerRef.current
        );
      }

    };

  }, []);


  // =======================================================
  // LOAD DATA
  // =======================================================

  const loadAll = async (isRefresh = false) => {

    try {

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');


      const params = {
        page,
        pageSize,
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


      const [
        acc,
        cat,
        tx,
      ] = await Promise.all([

        api.get('/accounts'),

        api.get('/categories'),

        api.get(
          '/transactions',
          {
            params,
          }
        ),

      ]);


      setAccounts(
        acc.data || []
      );

      setCategories(
        cat.data || []
      );

      setItems(
        tx.data?.items || []
      );

      setTotal(
        tx.data?.total || 0
      );


      if (tx.data?.page) {

        setPage(
          tx.data.page
        );

      }

    } catch (err) {

      console.error(
        'Gagal memuat transaksi:',
        err
      );


      setItems([]);

      setTotal(0);


      setError(
        err.response?.data?.message ||
        'Gagal memuat transaksi.'
      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };


  // =======================================================
  // INITIAL / FILTER LOAD
  // =======================================================

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


  // =======================================================
  // SUCCESS POPUP
  // =======================================================

  const showSuccess = (
    title,
    message
  ) => {

    if (successTimerRef.current) {

      clearTimeout(
        successTimerRef.current
      );

    }


    setSuccess({
      show: true,
      title,
      message,
    });


    successTimerRef.current =
      setTimeout(() => {

        setSuccess((prev) => ({
          ...prev,
          show: false,
        }));

      }, 3000);

  };


  const closeSuccess = () => {

    if (successTimerRef.current) {

      clearTimeout(
        successTimerRef.current
      );

    }


    setSuccess((prev) => ({
      ...prev,
      show: false,
    }));

  };


  // =======================================================
  // ERROR POPUP
  // =======================================================

  const showErrorPopup = (
    title,
    message
  ) => {

    setErrorPopup({
      show: true,
      title,
      message,
    });

  };


  const closeErrorPopup = () => {

    setErrorPopup((prev) => ({
      ...prev,
      show: false,
    }));

  };


  // =======================================================
  // FILTER HANDLER
  // =======================================================

  const updateFilter = (
    key,
    value
  ) => {

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


  // =======================================================
  // QUICK DATE FILTER
  // =======================================================

  const setQuickPeriod = (
    period
  ) => {

    const today = new Date();

    let start = new Date(today);

    let end = new Date(today);


    if (period === 'today') {

      start = new Date(today);

      end = new Date(today);

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
      startDate:
        formatDateInput(start),
      endDate:
        formatDateInput(end),
    }));

    setPage(1);

  };


  // =======================================================
  // AVAILABLE FILTER DATA
  // =======================================================

  const availableCategories =
    useMemo(() => {

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


      return Array.from(
        map.values()
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

    }, [items]);


  const availableAccounts =
    useMemo(() => {

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


      return Array.from(
        map.values()
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

    }, [items]);


  // =======================================================
  // CLIENT SEARCH
  // =======================================================

  const displayedItems =
    useMemo(() => {

      if (!filter.search.trim()) {
        return items;
      }


      const keyword =
        filter.search
          .toLowerCase()
          .trim();


      return items.filter(
        (item) => {

          const values = [

            item.note,

            item.description,

            item.category?.name,

            item.account?.name,

            TX_LABEL[item.type],

          ];


          return values.some(
            (value) =>
              String(value || '')
                .toLowerCase()
                .includes(keyword)
          );

        }
      );

    }, [
      items,
      filter.search,
    ]);


  // =======================================================
  // SUMMARY
  // =======================================================

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


  // =======================================================
  // ACTIVE FILTER
  // =======================================================

  const activeFilters = [];


  if (filter.startDate) {

    activeFilters.push({
      key: 'startDate',
      label:
        `Mulai ${formatDate(
          filter.startDate
        )}`,
    });

  }


  if (filter.endDate) {

    activeFilters.push({
      key: 'endDate',
      label:
        `Sampai ${formatDate(
          filter.endDate
        )}`,
    });

  }


  if (filter.type) {

    activeFilters.push({
      key: 'type',
      label:
        TX_LABEL[filter.type],
    });

  }


  if (filter.categoryId) {

    const category =
      categories.find(
        (c) =>
          String(c.id) ===
          String(
            filter.categoryId
          )
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
          String(a.id) ===
          String(
            filter.accountId
          )
      );


    if (account) {

      activeFilters.push({
        key: 'accountId',
        label: account.name,
      });

    }

  }


  // =======================================================
  // EXPORT CSV
  // =======================================================

  const exportCSV = async () => {

    try {

      const params = {
        page: 1,
        pageSize:
          total || 1000,
      };


      if (filter.type) {

        params.type =
          filter.type;

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
          {
            params,
          }
        );


      const exportItems =
        response.data?.items ||
        [];


      if (!exportItems.length) {

        showErrorPopup(
          'Tidak Ada Data',
          'Tidak ada transaksi yang dapat diekspor berdasarkan filter yang dipilih.'
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
        exportItems.map(
          (item) => [

            formatDate(
              item.date
            ),

            TX_LABEL[item.type] ||
              item.type,

            item.category?.name ||
              '-',

            item.account?.name ||
              '-',

            item.note ||
              item.description ||
              '-',

            Number(item.amount) ||
              0,

          ]
        );


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


      const blob =
        new Blob(
          ['\uFEFF' + csv],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


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


      URL.revokeObjectURL(
        url
      );

    } catch (err) {

      console.error(
        'Export error:',
        err
      );


      showErrorPopup(
        'Export Gagal',
        err.response?.data?.message ||
          'Gagal melakukan export CSV. Silakan coba lagi.'
      );

    }

  };


  // =======================================================
  // OPEN TRANSACTION
  // =======================================================

  const openTransaction = (
    type
  ) => {

    if (processing) {
      return;
    }


    setError('');

    setShowConfirm(false);

    setPendingTransaction(null);

    setTab(type);

  };


  // =======================================================
  // TRANSACTION SAVED
  // =======================================================

  const handleTransactionSaved = (
    transactionType
  ) => {

    const transactionLabel = {

      income:
        'Pemasukan',

      expense:
        'Pengeluaran',

      transfer:
        'Transfer',

    };


    setShowConfirm(false);

    setPendingTransaction(null);

    setTab(null);


    showSuccess(
      'Transaksi Berhasil Disimpan',
      `${transactionLabel[transactionType]} berhasil disimpan.`
    );


    loadAll(true);

  };


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          PROCESSING OVERLAY
      ================================================= */}

      <LoadingOverlay
        loading={processing}
        title={processingTitle}
        message={processingMessage}
      />


      {/* =================================================
          SUCCESS POPUP
      ================================================= */}

      {success.show && (

        <SuccessPopup
          title={success.title}
          message={success.message}
          onClose={closeSuccess}
        />

      )}


      {/* =================================================
          ERROR POPUP
      ================================================= */}

      {errorPopup.show && (

        <ErrorPopup
          title={errorPopup.title}
          message={errorPopup.message}
          onClose={closeErrorPopup}
        />

      )}


      {/* =================================================
          HEADER
      ================================================= */}

      <section className="
        overflow-hidden
        rounded-[1.75rem]
        border
        border-slate-200
        bg-white
        shadow-sm
      ">

        <div className="relative p-6 lg:p-7">

          <div className="
            absolute
            right-0
            top-0
            h-40
            w-40
            rounded-full
            bg-blue-50/70
            blur-3xl
          " />


          <div className="
            relative
            flex
            flex-col
            gap-6
            lg:flex-row
            lg:items-center
            lg:justify-between
          ">

            <div>

              <h1 className="
                text-2xl
                font-bold
                tracking-tight
                text-slate-900
              ">
                Transaksi
              </h1>


              <p className="
                mt-1
                max-w-xl
                text-sm
                leading-6
                text-slate-500
              ">
                Catat pemasukan,
                pengeluaran,
                dan transfer
                dengan mudah.
              </p>

            </div>


            <div className="
              flex
              flex-wrap
              gap-2.5
            ">

              <QuickBtn
                label="+ Pemasukan"
                color="
                  bg-emerald-600
                  hover:bg-emerald-700
                "
                onClick={() =>
                  openTransaction(
                    'income'
                  )
                }
              />


              <QuickBtn
                label="+ Pengeluaran"
                color="
                  bg-rose-600
                  hover:bg-rose-700
                "
                onClick={() =>
                  openTransaction(
                    'expense'
                  )
                }
              />


              <QuickBtn
                label="↔ Transfer"
                color="
                  bg-blue-600
                  hover:bg-blue-700
                "
                onClick={() =>
                  openTransaction(
                    'transfer'
                  )
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
          processing={processing}
          setProcessing={
            setProcessing
          }
          setProcessingTitle={
            setProcessingTitle
          }
          setProcessingMessage={
            setProcessingMessage
          }
          showErrorPopup={
            showErrorPopup
          }

          onClose={() => {

            if (!processing) {

              setTab(null);

              setShowConfirm(false);

              setPendingTransaction(
                null
              );

            }

          }}

          onSaved={() =>
            handleTransactionSaved(
              tab
            )
          }

          onConfirmReady={(
            payload
          ) => {

            setPendingTransaction(
              payload
            );

            setShowConfirm(true);

          }}

        />

      )}


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="
        grid
        grid-cols-1
        gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">

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

      <section className="
        rounded-[1.75rem]
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        sm:p-6
      ">

        <div className="
          flex
          flex-col
          gap-4
          xl:flex-row
          xl:items-center
          xl:justify-between
        ">

          <div>

            <h2 className="
              text-lg
              font-semibold
              text-slate-900
            ">
              Riwayat Transaksi
            </h2>


            <p className="
              mt-1
              text-sm
              text-slate-500
            ">
              Cari, filter, dan kelola
              aktivitas keuangan keluarga.
            </p>

          </div>


          <div className="
            flex
            flex-wrap
            gap-2
          ">

            <button
              type="button"
              onClick={() =>
                loadAll(true)
              }
              disabled={
                refreshing ||
                processing
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
              onClick={exportCSV}
              disabled={
                processing
              }
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
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Export CSV
            </button>

          </div>

        </div>


        {/* =================================================
            FILTER
        ================================================= */}

        <div className="
          mt-6
          rounded-2xl
          border
          border-slate-200
          bg-slate-50/70
          p-4
        ">

          <div className="
            mb-4
            flex
            items-center
            justify-between
          ">

            <div>

              <p className="
                text-sm
                font-semibold
                text-slate-800
              ">
                Filter transaksi
              </p>


              <p className="
                text-xs
                text-slate-500
              ">
                Persempit data sesuai
                kebutuhan.
              </p>

            </div>


            <button
              type="button"
              onClick={resetFilter}
              disabled={
                (
                  activeFilters.length === 0 &&
                  !filter.search
                ) ||
                processing
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


          <div className="
            grid
            grid-cols-1
            gap-3
            md:grid-cols-2
            xl:grid-cols-5
          ">

            <div className="xl:col-span-2">

              <label className="
                mb-1.5
                block
                text-xs
                font-semibold
                text-slate-500
              ">
                Cari transaksi
              </label>


              <input
                type="text"
                disabled={processing}
                placeholder="
                  Cari catatan, kategori, rekening...
                "
                value={filter.search}
                onChange={(e) =>
                  setFilter(
                    (prev) => ({
                      ...prev,
                      search:
                        e.target.value,
                    })
                  )
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
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
              />

            </div>


            <FilterSelect
              label="Jenis"
              value={filter.type}
              onChange={(value) =>
                updateFilter(
                  'type',
                  value
                )
              }
              disabled={processing}
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


            <FilterSelect
              label="Kategori"
              value={
                filter.categoryId
              }
              onChange={(value) =>
                updateFilter(
                  'categoryId',
                  value
                )
              }
              disabled={processing}
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


            <FilterSelect
              label="Rekening"
              value={
                filter.accountId
              }
              onChange={(value) =>
                updateFilter(
                  'accountId',
                  value
                )
              }
              disabled={processing}
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


          {/* =================================================
              DATE FILTER
          ================================================= */}

          <div className="mt-4">

            <div className="
              mb-2
              flex
              flex-col
              gap-2
              sm:flex-row
              sm:items-center
              sm:justify-between
            ">

              <label className="
                text-xs
                font-semibold
                text-slate-500
              ">
                Periode tanggal
              </label>


              <div className="
                flex
                flex-wrap
                gap-1.5
              ">

                <QuickPeriodBtn
                  label="Hari ini"
                  onClick={() =>
                    setQuickPeriod(
                      'today'
                    )
                  }
                  disabled={processing}
                />


                <QuickPeriodBtn
                  label="7 hari"
                  onClick={() =>
                    setQuickPeriod(
                      '7days'
                    )
                  }
                  disabled={processing}
                />


                <QuickPeriodBtn
                  label="Bulan ini"
                  onClick={() =>
                    setQuickPeriod(
                      'thisMonth'
                    )
                  }
                  disabled={processing}
                />


                <QuickPeriodBtn
                  label="Bulan lalu"
                  onClick={() =>
                    setQuickPeriod(
                      'lastMonth'
                    )
                  }
                  disabled={processing}
                />

              </div>

            </div>


            <div className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
            ">

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
                disabled={processing}
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
                disabled={processing}
              />

            </div>

          </div>


          {/* =================================================
              ACTIVE FILTER
          ================================================= */}

          {activeFilters.length > 0 && (

            <div className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-2
            ">

              <span className="
                text-xs
                text-slate-400
              ">
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
                      disabled={
                        processing
                      }
                      onClick={() =>
                        updateFilter(
                          item.key,
                          ''
                        )
                      }
                      className="
                        text-blue-400
                        hover:text-blue-700
                        disabled:opacity-40
                      "
                    >
                      ×
                    </button>

                  </span>

                )
              )}

            </div>

          )}

        </div>


        {/* =================================================
            RESULT INFO
        ================================================= */}

        <div className="
          mt-5
          flex
          flex-col
          gap-2
          border-b
          border-slate-100
          pb-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        ">

          <p className="
            text-xs
            text-slate-500
          ">

            Menampilkan{' '}

            <span className="
              font-semibold
              text-slate-700
            ">
              {displayedItems.length}
            </span>{' '}

            transaksi dari{' '}

            <span className="
              font-semibold
              text-slate-700
            ">
              {total}
            </span>{' '}

            data

          </p>


          {(filter.startDate ||
            filter.endDate) && (

            <p className="
              text-xs
              text-slate-400
            ">

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
            ERROR INLINE
        ================================================= */}

        {error && !loading && (

          <div className="
            mt-4
            rounded-xl
            border
            border-red-100
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-600
          ">
            {error}
          </div>

        )}


        {/* =================================================
            TABLE
        ================================================= */}

        <div className="
          mt-3
          overflow-x-auto
        ">

          {loading ? (

            <TransactionSkeleton />

          ) : displayedItems.length === 0 ? (

            <EmptyState
              hasFilter={
                activeFilters.length > 0 ||
                !!filter.search
              }
              onReset={resetFilter}
            />

          ) : (

            <table className="
              w-full
              min-w-[850px]
              text-sm
            ">

              <thead>

                <tr className="
                  border-b
                  border-slate-100
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-400
                ">

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

                  <th className="
                    px-4
                    py-4
                    text-right
                  ">
                    Nominal
                  </th>

                </tr>

              </thead>


              <tbody className="
                divide-y
                divide-slate-100
              ">

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


        {/* =================================================
            PAGINATION
        ================================================= */}

        {!loading &&
          displayedItems.length > 0 && (

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={
                setPage
              }
              className="mt-5"
            />

          )}

      </section>


      {/* =================================================
          CONFIRM MODAL
      ================================================= */}

      <ConfirmModal

        open={showConfirm}

        title={
          pendingTransaction?.title ||
          'Simpan Transaksi?'
        }

        message={
          pendingTransaction?.message ||
          'Apakah Anda yakin ingin menyimpan transaksi ini?'
        }

        confirmText={
          pendingTransaction?.confirmText ||
          'Ya, Simpan'
        }

        cancelText="Batal"

        type={
          pendingTransaction?.label ===
          'Saldo Tidak Mencukupi'
            ? 'warning'
            : 'primary'
        }

        onConfirm={async () => {

          const transaction =
            pendingTransaction;


          if (
            !transaction?.submit
          ) {

            setShowConfirm(false);

            setPendingTransaction(
              null
            );

            return;

          }


          // Tutup modal terlebih dahulu

          setShowConfirm(false);

          setPendingTransaction(
            null
          );


          // Jalankan request

          await transaction.submit();

        }}

        onCancel={() => {

          if (processing) {
            return;
          }


          setShowConfirm(false);

          setPendingTransaction(
            null
          );

        }}

        loading={processing}

      />

    </div>
  );
}


// =========================================================
// TRANSACTION FORM
// =========================================================

function TransactionForm({
  type,
  accounts,
  categories,
  processing,
  setProcessing,
  setProcessingTitle,
  setProcessingMessage,
  showErrorPopup,
  onClose,
  onSaved,
  onConfirmReady,
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


  const [formError, setFormError] =
    useState('');


  const catType =
    type === 'income'
      ? 'INCOME'
      : 'EXPENSE';


  const filteredCategories =
    categories.filter(
      (category) =>
        category.type ===
          catType &&
        category.isActive !== false
    );


  const title = {

    income:
      'Tambah Pemasukan',

    expense:
      'Tambah Pengeluaran',

    transfer:
      'Pindahkan Uang',

  }[type];


  const description = {

    income:
      'Tambahkan uang yang masuk ke rekening keluarga.',

    expense:
      'Catat pengeluaran agar kondisi keuangan tetap terkontrol.',

    transfer:
      'Pindahkan dana dari satu rekening ke rekening lainnya.',

  }[type];


  // =======================================================
  // AMOUNT
  // =======================================================

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


  // =======================================================
  // VALIDATE
  // =======================================================

  const validate = () => {

    setFormError('');


    const amount =
      parseNumber(
        form.amount
      );


    if (
      !amount ||
      amount <= 0
    ) {

      showErrorPopup(
        'Nominal Tidak Valid',
        'Nominal transaksi harus lebih dari 0.'
      );

      return false;

    }


    if (!form.accountId) {

      showErrorPopup(
        'Rekening Belum Dipilih',
        type === 'income'
          ? 'Silakan pilih rekening tujuan untuk pemasukan.'
          : 'Silakan pilih rekening sumber untuk transaksi ini.'
      );

      return false;

    }


    if (
      type === 'transfer' &&
      !form.toAccountId
    ) {

      showErrorPopup(
        'Rekening Tujuan Belum Dipilih',
        'Silakan pilih rekening tujuan untuk transfer.'
      );

      return false;

    }


    if (
      type === 'transfer' &&
      String(
        form.accountId
      ) === String(
        form.toAccountId
      )
    ) {

      showErrorPopup(
        'Rekening Tidak Valid',
        'Rekening sumber dan rekening tujuan harus berbeda.'
      );

      return false;

    }


    if (
      type !== 'transfer' &&
      !form.categoryId
    ) {

      showErrorPopup(
        'Kategori Belum Dipilih',
        'Silakan pilih kategori transaksi terlebih dahulu.'
      );

      return false;

    }


    if (!form.date) {

      showErrorPopup(
        'Tanggal Belum Diisi',
        'Tanggal transaksi wajib diisi.'
      );

      return false;

    }


    return true;

  };


  // =======================================================
  // SUBMIT FORM
  // =======================================================

  const submit = (
    event
  ) => {

    event.preventDefault();


    if (processing) {
      return;
    }


    if (!validate()) {
      return;
    }


    const amount =
      parseNumber(
        form.amount
      );


    const sourceAccount =
      accounts.find(
        (account) =>
          String(
            account.id
          ) === String(
            form.accountId
          )
      );


    const targetAccount =
      accounts.find(
        (account) =>
          String(
            account.id
          ) === String(
            form.toAccountId
          )
      );


    const category =
      categories.find(
        (item) =>
          String(
            item.id
          ) === String(
            form.categoryId
          )
      );


    const transactionLabel = {

      income:
        'Pemasukan',

      expense:
        'Pengeluaran',

      transfer:
        'Transfer',

    };


    let message = '';


    if (
      type === 'income'
    ) {

      message =
        `Apakah Anda yakin ingin menambahkan pemasukan sebesar ${formatRupiah(amount)} ke rekening "${sourceAccount?.name || '-'}"?`;

    }


    if (
      type === 'expense'
    ) {

      message =
        `Apakah Anda yakin ingin mencatat pengeluaran sebesar ${formatRupiah(amount)} dari rekening "${sourceAccount?.name || '-'}" untuk kategori "${category?.name || '-'}"?`;

    }


    if (
      type === 'transfer'
    ) {

      message =
        `Apakah Anda yakin ingin memindahkan ${formatRupiah(amount)} dari rekening "${sourceAccount?.name || '-'}" ke rekening "${targetAccount?.name || '-'}"?`;

    }


    onConfirmReady({

      title:
        `Simpan ${transactionLabel[type]}?`,

      label:
        transactionLabel[type],

      message,

      confirmText:
        'Ya, Simpan',

      submit:
        () =>
          confirmSubmit(false),

    });

  };


  // =======================================================
  // CONFIRM SUBMIT
  // =======================================================

  const confirmSubmit = async (
    confirmLowBalance = false
  ) => {

    if (processing) {
      return;
    }


    const amount =
      parseNumber(
        form.amount
      );


    if (
      !amount ||
      amount <= 0
    ) {

      showErrorPopup(
        'Nominal Tidak Valid',
        'Nominal transaksi harus lebih dari 0.'
      );

      return;

    }


    setFormError('');

    setProcessing(true);


    const processingConfig = {

      income: {

        title:
          'Memproses Data',

        message:
          'Sedang memproses perubahan data. Mohon tunggu sebentar...',

      },

      expense: {

        title:
          'Memproses Data',

        message:
          'Sedang memproses perubahan data. Mohon tunggu sebentar...',

      },

      transfer: {

        title:
          'Memproses Data',

        message:
          'Sedang memproses perubahan data. Mohon tunggu sebentar...',


      },

    };


    setProcessingTitle(
      processingConfig[type].title
    );


    setProcessingMessage(
      processingConfig[type].message
    );


    try {

      // ===================================================
      // INCOME
      // ===================================================

      if (
        type === 'income'
      ) {

        await api.post(
          '/transactions/income',
          {

            accountId:
              form.accountId,

            categoryId:
              form.categoryId,

            amount,

            date:
              form.date,

            note:
              form.note,

          }
        );

      }


      // ===================================================
      // EXPENSE
      // ===================================================

      if (
        type === 'expense'
      ) {

        await api.post(
          '/transactions/expense',
          {

            accountId:
              form.accountId,

            categoryId:
              form.categoryId,

            amount,

            date:
              form.date,

            note:
              form.note,

            confirmLowBalance,

          }
        );

      }


      // ===================================================
      // TRANSFER
      // ===================================================

      if (
        type === 'transfer'
      ) {

        await api.post(
          '/transactions/transfer',
          {

            fromAccountId:
              form.accountId,

            toAccountId:
              form.toAccountId,

            amount,

            date:
              form.date,

            note:
              form.note,

          }
        );

      }


      // ===================================================
      // SUCCESS
      // ===================================================

      onSaved();


      // ===================================================
      // RESET FORM
      // ===================================================

      setForm({

        accountId: '',

        toAccountId: '',

        categoryId: '',

        amount: '',

        date: new Date()
          .toISOString()
          .slice(0, 10),

        note: '',

      });


    } catch (err) {

      console.error(
        'Gagal menyimpan transaksi:',
        err
      );


      // ===================================================
      // LOW BALANCE WARNING
      // ===================================================

      if (
        type === 'expense' &&
        err.response?.data?.code ===
          'LOW_BALANCE_WARNING'
      ) {

        /*
         * Pastikan processing mati
         * sebelum modal kedua dibuka.
         */

        setProcessing(false);


        /*
         * Confirmation kedua.
         */

        onConfirmReady({

          title:
            'Saldo Tidak Mencukupi',

          label:
            'Saldo Tidak Mencukupi',

          message:
            err.response?.data?.message ||
            'Saldo rekening tidak mencukupi. Apakah Anda tetap ingin menyimpan transaksi ini?',

          confirmText:
            'Tetap Simpan',

          submit:
            () =>
              confirmSubmit(true),

        });


        return;

      }


      // ===================================================
      // GENERAL ERROR
      // ===================================================

      showErrorPopup(
        'Transaksi Gagal',
        err.response?.data?.message ||
          'Gagal menyimpan transaksi. Silakan coba lagi.'
      );

    } finally {

      setProcessing(false);

    }

  };


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <section className="
      rounded-[1.75rem]
      border
      border-slate-200
      bg-white
      p-5
      shadow-sm
      sm:p-6
    ">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="
        mb-6
        flex
        items-start
        justify-between
        gap-4
      ">

        <div>

          <div className="
            mb-2
            inline-flex
            rounded-full
            bg-blue-50
            px-3
            py-1
            text-xs
            font-semibold
            text-blue-600
          ">

            {type === 'income'
              ? 'Uang Masuk'
              : type === 'expense'
              ? 'Uang Keluar'
              : 'Transfer Dana'}

          </div>


          <h2 className="
            text-xl
            font-bold
            text-slate-900
          ">
            {title}
          </h2>


          <p className="
            mt-1
            text-sm
            text-slate-500
          ">
            {description}
          </p>

        </div>


        <button
          type="button"
          disabled={processing}
          onClick={onClose}
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-xl
            bg-slate-100
            text-lg
            text-slate-400
            transition
            hover:bg-slate-200
            hover:text-slate-700
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          ×
        </button>

      </div>


      {/* =================================================
          FORM
      ================================================= */}

      <form
        onSubmit={submit}
        className="
          grid
          grid-cols-1
          gap-5
          md:grid-cols-2
        "
      >

        {/* =================================================
            NOMINAL
        ================================================= */}

        <div>

          <label className="
            mb-1.5
            block
            text-xs
            font-semibold
            text-slate-500
          ">
            Nominal
          </label>


          <div className="relative">

            <span className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-sm
              font-semibold
              text-slate-400
            ">
              Rp
            </span>


            <input
              type="text"
              inputMode="numeric"
              required
              disabled={processing}
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
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
            />

          </div>


          <p className="
            mt-1.5
            text-[11px]
            text-slate-400
          ">
            Nominal otomatis menggunakan
            pemisah ribuan.
          </p>

        </div>


        {/* =================================================
            CATEGORY
        ================================================= */}

        {type !== 'transfer' && (

          <div>

            <label className="
              mb-1.5
              block
              text-xs
              font-semibold
              text-slate-500
            ">
              Kategori
            </label>


            <select
              required
              disabled={processing}
              value={
                form.categoryId
              }
              onChange={(e) =>
                setForm(
                  (prev) => ({
                    ...prev,
                    categoryId:
                      e.target.value,
                  })
                )
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
                disabled:cursor-not-allowed
                disabled:bg-slate-50
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


        {/* =================================================
            ACCOUNT
        ================================================= */}

        <div>

          <label className="
            mb-1.5
            block
            text-xs
            font-semibold
            text-slate-500
          ">

            {type === 'transfer'
              ? 'Rekening Sumber'
              : type === 'income'
              ? 'Rekening Tujuan'
              : 'Rekening Sumber'}

          </label>


          <select
            required
            disabled={processing}
            value={
              form.accountId
            }
            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,
                  accountId:
                    e.target.value,
                })
              )
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
              disabled:cursor-not-allowed
              disabled:bg-slate-50
            "
          >

            <option value="">
              Pilih rekening
            </option>


            {accounts
              .filter(
                (account) =>
                  account.isActive !==
                  false
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


        {/* =================================================
            TARGET ACCOUNT
        ================================================= */}

        {type === 'transfer' && (

          <div>

            <label className="
              mb-1.5
              block
              text-xs
              font-semibold
              text-slate-500
            ">
              Rekening Tujuan
            </label>


            <select
              required
              disabled={processing}
              value={
                form.toAccountId
              }
              onChange={(e) =>
                setForm(
                  (prev) => ({
                    ...prev,
                    toAccountId:
                      e.target.value,
                  })
                )
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
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
            >

              <option value="">
                Pilih rekening
              </option>


              {accounts
                .filter(
                  (account) =>
                    String(
                      account.id
                    ) !==
                      String(
                        form.accountId
                      ) &&
                    account.isActive !==
                      false
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


        {/* =================================================
            DATE
        ================================================= */}

        <div>

          <label className="
            mb-1.5
            block
            text-xs
            font-semibold
            text-slate-500
          ">
            Tanggal
          </label>


          <input
            type="date"
            required
            disabled={processing}
            value={form.date}
            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,
                  date:
                    e.target.value,
                })
              )
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
              disabled:cursor-not-allowed
              disabled:bg-slate-50
            "
          />

        </div>


        {/* =================================================
            NOTE
        ================================================= */}

        <div className="
          md:col-span-2
        ">

          <label className="
            mb-1.5
            block
            text-xs
            font-semibold
            text-slate-500
          ">

            Catatan

            <span className="
              ml-1
              font-normal
              text-slate-400
            ">
              (opsional)
            </span>

          </label>


          <input
            type="text"
            disabled={processing}
            value={form.note}
            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,
                  note:
                    e.target.value,
                })
              )
            }
            placeholder="
              Contoh: Belanja bulanan, gaji Agustus...
            "
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
              disabled:cursor-not-allowed
              disabled:bg-slate-50
            "
          />

        </div>


        {/* =================================================
            FORM ERROR
        ================================================= */}

        {formError && (

          <div className="
            rounded-xl
            border
            border-red-100
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-600
            md:col-span-2
          ">
            {formError}
          </div>

        )}


        {/* =================================================
            ACTION
        ================================================= */}

        <div className="
          flex
          justify-end
          gap-2
          md:col-span-2
        ">

          <button
            type="button"
            disabled={processing}
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
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Batal
          </button>


          <button
            type="submit"
            disabled={processing}
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
            Simpan Transaksi
          </button>

        </div>

      </form>

    </section>
  );
}


// =========================================================
// TRANSACTION ROW
// =========================================================

function TransactionRow({
  item,
}) {

  const amount =
    Number(item.amount) || 0;


  let amountPrefix = '';


  if (
    item.type === 'INCOME'
  ) {

    amountPrefix = '+ ';

  }


  if (
    item.type === 'EXPENSE'
  ) {

    amountPrefix = '- ';

  }


  return (
    <tr className="
      group
      transition
      hover:bg-slate-50/80
    ">

      <td className="
        px-4
        py-4
      ">

        <div className="
          font-medium
          text-slate-700
        ">
          {formatDate(
            item.date
          )}
        </div>

      </td>


      <td className="
        px-4
        py-4
      ">

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


      <td className="
        px-4
        py-4
        text-slate-700
      ">
        {item.category?.name ||
          '-'}
      </td>


      <td className="
        px-4
        py-4
        text-slate-700
      ">
        {item.account?.name ||
          '-'}
      </td>


      <td className="
        max-w-[260px]
        px-4
        py-4
        text-slate-500
      ">

        <span
          className="
            block
            truncate
          "
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
        {formatRupiah(
          amount
        )}
      </td>

    </tr>
  );
}


// =========================================================
// SUMMARY CARD
// =========================================================

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
        ${colors[color] || colors.slate}
      `}
    >

      <p className="
        text-xs
        font-semibold
        uppercase
        tracking-wide
        opacity-70
      ">
        {label}
      </p>


      <p className="
        mt-2
        text-xl
        font-bold
      ">
        {formatRupiah(
          value
        )}
      </p>

    </div>
  );
}


// =========================================================
// QUICK BUTTON
// =========================================================

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


// =========================================================
// QUICK PERIOD
// =========================================================

function QuickPeriodBtn({
  label,
  onClick,
  disabled,
}) {

  return (
    <button
      type="button"
      disabled={disabled}
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
        disabled:cursor-not-allowed
        disabled:opacity-40
      "
    >
      {label}
    </button>
  );
}


// =========================================================
// FILTER SELECT
// =========================================================

function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled,
}) {

  return (
    <div>

      <label className="
        mb-1.5
        block
        text-xs
        font-semibold
        text-slate-500
      ">
        {label}
      </label>


      <select
        disabled={disabled}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
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
          disabled:cursor-not-allowed
          disabled:bg-slate-50
        "
      >
        {children}
      </select>

    </div>
  );
}


// =========================================================
// DATE INPUT
// =========================================================

function DateInput({
  label,
  value,
  min,
  onChange,
  disabled,
}) {

  return (
    <div>

      <label className="
        mb-1.5
        block
        text-xs
        font-medium
        text-slate-500
      ">
        {label}
      </label>


      <input
        type="date"
        disabled={disabled}
        value={value}
        min={min}
        onChange={(e) =>
          onChange(
            e.target.value
          )
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
          disabled:cursor-not-allowed
          disabled:bg-slate-50
        "
      />

    </div>
  );
}


// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({
  hasFilter,
  onReset,
}) {

  return (
    <div className="
      flex
      flex-col
      items-center
      justify-center
      rounded-2xl
      border
      border-dashed
      border-slate-200
      px-6
      py-14
      text-center
    ">

      <div className="
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-2xl
        bg-slate-100
        text-xl
        text-slate-400
      ">
        Rp
      </div>


      <h3 className="
        mt-4
        font-semibold
        text-slate-700
      ">

        {hasFilter
          ? 'Transaksi tidak ditemukan'
          : 'Belum ada transaksi'}

      </h3>


      <p className="
        mt-1
        max-w-sm
        text-sm
        leading-6
        text-slate-400
      ">

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


// =========================================================
// SKELETON
// =========================================================

function TransactionSkeleton() {

  return (
    <div className="
      space-y-3
      py-3
    ">

      {[
        1,
        2,
        3,
        4,
        5,
      ].map(
        (item) => (

          <div
            key={item}
            className="
              flex
              animate-pulse
              items-center
              gap-4
              rounded-xl
              border
              border-slate-100
              p-4
            "
          >

            <div className="
              h-4
              w-24
              rounded
              bg-slate-100
            " />


            <div className="
              h-6
              w-24
              rounded-full
              bg-slate-100
            " />


            <div className="
              h-4
              w-28
              rounded
              bg-slate-100
            " />


            <div className="
              h-4
              w-32
              rounded
              bg-slate-100
            " />


            <div className="
              h-4
              flex-1
              rounded
              bg-slate-100
            " />


            <div className="
              h-4
              w-28
              rounded
              bg-slate-100
            " />

          </div>

        )
      )}

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


// =========================================================
// ERROR POPUP
// =========================================================

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