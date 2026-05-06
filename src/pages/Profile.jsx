// ============================================
// PROFILE PAGE — with saved addresses
// ============================================
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiUser, FiSave, FiMapPin, FiPlus, FiTrash2, FiCheck, FiPackage, FiHeart, FiMessageSquare, FiSend, FiChevronLeft } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { usePincodeAutofill } from '../hooks/usePincodeAutofill';

// ── Messages tab component ────────────────────────────────────
function MessagesTab() {
  const [conversations, setConversations] = useState([]);
  const [active,        setActive]        = useState(null); // selected conversation
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
      const { data } = await api.get('/conversations/mine');
      setConversations(data.conversations || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const loadConv = async (id, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      const { data } = await api.get(`/conversations/${id}`);
      setActive(data.conversation);
      setConversations(prev => prev.map(c => c._id === id ? { ...c, unreadByParticipant: 0 } : c));
    } catch (_) {}
    finally { setMsgLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  // Auto-poll active conversation every 5s
  useEffect(() => {
    clearInterval(pollRef.current);
    if (active?._id) {
      pollRef.current = setInterval(() => loadConv(active._id, true), 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [active?._id]);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      const { data } = await api.post(`/conversations/${active._id}/reply`, { content: reply });
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
      const { data } = await api.post('/conversations', { subject: newSubject, content: newMsg });
      setConversations(prev => [data.conversation, ...prev]);
      setShowNew(false);
      setNewSubject(''); setNewMsg('');
      loadConv(data.conversation._id);
      toast.success('Message sent to admin!');
    } catch { toast.error('Failed to start conversation'); }
    finally { setStarting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  // Detail view
  if (active) return (
    <div className="flex flex-col h-[520px]">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {msgLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : active.messages.map((m, i) => (
          <div key={i} className={`flex ${m.senderType === 'admin' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.senderType === 'admin'
                ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                : 'bg-primary-500 text-white rounded-tr-sm'
            }`}>
              <p className={`text-[10px] font-semibold mb-0.5 ${m.senderType === 'admin' ? 'text-gray-500' : 'text-white/70'}`}>
                {m.senderType === 'admin' ? '🛡 Eptomart Support' : 'You'}
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

      {/* Reply box */}
      {active.status === 'closed' ? (
        <p className="text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-xl">This conversation is closed by admin.</p>
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
  );

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Support Messages</h3>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 text-sm btn-primary py-1.5 px-3">
          <FiPlus size={14} /> New Message
        </button>
      </div>

      {/* New conversation form */}
      {showNew && (
        <form onSubmit={startConversation} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">New Message to Admin</h4>
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
            rows={3}
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
        <div className="text-center py-12 text-gray-400">
          <FiMessageSquare size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No messages yet. Start a conversation with our support team.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button key={c._id} onClick={() => loadConv(c._id)}
              className="w-full text-left border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:bg-orange-50 transition-all">
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

const BLANK_ADDR = { label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false };

export default function Profile() {
  const { user, updateProfile, loadUser } = useAuth();
  const [tab,         setTab]         = useState('profile'); // 'profile' | 'messages'
  const [name,        setName]        = useState(user?.name || '');
  const [saving,      setSaving]      = useState(false);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm,    setAddrForm]    = useState(BLANK_ADDR);
  const [savingAddr,  setSavingAddr]  = useState(false);

  const { lookupPincode, pincodeLoading } = usePincodeAutofill(
    useCallback(({ city, state }) => setAddrForm(f => ({ ...f, city, state })), [])
  );

  const addresses = user?.addresses || [];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await updateProfile({ name }); }
    finally { setSaving(false); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addrForm.fullName || !addrForm.phone || !addrForm.addressLine1 || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      return toast.error('Please fill in all required fields');
    }
    setSavingAddr(true);
    try {
      await api.post('/auth/add-address', addrForm);
      await loadUser();
      setShowAddAddr(false);
      setAddrForm(BLANK_ADDR);
      toast.success('Address saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally { setSavingAddr(false); }
  };

  const deleteAddress = async (addressId) => {
    if (!confirm('Remove this address?')) return;
    try {
      await api.delete(`/auth/address/${addressId}`);
      await loadUser();
      toast.success('Address removed');
    } catch { toast.error('Failed to remove address'); }
  };

  const setDefault = async (addressId) => {
    try {
      await api.patch(`/auth/address/${addressId}/default`);
      await loadUser();
      toast.success('Default address updated');
    } catch { toast.error('Failed to update'); }
  };

  const setA = (k, v) => setAddrForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <Helmet><title>My Profile — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">👤 My Profile</h1>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {[['profile', FiUser, 'Profile & Addresses'], ['messages', FiMessageSquare, 'Messages']].map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === 'messages' && (
          <div className="card p-6 mb-6">
            <MessagesTab />
          </div>
        )}

        {tab === 'profile' && <>
        {/* Profile card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
              <span className="text-primary-600 font-bold text-2xl">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email || user?.phone}</p>
              <span className={`badge mt-1 ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : user?.role === 'seller' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
            </div>
            {user?.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={user.email} disabled className="input-field bg-gray-50" />
              </div>
            )}
            {user?.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="text" value={user.phone} disabled className="input-field bg-gray-50" />
              </div>
            )}
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Saved addresses */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FiMapPin size={18} className="text-primary-500" /> Saved Addresses
            </h2>
            <button onClick={() => { setShowAddAddr(true); setAddrForm(BLANK_ADDR); }}
              className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium">
              <FiPlus size={14} /> Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No saved addresses yet. Add one for faster checkout & delivery estimates.</p>
          ) : (
            <div className="space-y-3">
              {addresses.map(addr => (
                <div key={addr._id}
                  className={`border-2 rounded-xl p-3 transition-all ${addr.isDefault ? 'border-primary-400 bg-orange-50' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{addr.label}</span>
                        {addr.isDefault && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-medium">Default</span>}
                      </div>
                      <p className="font-medium text-gray-800 text-sm">{addr.fullName} · {addr.phone}</p>
                      <p className="text-xs text-gray-500">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                      <p className="text-xs text-gray-500">{addr.city}, {addr.state} — {addr.pincode}</p>
                    </div>
                    <div className="flex gap-1.5 ml-2">
                      {!addr.isDefault && (
                        <button onClick={() => setDefault(addr._id)} title="Set as default"
                          className="text-gray-400 hover:text-primary-500 p-1.5 rounded-lg hover:bg-orange-50">
                          <FiCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteAddress(addr._id)} title="Remove"
                        className="text-gray-300 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add address form */}
          {showAddAddr && (
            <form onSubmit={handleAddAddress} className="mt-4 border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">New Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                  <select value={addrForm.label} onChange={e => setA('label', e.target.value)} className="input-field text-sm">
                    {['Home', 'Work', 'Other'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input value={addrForm.fullName} onChange={e => setA('fullName', e.target.value)} className="input-field text-sm" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                  <input value={addrForm.phone} onChange={e => setA('phone', e.target.value)} className="input-field text-sm" placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                  <div className="relative">
                    <input value={addrForm.pincode}
                      onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,6); setA('pincode', v); lookupPincode(v); }}
                      className="input-field text-sm pr-8" placeholder="600001" />
                    {pincodeLoading && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">City & state auto-filled</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1 *</label>
                <input value={addrForm.addressLine1} onChange={e => setA('addressLine1', e.target.value)} className="input-field text-sm" placeholder="House No, Street Name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Landmark (optional)</label>
                <input value={addrForm.addressLine2} onChange={e => setA('addressLine2', e.target.value)} className="input-field text-sm" placeholder="Near school, landmark" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input value={addrForm.city} onChange={e => setA('city', e.target.value)} className="input-field text-sm" placeholder="Chennai" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                  <input value={addrForm.state} onChange={e => setA('state', e.target.value)} className="input-field text-sm" placeholder="Tamil Nadu" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="defAddr" checked={addrForm.isDefault} onChange={e => setA('isDefault', e.target.checked)} className="accent-primary-500" />
                <label htmlFor="defAddr" className="text-sm text-gray-600">Set as default address</label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddAddr(false)} className="btn-outline flex-1 text-sm">Cancel</button>
                <button type="submit" disabled={savingAddr} className="btn-primary flex-1 text-sm">
                  {savingAddr ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/orders" className="card p-4 flex items-center gap-3 hover:border-primary-300 border-2 border-transparent transition-all">
            <FiPackage size={20} className="text-primary-500" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">My Orders</p>
              <p className="text-xs text-gray-500">Track & manage</p>
            </div>
          </Link>
          <Link to="/wishlist" className="card p-4 flex items-center gap-3 hover:border-red-300 border-2 border-transparent transition-all">
            <FiHeart size={20} className="text-red-400" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">My Wishlist</p>
              <p className="text-xs text-gray-500">Saved items</p>
            </div>
          </Link>
        </div>
        </> }
      </main>
      <Footer />
    </>
  );
}
