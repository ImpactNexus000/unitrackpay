import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentNav = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/log-payment', label: 'Log Payment' },
  { to: '/history', label: 'Payment History' },
  { to: '/receipts', label: 'Receipts' },
];

const adminNav = [
  { to: '/admin/queue', label: 'Review Queue' },
  { to: '/admin/students', label: 'All Students' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'border-l-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <aside className="hidden md:flex w-48 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col min-h-screen">
      <div className="p-4">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">UniTrackPay</h1>
        <p className="text-xs text-gray-400">University of Hertfordshire</p>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {studentNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className={linkClass}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Admin</p>
            </div>
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="px-2 pb-2 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'border-l-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Settings
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
