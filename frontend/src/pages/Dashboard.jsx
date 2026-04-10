import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/me/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return <p className="text-sm text-gray-400">Loading dashboard...</p>;
  }

  const { student, balance } = data;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Overview</h2>
      <p className="text-xs text-gray-400 mb-6">Welcome back, {student.name}</p>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total owed" value={`£${balance.total_owed.toFixed(2)}`} color="text-red-600" />
        <MetricCard label="Total paid" value={`£${balance.total_confirmed.toFixed(2)}`} color="text-green-600" />
        <MetricCard label="Remaining" value={`£${balance.remaining.toFixed(2)}`} color="text-blue-600" />
        <MetricCard label="Pending review" value={`£${balance.total_pending.toFixed(2)}`} color="text-amber-500" />
      </div>

      {/* Progress bar */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-gray-400">Payment progress</span>
          <span className="text-xs text-gray-400">{balance.progress_pct}% complete</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div
            className="h-2 bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(balance.progress_pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">£0</span>
          {data.next_due && (
            <span className="text-xs text-gray-400">
              Next due: {data.next_due.due_date} &middot; £{data.next_due.amount.toFixed(2)}
            </span>
          )}
          <span className="text-xs text-gray-400">£{balance.total_owed.toFixed(2)}</span>
        </div>
      </div>

      {/* Recent payments */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Recent payments</h3>
        {data.recent_payments.length === 0 ? (
          <p className="text-xs text-gray-400">No payments yet</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 font-medium border-b">
                <th className="text-left pb-2">Description</th>
                <th className="text-right pb-2">Amount</th>
                <th className="text-right pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 font-medium text-gray-900">{p.description}</td>
                  <td className="py-2 text-right text-gray-500">£{p.amount.toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-medium ${color}`}>{value}</p>
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
