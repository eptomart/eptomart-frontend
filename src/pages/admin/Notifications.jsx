// ============================================
// ADMIN — PUSH NOTIFICATIONS BROADCAST
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiBell, FiSend, FiUsers, FiCheckCircle, FiAlertCircle, FiZap } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const QUICK_TEMPLATES = [
  {
    label: '🔥 Flash Sale',
    title: '🔥 Flash Sale Live!',
    body: 'Huge discounts on top products. Shop now before stock runs out!',
    url: '/shop',
  },
  {
    label: '📦 New Arrivals',
    title: '✨ New Arrivals Are Here!',
    body: 'Fresh products just landed. Be the first to grab them!',
    url: '/shop',
  },
  {
    label: '🎉 Weekend Deal',
    title: '🎉 Weekend Special Offer',
    body: 'Extra savings this weekend only. Use code WEEKEND10 at checkout.',
    url: '/shop',
  },
  {
    label: '⚡ Limited Stock',
    title: '⚡ Limited Stock Alert',
    body: 'Popular items are selling fast! Grab yours before they\'re gone.',
    url: '/shop',
  },
];

export default function AdminNotifications() {
  const [form, setForm] = useState({ title: '', body: '', url: '/shop', icon: '' });
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastResult, setLastResult] = useState(null);

  // Fetch subscriber count
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/notifications/stats');
        setStats(data);
      } catch {
        // Stats endpoint optional — silently fail
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const applyTemplate = (tpl) => {
    setForm({ title: tpl.title, body: tpl.body, url: tpl.url, icon: '' });
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error('Title and message are required');

    setSending(true);
    setLastResult(null);
    try {
      const { data } = await api.post('/notifications/broadcast', {
        title: form.title,
        body: form.body,
        url: form.url || '/shop',
        icon: form.icon || undefined,
      });
      setLastResult(data);
      toast.success(`Sent to ${data.sent || 0} subscribers!`);
      setForm({ title: '', body: '', url: '/shop', icon: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  const charCount = form.body.length;
  const charMax = 150;

  return (
    <>
      <Helmet><title>Push Notifications — Eptomart Admin</title></Helmet>

      <div className="max-w-3xl space-y-6">
        <h1 className="text-xl font-bold">🔔 Push Notifications</h1>

        {/* Subscriber Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
              <FiUsers size={20} className="text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {loadingStats ? '—' : (stats?.totalSubscribers ?? 0)}
              </p>
              <p className="text-xs text-gray-400">Total Subscribers</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
              <FiCheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {loadingStats ? '—' : (stats?.activeSubscribers ?? 0)}
              </p>
              <p className="text-xs text-gray-400">Active Devices</p>
            </div>
          </div>
          <div className="card p-5 col-span-2 sm:col-span-1 flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
              <FiBell size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {loadingStats ? '—' : (stats?.sentToday ?? 0)}
              </p>
              <p className="text-xs text-gray-400">Sent Today</p>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiZap size={16} className="text-primary-500" /> Quick Templates
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                onClick={() => applyTemplate(tpl)}
                className="text-left p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-orange-50 transition-all text-sm font-medium text-gray-700"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compose Form */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiSend size={16} className="text-primary-500" /> Compose Broadcast
          </h2>

          <form onSubmit={handleBroadcast} className="space-y-4">
            {/* Notification Preview */}
            <div className="bg-gray-800 rounded-2xl p-4 text-white">
              <p className="text-xs text-gray-400 mb-2">Preview</p>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-sm">E</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{form.title || 'Notification Title'}</p>
                  <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                    {form.body || 'Your message will appear here...'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. 🔥 Flash Sale Live!"
                maxLength={60}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/60</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="e.g. Huge discounts on top products. Shop now!"
                maxLength={charMax}
                rows={3}
                className={`input-field resize-none ${charCount > 130 ? 'border-orange-300' : ''}`}
              />
              <p className={`text-xs mt-1 ${charCount > 130 ? 'text-orange-500' : 'text-gray-400'}`}>
                {charCount}/{charMax} characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Click URL
                </label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="/shop"
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Where users go when they click</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon URL (Optional)
                </label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))}
                  placeholder="https://... or leave blank"
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Custom icon for notification</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={sending || !form.title || !form.body}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <FiSend size={16} />
              {sending ? 'Broadcasting...' : `Broadcast to All Subscribers`}
            </button>
          </form>
        </div>

        {/* Last Broadcast Result */}
        {lastResult && (
          <div className={`card p-5 flex items-start gap-4 ${lastResult.sent > 0 ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
            {lastResult.sent > 0
              ? <FiCheckCircle size={22} className="text-green-500 flex-shrink-0 mt-0.5" />
              : <FiAlertCircle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-semibold text-sm ${lastResult.sent > 0 ? 'text-green-700' : 'text-red-600'}`}>
                Broadcast Complete
              </p>
              <p className={`text-xs mt-1 ${lastResult.sent > 0 ? 'text-green-600' : 'text-red-500'}`}>
                ✅ {lastResult.sent} sent successfully
                {lastResult.failed > 0 && ` · ❌ ${lastResult.failed} failed (stale subscriptions removed)`}
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="card p-5 bg-blue-50 border border-blue-100">
          <h3 className="font-semibold text-blue-800 text-sm mb-2">ℹ️ How Push Notifications Work</h3>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Users must have granted notification permission in their browser</li>
            <li>Notifications are delivered even when users have the site closed</li>
            <li>Failed deliveries (expired subscriptions) are automatically cleaned up</li>
            <li>Order-related notifications (placed, shipped, delivered) are sent automatically</li>
            <li>Use broadcasts for promotions, flash sales, and announcements</li>
          </ul>
        </div>
      </div>
    </>
  );
}
