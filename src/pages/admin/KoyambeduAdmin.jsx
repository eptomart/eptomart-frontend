import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TAB_LIST = ['dashboard', 'orders', 'sellers', 'seller-admins', 'categories'];

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
const SELLER_STATUS_COLOR = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-700',
  suspended:      'bg-orange-100 text-orange-700',
};

export default function KoyambeduAdmin() {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState('dashboard');
  const [stats,   setStats]   = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [sellers, setSellers] = useState([]);
  const [sellerAdmins, setSellerAdmins] = useState([]);
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchOrder,  setSearchOrder]  = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [saFilter,     setSaFilter]     = useState('');

  // Order update modal
  const [updateModal, setUpdateModal] = useState(null);
  const [newStatus,    setNewStatus]  = useState('');
  const [delivPartner, setDelivPartner] = useState('');
  const [adminNotes,   setAdminNotes]  = useState('');
  const [updating,     setUpdating]    = useState(false);

  // SellerAdmin create modal
  const [showSaCreate, setShowSaCreate] = useState(false);
  const [saForm, setSaForm] = useState({ userId:'', name:'', businessName:'', contactPhone:'', contactEmail:'' });
  const [saCreating, setSaCreating] = useState(false);

  // Reject reason modal
  const [rejectModal, setRejectModal] = useState(null); // { id, type: 'seller'|'sa' }
  const [rejectReason, setRejectReason] = useState('');

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
        const params = sellerFilter ? `?status=${sellerFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/sellers${params}`);
        setSellers(data.sellers || []);
      } else if (t === 'seller-admins') {
        const params = saFilter ? `?status=${saFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/seller-admins${params}`);
        setSellerAdmins(data.sellerAdmins || []);
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

  const sellerAction = async (sellerId, action, reason = '') => {
    try {
      await api.patch(`/koyambedu/admin/sellers/${sellerId}/approve`, { action, reason });
      toast.success(`Seller ${action}d`);
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

  const saAction = async (saId, action, reason = '') => {
    try {
      await api.patch(`/koyambedu/admin/seller-admins/${saId}/approve`, { action, reason });
      toast.success(`SellerAdmin ${action}d`);
      loadTab('seller-admins');
    } catch { toast.error('Failed'); }
  };

  const createSellerAdmin = async () => {
    if (!saForm.userId || !saForm.name) { toast.error('User ID and name required'); return; }
    setSaCreating(true);
    try {
      await api.post('/koyambedu/admin/seller-admins', saForm);
      toast.success('SellerAdmin created. Pending review.');
      setShowSaCreate(false);
      setSaForm({ userId:'', name:'', businessName:'', contactPhone:'', contactEmail:'' });
      loadTab('seller-admins');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaCreating(false); }
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
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {TAB_LIST.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {t === 'seller-admins' ? 'Seller Admins' : t.charAt(0).toUpperCase() + t.slice(1)}
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
                ['Today Orders',       stats.todayOrders,       'bg-blue-50 border-blue-200'],
                ['Pending Dispatch',   stats.pendingDispatch,   'bg-yellow-50 border-yellow-200'],
                ['Delivered Today',    stats.delivered,         'bg-green-50 border-green-200'],
                ['Today Revenue',     `₹${(stats.todayRevenue||0).toLocaleString('en-IN')}`, 'bg-purple-50 border-purple-200'],
                ['Price Revisions',    stats.pendingRevisions,  'bg-orange-50 border-orange-200'],
                ['Active Sellers',     stats.activeSellers,     'bg-gray-50 border-gray-200'],
                ['Pending Categories', stats.pendingCategories, 'bg-red-50 border-red-200'],
              ].map(([label, val, cls]) => (
                <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
                  <p className="text-2xl font-black text-gray-800">{val}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab('orders')} className="bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 transition">View Orders →</button>
              <button onClick={() => setTab('sellers')} className="border-2 border-green-600 text-green-700 font-bold py-3 rounded-xl text-sm hover:bg-green-50 transition">Manage Sellers →</button>
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
                      {order.buyerLocation?.distanceKm && (
                        <p className="text-xs text-blue-500">📍 {order.buyerLocation.distanceKm} km from market</p>
                      )}
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
                      <p className="text-xs text-gray-500">₹{order.pricing?.total?.toFixed(2)} · Delivery ₹{order.pricing?.deliveryCharge} · {order.deliverySlot}</p>
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
            <div className="flex gap-2 mb-4 flex-wrap">
              {[['','All'],['pending_review','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended']].map(([v,label]) => (
                <button key={v} onClick={() => { setSellerFilter(v); setTimeout(() => loadTab('sellers'), 0); }}
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
                      {s.createdBySellerAdmin && (
                        <p className="text-xs text-blue-500">Created by SA: {s.createdBySellerAdmin.name}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SELLER_STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {(s.status || 'unknown').replace(/_/g,' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {s.status === 'pending_review' && (
                      <>
                        <button onClick={() => sellerAction(s._id, 'approve')} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                        <button onClick={() => { setRejectModal({ id: s._id, type: 'seller' }); setRejectReason(''); }}
                          className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕ Reject</button>
                      </>
                    )}
                    {s.status === 'approved' && (
                      <button onClick={() => sellerAction(s._id, 'suspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50">Suspend</button>
                    )}
                    {s.status === 'suspended' && (
                      <button onClick={() => sellerAction(s._id, 'unsuspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Unsuspend</button>
                    )}
                    {s.status === 'rejected' && (
                      <button onClick={() => sellerAction(s._id, 'approve')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Re-approve</button>
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

        {/* ── SELLER ADMINS ── */}
        {tab === 'seller-admins' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['pending_review','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended']].map(([v,label]) => (
                  <button key={v} onClick={() => { setSaFilter(v); setTimeout(() => loadTab('seller-admins'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${saFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSaCreate(true)}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                + Create SA
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-blue-700 leading-relaxed">
              🔒 SellerAdmins can create sellers and update product details. They cannot approve sellers (SuperAdmin only) and cannot see buyer address or phone.
            </div>

            <div className="space-y-3">
              {sellerAdmins.map(sa => (
                <div key={sa._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{sa.name}</p>
                      {sa.businessName && <p className="text-xs text-gray-500">{sa.businessName}</p>}
                      <p className="text-xs text-gray-400">{sa.user?.email} · {sa.contactPhone}</p>
                      {sa.createdBy && <p className="text-xs text-gray-400">Created by: {sa.createdBy.name}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SELLER_STATUS_COLOR[sa.status] || 'bg-gray-100 text-gray-600'}`}>
                      {(sa.status || 'unknown').replace(/_/g,' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {sa.status === 'pending_review' && (
                      <>
                        <button onClick={() => saAction(sa._id, 'approve')} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                        <button onClick={() => { setRejectModal({ id: sa._id, type: 'sa' }); setRejectReason(''); }}
                          className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕ Reject</button>
                      </>
                    )}
                    {sa.status === 'approved' && (
                      <button onClick={() => saAction(sa._id, 'suspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50">Suspend</button>
                    )}
                    {(sa.status === 'suspended' || sa.status === 'rejected') && (
                      <button onClick={() => saAction(sa._id, 'approve')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Re-approve</button>
                    )}
                  </div>
                </div>
              ))}
              {sellerAdmins.length === 0 && <p className="text-center text-gray-500 py-8">No SellerAdmins found</p>}
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
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveCategory(cat._id, true)} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓</button>
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

      {/* ── Order update modal ── */}
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

      {/* ── Create SellerAdmin modal ── */}
      {showSaCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Create Seller Admin</h3>
            <p className="text-xs text-gray-500">Seller Admins can create and manage sellers but cannot approve them.</p>
            {[
              ['userId',       'Eptomart User ID *', 'text'],
              ['name',         'Full Name *',        'text'],
              ['businessName', 'Business Name',      'text'],
              ['contactPhone', 'Phone',              'tel'],
              ['contactEmail', 'Email',              'email'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={saForm[k]} onChange={e => setSaForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setShowSaCreate(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={createSellerAdmin} disabled={saCreating}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject reason modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-[9996] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Rejection Reason</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Enter reason for rejection..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => {
                if (rejectModal.type === 'seller') sellerAction(rejectModal.id, 'reject', rejectReason);
                else saAction(rejectModal.id, 'reject', rejectReason);
                setRejectModal(null);
              }} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
