import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const PAYMENT_TYPES = [
  { value: '', label: 'Select category' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'lab', label: 'Lab fees' },
  { value: 'library', label: 'Library' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: '', label: 'Select method' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card payment' },
  { value: 'online_portal', label: 'Online portal' },
  { value: 'cash', label: 'Cash' },
];

export default function LogPayment() {
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({
    fee_item_id: '',
    category: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference: '',
    notes: '',
  });
  // Fee setup fields (shown when category has no existing fee_item)
  const [feeSetup, setFeeSetup] = useState({
    total_amount: '',
    has_discount: false,
    discount: '',
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get('/me/fees').then((res) => setFees(res.data));
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Check if the selected category already has a fee_item
  const categoryHasFee = fees.some((f) => f.category === form.category);
  const showFeeSetup = form.category && !categoryHasFee;

  const handleFile = (f) => {
    if (!f) return;
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(f.type)) {
      setError('Invalid file type. Only PNG, JPG, and PDF are allowed.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // If this is a new category, create the fee_item first
      if (showFeeSetup) {
        if (!feeSetup.total_amount || parseFloat(feeSetup.total_amount) <= 0) {
          setError('Please enter the total amount owed for this category');
          setSubmitting(false);
          return;
        }

        const feePayload = {
          category: form.category,
          total_amount: parseFloat(feeSetup.total_amount),
          discount: feeSetup.has_discount && feeSetup.discount
            ? parseFloat(feeSetup.discount)
            : null,
        };

        await client.post('/me/fees', feePayload);
      }

      const payload = {
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method || null,
        reference: form.reference || null,
        notes: form.notes || null,
        fee_item_id: form.fee_item_id || null,
        category: form.category || null,
      };

      const { data } = await client.post('/me/payments/', payload);

      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await client.patch(`/me/payments/${data.id}/receipt`, fd);
      }

      navigate('/history');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Log Payment</h2>
      <p className="text-xs text-gray-400 mb-6">Record a payment you've made</p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left — Payment details */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Payment details</h3>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment category</label>
              <select
                value={form.category}
                onChange={(e) => {
                  setForm({ ...form, category: e.target.value });
                  setFeeSetup({ total_amount: '', has_discount: false, discount: '' });
                }}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Inline fee setup — only shown for new categories */}
            {showFeeSetup && (
              <div className="mb-4 border border-blue-100 bg-blue-50/50 rounded-lg p-3 space-y-3">
                <p className="text-xs text-blue-700 font-medium">
                  First time logging {PAYMENT_TYPES.find((t) => t.value === form.category)?.label.toLowerCase()} — set your total owed
                </p>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Total amount owed for {PAYMENT_TYPES.find((t) => t.value === form.category)?.label.toLowerCase()} (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={feeSetup.total_amount}
                    onChange={(e) => setFeeSetup({ ...feeSetup, total_amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                    placeholder="e.g. 9250.00"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has_discount"
                    checked={feeSetup.has_discount}
                    onChange={(e) =>
                      setFeeSetup({ ...feeSetup, has_discount: e.target.checked, discount: '' })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="has_discount" className="text-xs text-gray-600">
                    Were you given a discount?
                  </label>
                </div>

                {feeSetup.has_discount && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Discount amount (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={feeSetup.discount}
                      onChange={(e) => setFeeSetup({ ...feeSetup, discount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                      placeholder="e.g. 500.00"
                    />
                    {feeSetup.total_amount && feeSetup.discount && (
                      <p className="text-xs text-gray-400 mt-1">
                        After discount: £{(parseFloat(feeSetup.total_amount) - parseFloat(feeSetup.discount)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Show existing fee info if category already set up */}
            {form.category && categoryHasFee && (
              <div className="mb-4 bg-gray-50 rounded-lg p-3">
                {(() => {
                  const fee = fees.find((f) => f.category === form.category);
                  return (
                    <p className="text-xs text-gray-500">
                      Total owed: <span className="font-medium text-gray-900">£{Number(fee.amount_due).toFixed(2)}</span>
                      {fee.discount && (
                        <span className="text-green-600 ml-1">(£{Number(fee.discount).toFixed(2)} discount applied)</span>
                      )}
                    </p>
                  );
                })()}
              </div>
            )}

            {fees.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Link to fee item (optional)</label>
                <select
                  value={form.fee_item_id}
                  onChange={set('fee_item_id')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">None</option>
                  {fees.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.description || f.category} — £{Number(f.amount_due).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
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
                  placeholder="0.00"
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

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment method</label>
              <select
                value={form.payment_method}
                onChange={set('payment_method')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Reference / transaction ID</label>
              <input
                type="text"
                value={form.reference}
                onChange={set('reference')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                placeholder="e.g. TXN-12345"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={set('notes')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                placeholder="Any additional details"
              />
            </div>
          </div>

          {/* Right — Upload + info */}
          <div className="space-y-4">
            {/* Upload panel */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Upload receipt</h3>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-700 font-medium">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-red-500 ml-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500">Drag & drop receipt or screenshot</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF &middot; Max 10MB</p>
                  </>
                )}
              </div>

              {!file && (
                <label className="block mt-3">
                  <span className="w-full block text-center text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-500 cursor-pointer hover:bg-gray-50">
                    Browse files
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>

            {/* What happens next */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-medium text-gray-900 mb-3">What happens next</h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'You submit this form', detail: 'Your payment is recorded and queued for review' },
                  { step: '2', title: 'Finance reviews', detail: '1–3 business days' },
                  { step: '3', title: 'You get notified', detail: 'Email + in-app notification on status change' },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-1" />
                      {i < 2 && <div className="w-px flex-1 min-h-4 bg-gray-200 mt-1" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit payment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
