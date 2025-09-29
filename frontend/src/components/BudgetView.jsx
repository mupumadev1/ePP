import React, { useMemo, useState } from 'react';

const formatCurrency = (value) => {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  } catch {
    return `$${num.toLocaleString()}`;
  }
};

const BudgetView = ({ tenders = [] }) => {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const total = tenders.reduce((sum, t) => sum + (Number(t.estimated_value) || 0), 0);
    const byStatus = tenders.reduce((acc, t) => {
      const s = t.status || 'unknown';
      acc[s] = (acc[s] || 0) + (Number(t.estimated_value) || 0);
      return acc;
    }, {});
    return { total, byStatus };
  }, [tenders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenders;
    return tenders.filter(t =>
      String(t.title || t.name || '').toLowerCase().includes(q) ||
      String(t.reference || t.ref || '').toLowerCase().includes(q) ||
      String(t.status || '').toLowerCase().includes(q)
    );
  }, [tenders, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Budget Management</h2>
          <p className="text-gray-500 mt-1">Admin-only view to monitor procurement budgets.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Estimated Budget</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(stats.total)}</div>
        </div>
        {Object.entries(stats.byStatus).map(([status, amount]) => (
          <div key={status} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{String(status).toUpperCase()}</div>
            <div className="text-xl font-semibold mt-1">{formatCurrency(amount)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, reference, or status..."
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((t) => (
                <tr key={t.id || t.reference} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.reference || t.ref || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.title || t.name || 'Untitled'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{t.status || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(t.estimated_value)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-gray-500" colSpan={4}>No tenders match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">Note: Values shown are based on tenders' estimated_value fields.</p>
    </div>
  );
};

export default BudgetView;
