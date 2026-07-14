// ============================================
// ADMIN — WhatsApp Inbox
// Super Admin only: view & reply to inbound
// WhatsApp messages from customers.
// ============================================
import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function WhatsAppInbox() {
  const [msgs,          setMsgs]          = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [unreadOnly,    setUnreadOnly]    = useState(false);
  const [replyModal,    setReplyModal]    = useState(null);
  const [replyText,     setReplyText]     = useState('');
  const [replying,      setReplying]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/admin/whatsapp/messages?limit=100');
      setMsgs(data.messages || []);
      setUnread(data.unreadCount || 0);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (msg) => {
    try {
      await api.patch(`/koyambedu/admin/whatsapp/messages/${msg._id}/read`);
      setMsgs(m => m.map(x => x._id === msg._id ? { ...x, isRead: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/koyambedu/admin/whatsapp/messages/read-all');
      setMsgs(m => m.map(x => ({ ...x, isRead: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await api.post(`/koyambedu/admin/whatsapp/messages/${replyModal._id}/reply`, {
        text: replyText.trim(),
      });
      toast.success('Reply sent!');
      setMsgs(m => m.map(x => x._id === replyModal._id
        ? { ...x, isRead: true, repliedAt: new Date(), replyText: replyText.trim() }
        : x
      ));
      if (!replyModal.isRead) setUnread(u => Math.max(0, u - 1));
      setReplyModal(null);
      setReplyText('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const displayed = unreadOnly ? msgs.filter(m => !m.isRead) : msgs;

  const msgContent = (msg) => {
    if (msg.type === 'text' || msg.type === 'button') return msg.text || '—';
    if (msg.type === 'image')    return `📷 Image${msg.mediaCaption ? ` — ${msg.mediaCaption}` : ''}`;
    if (msg.type === 'audio')    return '🎵 Audio message';
    if (msg.type === 'video')    return `🎥 Video${msg.mediaCaption ? ` — ${msg.mediaCaption}` : ''}`;
    if (msg.type === 'document') return `📄 Document${msg.text ? `: ${msg.text}` : ''}`;
    if (msg.type === 'sticker')  return '🙂 Sticker';
    if (msg.type === 'location') return `📍 Location${msg.locationName ? `: ${msg.locationName}` : ''}`;
    return `[${msg.type}]`;
  };

  const hoursSince = (date) => (Date.now() - new Date(date).getTime()) / 3_600_000;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            💬 WhatsApp Inbox
            {unread > 0 && (
              <span className="bg-green-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                {unread} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Inbound messages from customers on your business WhatsApp number
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead}
            className="text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Mark all read
          </button>
          <button onClick={load}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setUnreadOnly(false)}
          className={`text-sm font-bold px-4 py-2 rounded-xl transition ${!unreadOnly ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          All messages
        </button>
        <button onClick={() => setUnreadOnly(true)}
          className={`text-sm font-bold px-4 py-2 rounded-xl transition ${unreadOnly ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Unread only
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && msgs.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
          <p className="text-4xl">📲</p>
          <p className="font-bold text-gray-700">No messages yet</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Register the webhook in Meta Developer Dashboard to start receiving messages.<br />
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              WhatsApp → Configuration → Webhook → messages field
            </span>
          </p>
        </div>
      )}

      {/* Message list */}
      {!loading && displayed.length === 0 && msgs.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No unread messages</div>
      )}

      <div className="space-y-3">
        {displayed.map(msg => (
          <div key={msg._id}
            className={`bg-white rounded-2xl border p-5 transition ${msg.isRead ? 'border-gray-100' : 'border-green-300 shadow-sm'}`}>

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-lg">
                  👤
                </div>
                <div>
                  <p className="font-bold text-gray-800">{msg.profileName || msg.from}</p>
                  <p className="text-xs text-gray-400">{msg.from}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!msg.isRead && <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />}
                <span className="text-xs text-gray-400">
                  {new Date(msg.sentAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed mb-3">
              {msgContent(msg)}
            </div>

            {/* Replied */}
            {msg.repliedAt && (
              <p className="text-xs text-green-600 font-semibold mb-2">
                ✓ Replied: {msg.replyText}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!msg.isRead && (
                <button onClick={() => markRead(msg)}
                  className="text-sm px-4 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-bold">
                  Mark read
                </button>
              )}
              <button onClick={() => { setReplyModal(msg); setReplyText(''); }}
                className="text-sm px-4 py-1.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition">
                💬 Reply
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-green-700 text-lg">💬 Reply via WhatsApp</h3>
                <p className="text-sm text-gray-400">
                  To: {replyModal.profileName || replyModal.from} ({replyModal.from})
                </p>
              </div>
              <button onClick={() => setReplyModal(null)}
                className="text-gray-400 text-2xl font-bold leading-none hover:text-gray-600">✕</button>
            </div>

            {/* Original message */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
              <p className="text-xs font-bold text-gray-400 mb-1">Customer said:</p>
              {msgContent(replyModal)}
            </div>

            {/* 24h warning */}
            {hoursSince(replyModal.sentAt) > 20 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-sm text-orange-700">
                ⚠️ This message is over 20 hours old. Replies only work within Meta's 24-hour window.
              </div>
            )}

            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply…"
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none"
            />

            <div className="flex gap-3">
              <button onClick={() => setReplyModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                disabled={replying || !replyText.trim()}
                onClick={sendReply}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-40 transition">
                {replying ? 'Sending…' : '📤 Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
