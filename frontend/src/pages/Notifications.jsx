import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    client
      .get('/me/notifications/')
      .then((res) => setNotifications(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await client.patch('/me/notifications/read', { ids: unreadIds });
    load();
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading notifications...</p>;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Notifications</h2>
          <p className="text-xs text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`border rounded-lg p-3 ${
                n.is_read
                  ? 'border-gray-100 bg-white'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
