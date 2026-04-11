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
    return <DashboardSkeleton />;
  }

  const { student, balance, balance_by_category = [] } = data;

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
        {/* Per-category balance cards */}
        <div className="space-y-3 mb-4">
          {balance_by_category.map((cat) => (
            <div key={cat.category} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs font-medium text-gray-500 mb-1 capitalize">{cat.label}</p>
              <p className="text-2xl font-medium text-red-500">
                £{cat.remaining.toFixed(2)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Owed: </span>
                  <span className="text-red-600 font-medium">£{cat.total_owed.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Paid: </span>
                  <span className="text-green-600 font-medium">£{cat.total_confirmed.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(cat.progress_pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {cat.progress_pct}% complete
                  {cat.total_pending > 0 && ` · £${cat.total_pending.toFixed(2)} pending`}
                </p>
              </div>
            </div>
          ))}
          {data.next_due && (
            <p className="text-xs text-gray-400 text-center">
              Next payment due: {data.next_due.due_date}
            </p>
          )}
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
                    {p.category && <span className="capitalize">{p.category} · </span>}
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

        {/* Per-category metric rows */}
        <div className="space-y-4 mb-6">
          {balance_by_category.map((cat) => (
            <div key={cat.category}>
              <p className="text-xs font-medium text-gray-500 mb-2 capitalize">{cat.label}</p>
              <div className="grid grid-cols-4 gap-3">
                <MetricCard label="Total owed" value={`£${cat.total_owed.toFixed(2)}`} color="text-red-600" />
                <MetricCard label="Total paid" value={`£${cat.total_confirmed.toFixed(2)}`} color="text-green-600" />
                <MetricCard label="Remaining" value={`£${cat.remaining.toFixed(2)}`} color="text-blue-600" />
                <MetricCard label="Pending review" value={`£${cat.total_pending.toFixed(2)}`} color="text-amber-500" />
              </div>
            </div>
          ))}
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
                    <th className="text-left pb-2">Category</th>
                    <th className="text-right pb-2">Amount</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_payments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 font-medium text-gray-900">{p.description}</td>
                      <td className="py-2 text-gray-500 capitalize">{p.category || '—'}</td>
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

function DashboardSkeleton() {
  return (
    <div>
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="skeleton h-3 w-20 mx-auto mb-3" />
            <div className="skeleton h-8 w-32 mx-auto mb-3" />
            <div className="grid grid-cols-2 gap-2">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-full" />
            </div>
            <div className="skeleton h-1.5 w-full mt-3 rounded-full" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="skeleton h-5 w-24 mb-2" />
        <div className="skeleton h-3 w-40 mb-6" />
        <div className="space-y-4 mb-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="skeleton h-3 w-16 mb-2" />
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="skeleton h-20 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="skeleton h-16 rounded-xl mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
