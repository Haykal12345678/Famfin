import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const ACTION_STYLE = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function AuditLogs() {
  const { tenants, activeTenantId } = useAuth();
  const currentTenant = tenants.find((t) => t.id === activeTenantId);
  const [logs, setLogs] = useState([]);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/audit-logs', { params: { module: moduleFilter || undefined, page, pageSize } })
      .then((res) => {
        setLogs(res.data.items);
        setTotal(res.data.total || 0);
        setPage(res.data.page || page);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat audit log.'))
      .finally(() => setLoading(false));
  }, [moduleFilter, page]);

  if (currentTenant && !['OWNER', 'ADMIN'].includes(currentTenant.role)) {
    return <p className="text-sm text-gray-400">Hanya Owner/Admin yang dapat melihat Audit Log.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Audit Log</h1>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Modul</option>
          <option value="Transaction">Transaction</option>
          <option value="Account">Account</option>
          <option value="Category">Category</option>
          <option value="Budget">Budget</option>
          <option value="FinancialGoal">Financial Goal</option>
          <option value="Membership">Membership</option>
          <option value="Tenant">Tenant</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">Memuat...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Belum ada aktivitas tercatat.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="py-2 pr-4">Waktu</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Aksi</th>
                    <th className="py-2 pr-4">Modul</th>
                    <th className="py-2 pr-4">Detail Perubahan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 border-gray-50 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-500">{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                      <td className="py-2 pr-4">{log.user?.name || '-'}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_STYLE[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                      </td>
                      <td className="py-2 pr-4">{log.module}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500 max-w-md">
                        {log.oldValue && <div>Sebelum: <code className="break-all">{JSON.stringify(log.oldValue)}</code></div>}
                        {log.newValue && <div>Sesudah: <code className="break-all">{JSON.stringify(log.newValue)}</code></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} className="mt-4" />
          </>
        )}
      </div>
    </div>
  );
}
