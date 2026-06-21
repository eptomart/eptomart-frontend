// ============================================
// KOYAMBEDU — Special Occasion Requests (F12 Admin View)
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiPhone, FiMail, FiCalendar, FiCheck } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  new:       { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'New' },
  contacted: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Contacted' },
  completed: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Completed' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled' },
};

const STATUS_FILTERS = ['', 'new', 'contacted', 'completed', 'cancelled'];

export default function KoyambeduSpecialRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [notes,    setNotes]    = useState({});
  const [saving,   setSaving]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/koyambedu/seller-admin/special-requests${params}`);
      setRequests(data.requests || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setSaving(prev => ({ ...prev, [id]: status }));
    try {
      await api.patch(`/koyambedu/seller-admin/special-requests/${id}`, { status, adminNotes: notes[id] || '' });
      toast.success(`Marked as ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(prev => ({ ...prev, [id]: null })); }
  };

  const newCount = requests.filter(r => r.status === 'new').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            🎉 Special Occasion Requests
          </h1>
          {newCount > 0 && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm text-yellow-800">
              ⏳ <strong>{newCount}</strong> new request{newCount > 1 ? 's' : ''} awaiting response
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                filter === s ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button onClick={load} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50">
            <FiRefreshCw size={11} /> Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.new;
              const isExpanded = expanded === r._id;
              return (
                <div key={r._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button className="w-full text-left p-4" onClick={() => setExpanded(isExpanded ? null : r._id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{r.buyerName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.occasionType?.replace('_',' ')} · Required: {new Date(r.requiredDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Submitted: {new Date(r.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      {/* Contact info */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-blue-600">
                          <FiPhone size={13} /> {r.phone}
                        </a>
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-blue-600">
                            <FiMail size={13} /> {r.email}
                          </a>
                        )}
                      </div>

                      {/* Items */}
                      {r.requestedItems?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">Requested Items</p>
                          <ul className="space-y-1">
                            {r.requestedItems.map((item, i) => (
                              <li key={i} className="text-sm text-gray-700">
                                • {item.itemName} — {item.quantity} {item.unit}
                                {item.notes && <span className="text-xs text-gray-400 ml-1">({item.notes})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {r.additionalNotes && (
                        <p className="text-xs text-gray-500 italic">Notes: {r.additionalNotes}</p>
                      )}

                      {/* Admin notes */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Admin Notes</label>
                        <textarea rows={2} value={notes[r._id] ?? (r.adminNotes || '')}
                          onChange={e => setNotes(prev => ({ ...prev, [r._id]: e.target.value }))}
                          className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
                          placeholder="Add notes…" />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'new' && (
                          <button onClick={() => updateStatus(r._id, 'contacted')} disabled={!!saving[r._id]}
                            className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                            <FiPhone size={12} /> {saving[r._id] === 'contacted' ? '…' : 'Mark Contacted'}
                          </button>
                        )}
                        {['new','contacted'].includes(r.status) && (
                          <button onClick={() => updateStatus(r._id, 'completed')} disabled={!!saving[r._id]}
                            className="flex items-center gap-1 px-3 py-2 text-xs bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
                            <FiCheck size={12} /> {saving[r._id] === 'completed' ? '…' : 'Mark Completed'}
                          </button>
                        )}
                        {r.status !== 'cancelled' && r.status !== 'completed' && (
                          <button onClick={() => updateStatus(r._id, 'cancelled')} disabled={!!saving[r._id]}
                            className="px-3 py-2 text-xs border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50">
                            {saving[r._id] === 'cancelled' ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!requests.length && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🎉</p>
                <p>No special requests found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
