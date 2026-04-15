import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /\d/.test(p) },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    email: '',
    programme: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPwRules, setShowPwRules] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const passingRules = PASSWORD_RULES.filter((r) => r.test(form.password)).length;
  const strengthPct = (passingRules / PASSWORD_RULES.length) * 100;
  const strengthColor =
    strengthPct <= 25 ? 'bg-red-500' : strengthPct <= 50 ? 'bg-orange-400' : strengthPct <= 75 ? 'bg-yellow-400' : 'bg-green-500';
  const strengthLabel =
    strengthPct <= 25 ? 'Weak' : strengthPct <= 50 ? 'Fair' : strengthPct <= 75 ? 'Good' : 'Strong';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (passingRules < PASSWORD_RULES.length) {
      setError('Password does not meet all requirements');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name,
        student_id: form.student_id,
        email: form.email,
        programme: form.programme || null,
        password: form.password,
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { key: 'full_name', label: 'Full name', type: 'text', required: true },
    { key: 'student_id', label: 'Student ID', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
    { key: 'programme', label: 'Programme', type: 'text', required: false, placeholder: 'e.g. MSc Molecular Biotechnology' },
    { key: 'password', label: 'Password', type: 'password', required: true },
    { key: 'confirm', label: 'Confirm password', type: 'password', required: true },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">UniTrackPay</h1>
          <p className="text-xs text-gray-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
              <input
                type={f.type}
                required={f.required}
                value={form[f.key]}
                onChange={set(f.key)}
                onFocus={f.key === 'password' ? () => setShowPwRules(true) : undefined}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              />

              {/* Password strength UI */}
              {f.key === 'password' && showPwRules && form.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${strengthPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10">{strengthLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PASSWORD_RULES.map((r) => {
                      const pass = r.test(form.password);
                      return (
                        <div key={r.key} className="flex items-center gap-1.5">
                          {pass ? (
                            <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <circle cx="12" cy="12" r="5" />
                            </svg>
                          )}
                          <span className={`text-xs ${pass ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                            {r.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Password match indicator */}
              {f.key === 'confirm' && form.confirm && (
                <p className={`text-xs mt-1 ${form.password === form.confirm ? 'text-green-600' : 'text-red-500'}`}>
                  {form.password === form.confirm ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 dark:text-gray-100 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
