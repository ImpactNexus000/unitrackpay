import { useEffect, useState } from 'react';
import client from '../api/client';

export default function AdminQueue() {
  const [data, setData] = useState(null);
  const [reviewNote, setReviewNote] = useState({});

  const load = () => {
    client.get('/admin/queue').then((res) => setData(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (paymentId, action) => {
    try {
      await client.patch(`/admin/payments/${paymentId}`, {
        action,
        note: reviewNote[paymentId] || null,
      });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to review payment');
    }
  };

  if (!data) {
    return <p className="text-sm text-gray-400">Loading queue...</p>;
  }

  const { metrics, pending_submissions, recent_activity } = data;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Queue</h2>
      <p className="text-xs text-gray-400 mb-6">Review and process student payment submissions</p>

      {/* Metric cards — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-xl font-medium text-amber-500">{metrics.pending}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Confirmed today</p>
          <p className="text-xl font-medium text-green-600">{metrics.confirmed_today}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total received this month</p>
          <p className="text-xl font-medium text-gray-900">£{metrics.total_this_month.toFixed(2)}</p>
        </div>
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — Pending submissions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Pending submissions</h3>

          {pending_submissions.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-400">No pending submissions</p>
            </div>
          ) : (
            pending_submissions.map((p) => (
              <div
                key={p.id}
                className="border border-gray-200 rounded-lg p-4 mb-3 bg-white"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-sm font-medium">{p.student_name}</span>
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      {p.student_id}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                    pending
                  </span>
                </div>

                {/* Meta */}
                <p className="text-xs text-gray-400">
                  {p.payment_method || 'Payment'} &middot; £{p.amount.toFixed(2)} &middot;
                  Submitted {new Date(p.submitted_at).toLocaleDateString('en-GB')} &middot;
                  {p.reference ? ` Ref: ${p.reference}` : ' No ref'}
                </p>

                {p.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{p.notes}"</p>
                )}

                {/* Admin note input */}
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={reviewNote[p.id] || ''}
                  onChange={(e) =>
                    setReviewNote({ ...reviewNote, [p.id]: e.target.value })
                  }
                  className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-lg mt-2"
                />

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  {p.receipt_url && (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg"
                    >
                      View receipt
                    </a>
                  )}
                  <button
                    onClick={() => handleReview(p.id, 'confirmed')}
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleReview(p.id, 'rejected')}
                    className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right — Recent activity */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Recent activity</h3>
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            {recent_activity.length === 0 ? (
              <p className="text-xs text-gray-400">No recent activity</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-gray-400 text-xs font-medium border-b">
                    <th className="text-left py-2">Student</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_activity.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-2 font-medium text-gray-900">
                        {a.student_name}
                      </td>
                      <td className="py-2 text-gray-500">
                        {a.payment_method || '—'}
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        £{a.amount.toFixed(2)}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}
    >
      {status}
    </span>
  );
}
