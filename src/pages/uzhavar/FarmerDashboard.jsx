// ============================================
// UZHAVAR FRESH — Farmer Dashboard
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiPackage, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['vegetable', 'fruit', 'grain', 'herb', 'other'];

// Document preview helper
function DocPreview({ url, label }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  const isPdf   = /\.pdf(\?|$)/i.test(url);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="w-full max-h-48 object-cover bg-gray-100 hover:opacity-90 transition-opacity" />
          <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>{label}</span>
            <span className="text-green-600 font-semibold">View full ↗</span>
          </div>
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-lg flex-shrink-0">
            {isPdf ? '📕' : '📎'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{label}</p>
            <p className="text-xs text-gray-400">{isPdf ? 'PDF Document' : 'Document'} · Tap to view</p>
          </div>
          <span className="text-green-600 text-xs font-bold flex-shrink-0">Open ↗</span>
        </a>
      )}
    </div>
  );
}
const UNITS      = ['kg', 'gram', 'bunch', 'piece', 'litre'];

const ORDER_STATUS_COLOR = {
  pending_farmer: 'bg-yellow-100 text-yellow-700',
  buyer_confirmed: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  auto_cancelled: 'bg-red-100 text-red-600',
};

const emptyProduct = { name: '', nameTa: '', category: 'vegetable', unit: 'kg', pricePerUnit: '', availableQuantity: '', harvestFrom: '', harvestTo: '', deliveryType: 'both', productType: 'fresh', canShip: false };

// ── Farmer Promo Request Section ────────────────────────────────
function FarmerPromoSection() {
  const [requests,   setRequests]   = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '', discountValue: '', minOrderValue: '', maxUsage: '50',
    validFrom: '', validTo: '', description: '', requestReason: '',
  });

  useEffect(() => {
    api.get('/coupon/my-requests').then(r => { if (r.data.success) setRequests(r.data.coupons); }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.code || !form.discountValue || !form.validFrom || !form.validTo) {
      toast.error('Fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/coupon/request', { ...form, platform: 'Uzhavar' });
      if (data.success) {
        toast.success('Promo request sent to admin!');
        setRequests(r => [data.coupon, ...r]);
        setShowForm(false);
        setForm({ code: '', discountValue: '', minOrderValue: '', maxUsage: '50', validFrom: '', validTo: '', description: '', requestReason: '' });
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const statusColor = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626', admin_created: '#16a34a' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Request a % discount promo code from admin</p>
        <button onClick={() => setShowForm(v => !v)}
          className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-green-600">
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
          {[
            { key: 'code',          label: 'Promo Code *',    type: 'text',   placeholder: 'FARM10' },
            { key: 'discountValue', label: 'Discount % *',    type: 'number', placeholder: '10' },
            { key: 'minOrderValue', label: 'Min Order (₹)',   type: 'number', placeholder: '0' },
            { key: 'maxUsage',      label: 'Max Uses',        type: 'number', placeholder: '50' },
            { key: 'validFrom',     label: 'Valid From *',    type: 'date' },
            { key: 'validTo',       label: 'Valid To *',      type: 'date' },
            { key: 'description',   label: 'Description',     type: 'text',   placeholder: 'Harvest season offer' },
            { key: 'requestReason', label: 'Reason',          type: 'text',   placeholder: 'Festival promo' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 font-medium">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full mt-0.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-green-500" />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm">
              {submitting ? 'Submitting…' : 'Submit to Admin'}
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl">
          <p className="text-2xl mb-2">🎟️</p>
          <p className="text-sm">No promo requests yet</p>
          <p className="text-xs mt-1">Request a discount code to offer your buyers</p>
        </div>
      ) : requests.map(c => (
        <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-800">{c.code}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.discountValue}% off · max {c.maxUsage} uses · {c.description || '—'}</p>
          </div>
          <span className="text-xs font-bold capitalize px-2.5 py-1 rounded-full"
            style={{ background: `${statusColor[c.requestStatus] || '#6b7280'}18`, color: statusColor[c.requestStatus] || '#6b7280' }}>
            {c.requestStatus === 'admin_created' ? 'Active' : c.requestStatus}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FarmerDashboard() {
  const navigate   = useNavigate();
  const { isLoggedIn } = useAuth();
  const [farmer, setFarmer]       = useState(null);
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [tab, setTab]             = useState('products'); // products | orders | profile
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyProduct);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login', { state: { from: '/uzhavar/farmer' } }); return; }
    loadData();
  }, [isLoggedIn]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fRes = await api.get('/uzhavar/farmer/me');
      const farmerData = fRes.data.farmer;
      setFarmer(farmerData);

      // Only load products & orders if farmer profile exists
      if (farmerData) {
        const [pRes, oRes] = await Promise.all([
          api.get(`/uzhavar/farmers/${farmerData._id}/products`).catch(() => ({ data: { products: [] } })),
          api.get('/uzhavar/farmer/orders').catch(() => ({ data: { orders: [] } })),
        ]);
        setProducts(pRes.data.products || []);
        setOrders(oRes.data.orders || []);
      }
    } catch {
      // farmer/me failed — user is not logged in or network error
      setFarmer(null);
    } finally {
      setLoading(false);
    }
  };


  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const res = await api.patch('/uzhavar/farmer/toggle-availability');
      setFarmer(f => ({ ...f, availableNow: res.data.availableNow }));
      toast.success(res.data.availableNow ? 'You are now LIVE!' : 'Set to scheduled');
    } catch {
      toast.error('Toggle failed');
    } finally {
      setToggling(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.pricePerUnit || !form.availableQuantity || !form.harvestFrom || !form.harvestTo) {
      toast.error('Fill all required fields including harvest dates');
      return;
    }
    if (new Date(form.harvestTo) < new Date(form.harvestFrom)) {
      toast.error('"Available To" must be after "Available From"');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/uzhavar/farmer/products/${editId}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/uzhavar/farmer/products', form);
        toast.success('Product listed!');
      }
      setShowForm(false);
      setForm(emptyProduct);
      setEditId(null);
      if (farmer?._id) {
        const r = await api.get(`/uzhavar/farmers/${farmer._id}/products`);
        setProducts(r.data.products || []);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Remove this product?')) return;
    await api.delete(`/uzhavar/farmer/products/${productId}`);
    setProducts(prev => prev.filter(p => p._id !== productId));
    toast.success('Removed');
  };

  const handleAccept = async (orderId) => {
    try {
      await api.post(`/uzhavar/farmer/orders/${orderId}/accept`);
      toast.success('Order accepted! Buyer has 15 mins to confirm.');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'farmer_accepted' } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Accept failed');
    }
  };

  const handleReject = async (orderId) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await api.post(`/uzhavar/farmer/orders/${orderId}/reject`, { reason });
      toast.success('Order rejected');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch {
      toast.error('Reject failed');
    }
  };

  if (loading) return <><Navbar /><div className="min-h-screen flex items-center justify-center"><div className="text-green-600 text-4xl animate-bounce">🌱</div></div></>;

  if (!farmer) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-5xl mb-4">🧑‍🌾</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Not registered as farmer</h2>
          <p className="text-gray-500 text-sm mb-4">Register to list your harvest and connect with buyers</p>
          <button onClick={() => navigate('/uzhavar/farmer/register')}
            className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl">
            Register as Farmer
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending_farmer');
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 10);

  return (
    <>
      <Helmet><title>Farmer Dashboard — Uzhavar Fresh</title></Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-12 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-700 to-lime-500 rounded-2xl p-5 text-white mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-black text-xl">{farmer.name}</h1>
              <p className="text-green-100 text-sm">{farmer.address?.village}, {farmer.address?.district}</p>
              <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${farmer.verificationStatus === 'approved' ? 'bg-white text-green-700' : farmer.verificationStatus === 'pending' ? 'bg-yellow-300 text-yellow-800' : 'bg-red-300 text-red-800'}`}>
                {farmer.verificationStatus === 'approved' ? '✅ Verified' : farmer.verificationStatus === 'pending' ? '⏳ Pending Approval' : '❌ ' + farmer.verificationStatus}
              </span>
            </div>
            {farmer.verificationStatus === 'approved' && (
              <button onClick={toggleAvailability} disabled={toggling}
                className="flex flex-col items-center gap-1 bg-white/20 rounded-xl px-4 py-2 hover:bg-white/30 transition-colors">
                {farmer.availableNow
                  ? <FiToggleRight size={28} className="text-white" />
                  : <FiToggleLeft size={28} className="text-green-200" />}
                <span className="text-xs font-bold">{farmer.availableNow ? 'LIVE' : 'Offline'}</span>
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 mt-4 text-center">
            <div><p className="font-black text-xl">{products.length}</p><p className="text-green-200 text-xs">Products</p></div>
            <div><p className="font-black text-xl">{pendingOrders.length}</p><p className="text-green-200 text-xs">New Orders</p></div>
            <div><p className="font-black text-xl">{farmer.ratings?.average?.toFixed(1) || '—'}</p><p className="text-green-200 text-xs">Rating</p></div>
          </div>
        </div>

        {/* New order alerts */}
        {pendingOrders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-4 animate-pulse-once">
            <p className="font-bold text-yellow-800 text-sm">🔔 {pendingOrders.length} new order{pendingOrders.length > 1 ? 's' : ''} waiting for acceptance</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {[
            { key: 'products', label: `🥬 Products (${products.length})` },
            { key: 'orders',   label: `📦 Orders (${orders.length})` },
            { key: 'promos',   label: `🎟️ Promos` },
            { key: 'profile',  label: `👤 My Profile` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          <>
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyProduct); }}
              className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm mb-4 hover:bg-green-700 transition-colors">
              <FiPlus size={14} /> Add New Harvest
            </button>

            {products.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl">
                <div className="text-3xl mb-2">🌱</div>
                <p>No products listed. Add your first harvest!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(prod => (
                  <div key={prod._id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-xl">🥬</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{prod.name}</p>
                      <p className="text-xs text-gray-500">₹{prod.pricePerUnit}/{prod.unit} · {prod.availableQuantity} {prod.unit} left</p>
                      <p className="text-xs text-gray-400">
                        🗓 {new Date(prod.harvestFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' → '}
                        {new Date(prod.harvestTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ ...prod, harvestFrom: prod.harvestFrom?.split('T')[0], harvestTo: prod.harvestTo?.split('T')[0] }); setEditId(prod._id); setShowForm(true); }}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100">
                        <FiEdit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(prod._id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl">
                <div className="text-3xl mb-2">📦</div>
                <p>No orders yet</p>
              </div>
            ) : orders.map(order => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="px-4 py-3">
                  {order.items?.map((item, i) => (
                    <p key={i} className="text-sm text-gray-700">{item.name} × {item.quantity} {item.unit} — ₹{item.lineTotal}</p>
                  ))}
                  <p className="text-xs text-gray-400 mt-1">{order.bookingType === 'scheduled' ? `📅 Scheduled: ${order.scheduledSlot}` : '⚡ Instant delivery'}</p>
                  {/* Payment split for farmer */}
                  {order.balancePayableToFarmer > 0 && (
                    <div className={`mt-2 rounded-xl px-3 py-2 flex justify-between items-center text-xs font-bold ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      <span>{order.status === 'delivered' ? '✅ Collected from buyer' : '💰 Collect from buyer at delivery'}</span>
                      <span>₹{order.balancePayableToFarmer?.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                {order.status === 'pending_farmer' && (
                  <div className="px-4 pb-4 flex gap-2">
                    <button onClick={() => handleAccept(order._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-green-700">
                      <FiCheckCircle size={14} /> Accept
                    </button>
                    <button onClick={() => handleReject(order._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-sm hover:bg-red-100 border border-red-200">
                      <FiXCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Promos tab */}
        {tab === 'promos' && <FarmerPromoSection />}

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-4">

            {/* Verification status */}
            <div className={`rounded-2xl p-4 border ${
              farmer.verificationStatus === 'approved' ? 'bg-green-50 border-green-200' :
              farmer.verificationStatus === 'pending'  ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {farmer.verificationStatus === 'approved' ? '✅' : farmer.verificationStatus === 'pending' ? '⏳' : '❌'}
                </span>
                <p className="font-bold text-sm capitalize text-gray-800">
                  Verification: {farmer.verificationStatus}
                </p>
              </div>
              {farmer.verificationStatus === 'pending' && (
                <p className="text-xs text-yellow-700">Your documents are under review. You'll be activated once approved by admin.</p>
              )}
              {farmer.verificationStatus === 'rejected' && farmer.rejectionReason && (
                <p className="text-xs text-red-700">Reason: {farmer.rejectionReason}</p>
              )}
              {farmer.verificationStatus === 'approved' && (
                <p className="text-xs text-green-700">Your account is verified and active. Buyers can find you.</p>
              )}
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">📋 Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-semibold text-gray-800">{farmer.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-semibold text-gray-800">{farmer.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Language</span><span className="font-semibold text-gray-800 capitalize">{farmer.language === 'ta' ? 'Tamil' : farmer.language === 'en' ? 'English' : 'Tamil & English'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery radius</span><span className="font-semibold text-gray-800">{farmer.deliveryRadius} km</span></div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">📍 Location</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Village</span><span className="font-semibold text-gray-800">{farmer.address?.village || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Taluk</span><span className="font-semibold text-gray-800">{farmer.address?.taluk || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">District</span><span className="font-semibold text-gray-800">{farmer.address?.district || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">State</span><span className="font-semibold text-gray-800">{farmer.address?.state || 'Tamil Nadu'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Pincode</span><span className="font-semibold text-gray-800">{farmer.address?.pincode || '—'}</span></div>
                {farmer.gpsLocation?.coordinates && farmer.gpsLocation.coordinates[0] !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">GPS</span>
                    <span className="font-mono text-xs text-green-700">{farmer.gpsLocation.coordinates[1].toFixed(5)}, {farmer.gpsLocation.coordinates[0].toFixed(5)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">🏦 Bank Details</h3>
              {farmer.bankAccount?.bankName ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-semibold text-gray-800">{farmer.bankAccount.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="font-semibold text-gray-800">••••••{farmer.bankAccount.lastFour || '****'}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Verified</span>
                    <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${farmer.bankAccount.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {farmer.bankAccount.verified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No bank details on record</p>
              )}
            </div>

            {/* Uploaded Documents */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">📄 Uploaded Documents</h3>
              <div className="space-y-3">

                {/* Aadhaar */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Aadhaar Card</p>
                  {farmer.aadhaarDoc ? (
                    <DocPreview url={farmer.aadhaarDoc} label="Aadhaar" />
                  ) : (
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">Not uploaded</p>
                  )}
                </div>

                {/* Farm proof */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Farm Proof</p>
                  {farmer.farmProofDoc ? (
                    <DocPreview url={farmer.farmProofDoc} label="Farm Proof" />
                  ) : (
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">Not uploaded</p>
                  )}
                </div>

              </div>
              <p className="text-[10px] text-gray-400 mt-3">Documents are used for verification only. They are not shown to buyers.</p>
            </div>

            {/* Ratings */}
            {farmer.ratings?.count > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-3">⭐ My Ratings</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['freshness', 'quality', 'delivery', 'behaviour'].map(k => {
                    const r = farmer.ratings[k];
                    const avg = r?.count > 0 ? (r.total / r.count).toFixed(1) : '—';
                    return (
                      <div key={k} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                        <span className="capitalize text-gray-500 text-xs">{k}</span>
                        <span className="font-bold text-gray-800 text-sm">{avg} ⭐</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">{farmer.ratings.count} total ratings · Avg {farmer.ratings.average?.toFixed(1)}</p>
              </div>
            )}

          </div>
        )}

      </main>
      <Footer />

      {/* Add/Edit product modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg mb-4">{editId ? 'Edit Product' : 'Add Harvest'}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Product Name (English) *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400" placeholder="e.g. Tomato" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tamil Name</label>
                <input value={form.nameTa} onChange={e => setForm(f => ({ ...f, nameTa: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400" placeholder="e.g. தக்காளி" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400 capitalize">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Price per unit (₹) *</label>
                  <input type="number" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Available Qty *</label>
                  <input type="number" value={form.availableQuantity} onChange={e => setForm(f => ({ ...f, availableQuantity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400" />
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-green-700">🗓 Harvest Availability Window *</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Available From</label>
                    <input type="date" min={today} max={maxDate.toISOString().split('T')[0]}
                      value={form.harvestFrom}
                      onChange={e => {
                        const from = e.target.value;
                        setForm(f => ({
                          ...f,
                          harvestFrom: from,
                          // auto-set To = From + 7 days if not set
                          harvestTo: f.harvestTo && f.harvestTo >= from ? f.harvestTo : (() => { const d = new Date(from); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })(),
                        }));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Available To</label>
                    <input type="date" min={form.harvestFrom || today} max={maxDate.toISOString().split('T')[0]}
                      value={form.harvestTo}
                      onChange={e => setForm(f => ({ ...f, harvestTo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400 bg-white" />
                  </div>
                </div>
                <p className="text-[10px] text-green-600">Buyers can order during this window. Product expires 3 days after end date.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Delivery Type</label>
                <select value={form.deliveryType} onChange={e => setForm(f => ({ ...f, deliveryType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400">
                  <option value="both">Both (Instant + Scheduled)</option>
                  <option value="instant">Instant Only</option>
                  <option value="scheduled">Scheduled Only</option>
                </select>
              </div>

              {/* Product type + shipping */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3">
                <p className="text-xs font-bold text-blue-700">📦 Product Type & Shipping</p>
                <div>
                  <label className="text-xs font-medium text-gray-600">Product Type *</label>
                  <div className="flex gap-2 mt-1">
                    {[{ val: 'fresh', label: '🥬 Fresh Produce', hint: 'Vegetables, fruits, greens' },
                      { val: 'dry',   label: '🌾 Dry Product',   hint: 'Millets, grains, pulses' }].map(o => (
                      <button key={o.val} type="button"
                        onClick={() => setForm(f => ({ ...f, productType: o.val, canShip: o.val === 'fresh' ? false : f.canShip }))}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-colors text-left ${form.productType === o.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {o.label}
                        <p className={`text-[10px] font-normal mt-0.5 ${form.productType === o.val ? 'text-blue-100' : 'text-gray-400'}`}>{o.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {form.productType === 'dry' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Can ship to buyer?</p>
                      <p className="text-[10px] text-gray-400">Allow delivery beyond local area</p>
                    </div>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, canShip: !f.canShip }))}
                      className={`w-11 h-6 rounded-full transition-colors relative ${form.canShip ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.canShip ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
                {form.productType === 'fresh' && (
                  <p className="text-[10px] text-blue-500">⚠️ Fresh produce can only be delivered locally (within 10 km from your farm).</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl">Cancel</button>
              <button onClick={handleSaveProduct} disabled={saving}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-60">
                {saving ? 'Saving...' : editId ? 'Update' : 'List Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
