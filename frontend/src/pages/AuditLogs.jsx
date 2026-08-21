import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import LoadingOverlay from '../components/LoadingOverlay';

const ACTION_STYLE = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  UPDATE: 'bg-amber-50 text-amber-700 border-amber-100',
  DELETE: 'bg-red-50 text-red-700 border-red-100',
};

const ACTION_DOT = {
  CREATE: 'bg-emerald-500',
  UPDATE: 'bg-amber-500',
  DELETE: 'bg-red-500',
};

const ACTION_LABEL = {
  CREATE: 'Dibuat',
  UPDATE: 'Diubah',
  DELETE: 'Dihapus',
};

const MODULE_LABEL = {
  Transaction: 'Transaksi',
  Account: 'Rekening',
  Category: 'Kategori',
  Budget: 'Budget',
  FinancialGoal: 'Target Tabungan',
  Membership: 'Anggota',
  Tenant: 'Keluarga',
};

const PERIOD_OPTIONS = [
  {
    value: '1m',
    label: '1 Bulan Terakhir',
  },
  {
    value: '3m',
    label: '3 Bulan Terakhir',
  },
  {
    value: '6m',
    label: '6 Bulan Terakhir',
  },
  {
    value: '1y',
    label: '1 Tahun Terakhir',
  },
  {
    value: 'all',
    label: 'Semua Waktu',
  },
];

export default function AuditLogs() {
  const { tenants, activeTenantId } = useAuth();

  const currentTenant = tenants?.find(
    (tenant) => tenant.id === activeTenantId
  );

  const [logs, setLogs] = useState([]);

  const [moduleFilter, setModuleFilter] = useState('');

  // Default hanya 1 bulan terakhir
  const [periodFilter, setPeriodFilter] = useState('1m');

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  /**
   * =========================================================
   * GET PERIOD DATE
   * =========================================================
   */
  const getPeriodDate = (period) => {
    if (!period || period === 'all') {
      return null;
    }

    const date = new Date();

    switch (period) {
      case '1m':
        date.setMonth(date.getMonth() - 1);
        break;

      case '3m':
        date.setMonth(date.getMonth() - 3);
        break;

      case '6m':
        date.setMonth(date.getMonth() - 6);
        break;

      case '1y':
        date.setFullYear(date.getFullYear() - 1);
        break;

      default:
        return null;
    }

    return date;
  };

  /**
   * =========================================================
   * LOAD LOGS
   * =========================================================
   */
  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const fromDate = getPeriodDate(periodFilter);

      const params = {
        module: moduleFilter || undefined,
        page,
        pageSize,
      };

      /**
       * Backend menerima filter tanggal jika tersedia.
       *
       * Kalau endpoint backend kamu menggunakan nama parameter
       * berbeda, tinggal sesuaikan:
       *
       * fromDate -> startDate
       */
      if (fromDate) {
        params.fromDate = fromDate.toISOString();
      }

      const response = await api.get('/audit-logs', {
        params,
      });

      const data = response.data || {};

      setLogs(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);

      if (data.page) {
        setPage(Number(data.page));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal memuat audit log. Silakan coba lagi.'
      );

      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================================================
   * EFFECT
   * =========================================================
   */
  useEffect(() => {
    loadLogs();
  }, [moduleFilter, periodFilter, page]);

  /**
   * =========================================================
   * EXPORT CSV
   * =========================================================
   */
  const handleExportCSV = async () => {
    if (exporting) return;

    setExporting(true);
    setError('');

    try {
      const fromDate = getPeriodDate(periodFilter);

      /**
       * Ambil seluruh data sesuai filter.
       *
       * Tidak menggunakan pagination halaman aktif.
       */
      const params = {
        module: moduleFilter || undefined,
        page: 1,

        // Angka besar supaya seluruh data terambil.
        pageSize: 10000,
      };

      if (fromDate) {
        params.fromDate = fromDate.toISOString();
      }

      const response = await api.get('/audit-logs', {
        params,
      });

      const data = response.data || {};

      const exportLogs = Array.isArray(data.items)
        ? data.items
        : [];

      if (exportLogs.length === 0) {
        setError(
          'Tidak ada data audit log yang dapat diexport.'
        );

        return;
      }

      /**
       * CSV HEADER
       */
      const headers = [
        'Waktu',
        'User',
        'Email',
        'Aksi',
        'Modul',
        'Sebelum',
        'Sesudah',
      ];

      /**
       * Escape CSV
       */
      const escapeCSV = (value) => {
        if (
          value === null ||
          value === undefined
        ) {
          return '';
        }

        let stringValue = String(value);

        /**
         * Kalau object / JSON
         */
        if (
          typeof value === 'object'
        ) {
          try {
            stringValue = JSON.stringify(value);
          } catch {
            stringValue = String(value);
          }
        }

        /**
         * Escape double quote
         */
        stringValue = stringValue.replace(
          /"/g,
          '""'
        );

        /**
         * Bungkus semua value dengan quote
         */
        return `"${stringValue}"`;
      };

      /**
       * CSV ROWS
       */
      const rows = exportLogs.map((log) => {
        return [
          formatDateTime(log.timestamp),

          log.user?.name || 'System',

          log.user?.email || '',

          ACTION_LABEL[log.action] ||
            log.action ||
            '-',

          MODULE_LABEL[log.module] ||
            log.module ||
            '-',

          formatValueForCSV(log.oldValue),

          formatValueForCSV(log.newValue),
        ]
          .map(escapeCSV)
          .join(',');
      });

      /**
       * BOM supaya Excel membaca UTF-8
       */
      const csvContent =
        '\uFEFF' +
        [
          headers.map(escapeCSV).join(','),
          ...rows,
        ].join('\r\n');

      const blob = new Blob(
        [csvContent],
        {
          type: 'text/csv;charset=utf-8;',
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;

      link.download = createExportFileName(
        periodFilter,
        moduleFilter
      );

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal melakukan export CSV. Silakan coba lagi.'
      );
    } finally {
      setExporting(false);
    }
  };

  /**
   * =========================================================
   * ACCESS CONTROL
   * =========================================================
   */
  if (
    currentTenant &&
    !['OWNER', 'ADMIN'].includes(
      currentTenant.role
    )
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.6 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Akses Tidak Diizinkan
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Hanya Owner atau Admin yang dapat
            melihat Audit Log keluarga.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* =====================================================
          LOADING OVERLAY
      ===================================================== */}

      <LoadingOverlay
        loading={loading || exporting}
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Audit Log
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pantau seluruh aktivitas dan perubahan
              data di FamFin.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* EXPORT */}

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={
                loading ||
                exporting ||
                logs.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-spin"
                >
                  <path d="M21 12a9 9 0 1 1-18 0" />
                </svg>
              ) : (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              )}

              {exporting
                ? 'Exporting...'
                : 'Export CSV'}
            </button>

            {/* REFRESH */}

            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              >
                <path d="M21 12a9 9 0 0 0-15.3-6.4L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 15.3 6.4L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>

              {loading
                ? 'Memuat...'
                : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTER
      ===================================================== */}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
          {/* MODULE */}

          <div>
            <label
              htmlFor="module-filter"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Filter Modul
            </label>

            <select
              id="module-filter"
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-50"
            >
              <option value="">
                Semua Modul
              </option>

              <option value="Transaction">
                Transaksi
              </option>

              <option value="Account">
                Rekening
              </option>

              <option value="Category">
                Kategori
              </option>

              <option value="Budget">
                Budget
              </option>

              <option value="FinancialGoal">
                Target Tabungan
              </option>

              <option value="Membership">
                Anggota
              </option>

              <option value="Tenant">
                Keluarga
              </option>
            </select>
          </div>

          {/* PERIOD */}

          <div>
            <label
              htmlFor="period-filter"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Periode
            </label>

            <select
              id="period-filter"
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-50"
            >
              {PERIOD_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* TOTAL */}

          <div className="flex items-end">
            <div className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-400">
                  Total aktivitas
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-800">
                  {total}
                </p>
              </div>

              {(moduleFilter ||
                periodFilter !== '1m') && (
                <button
                  type="button"
                  onClick={() => {
                    setModuleFilter('');
                    setPeriodFilter('1m');
                    setPage(1);
                  }}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE FILTER INFO */}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            Menampilkan:
          </span>

          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
            {
              PERIOD_OPTIONS.find(
                (item) =>
                  item.value === periodFilter
              )?.label
            }
          </span>

          {moduleFilter && (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {MODULE_LABEL[moduleFilter] ||
                moduleFilter}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-red-600">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <path d="m15 9-6 6" />

                <path d="m9 9 6 6" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Gagal memuat data
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-800">
                Riwayat Aktivitas
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Semua perubahan data yang tercatat
                oleh sistem.
              </p>
            </div>

            {moduleFilter && (
              <span className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                {MODULE_LABEL[moduleFilter] ||
                  moduleFilter}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState
            hasFilter={Boolean(
              moduleFilter ||
                periodFilter !== '1m'
            )}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Waktu
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      User
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Aksi
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Modul
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Detail Perubahan
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const actionStyle =
                      ACTION_STYLE[log.action] ||
                      'bg-slate-50 text-slate-600 border-slate-100';

                    const actionDot =
                      ACTION_DOT[log.action] ||
                      'bg-slate-400';

                    const actionLabel =
                      ACTION_LABEL[log.action] ||
                      log.action ||
                      '-';

                    const moduleLabel =
                      MODULE_LABEL[log.module] ||
                      log.module ||
                      '-';

                    return (
                      <tr
                        key={log.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* WAKTU */}

                        <td className="whitespace-nowrap px-6 py-4 align-top">
                          <p className="font-medium text-slate-700">
                            {formatDate(
                              log.timestamp
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatTime(
                              log.timestamp
                            )}
                          </p>
                        </td>

                        {/* USER */}

                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                              {getInitial(
                                log.user?.name ||
                                  'System'
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[180px] truncate font-semibold text-slate-800">
                                {log.user?.name ||
                                  'System'}
                              </p>

                              {log.user?.email && (
                                <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-400">
                                  {
                                    log.user
                                      .email
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* AKSI */}

                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${actionStyle}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${actionDot}`}
                            />

                            {actionLabel}
                          </span>
                        </td>

                        {/* MODUL */}

                        <td className="px-6 py-4 align-top">
                          <span className="inline-flex rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            {moduleLabel}
                          </span>
                        </td>

                        {/* DETAIL */}

                        <td className="max-w-[450px] px-6 py-4 align-top">
                          <AuditDetail
                            log={log}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Menampilkan{' '}
                  <span className="font-semibold text-slate-600">
                    {logs.length}
                  </span>{' '}
                  aktivitas pada halaman ini
                </p>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  className="mt-0"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          INFO
      ===================================================== */}

      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Audit Log FamFin
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Riwayat aktivitas digunakan untuk
              membantu monitoring, keamanan, dan
              pelacakan perubahan data keluarga.
            </p>
          </div>

          <div className="text-xs text-slate-400">
            {total} aktivitas tercatat
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   AUDIT DETAIL
========================================================= */

function AuditDetail({ log }) {
  const hasOldValue =
    log.oldValue !== null &&
    log.oldValue !== undefined;

  const hasNewValue =
    log.newValue !== null &&
    log.newValue !== undefined;

  if (!hasOldValue && !hasNewValue) {
    return (
      <span className="text-xs text-slate-400">
        Tidak ada detail perubahan
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {hasOldValue && (
        <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
            Sebelum
          </p>

          <code className="block max-h-28 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-red-700">
            {formatValue(log.oldValue)}
          </code>
        </div>
      )}

      {hasNewValue && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Sesudah
          </p>

          <code className="block max-h-28 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-emerald-700">
            {formatValue(log.newValue)}
          </code>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   LOADING STATE
========================================================= */

function LoadingState() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4"
        >
          <div className="h-10 w-24 rounded-xl bg-slate-100" />

          <div className="h-10 w-40 rounded-xl bg-slate-100" />

          <div className="h-7 w-24 rounded-full bg-slate-100" />

          <div className="h-7 w-28 rounded-xl bg-slate-100" />

          <div className="h-12 flex-1 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ hasFilter }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      </div>

      <h3 className="mt-4 font-semibold text-slate-700">
        {hasFilter
          ? 'Tidak ada aktivitas'
          : 'Belum ada aktivitas'}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {hasFilter
          ? 'Tidak ditemukan aktivitas untuk filter yang dipilih.'
          : 'Aktivitas perubahan data akan muncul di sini setelah ada aktivitas di sistem.'}
      </p>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitial(name) {
  if (!name) return 'U';

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleTimeString(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  );
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function formatValueForCSV(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createExportFileName(
  period,
  module
) {
  const date = new Date();

  const yyyy = date.getFullYear();

  const mm = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const dd = String(
    date.getDate()
  ).padStart(2, '0');

  const periodLabel =
    period || 'all';

  const moduleLabel =
    module || 'all-modules';

  return `famfin-audit-log-${moduleLabel}-${periodLabel}-${yyyy}-${mm}-${dd}.csv`;
}