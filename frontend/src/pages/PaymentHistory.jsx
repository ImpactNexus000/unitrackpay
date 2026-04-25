import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

function TableSkeleton() {
  return (
    <div>
      <div className="skeleton h-5 w-36 mb-1" />
      <div className="skeleton h-3 w-56 mb-4" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 w-28 rounded-lg" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

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

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'lab', label: 'Lab fees' },
  { value: 'library', label: 'Library' },
  { value: 'other', label: 'Other' },
];

const METHOD_OPTIONS = [
  { value: '', label: '—' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'online_portal', label: 'Online portal' },
  { value: 'cash', label: 'Cash' },
];

export default function PaymentHistory() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ method: '', status: '', reference: '' });
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
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
  }, [filters, page, refreshKey]);

  if (!data) return <TableSkeleton />;

  const setFilter = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  const refresh = () => setRefreshKey((k) => k + 1);

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

      {/* Mobile card layout */}
      <div className="md:hidden">
        {data.items.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.notes || p.payment_method || 'Payment'}
                    </p>
                    <p className="text-xs text-gray-400">{p.payment_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">£{Number(p.amount).toFixed(2)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{formatMethod(p.payment_method)}</span>
                  {p.reference && <span>Ref: {p.reference}</span>}
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                      View receipt
                    </a>
                  )}
                  {p.reviewed_by_name && <span>Verified by {p.reviewed_by_name}</span>}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-xs text-blue-600 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="text-xs text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400">
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
                  <td className="py-2 text-right">
                    {p.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditing(p)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
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

      {editing && (
        <EditModal
          payment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            toast.success('Payment updated');
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {deleting && (
        <DeleteModal
          payment={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refresh();
            toast.success('Payment deleted');
          }}
          onError={(msg) => toast.error(msg)}
        />
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

function EditModal({ payment, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    category: payment.category || '',
    amount: String(payment.amount ?? ''),
    payment_date: payment.payment_date || '',
    payment_method: payment.payment_method || '',
    reference: payment.reference || '',
    notes: payment.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.patch(`/me/payments/${payment.id}`, {
        category: form.category || null,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method || null,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Edit payment</h3>
        <p className="text-xs text-gray-400 mb-4">
          The current balance will update once you save.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (£)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={set('amount')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                required
                value={form.payment_date}
                onChange={set('payment_date')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Method</label>
            <select
              value={form.payment_method}
              onChange={set('payment_method')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Reference</label>
            <input
              type="text"
              value={form.reference}
              onChange={set('reference')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={set('notes')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ payment, onClose, onDeleted, onError }) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await client.delete(`/me/payments/${payment.id}`);
      onDeleted();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to delete payment');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete this payment?</h3>
        <p className="text-sm text-gray-600 mb-2">
          You're about to delete the £{Number(payment.amount).toFixed(2)} payment from {payment.payment_date}.
        </p>
        <p className="text-sm text-red-600 font-medium mb-4">
          This action cannot be undone.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={deleting}
            className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
