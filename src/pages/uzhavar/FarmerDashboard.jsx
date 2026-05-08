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
const UNITS      = ['kg', 'gram', 'bunch', 'piece', 'litre'];

const ORDER_STATUS_COLOR = {
  pending_farmer: 'bg-yellow-100 text-yellow-700',
  buyer_confirmed: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  auto_cancelled: 'bg-red-100 text-red-600',
};

const emptyProduct = { name: '', nameTa: '', category: 'vegetable', unit: 'kg', pricePerUnit: '', availableQuantity: '', harvestDate: '', deliveryType: 'both' };

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
      const [fRes, pRes, oRes] = await Promise.all([
        api.get('/uzhavar/farmer/me'),
        api.get('/uzhavar/farmer/products').catch(() => ({ data: { products: [] } })),
        api.get('/uzhavar/farmer/orders'),
      ]);
      setFarmer(fRes.data.farmer);
      setProducts(pRes.data.products || []);
      setOrders(oRes.data.orders || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Farmer get own products (quick workaround using farmerId)
  useEffect(() => {
    if (farmer?._id) {
      api.get(`/uzhavar/farmers/${farmer._id}/products`)
        .then(r => setProducts(r.data.products || []))
        .catch(() => {});
    }
  }, [farmer]);

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
    if (!form.name || !form.pricePerUnit || !form.availableQuantity || !form.harvestDate) {
      toast.error('Fill all required fields');
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
                      <p className="text-xs text-gray-400">Harvest: {new Date(prod.harvestDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ ...prod, harvestDate: prod.harvestDate?.split('T')[0] }); setEditId(prod._id); setShowForm(true); }}
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
              <div>
                <label className="text-xs font-medium text-gray-600">Harvest Date *</label>
                <input type="date" min={today} max={maxDate.toISOString().split('T')[0]} value={form.harvestDate}
                  onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-green-400" />
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

  var maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 10);
}
