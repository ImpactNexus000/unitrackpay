import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileNav from './MobileNav';
import NotificationBadge from './NotificationBadge';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

function UserAvatar({ name }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs font-medium">
      {initials}
    </div>
  );
}

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {/* Desktop sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">UniTrackPay</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBadge />
            <UserAvatar name={user.full_name} />
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden md:flex justify-end items-center gap-3 px-6 py-3">
          <ThemeToggle />
          <NotificationBadge />
          <UserAvatar name={user.full_name} />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:px-6 md:pb-6 md:pt-0 pb-20">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  );
}
