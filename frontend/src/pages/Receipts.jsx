import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/me/payments/?limit=100')
      .then((res) => {
        const withReceipts = res.data.items.filter((p) => p.receipt_url);
        setReceipts(withReceipts);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading receipts...</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Receipts</h2>
      <p className="text-xs text-gray-400 mb-6">Your uploaded receipt files</p>

      {receipts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No receipts uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload receipts when logging a payment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {receipts.map((p) => {
            const isPdf = p.receipt_url?.includes('.pdf');
            return (
              <a
                key={p.id}
                href={p.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  {isPdf ? (
                    <div className="text-center">
                      <svg
                        className="w-10 h-10 text-gray-300 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      <span className="text-xs text-gray-400 mt-1 block">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={p.receipt_url}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {p.notes || p.payment_method || 'Payment'}
                  </p>
                  <p className="text-xs text-gray-400">
                    £{Number(p.amount).toFixed(2)} &middot; {p.payment_date}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </a>
            );
          })}
        </div>
      )}
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${styles[status] || ''}`}
    >
      {status}
    </span>
  );
}
