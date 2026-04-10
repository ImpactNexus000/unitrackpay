import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function NotificationBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    client
      .get('/me/notifications/')
      .then((res) => {
        const count = res.data.filter((n) => !n.is_read).length;
        setUnread(count);
      })
      .catch(() => {});
  }, []);

  return (
    <Link to="/notifications" className="relative p-1">
      <svg
        className="w-5 h-5 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </Link>
  );
}
