import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import BalanceBar from '../components/BalanceBar';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/me/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return <p className="text-sm text-gray-400">Loading dashboard...</p>;
  }

  const { student, balance } = data;

  const timelineItems = data.recent_payments.map((p) => ({
    id: p.id,
    date: new Date(p.submitted_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }),
    title: p.description,
    detail: `£${p.amount.toFixed(2)} — ${p.status}`,
    status: p.status,
  }));

  return (
    <div>
      {/* --- Mobile layout (hidden on md+) --- */}
      <div className="md:hidden">
        {/* Balance card */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Outstanding balance</p>
          <p className="text-3xl font-medium text-red-500">
            £{balance.remaining.toFixed(2)}
          </p>
          {data.next_due && (
            <p className="text-xs text-gray-400 mt-1">
              Next payment due: {data.next_due.due_date}
            </p>
          )}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(balance.progress_pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              £{balance.total_confirmed.toFixed(2)} paid of £{balance.total_owed.toFixed(2)} total
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { to: '/log-payment', icon: '📋', label: 'Log Payment' },
            { to: '/receipts', icon: '📂', label: 'My Receipts' },
            { to: '/history', icon: '📊', label: 'History' },
            { to: '/settings', icon: '⚙️', label: 'Settings' },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="border border-gray-200 rounded-lg p-3 text-center bg-white"
            >
              <span className="text-lg mb-1 block">{a.icon}</span>
              <span className="text-xs font-medium text-gray-500">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent payments list */}
        <div>
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
            <span>Recent payments</span>
            <Link to="/history" className="text-blue-500">See all</Link>
          </div>
          {data.recent_payments.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No payments yet</p>
          ) : (
            data.recent_payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center py-2.5 border-b border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.submitted_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">£{p.amount.toFixed(2)}</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Desktop layout (hidden on mobile) --- */}
      <div className="hidden md:block">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Overview</h2>
        <p className="text-xs text-gray-400 mb-6">Welcome back, {student.name}</p>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MetricCard label="Total owed" value={`£${balance.total_owed.toFixed(2)}`} color="text-red-600" />
          <MetricCard label="Total paid" value={`£${balance.total_confirmed.toFixed(2)}`} color="text-green-600" />
          <MetricCard label="Remaining" value={`£${balance.remaining.toFixed(2)}`} color="text-blue-600" />
          <MetricCard label="Pending review" value={`£${balance.total_pending.toFixed(2)}`} color="text-amber-500" />
        </div>

        {/* Balance bar */}
        <div className="mb-6">
          <BalanceBar
            totalOwed={balance.total_owed}
            totalConfirmed={balance.total_confirmed}
            nextDue={data.next_due}
          />
        </div>

        {/* Two-column lower section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left — Recent payments */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">Recent payments</h3>
              <Link
                to="/history"
                className="text-xs border border-gray-200 rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-50"
              >
                View all
              </Link>
            </div>

            {data.recent_payments.length === 0 ? (
              <p className="text-xs text-gray-400">No payments yet</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-xs font-medium border-b">
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

            <Link
              to="/log-payment"
              className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 text-center mt-3 block hover:border-gray-400 hover:text-gray-500"
            >
              + Log a new payment
            </Link>
          </div>

          {/* Right — Timeline */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Timeline</h3>
            <Timeline items={timelineItems} />
          </div>
        </div>
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
