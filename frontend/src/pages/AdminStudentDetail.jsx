import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export default function AdminStudentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    client.get(`/admin/students/${id}`).then((res) => setData(res.data));
  }, [id, refreshKey]);

  if (!data) {
    return <p className="text-sm text-gray-400">Loading student...</p>;
  }

  const { student, balance, fees, payments } = data;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{student.full_name}</h2>
      <p className="text-xs text-gray-400 mb-6">
        {student.student_id} &middot; {student.email} &middot; {student.programme || 'No programme'}
      </p>

      {/* Balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total owed</p>
          <p className="text-xl font-medium text-red-600">£{balance.total_owed.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Confirmed</p>
          <p className="text-xl font-medium text-green-600">£{balance.total_confirmed.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-xl font-medium text-amber-500">£{balance.total_pending.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Remaining</p>
          <p className="text-xl font-medium text-blue-600">£{balance.remaining.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fee items */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Fee items</h3>
          {fees.length === 0 ? (
            <p className="text-xs text-gray-400">No fee items</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-medium border-b">
                  <th className="text-left pb-2">Description</th>
                  <th className="text-left pb-2">Category</th>
                  <th className="text-right pb-2">Amount</th>
                  <th className="text-left pb-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="py-2 font-medium text-gray-900">{f.description || '—'}</td>
                    <td className="py-2 text-gray-500">{f.category || '—'}</td>
                    <td className="py-2 text-right text-gray-500">£{f.amount_due.toFixed(2)}</td>
                    <td className="py-2 text-gray-500">{f.due_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment history */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Payment history</h3>
          {payments.length === 0 ? (
            <p className="text-xs text-gray-400">No payments</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-medium border-b">
                  <th className="text-left pb-2">Date</th>
                  <th className="text-left pb-2">Method</th>
                  <th className="text-right pb-2">Amount</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 font-medium text-gray-900">{p.payment_date}</td>
                    <td className="py-2 text-gray-500">{p.payment_method || '—'}</td>
                    <td className="py-2 text-right text-gray-500">£{p.amount.toFixed(2)}</td>
                    <td className="py-2">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setDeleting(p)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleting && (
        <DeleteModal
          payment={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setRefreshKey((k) => k + 1);
            toast.success('Payment deleted');
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}
    </div>
  );
}

function DeleteModal({ payment, onClose, onDeleted, onError }) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await client.delete(`/admin/payments/${payment.id}`);
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
          You're about to delete the £{Number(payment.amount).toFixed(2)} {payment.status} payment from {payment.payment_date}.
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
