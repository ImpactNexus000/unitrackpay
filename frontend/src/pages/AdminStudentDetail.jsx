import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/admin/students/${id}`).then((res) => setData(res.data));
  }, [id]);

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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-600',
    confirmed: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
      {status}
    </span>
  );
}
