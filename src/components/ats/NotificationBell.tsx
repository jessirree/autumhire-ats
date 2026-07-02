import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AppNotification,
  getNotificationsForUser,
  markNotificationRead,
} from '../../services/notificationService';

/** Bell with unread badge + dropdown, backed by the Notifications collection. */
export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!user) return;
    getNotificationsForUser(user.id).then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    load();
    // Light polling keeps the badge fresh without a realtime listener.
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const unread = notifications.filter((n) => !n.read);

  const handleMarkRead = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
  };

  const handleMarkAllRead = async () => {
    await Promise.all(unread.map((n) => markNotificationRead(n.id).catch(() => {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-autumn-primary hover:bg-orange-50 transition-colors"
        title="Notifications"
      >
        <Bell className="size-5" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {unread.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="size-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">No notifications yet.</p>
            )}
            {notifications.slice(0, 30).map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.read ? 'opacity-60' : 'bg-orange-50/30'}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="size-2 rounded-full bg-autumn-primary mt-1.5 shrink-0" />}
                  <div className={n.read ? 'pl-4' : ''}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
