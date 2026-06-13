// ============================================
// SELLER MESSAGES — Seller ↔ Admin inbox
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiChevronLeft, FiPlus } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SellerMessages() {
  const [conversations, setConversations] = useState([]);
  const [active,        setActive]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [msgLoading,    setMsgLoading]    = useState(false);
  const [reply,         setReply]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [newSubject,    setNewSubject]    = useState('');
  const [newMsg,        setNewMsg]        = useState('');
  const [starting,      setStarting]      = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadList = async () => {
    try {
      const { data } = await api.get('/conversations/seller/mine');
      setConversations(data.conversations || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const loadConv = async (id, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      const { data } = await api.get(`/conversations/seller/${id}`);
      setActive(data.conversation);
      setConversations(prev => prev.map(c => c._id === id ? { ...c, unreadByParticipant: 0 } : c));
    } catch (_) {}
    finally { setMsgLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

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
      const { data } = await api.post(`/conversations/seller/${active._id}/reply`, { content: reply });
      setActive(data.conversation);
      setReply('');
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const startConversation = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMsg.trim()) return toast.error('Fill in subject and message');
    setStarting(true);
    try {
      const { data } = await api.post('/conversations/seller', { subject: newSubject, content: newMsg });
      setConversations(prev => [data.conversation, ...prev]);
      setShowNew(false);
      setNewSubject(''); setNewMsg('');
      loadConv(data.conversation._id);
      toast.success('Message sent to admin!');
    } catch { toast.error('Failed to start conversation'); }
    finally { setStarting(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Detail view
  if (active) return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setActive(null); clearInterval(pollRef.current); loadList(); }}
          className="text-gray-400 hover:text-gray-600 p-1">
          <FiChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{active.subject}</p>
          <p className="text-xs text-gray-400">{active.status === 'closed' ? '🔒 Closed' : '🟢 Open'}</p>
        </div>
      </div>

      <div className="card p-4 flex flex-col h-[480px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {msgLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : active.messages.map((m, i) => (
            <div key={i} className={`flex ${m.senderType === 'admin' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.senderType === 'admin'
                  ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  : 'bg-primary-500 text-white rounded-tr-sm'
              }`}>
                <p className={`text-[10px] font-semibold mb-0.5 ${m.senderType === 'admin' ? 'text-gray-500' : 'text-white/70'}`}>
                  {m.senderType === 'admin' ? '🛡 Eptomart Admin' : 'You'}
                </p>
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${m.senderType === 'admin' ? 'text-gray-400' : 'text-white/60'}`}>
                  {new Date(m.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {active.status === 'closed' ? (
          <p className="text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-xl">This conversation has been closed by admin.</p>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type a message… (Enter to send)"
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

  // List view
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <p className="text-sm text-gray-500">Your conversations with Eptomart admin</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <FiPlus size={14} /> New Message
        </button>
      </div>

      {showNew && (
        <form onSubmit={startConversation} className="card p-5 mb-5 space-y-3">
          <h4 className="font-semibold text-gray-700">New Message to Admin</h4>
          <input
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            placeholder="Subject"
            className="input-field text-sm w-full"
          />
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Write your message..."
            rows={4}
            className="input-field text-sm w-full resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-outline text-sm flex-1">Cancel</button>
            <button type="submit" disabled={starting} className="btn-primary text-sm flex-1">
              {starting ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </form>
      )}

      {conversations.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiMessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs mt-1">Start a conversation with our admin team for support or queries.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button key={c._id} onClick={() => loadConv(c._id)}
              className="w-full text-left card p-4 hover:border-primary-300 border-2 border-transparent transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-800 truncate">{c.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.unreadByParticipant > 0 && (
                    <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.unreadByParticipant}</span>
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
