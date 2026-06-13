// ============================================
// NOTIFICATION BELL — in-app inbox
// Works for seller, admin, and user roles
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';
import api from '../../utils/api';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open,        setOpen]        = useState(false);
  const [items,       setItems]       = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/mine');
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (_) {}
  }, []);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (notif) => {
    if (!notif.read) {
      await api.patch(`/notifications/${notif._id}/read`).catch(() => {});
      setItems(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (notif.url && notif.url !== '/') {
      navigate(notif.url);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    await api.patch('/notifications/read-all').catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setLoading(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <FiBell size={15} className="text-orange-500" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} disabled={loading}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                  <FiCheck size={11} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <FiX size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FiBell size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              items.map(notif => (
                <button
                  key={notif._id}
                  onClick={() => markRead(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
                    notif.read ? '' : 'bg-orange-50/60'
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${notif.read ? 'bg-transparent' : 'bg-orange-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold text-gray-800 leading-snug ${notif.read ? 'font-medium' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <p className="text-[11px] text-gray-400">Showing last {items.length} notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
