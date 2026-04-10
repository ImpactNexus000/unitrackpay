import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

const PAYMENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'online_portal', label: 'Online portal' },
  { value: 'cash', label: 'Cash' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

export default function PaymentHistory() {
  const [data, setData] = useState({ items: [], total: 0, total_confirmed: 0 });
  const [filters, setFilters] = useState({ method: '', status: '', reference: '' });
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.method) params.set('method', filters.method);
    if (filters.reference) params.set('reference', filters.reference);
    params.set('page', page);
    params.set('limit', limit);

    client
      .get(`/me/payments/?${params.toString()}`)
      .then((res) => setData(res.data));
  }, [filters, page]);

  const setFilter = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Method', 'Reference', 'Amount', 'Status', 'Verified by'];
    const rows = data.items.map((p) => [
      p.payment_date,
      p.notes || p.payment_method || '',
      p.payment_method || '',
      p.reference || '',
      p.amount,
      p.status,
      p.reviewed_by_name || '',
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = 'px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white';

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Payment History</h2>
      <p className="text-xs text-gray-400 mb-4">View and filter all your payment records</p>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap my-4">
        <select value={filters.method} onChange={setFilter('method')} className={inputClass}>
          {PAYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select value={filters.status} onChange={setFilter('status')} className={inputClass}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search reference..."
          value={filters.reference}
          onChange={setFilter('reference')}
          className={`${inputClass} w-44`}
        />

        <button
          onClick={exportCSV}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 text-xs font-medium border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Description</th>
              <th className="text-left py-2">Method</th>
              <th className="text-left py-2">Reference</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-left py-2">Receipt</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Verified by</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  No payments found
                </td>
              </tr>
            ) : (
              data.items.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 font-medium text-gray-900">{p.payment_date}</td>
                  <td className="py-2 font-medium text-gray-900">
                    {p.notes || p.payment_method || 'Payment'}
                  </td>
                  <td className="py-2 text-gray-500">{formatMethod(p.payment_method)}</td>
                  <td className="py-2 text-gray-500">{p.reference || '—'}</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    £{Number(p.amount).toFixed(2)}
                  </td>
                  <td className="py-2">
                    {p.receipt_url ? (
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 cursor-pointer"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-2">
                    {p.reviewed_by_name ? (
                      <span className="text-gray-500">{p.reviewed_by_name}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-3">
        Showing {data.items.length} of {data.total} records &middot; Total confirmed: £
        {Number(data.total_confirmed).toFixed(2)}
      </p>

      {/* Pagination */}
      {data.total > limit && (
        <div className="flex gap-2 mt-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-gray-500">
            Page {page} of {Math.ceil(data.total / limit)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / limit)}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatMethod(method) {
  const map = {
    bank_transfer: 'Bank transfer',
    card: 'Card',
    online_portal: 'Online portal',
    cash: 'Cash',
  };
  return map[method] || method || '—';
}

