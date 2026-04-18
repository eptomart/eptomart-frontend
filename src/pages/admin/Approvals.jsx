import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEdit3, FiChevronRight, FiEye } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'pending', label: 'Pending', color: 'text-yellow-600' },
  { key: 'approved', label: 'Approved', color: 'text-green-600' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-600' },
  { key: 'correction_needed', label: 'Correction Needed', color: 'text-orange-600' },
];

export default function AdminApprovals() {
  const [tab,      setTab]      = useState('pending');
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // { action, product }
  const [note,     setNote]     = useState('');

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
      <h1 className="text-xl font-bold text-gray-800 mb-6">
        🔔 Product Approvals
        {stats.pending > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pending} pending</span>}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
              ${tab === t.key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'}`}>
            {t.label}
            {stats[t.key] > 0 && <span className={`text-xs ${tab === t.key ? 'bg-white/30' : 'bg-gray-100'} px-1.5 rounded-full`}>{stats[t.key]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
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
                        {p.seller?.address?.city && ` · ${p.seller.address.city}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatINR(p.discountPrice || p.price)} · GST {p.gstRate}% · Stock: {p.stock}
                      </p>
                      {p.approvalNote && (
                        <p className="text-xs text-orange-600 mt-1">📌 Note: {p.approvalNote}</p>
                      )}
                      {p.submittedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted: {new Date(p.submittedAt).toLocaleString('en-IN')}
                        </p>
                      )}
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

      {/* Action modal */}
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
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter reason or instructions..."
                rows={3}
                className="input-field mb-4 resize-none"
              />
            )}
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setNote(''); }} className="btn-outline flex-1">Cancel</button>
              <button onClick={perform}
                className={`flex-1 text-white font-semibold py-2 px-4 rounded-xl transition-all
                  ${modal.action === 'approve' ? 'bg-green-500 hover:bg-green-600' : modal.action === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
