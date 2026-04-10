import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Settings</h2>
      <p className="text-xs text-gray-400 mb-6">Manage your account</p>

      <div className="border border-gray-200 rounded-xl p-4 bg-white max-w-md">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Profile</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400">Full name</p>
            <p className="text-sm text-gray-900">{user?.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Student ID</p>
            <p className="text-sm text-gray-900">{user?.student_id || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Programme</p>
            <p className="text-sm text-gray-900">{user?.programme || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Role</p>
            <p className="text-sm text-gray-900 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-6 w-full text-sm text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
