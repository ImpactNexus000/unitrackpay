import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/admin/students')
      .then((res) => setStudents(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading students...</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">All Students</h2>
      <p className="text-xs text-gray-400 mb-6">
        {students.length} student{students.length !== 1 ? 's' : ''} registered
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 text-xs font-medium border-b">
              <th className="text-left py-2">Student ID</th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Programme</th>
              <th className="text-right py-2">Total owed</th>
              <th className="text-right py-2">Paid</th>
              <th className="text-right py-2">Remaining</th>
              <th className="text-right py-2">Progress</th>
              <th className="text-left py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2 font-medium text-gray-900">{s.student_id}</td>
                <td className="py-2 font-medium text-gray-900">{s.full_name}</td>
                <td className="py-2 text-gray-500">{s.programme || '—'}</td>
                <td className="py-2 text-right text-gray-500">
                  £{s.balance.total_owed.toFixed(2)}
                </td>
                <td className="py-2 text-right text-green-600">
                  £{s.balance.total_confirmed.toFixed(2)}
                </td>
                <td className="py-2 text-right text-red-600">
                  £{s.balance.remaining.toFixed(2)}
                </td>
                <td className="py-2 text-right text-gray-500">
                  {s.balance.progress_pct}%
                </td>
                <td className="py-2">
                  <Link
                    to={`/admin/students/${s.id}`}
                    className="text-blue-500 text-xs"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
