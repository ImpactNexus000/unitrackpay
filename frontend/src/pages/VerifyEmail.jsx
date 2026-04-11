import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const updated = [...code];
    updated[index] = value;
    setCode(updated);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5 && updated.every((d) => d)) {
      handleSubmit(updated.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...code];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setCode(updated);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      handleSubmit(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleSubmit = async (codeStr) => {
    if (!codeStr || codeStr.length !== 6) return;
    setError('');
    setSubmitting(true);

    try {
      const { data } = await client.post('/auth/verify', { email, code: codeStr });
      const user = await loginWithTokens(data.access_token, data.refresh_token);
      setVerified(true);
      setTimeout(() => {
        navigate(user.role === 'admin' || user.role === 'super_admin' ? '/admin/queue' : '/dashboard');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await client.post('/auth/resend-code', { email });
      setSuccess('A new code has been sent to your email.');
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Failed to resend code. Try again.');
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <svg className="w-16 h-16" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="26" fill="none" stroke="#22c55e" strokeWidth="2.5" className="animate-circle-draw" />
              <path d="M17 28l7 7 15-15" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-check-draw" />
            </svg>
            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse-ring" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verified!</h2>
          <p className="text-xs text-gray-400 mt-1">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verify your email</h1>
          <p className="text-xs text-gray-400 mt-1">
            We sent a 6-digit code to
          </p>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{email}</p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 mb-4 text-center">{error}</p>
        )}

        {success && (
          <p className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2 mb-4 text-center">{success}</p>
        )}

        {/* Code inputs */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={submitting}
              className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors disabled:opacity-50"
            />
          ))}
        </div>

        {/* Manual submit (in case auto-submit didn't fire) */}
        <button
          onClick={() => handleSubmit(code.join(''))}
          disabled={submitting || code.some((d) => !d)}
          className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 mb-4"
        >
          {submitting ? 'Verifying...' : 'Verify email'}
        </button>

        <div className="text-center space-y-2">
          <p className="text-xs text-gray-400">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-gray-900 dark:text-gray-100 font-medium hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          </p>
          <p className="text-xs text-gray-400">
            <Link to="/register" className="text-gray-900 dark:text-gray-100 font-medium">
              Back to register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
