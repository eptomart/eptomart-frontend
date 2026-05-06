// ============================================
// ADMIN MESSAGES — Inbox for all conversations
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiChevronLeft, FiUser, FiShoppingBag, FiCheckCircle, FiCircle } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [active,        setActive]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [msgLoading,    setMsgLoading]    = useState(false);
  const [reply,         setReply]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [typeFilter,    setTypeFilter]    = useState('');   // '' | 'user' | 'seller'
  const [statusFilter,  setStatusFilter]  = useState('');   // '' | 'open' | 'closed'
  const [unreadTotal,   setUnreadTotal]   = useState(0);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadList = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter)   params.set('type',   typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/conversations/admin/all?${params}`);
      setConversations(data.conversations || []);
      setUnreadTotal(data.unreadTotal || 0);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const loadConv = async (id, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      const { data } = await api.get(`/conversations/admin/${id}`);
      setActive(data.conversation);
      setConversations(prev => prev.map(c => c._id === id ? { ...c, unreadByAdmin: 0 } : c));
    } catch (_) {}
    finally { setMsgLoading(false); }
  };

  useEffect(() => { loadList(); }, [typeFilter, statusFilter]);

  // Poll active conversation every 5s
  useEffect(() => {
    clearInterval(pollRef.current);
    if (active?._id) {
      pollRef.current = setInterval(() => loadConv(active._id, true), 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [active?._id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      const { data } = await api.post(`/conversations/admin/${active._id}/reply`, { content: reply });
      setActive(data.conversation);
      setReply('');
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const toggleStatus = async () => {
    if (!active) return;
    const newStatus = active.status === 'open' ? 'closed' : 'open';
    try {
      const { data } = await api.patch(`/conversations/admin/${active._id}/status`, { status: newStatus });
      setActive(data.conversation);
      setConversations(prev => prev.map(c => c._id === active._id ? { ...c, status: newStatus } : c));
      toast.success(`Conversation ${newStatus}`);
    } catch { toast.error('Failed to update status'); }
  };

  // ── Detail view ──────────────────────────────
  if (active) return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => { setActive(null); clearInterval(pollRef.current); loadList(); }}
          className="text-gray-400 hover:text-gray-600 p-1">
          <FiChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{active.subject}</p>
          <p className="text-xs text-gray-500">
            {active.participantType === 'seller' ? '🏪 Seller' : '👤 User'}: <strong>{active.participantName}</strong>
            {active.participantEmail && <span className="ml-1 text-gray-400">({active.participantEmail})</span>}
          </p>
        </div>
        <button
          onClick={toggleStatus}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
            active.status === 'open'
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
          }`}
        >
          {active.status === 'open' ? <><FiCheckCircle size={12} /> Close</> : <><FiCircle size={12} /> Reopen</>}
        </button>
      </div>

      <div className="card p-4 flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {msgLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : active.messages.map((m, i) => (
            <div key={i} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.senderType === 'admin'
                  ? 'bg-primary-500 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                <p className={`text-[10px] font-semibold mb-0.5 ${m.senderType === 'admin' ? 'text-white/70' : 'text-gray-500'}`}>
                  {m.senderType === 'admin' ? `🛡 ${m.senderName}` : `${active.participantType === 'seller' ? '🏪' : '👤'} ${m.senderName}`}
                </p>
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${m.senderType === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {active.status === 'closed' ? (
          <p className="text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-xl">Conversation closed. Reopen to reply.</p>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type your reply… (Enter to send)"
              rows={2}
              className="input-field flex-1 resize-none text-sm"
            />
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              className="btn-primary px-4 self-end disabled:opacity-60">
              <FiSend size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiMessageSquare size={20} className="text-primary-500" /> Messages
            {unreadTotal > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadTotal} unread</span>
            )}
          </h2>
          <p className="text-sm text-gray-500">All conversations from users and sellers</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field text-sm py-1.5 px-3">
            <option value="">All types</option>
            <option value="user">Users</option>
            <option value="seller">Sellers</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm py-1.5 px-3">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiMessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button key={c._id} onClick={() => loadConv(c._id)}
              className={`w-full text-left card p-4 transition-all hover:border-primary-300 border-2 ${c.unreadByAdmin > 0 ? 'border-primary-200 bg-orange-50' : 'border-transparent'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {c.participantType === 'seller'
                      ? <FiShoppingBag size={12} className="text-blue-500 flex-shrink-0" />
                      : <FiUser size={12} className="text-green-500 flex-shrink-0" />}
                    <span className="text-xs font-medium text-gray-500">{c.participantName}</span>
                  </div>
                  <p className={`text-sm truncate ${c.unreadByAdmin > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{c.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.unreadByAdmin > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.unreadByAdmin}</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
