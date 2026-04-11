import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { key: 'full_name', label: 'Full name', type: 'text', required: true },
    { key: 'student_id', label: 'Student ID', type: 'text', required: true },
    { key: 'email', label: 'University email', type: 'email', required: true, placeholder: 'you@herts.ac.uk' },
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
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              />
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
          Use your University of Hertfordshire email address
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 dark:text-gray-100 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
