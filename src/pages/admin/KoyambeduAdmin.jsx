import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TAB_LIST = ['dashboard','orders','sellers','categories'];

const STATUS_OPTIONS = [
  'placed','pending_confirmation','price_revision_pending','confirmed',
  'packing','dispatched','delivered','cancelled',
];

const STATUS_COLOR = {
  placed:'bg-gray-100 text-gray-700', pending_confirmation:'bg-yellow-100 text-yellow-700',
  price_revision_pending:'bg-orange-100 text-orange-700', confirmed:'bg-green-100 text-green-700',
  packing:'bg-purple-100 text-purple-700', dispatched:'bg-blue-100 text-blue-700',
  delivered:'bg-green-200 text-green-800', cancelled:'bg-red-100 text-red-700',
};

export default function KoyambeduAdmin() {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState('dashboard');
  const [stats,   setStats]   = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [sellers, setSellers] = useState([]);
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchOrder,  setSearchOrder]  = useState('');
  const [sellerFilter, setSellerFilter] = useState('');

  // Update order modal
  const [updateModal, setUpdateModal] = useState(null);
  const [newStatus,    setNewStatus]  = useState('');
  const [delivPartner, setDelivPartner] = useState('');
  const [adminNotes,   setAdminNotes]  = useState('');
  const [updating,     setUpdating]    = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'dashboard') {
        const { data } = await api.get('/koyambedu/admin/dashboard');
        setStats(data.stats);
      } else if (t === 'orders') {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (searchOrder)  params.set('search', searchOrder);
        const { data } = await api.get(`/koyambedu/admin/orders?${params}&limit=50`);
        setOrders(data.orders || []);
      } else if (t === 'sellers') {
        const { data } = await api.get(`/koyambedu/admin/sellers?approved=${sellerFilter}`);
        setSellers(data.sellers || []);
      } else if (t === 'categories') {
        const { data } = await api.get('/koyambedu/admin/categories?status=pending');
        setCats(data.categories || []);
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const updateOrderStatus = async () => {
    if (!newStatus) { toast.error('Select a status'); return; }
    setUpdating(true);
    try {
      await api.patch(`/koyambedu/admin/orders/${updateModal._id}/status`, {
        status: newStatus, deliveryPartner: delivPartner, adminNotes,
      });
      toast.success('Order updated');
      setUpdateModal(null);
      loadTab('orders');
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  const approveSeller = async (sellerId, approve, reason = '') => {
    try {
      await api.patch(`/koyambedu/admin/sellers/${sellerId}/approve`, { approve, reason });
      toast.success(approve ? 'Seller approved' : 'Seller rejected');
      loadTab('sellers');
    } catch { toast.error('Failed'); }
  };

  const toggleSeller = async (sellerId) => {
    try {
      const { data } = await api.patch(`/koyambedu/admin/sellers/${sellerId}/toggle`);
      toast.success(data.isActive ? 'Seller activated' : 'Seller deactivated');
      loadTab('sellers');
    } catch { toast.error('Failed'); }
  };

  const approveCategory = async (catId, approve) => {
    try {
      await api.patch(`/koyambedu/admin/categories/${catId}/approve`, { approve });
      toast.success(approve ? 'Category approved' : 'Category rejected');
      loadTab('categories');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-lg">Koyambedu Daily — Admin</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {TAB_LIST.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading && <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && !loading && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3">Today's Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                ['Today Orders',      stats.todayOrders,        'bg-blue-50 border-blue-200'],
                ['Pending Dispatch',  stats.pendingDispatch,    'bg-yellow-50 border-yellow-200'],
                ['Delivered Today',   stats.delivered,          'bg-green-50 border-green-200'],
                ['Today Revenue',    `₹${(stats.todayRevenue||0).toLocaleString('en-IN')}`, 'bg-purple-50 border-purple-200'],
                ['Price Revisions',   stats.pendingRevisions,   'bg-orange-50 border-orange-200'],
                ['Active Sellers',    stats.activeSellers,      'bg-gray-50 border-gray-200'],
                ['Pending Categories',stats.pendingCategories,  'bg-red-50 border-red-200'],
              ].map(([label, val, cls]) => (
                <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
                  <p className="text-2xl font-black text-gray-800">{val}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab('orders')} className="bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 transition">
                View Orders →
              </button>
              <button onClick={() => setTab('sellers')} className="border-2 border-green-600 text-green-700 font-bold py-3 rounded-xl text-sm hover:bg-green-50 transition">
                Manage Sellers →
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && !loading && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input value={searchOrder} onChange={e => setSearchOrder(e.target.value)} placeholder="Search Order ID..."
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-green-400" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <button onClick={() => loadTab('orders')} className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Search</button>
            </div>

            <div className="space-y-3">
              {orders.map(order => (
                <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                      <p className="text-xs text-gray-500">{order.buyer?.name} · {order.buyer?.phone}</p>
                      <p className="text-xs text-gray-400">{order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {order.orderStatus?.replace(/_/g,' ')}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    {order.items?.slice(0,3).map((it,i) => (
                      <span key={i}>{it.name} ×{it.quantity}{it.unitLabel || it.unit}{i < order.items.length-1 ? ', ' : ''}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-500">₹{order.pricing?.total?.toFixed(2)} · {order.deliverySlot}</p>
                      {order.deliveryPartner && <p className="text-xs text-green-600">🚚 {order.deliveryPartner}</p>}
                    </div>
                    <button onClick={() => { setUpdateModal(order); setNewStatus(order.orderStatus); setDelivPartner(order.deliveryPartner || ''); setAdminNotes(order.adminNotes || ''); }}
                      className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700">
                      Update
                    </button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-center text-gray-500 py-8">No orders found</p>}
            </div>
          </div>
        )}

        {/* ── SELLERS ── */}
        {tab === 'sellers' && !loading && (
          <div>
            <div className="flex gap-2 mb-4">
              {[['','All'],['false','Pending'],['true','Approved']].map(([v,label]) => (
                <button key={v} onClick={() => { setSellerFilter(v); loadTab('sellers'); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${sellerFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {sellers.map(s => (
                <div key={s._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{s.businessName}</p>
                      <p className="text-xs text-gray-500">{s.ownerName} · {s.contact?.phone}</p>
                      <p className="text-xs text-gray-400">Stall {s.stallNumber} · {s.marketSection}</p>
                      {s.user && <p className="text-xs text-gray-400">{s.user.email}</p>}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {s.isApproved ? 'Approved' : 'Pending'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!s.isApproved && (
                      <>
                        <button onClick={() => approveSeller(s._id, true)} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                        <button onClick={() => approveSeller(s._id, false, 'Does not meet requirements')} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕ Reject</button>
                      </>
                    )}
                    <button onClick={() => toggleSeller(s._id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${s.isActive ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {sellers.length === 0 && <p className="text-center text-gray-500 py-8">No sellers found</p>}
            </div>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === 'categories' && !loading && (
          <div>
            <p className="text-xs text-gray-500 mb-4">Categories pending admin approval before going live</p>
            <div className="space-y-3">
              {cats.map(cat => (
                <div key={cat._id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                  <span className="text-3xl">{cat.icon || '🌿'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                    {cat.nameTamil && <p className="text-xs text-gray-400">{cat.nameTamil}</p>}
                    <p className="text-xs text-gray-500">By: {cat.createdBy?.businessName || '—'}</p>
                    {cat.parent && <p className="text-xs text-gray-400">Subcategory</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveCategory(cat._id, true)} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                    <button onClick={() => approveCategory(cat._id, false)} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕</button>
                  </div>
                </div>
              ))}
              {cats.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-green-500 text-4xl mb-2">✅</p>
                  <p className="text-gray-500 text-sm">No pending categories</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order update modal */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Update Order {updateModal.orderId}</h3>
            <div>
              <label className="text-xs text-gray-500 font-medium">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Delivery Partner</label>
              <input value={delivPartner} onChange={e => setDelivPartner(e.target.value)} placeholder="e.g. Swiggy Genie, own delivery"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Admin Notes</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUpdateModal(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={updateOrderStatus} disabled={updating}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {updating ? 'Saving...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
