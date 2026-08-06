import { useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [cashflow, setCashflow] = useState(null);
  const [topCategory, setTopCategory] = useState([]);
  const [loading, setLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    try {
      const [cf, top] = await Promise.all([
        api.get('/reports/cashflow', { params: range }),
        api.get('/reports/top-expense-category', { params: range }),
      ]);
      setCashflow(cf.data);
      setTopCategory(top.data);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    const res = await api.get('/export/transactions', { params: range, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transaksi-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
            <p className="mt-1 text-sm text-slate-500">Lihat ringkasan cashflow dan kategori teratas.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={runReport} className="rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              {loading ? 'Memuat...' : 'Tampilkan Laporan'}
            </button>
            <button onClick={downloadCsv} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm hover:bg-slate-100">
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Dari</p>
            <p className="text-sm text-slate-900">{range.startDate || '-'} </p>
          </div>
          <div className="space-y-2 rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sampai</p>
            <p className="text-sm text-slate-900">{range.endDate || '-'} </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-xs text-slate-500">Dari Tanggal</label>
            <input type="date" className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" value={range.startDate} onChange={(e) => setRange({ ...range, startDate: e.target.value })} />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-xs text-slate-500">Sampai Tanggal</label>
            <input type="date" className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" value={range.endDate} onChange={(e) => setRange({ ...range, endDate: e.target.value })} />
          </div>
        </div>
      </div>

      {cashflow && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="Total Pemasukan" value={cashflow.totalIncome} color="text-emerald-600" />
          <Kpi label="Total Pengeluaran" value={cashflow.totalExpense} color="text-red-600" />
          <Kpi label="Net Cash Flow" value={cashflow.netCashFlow} color={cashflow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        </div>
      )}

      {topCategory.length > 0 && (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Top Kategori Pengeluaran</h2>
          <div className="space-y-2">
            {topCategory.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span>{i + 1}. {c.name}</span>
                <span className="font-semibold text-slate-900">{formatRupiah(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{formatRupiah(value)}</p>
    </div>
  );
}
