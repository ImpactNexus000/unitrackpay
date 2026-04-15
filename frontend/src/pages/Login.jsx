import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await client.post('/auth/login', { email, password });

      if (data.requires_verification) {
        toast.info('Verification code sent to your email');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.info('Please verify your email first');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">UniTrackPay</h1>
          <p className="text-xs text-gray-400 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-gray-900 dark:text-gray-100 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
