import { useEffect, useState } from 'react';
import client from '../api/client';

export default function AdminReports() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/admin/reports?month=${month}`).then((res) => setData(res.data));
  }, [month]);

  if (!data) {
    return <p className="text-sm text-gray-400">Loading reports...</p>;
  }

  const methodLabels = {
    bank_transfer: 'Bank transfer',
    card: 'Card',
    online_portal: 'Online portal',
    cash: 'Cash',
    unknown: 'Unknown',
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Reports</h2>
      <p className="text-xs text-gray-400 mb-6">Monthly payment totals by type</p>

      {/* Month selector */}
      <div className="mb-6">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total confirmed</p>
          <p className="text-xl font-medium text-green-600">
            £{data.total_confirmed.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Rejected</p>
          <p className="text-xl font-medium text-red-600">{data.total_rejected_count}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Still pending</p>
          <p className="text-xl font-medium text-amber-500">{data.total_pending_count}</p>
        </div>
      </div>

      {/* Breakdown by method */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Breakdown by payment method</h3>
        {data.by_method.length === 0 ? (
          <p className="text-xs text-gray-400">No confirmed payments this month</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-gray-400 text-xs font-medium border-b">
                <th className="text-left py-2">Method</th>
                <th className="text-right py-2">Count</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.by_method.map((row) => (
                <tr key={row.method} className="border-b">
                  <td className="py-2 font-medium text-gray-900">
                    {methodLabels[row.method] || row.method}
                  </td>
                  <td className="py-2 text-right text-gray-500">{row.count}</td>
                  <td className="py-2 text-right text-gray-500">£{row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
