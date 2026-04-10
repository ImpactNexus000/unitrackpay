import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentNav = [
  { to: '/', label: 'Overview' },
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
  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <aside className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4">
        <h1 className="text-sm font-semibold text-gray-900">UniTrackPay</h1>
        <p className="text-xs text-gray-400">University of Hertfordshire</p>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? 'border-l-2 border-gray-900 bg-white font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
