import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEdit3, FiEye, FiMapPin, FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

// ── Products approval tabs ───────────────────────────────
const PRODUCT_TABS = [
  { key: 'pending',           label: 'Pending',          color: 'text-yellow-600' },
  { key: 'approved',          label: 'Approved',          color: 'text-green-600'  },
  { key: 'rejected',          label: 'Rejected',          color: 'text-red-600'    },
  { key: 'correction_needed', label: 'Correction Needed', color: 'text-orange-600' },
];

// ── Approval history (collapsible per product) ──────────
function ApprovalHistory({ productId }) {
  const [open,    setOpen]    = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!open) { setOpen(true); setLoading(true); }
    else       { setOpen(false); return; }
    try {
      const { data } = await api.get(`/approvals/${productId}/history`);
      setHistory(data.history || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const ACTION_STYLE = {
    submitted:            { dot: 'bg-blue-400',   text: 'text-blue-700'  },
    approved:             { dot: 'bg-green-500',  text: 'text-green-700' },
    rejected:             { dot: 'bg-red-500',    text: 'text-red-700'   },
    correction_requested: { dot: 'bg-orange-400', text: 'text-orange-700'},
    resubmitted:          { dot: 'bg-indigo-400', text: 'text-indigo-700'},
  };

  return (
    <div className="mt-2">
      <button onClick={load}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
        <FiClock size={11} />
        Approval History
        {open ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-2 pl-2 border-l-2 border-gray-100 space-y-2">
          {loading && <p className="text-xs text-gray-400">Loading…</p>}
          {!loading && history.length === 0 && <p className="text-xs text-gray-400">No history yet.</p>}
          {history.map((h, i) => {
            const st = ACTION_STYLE[h.action] || { dot: 'bg-gray-400', text: 'text-gray-700' };
            return (
              <div key={i} className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${st.dot}`} />
                <div>
                  <p className={`text-xs font-semibold capitalize ${st.text}`}>
                    {h.action?.replace(/_/g, ' ')}
                    <span className="text-gray-400 font-normal ml-1">by {h.performedBy?.name || '—'}</span>
                  </p>
                  {h.note && <p className="text-xs text-gray-500 mt-0.5">📌 {h.note}</p>}
                  <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pickup address approval section ─────────────────────
function AddressApprovals() {
  const [addrTab,  setAddrTab]  = useState('pending');
  const [items,    setItems]    = useState([]);
  const [stats,    setStats]    = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading,  setLoading]  = useState(true);
  const [rejectModal, setRejectModal] = useState(null); // { sellerId, addrId, label }
  const [rejectNote,  setRejectNote]  = useState('');

  const load = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/sellers/pickup-addresses/pending?status=${status}`);
      setItems(data.items || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(addrTab); }, [addrTab]);

  const approve = async (sellerId, addrId) => {
    try {
      await api.post(`/sellers/${sellerId}/pickup-addresses/${addrId}/approve`);
      toast.success('Address approved — seller notified');
      load(addrTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const reject = async () => {
    if (!rejectNote.trim()) return toast.error('Enter a rejection reason');
    try {
      await api.post(`/sellers/${rejectModal.sellerId}/pickup-addresses/${rejectModal.addrId}/reject`, { note: rejectNote });
      toast.success('Address rejected — seller notified');
      setRejectModal(null); setRejectNote('');
      load(addrTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const STATUS_TABS = [
    { key: 'pending',  label: 'Pending',  count: stats.pending  },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setAddrTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all
              ${addrTab === t.key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 rounded-full ${addrTab === t.key ? 'bg-white/30' : 'bg-gray-100'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">No {addrTab} addresses</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={`${item.sellerId}-${item.addressId}`} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FiMapPin size={14} className="text-primary-500 shrink-0" />
                    <span className="font-semibold text-gray-800">{item.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${item.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                        item.status === 'approved' ? 'bg-green-100 text-green-700'   :
                        'bg-red-100 text-red-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {[item.street, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                  </p>
                  {item.phone && <p className="text-xs text-gray-400 mt-0.5">📞 {item.phone}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Seller: <span className="font-medium text-gray-700">{item.sellerName}</span>
                    {item.sellerEmail && <span className="ml-1 text-gray-400">({item.sellerEmail})</span>}
                  </p>
                  {item.adminNote && (
                    <p className="text-xs text-red-600 mt-1">❌ Reason: {item.adminNote}</p>
                  )}
                </div>

                {addrTab === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => approve(item.sellerId, item.addressId)}
                      className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-all">
                      <FiCheck size={13} /> Approve
                    </button>
                    <button onClick={() => setRejectModal({ sellerId: item.sellerId, addrId: item.addressId, label: item.label })}
                      className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-all">
                      <FiX size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-1">Reject Address</h3>
            <p className="text-sm text-gray-500 mb-3">
              Rejecting <span className="font-medium">{rejectModal.label}</span>. Enter reason for seller.
            </p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. Address is incomplete, please add landmark..."
              rows={3} className="input-field mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectNote(''); }}
                className="btn-outline flex-1">Cancel</button>
              <button onClick={reject}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-all">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Approvals page ──────────────────────────────────
export default function AdminApprovals() {
  const [section, setSection] = useState('products'); // 'products' | 'addresses'

  // Products state
  const [tab,      setTab]      = useState('pending');
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [note,     setNote]     = useState('');

  // Address pending count for badge
  const [addrPendingCount, setAddrPendingCount] = useState(0);

  const load = async (status) => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/approvals?status=${status}`),
        api.get('/approvals/stats'),
      ]);
      setProducts(pRes.data.products || []);
      setStats(sRes.data.stats || {});
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  // Load address pending count on mount
  useEffect(() => {
    api.get('/sellers/pickup-addresses/pending?status=pending')
      .then(r => setAddrPendingCount(r.data.stats?.pending || 0))
      .catch(() => {});
  }, []);

  const perform = async () => {
    if (!modal) return;
    const { action, product } = modal;
    if ((action === 'reject' || action === 'request-correction') && !note.trim()) {
      return toast.error('Please enter a reason');
    }
    try {
      await api.post(`/approvals/${product._id}/${action}`, { note });
      toast.success(`Product ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back'}!`);
      setModal(null); setNote('');
      load(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      {/* Section switcher */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">🔔 Approvals</h1>
        <div className="flex gap-2">
          <button onClick={() => setSection('products')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
              ${section === 'products' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-orange-50'}`}>
            Products
            {stats.pending > 0 && <span className={`text-xs px-1.5 rounded-full ${section === 'products' ? 'bg-white/30' : 'bg-yellow-100 text-yellow-700'}`}>{stats.pending}</span>}
          </button>
          <button onClick={() => setSection('addresses')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
              ${section === 'addresses' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-orange-50'}`}>
            Pickup Addresses
            {addrPendingCount > 0 && (
              <span className={`text-xs px-1.5 rounded-full ${section === 'addresses' ? 'bg-white/30' : 'bg-yellow-100 text-yellow-700'}`}>{addrPendingCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Products section ── */}
      {section === 'products' && (
        <>
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {PRODUCT_TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap
                  ${tab === t.key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'}`}>
                {t.label}
                {stats[t.key] > 0 && <span className={`text-xs ${tab === t.key ? 'bg-white/30' : 'bg-gray-100'} px-1.5 rounded-full`}>{stats[t.key]}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : products.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">No products in this status</div>
          ) : (
            <div className="space-y-4">
              {products.map(p => (
                <div key={p._id} className="card p-4">
                  <div className="flex gap-4">
                    <img src={p.images?.[0]?.url} alt={p.name} className="w-20 h-20 object-cover rounded-xl bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-800">{p.name}</h3>
                          <p className="text-sm text-gray-500">
                            Seller: <span className="font-medium text-gray-700">{p.seller?.businessName || '—'}</span>
                            {p.seller?.sellerId && <span className="text-xs font-mono text-gray-400 ml-1">({p.seller.sellerId})</span>}
                            {p.seller?.address?.city && ` · ${p.seller.address.city}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatINR(p.discountPrice || p.price)} · GST {p.gstRate}% · Stock: {p.stock}
                          </p>
                          {p.productCode && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">Code: {p.productCode}</p>
                          )}
                          {p.approvalNote && (
                            <p className="text-xs text-orange-600 mt-1">📌 Admin note: {p.approvalNote}</p>
                          )}
                          {p.sellerNote && (
                            <div className="text-xs text-blue-700 mt-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
                              💬 <strong>Seller says:</strong> "{p.sellerNote}"
                            </div>
                          )}
                          {p.submittedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Submitted: {new Date(p.submittedAt).toLocaleString('en-IN')}
                            </p>
                          )}
                          <ApprovalHistory productId={p._id} />
                        </div>
                        <a href={`/product/${p._id}?byId=true`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-primary-500 hover:underline">
                          <FiEye size={12} /> Preview
                        </a>
                      </div>

                      {tab === 'pending' && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button onClick={() => setModal({ action: 'approve', product: p })}
                            className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-all">
                            <FiCheck size={14} /> Approve
                          </button>
                          <button onClick={() => setModal({ action: 'reject', product: p })}
                            className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-all">
                            <FiX size={14} /> Reject
                          </button>
                          <button onClick={() => setModal({ action: 'request-correction', product: p })}
                            className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-all">
                            <FiEdit3 size={14} /> Request Fix
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Product action modal */}
          {modal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-bold text-gray-800 mb-1 capitalize">
                  {modal.action.replace('-', ' ')}: {modal.product.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {modal.action === 'approve' ? 'Product will go live immediately.' : 'Enter reason for the seller.'}
                </p>
                {modal.action !== 'approve' && (
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Enter reason or instructions..."
                    rows={3} className="input-field mb-4 resize-none" />
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setModal(null); setNote(''); }} className="btn-outline flex-1">Cancel</button>
                  <button onClick={perform}
                    className={`flex-1 text-white font-semibold py-2 px-4 rounded-xl transition-all
                      ${modal.action === 'approve' ? 'bg-green-500 hover:bg-green-600'
                        : modal.action === 'reject' ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-orange-500 hover:bg-orange-600'}`}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Addresses section ── */}
      {section === 'addresses' && <AddressApprovals />}
    </div>
  );
}
