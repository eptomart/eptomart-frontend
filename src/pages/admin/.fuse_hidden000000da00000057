// ============================================
// ADMIN MESSAGES — Inbox + Compose
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import {
  FiMessageSquare, FiSend, FiChevronLeft, FiUser, FiShoppingBag,
  FiCheckCircle, FiCircle, FiPlus, FiX, FiSearch,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Compose Modal ─────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onCreated }) {
  const [pType,       setPType]       = useState('user');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [subject,     setSubject]     = useState('');
  const [content,     setContent]     = useState('');
  const [searching,   setSearching]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const searchRef = useRef(null);

  // Debounced search
  useEffect(() => {
    setSelected(null);
    setResults([]);
    if (!query.trim()) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/conversations/admin/search-participants?q=${encodeURIComponent(query)}&type=${pType}`);
        setResults(data.results || []);
      } catch (_) {}
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, pType]);

  const handleSend = async () => {
    if (!selected) return toast.error('Please select a recipient');
    if (!subject.trim()) return toast.error('Subject is required');
    if (!content.trim()) return toast.error('Message cannot be empty');
    setSending(true);
    try {
      const { data } = await api.post('/conversations/admin/new', {
        participantType: pType,
        participantId:   selected._id,
        subject:         subject.trim(),
        content:         content.trim(),
      });
      toast.success('Message sent!');
      onCreated(data.conversation);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FiMessageSquare size={16} className="text-primary-500" /> New Message
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Participant type toggle */}
          <div className="flex gap-2">
            {['user','seller'].map(t => (
              <button
                key={t}
                onClick={() => { setPType(t); setQuery(''); setSelected(null); setResults([]); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                  pType === t ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'user' ? <><FiUser size={13} className="inline mr-1" />User</> : <><FiShoppingBag size={13} className="inline mr-1" />Seller</>}
              </button>
            ))}
          </div>

          {/* Recipient search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              To {pType === 'seller' ? '(Seller / Business name)' : '(User name or email)'}
            </label>
            {selected ? (
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-orange-50 border-primary-300">
                <span className="text-sm font-medium text-gray-800 flex-1">{selected.name}</span>
                {selected.email && <span className="text-xs text-gray-400">{selected.email}</span>}
                <button onClick={() => { setSelected(null); setQuery(''); }} className="text-gray-400 hover:text-red-500">
                  <FiX size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={`Search ${pType}s…`}
                    className="input-field w-full pl-8 text-sm"
                    autoFocus
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {results.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {results.map(r => (
                      <button
                        key={r._id}
                        onClick={() => { setSelected(r); setQuery(''); setResults([]); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors"
                      >
                        {r.type === 'seller'
                          ? <FiShoppingBag size={13} className="text-blue-500 flex-shrink-0" />
                          : <FiUser size={13} className="text-green-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                          {r.email && <p className="text-xs text-gray-400 truncate">{r.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() && !searching && results.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 pl-1">No {pType}s found.</p>
                )}
              </>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Your recent order"
              className="input-field w-full text-sm"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your message here…"
              rows={4}
              className="input-field w-full resize-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !selected || !subject.trim() || !content.trim()}
              className="flex-1 btn-primary py-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><FiSend size={14} /> Send</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [active,        setActive]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [msgLoading,    setMsgLoading]    = useState(false);
  const [reply,         setReply]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [typeFilter,    setTypeFilter]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [unreadTotal,   setUnreadTotal]   = useState(0);
  const [showCompose,   setShowCompose]   = useState(false);
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

  // Called when compose modal creates a new conversation
  const handleComposed = (conv) => {
    setShowCompose(false);
    setConversations(prev => [conv, ...prev]);
    loadConv(conv._id);
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
      {/* Compose modal */}
      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} onCreated={handleComposed} />
      )}

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

        <div className="flex gap-2 flex-wrap items-center">
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
          <button
            onClick={() => setShowCompose(true)}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
          >
            <FiPlus size={15} /> New Message
          </button>
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
          <button onClick={() => setShowCompose(true)} className="mt-4 btn-primary text-sm px-5 py-2 flex items-center gap-1.5 mx-auto">
            <FiPlus size={14} /> Start a conversation
          </button>
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
