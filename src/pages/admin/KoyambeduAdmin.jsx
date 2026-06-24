import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import KoyambeduImageUploader from '../../components/koyambedu/KoyambeduImageUploader';
import KoyambeduVariantProductForm, { EMPTY_VARIANT_PRODUCT } from '../../components/koyambedu/KoyambeduVariantProductForm';
import toast from 'react-hot-toast';

const TAB_LIST = ['dashboard', 'orders', 'sellers', 'seller-admins', 'categories', 'products'];

// ── Danger Zone component ─────────────────────
function DangerZone() {
  const [confirm, setConfirm] = useState('');
  const [wiping,  setWiping]  = useState(false);
  const [result,  setResult]  = useState(null);

  const handleWipe = async () => {
    if (confirm !== 'DELETE ALL') {
      toast.error('Type DELETE ALL exactly to confirm'); return;
    }
    setWiping(true);
    try {
      const { data } = await api.delete('/koyambedu/admin/wipe-all');
      setResult(data.deleted);
      setConfirm('');
      toast.success('All Koyambedu data wiped');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Wipe failed');
    } finally { setWiping(false); }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
        <h2 className="font-black text-red-700 text-base mb-1">⚠️ Danger Zone</h2>
        <p className="text-red-600 text-sm mb-4 leading-relaxed">
          This will permanently delete <strong>all</strong> Koyambedu data:
          products, sellers, seller-admins, orders, carts, and categories.
          <br />Main user accounts are <strong>not</strong> affected.
          <br /><span className="font-bold">This cannot be undone.</span>
        </p>

        {result && (
          <div className="bg-white border border-red-200 rounded-xl p-3 mb-4 text-xs text-gray-700 space-y-1">
            <p className="font-bold text-red-700 mb-1">✓ Wiped successfully:</p>
            {Object.entries(result).map(([k, v]) => (
              <p key={k}>{k}: <strong>{v}</strong> deleted</p>
            ))}
          </div>
        )}

        <label className="block text-sm font-bold text-red-700 mb-1">
          Type <code className="bg-red-100 px-1 rounded">DELETE ALL</code> to confirm
        </label>
        <input
          type="text"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="DELETE ALL"
          className="w-full border-2 border-red-300 rounded-xl px-3 py-2.5 text-sm font-mono mb-3 focus:outline-none focus:border-red-500"
        />
        <button
          onClick={handleWipe}
          disabled={wiping || confirm !== 'DELETE ALL'}
          className="w-full bg-red-600 text-white font-black py-3 rounded-xl disabled:opacity-40 transition active:scale-95">
          {wiping ? 'Wiping…' : '🗑️ Wipe All Koyambedu Data'}
        </button>
      </div>
    </div>
  );
}


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
  const { isSuperAdmin } = useAuth();
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
  const [catFilter,    setCatFilter]    = useState('');

  // Category create/edit modal
  const [showCatForm,  setShowCatForm]  = useState(false);
  const [catFormEdit,  setCatFormEdit]  = useState(null); // null = create, object = edit
  const [catForm,      setCatForm]      = useState({ name:'', nameTamil:'', icon:'🌿', image:'', description:'', sortOrder:'0' });
  const [catImgUploading, setCatImgUploading] = useState(false);
  const [catSaving,    setCatSaving]    = useState(false);

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
  const [userQuery,   setUserQuery]   = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearching, setUserSearching] = useState(false);

  // Reject reason modal
  const [rejectModal, setRejectModal] = useState(null); // { id, type: 'seller'|'sa' }
  const [rejectReason, setRejectReason] = useState('');

  // Edit Seller modal (SuperAdmin only)
  const [editSeller,    setEditSeller]    = useState(null); // seller object
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);

  // Review SA edit modal (SuperAdmin only)
  const [reviewEditSeller, setReviewEditSeller] = useState(null); // seller with pendingEdit
  const [reviewEditSaving, setReviewEditSaving] = useState(false);

  // Create Seller modal (SuperAdmin only)
  const [showCreateSeller, setShowCreateSeller] = useState(false);
  const [createSellerForm, setCreateSellerForm] = useState({
    ownerName: '', businessName: '', stallNumber: '', marketSection: '',
    contactPhone: '', contactEmail: '', commissionRate: '10', description: '',
    assignedSellerAdminId: '',
  });
  const [approvedSaList, setApprovedSaList] = useState([]);
  const [createSellerSaving, setCreateSellerSaving] = useState(false);

  // Add Product modal (admin adds product for any seller)
  const [showAddProduct,   setShowAddProduct]   = useState(false);
  const [addProdSeller,    setAddProdSeller]     = useState(null); // full seller object
  const [kbdCategories,    setKbdCategories]     = useState([]);
  const [kbdProdForm,      setKbdProdForm]       = useState(EMPTY_VARIANT_PRODUCT);
  const [addProdSaving,    setAddProdSaving]      = useState(false);

  // Products tab
  const [products,       setProducts]       = useState([]);
  const [prodSearch,     setProdSearch]     = useState('');
  const [prodAvail,      setProdAvail]      = useState('');
  const [editProduct,    setEditProduct]    = useState(null); // product being edited
  const [editProdForm,   setEditProdForm]   = useState({});
  const [editProdSaving, setEditProdSaving] = useState(false);

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
        const params = catFilter ? `?status=${catFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/categories${params}`);
        setCats(data.categories || []);
      } else if (t === 'products') {
        const params = new URLSearchParams();
        if (prodSearch) params.set('search', prodSearch);
        if (prodAvail)  params.set('available', prodAvail);
        const { data } = await api.get(`/koyambedu/admin/products?${params}`);
        setProducts(data.products || []);
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

  const searchUsers = async (q) => {
    setUserQuery(q);
    setSelectedUser(null);
    setSaForm(f => ({ ...f, userId: '' }));
    if (q.trim().length < 3) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/user-search?q=${encodeURIComponent(q.trim())}`);
      setUserResults(data.users || []);
    } catch { setUserResults([]); }
    finally { setUserSearching(false); }
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery(u.email || u.phone || '');
    setSaForm(f => ({ ...f, userId: u._id, name: f.name || u.name || '', contactPhone: f.contactPhone || u.phone || '', contactEmail: f.contactEmail || u.email || '' }));
  };

  const createSellerAdmin = async () => {
    if (!saForm.userId || !saForm.name) { toast.error('Select a user and enter a name'); return; }
    setSaCreating(true);
    try {
      await api.post('/koyambedu/admin/seller-admins', saForm);
      toast.success('SellerAdmin created. Pending review.');
      setShowSaCreate(false);
      setSaForm({ userId:'', name:'', businessName:'', contactPhone:'', contactEmail:'' });
      setSelectedUser(null); setUserQuery(''); setUserResults([]);
      loadTab('seller-admins');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaCreating(false); }
  };

  const reviewSellerEdit = async (approve, rejectReason = '') => {
    if (!reviewEditSeller) return;
    setReviewEditSaving(true);
    try {
      const { data } = await api.post(
        `/koyambedu/admin/sellers/${reviewEditSeller._id}/review-edit`,
        { approve, rejectReason }
      );
      toast.success(approve ? 'Edit approved and applied!' : 'Edit rejected');
      setReviewEditSeller(null);
      setSellers(prev => prev.map(s => s._id === reviewEditSeller._id ? data.seller : s));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setReviewEditSaving(false); }
  };

  const approveCategory = async (catId, approve) => {
    try {
      await api.patch(`/koyambedu/admin/categories/${catId}/approve`, { approve });
      toast.success(approve ? 'Category approved' : 'Category rejected');
      loadTab('categories');
    } catch { toast.error('Failed'); }
  };

  const openEditSeller = (s) => {
    setEditSeller(s);
    setEditForm({
      ownerName:     s.ownerName     || '',
      businessName:  s.businessName  || '',
      stallNumber:   s.stallNumber   || '',
      marketSection: s.marketSection || '',
      description:   s.description   || '',
      contactPhone:  s.contact?.phone || '',
      contactEmail:  s.contact?.email || '',
      syncToAccount: false,
    });
  };

  const saveEditSeller = async () => {
    setEditSaving(true);
    try {
      const { data } = await api.patch(`/koyambedu/admin/sellers/${editSeller._id}/contact`, editForm);
      toast.success('Seller updated');
      setEditSeller(null);
      // Update the local list immediately
      setSellers(prev => prev.map(s => s._id === editSeller._id ? data.seller : s));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update'); }
    finally { setEditSaving(false); }
  };

  const openAddProduct = async (seller) => {
    setAddProdSeller(seller);
    setKbdProdForm(EMPTY_VARIANT_PRODUCT);
    if (!kbdCategories.length) {
      try {
        const { data } = await api.get('/koyambedu/categories');
        setKbdCategories(data.categories || []);
      } catch {}
    }
    setShowAddProduct(true);
  };

  const submitAddProduct = async () => {
    if (!kbdProdForm.categoryId || !kbdProdForm.name) {
      toast.error('Category and name are required'); return;
    }
    const validVariants = (kbdProdForm.variants || []).filter((v, i, arr) => v.basePrice && v.fromQty && (v.toQty || i === arr.length - 1));
    if (validVariants.length === 0) {
      toast.error('At least one complete variant (base price + qty range) is required'); return;
    }
    setAddProdSaving(true);
    try {
      await api.post(`/koyambedu/admin/sellers/${addProdSeller._id}/products`, {
        ...kbdProdForm,
        variants: validVariants,
      });
      toast.success('Product added!');
      setShowAddProduct(false);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setAddProdSaving(false); }
  };

  const openCatCreate = () => {
    setCatFormEdit(null);
    setCatForm({ name:'', nameTamil:'', icon:'🌿', image:'', description:'', sortOrder:'0' });
    setShowCatForm(true);
  };

  const openCatEdit = (cat) => {
    setCatFormEdit(cat);
    setCatForm({ name: cat.name, nameTamil: cat.nameTamil || '', icon: cat.icon || '🌿', image: cat.image || '', description: cat.description || '', sortOrder: String(cat.sortOrder || 0) });
    setShowCatForm(true);
  };

  const uploadCatImage = async (file) => {
    if (!file) return;
    setCatImgUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/koyambedu/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCatForm(f => ({ ...f, image: data.url }));
      toast.success('Image uploaded');
    } catch { toast.error('Image upload failed'); }
    finally { setCatImgUploading(false); }
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setCatSaving(true);
    try {
      if (catFormEdit) {
        await api.put(`/koyambedu/admin/categories/${catFormEdit._id}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post('/koyambedu/admin/categories', catForm);
        toast.success('Category created');
      }
      setShowCatForm(false);
      loadTab('categories');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setCatSaving(false); }
  };

  const toggleCatActive = async (cat) => {
    try {
      await api.put(`/koyambedu/admin/categories/${cat._id}`, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
      loadTab('categories');
    } catch { toast.error('Failed'); }
  };

  const openEditProduct = (p) => {
    setEditProduct(p);
    setEditProdForm({
      categoryId:               p.category?._id || p.categoryId || '',
      name:                     p.name,
      nameTamil:                p.nameTamil || '',
      unit:                     p.unit || 'kg',
      unitLabel:                p.unitLabel || p.unit || 'kg',
      description:              p.description || '',
      isAvailable:              p.isAvailable,
      isSameDay:                p.isSameDay,
      isNextDay:                p.isNextDay,
      badges:                   p.badges || [],
      images:                   p.images || [],
      procurementChargePercent: p.procurementChargePercent || 15,
      platformChargePercent:    p.platformChargePercent    || 10,
      logisticsChargePercent:   p.logisticsChargePercent   || 10,
      variants: p.variants?.length
        ? p.variants.map(v => ({ basePrice: v.basePrice, fromQty: v.fromQty, toQty: v.toQty, finalPrice: String(v.finalPrice) }))
        : [{ basePrice: p.currentPrice || '', fromQty: p.minQty || 1, toQty: p.maxQty || 50, finalPrice: String(p.currentPrice || '') }],
    });
  };

  const saveEditProduct = async () => {
    setEditProdSaving(true);
    try {
      const validVariants = (editProdForm.variants || []).filter((v, i, arr) => v.basePrice && v.fromQty && (v.toQty || i === arr.length - 1));
      await api.put(`/koyambedu/admin/products/${editProduct._id}`, {
        ...editProdForm,
        variants: validVariants.length > 0 ? validVariants : undefined,
      });
      toast.success('Product updated');
      setEditProduct(null);
      loadTab('products');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setEditProdSaving(false); }
  };

  const toggleProduct = async (productId) => {
    try {
      const { data } = await api.patch(`/koyambedu/admin/products/${productId}/toggle`);
      toast.success(data.isAvailable ? 'Product enabled' : 'Product disabled');
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, isAvailable: data.isAvailable } : p));
    } catch { toast.error('Failed'); }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/koyambedu/admin/products/${p._id}`);
      toast.success('Product deleted');
      setProducts(prev => prev.filter(x => x._id !== p._id));
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  const openCreateSeller = async () => {
    setCreateSellerForm({ ownerName:'', businessName:'', stallNumber:'', marketSection:'', contactPhone:'', contactEmail:'', commissionRate:'10', description:'', assignedSellerAdminId:'' });
    // Load approved seller admins for the dropdown
    try {
      const { data } = await api.get('/koyambedu/admin/seller-admins?status=approved');
      setApprovedSaList(data.sellerAdmins || []);
    } catch { setApprovedSaList([]); }
    setShowCreateSeller(true);
  };

  const submitCreateSeller = async () => {
    const { ownerName, businessName, contactPhone } = createSellerForm;
    if (!ownerName || !businessName || !contactPhone) {
      toast.error('Owner name, business name and phone are required'); return;
    }
    setCreateSellerSaving(true);
    try {
      await api.post('/koyambedu/admin/sellers', createSellerForm);
      toast.success('Seller created and approved!');
      setShowCreateSeller(false);
      loadTab('sellers');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create seller'); }
    finally { setCreateSellerSaving(false); }
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['pending_review','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended']].map(([v,label]) => (
                  <button key={v} onClick={() => { setSellerFilter(v); setTimeout(() => loadTab('sellers'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${sellerFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {isSuperAdmin && (
                <button onClick={openCreateSeller}
                  className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                  + Create Seller
                </button>
              )}
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
                      {s.pendingEdit?.submittedAt && (
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">📝 Edit Pending Review</p>
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
                      <>
                        <button onClick={() => sellerAction(s._id, 'suspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50">Suspend</button>
                        <button onClick={() => openAddProduct(s)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700">+ Add Product</button>
                      </>
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
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => openEditSeller(s)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-300 text-blue-600 hover:bg-blue-50">
                          ✏️ Edit
                        </button>
                        {s.pendingEdit?.submittedAt && (
                          <button onClick={() => setReviewEditSeller(s)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600">
                            📝 Review Edit
                          </button>
                        )}
                      </>
                    )}
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
              🔒 SellerAdmins can create sellers and update product prices/stock. They cannot approve sellers and cannot see buyer info.
              {!isSuperAdmin && <span className="block mt-1 text-orange-600 font-semibold">⚠️ Approving SellerAdmins requires SuperAdmin access.</span>}
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
                    {isSuperAdmin ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Approval requires SuperAdmin</span>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']].map(([v,label]) => (
                  <button key={v} onClick={() => { setCatFilter(v); setTimeout(() => loadTab('categories'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${catFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={openCatCreate}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                + Add Category
              </button>
            </div>
            <div className="space-y-2">
              {cats.map(cat => (
                <div key={cat._id} className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${!cat.isActive ? 'opacity-50' : 'border-gray-200'}`}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    : <span className="text-2xl w-9 text-center flex-shrink-0">{cat.icon || '🌿'}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        cat.status === 'approved' ? 'bg-green-100 text-green-700'
                        : cat.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'}`}>
                        {cat.status}
                      </span>
                      {!cat.isActive && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">hidden</span>}
                    </div>
                    {cat.nameTamil && <p className="text-[10px] text-gray-400">{cat.nameTamil}</p>}
                    {cat.sortOrder > 0 && <p className="text-[10px] text-gray-400">Order: {cat.sortOrder}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {cat.status === 'pending' && (
                      <>
                        <button onClick={() => approveCategory(cat._id, true)} className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">✓</button>
                        <button onClick={() => approveCategory(cat._id, false)} className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">✕</button>
                      </>
                    )}
                    <button onClick={() => openCatEdit(cat)}
                      className="border border-blue-200 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-blue-50">
                      Edit
                    </button>
                    <button onClick={() => toggleCatActive(cat)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${cat.isActive ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {cat.isActive ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
              {cats.length === 0 && <p className="text-center text-gray-500 py-8">No categories found</p>}
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && !loading && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                placeholder="Search product name…"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-green-400" />
              <select value={prodAvail} onChange={e => setProdAvail(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <button onClick={() => loadTab('products')}
                className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
                Search
              </button>
            </div>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p._id} className={`bg-white rounded-2xl border p-3 ${!p.isAvailable ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    {p.images?.[0]?.url && (
                      <img src={p.images[0].url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm leading-tight">{p.name}</p>
                          {p.nameTamil && <p className="text-[11px] text-gray-400">{p.nameTamil}</p>}
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {p.category?.icon} {p.category?.name} · {p.seller?.businessName}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.isAvailable ? 'Available' : 'Off'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                        <span className="font-black text-gray-800">₹{p.currentPrice}</span>
                        <span>/{p.unitLabel || p.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => openEditProduct(p)}
                      className="flex-1 border border-blue-200 text-blue-600 text-xs font-bold py-1.5 rounded-xl hover:bg-blue-50">
                      ✏️ Edit
                    </button>
                    <button onClick={() => toggleProduct(p._id)}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-xl border ${p.isAvailable ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {p.isAvailable ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteProduct(p)}
                      className="border border-red-200 text-red-500 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-red-50">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-center text-gray-500 py-8">No products found</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Product modal ── */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Edit Product</h3>
                  <p className="text-xs text-gray-500">{editProduct.seller?.businessName}</p>
                </div>
                <button onClick={() => setEditProduct(null)} className="text-gray-400 text-xl font-bold">✕</button>
              </div>

              <KoyambeduVariantProductForm
                form={editProdForm}
                onChange={setEditProdForm}
                categories={kbdCategories.length ? kbdCategories : [editProduct.category].filter(Boolean)}
              />

              <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                <button onClick={() => setEditProduct(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={saveEditProduct} disabled={editProdSaving}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {editProdSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Category Create/Edit modal ── */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{catFormEdit ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            {[
              ['name',        'Category Name *', 'text',   'e.g. Vegetables'],
              ['nameTamil',   'Tamil Name',      'text',   'தமிழ் பெயர்'],
              ['icon',        'Emoji Icon',      'text',   '🥦'],
              ['description', 'Description',     'text',   'Short description'],
              ['sortOrder',   'Sort Order',      'number', '0 = first'],
            ].map(([field, label, type, ph]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                <input type={type} value={catForm[field]}
                  onChange={e => setCatForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            {/* Category image upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category Image</label>
              {catForm.image ? (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200">
                  <img src={catForm.image} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCatForm(f => ({ ...f, image: '' }))}
                    className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border-2 border-dashed border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold hover:bg-green-50 cursor-pointer w-full justify-center">
                  {catImgUploading
                    ? <><span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Uploading…</>
                    : <><span className="text-lg">🖼️</span> Upload Image</>}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => uploadCatImage(e.target.files?.[0])} disabled={catImgUploading} />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCatForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={saveCat} disabled={catSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {catSaving ? 'Saving…' : catFormEdit ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Seller modal (SuperAdmin only) ── */}
      {showCreateSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Create Seller (Pre-Approved)</h3>
              <button onClick={() => setShowCreateSeller(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700">
              ✅ Seller will be created with <strong>Approved</strong> status — no review needed.
            </div>
            {[
              ['ownerName',     'Owner Name *',       'text', 'e.g. Rajan Kumar'],
              ['businessName',  'Business Name *',    'text', 'e.g. Rajan Vegetables'],
              ['contactPhone',  'Contact Phone *',    'tel',  '10-digit mobile'],
              ['stallNumber',   'Stall Number',       'text', 'e.g. A-12'],
              ['marketSection', 'Market Section',     'text', 'e.g. Vegetables, Flowers'],
              ['contactEmail',  'Email (optional)',   'email',''],
              ['commissionRate','Commission Rate (%)', 'number','e.g. 10'],
              ['description',   'Description',        'text', 'Short note about seller'],
            ].map(([field, label, type, ph]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={createSellerForm[field]}
                  onChange={e => setCreateSellerForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assign to Seller Admin (optional)</label>
              <select
                value={createSellerForm.assignedSellerAdminId}
                onChange={e => setCreateSellerForm(f => ({ ...f, assignedSellerAdminId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">— None —</option>
                {approvedSaList.map(sa => (
                  <option key={sa._id} value={sa._id}>{sa.name} ({sa.businessName || sa.user?.email || 'SA'})</option>
                ))}
              </select>
              {approvedSaList.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No approved seller admins found.</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreateSeller(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitCreateSeller} disabled={createSellerSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-green-700 disabled:opacity-50">
                {createSellerSaving ? 'Creating…' : '✓ Create Seller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create SellerAdmin modal ── */}
      {showSaCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800">Create Seller Admin</h3>
            <p className="text-xs text-gray-500">Seller Admins can create and manage sellers but cannot approve them.</p>

            {/* User search */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Search Eptomart User * (email, phone or name)</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={userQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="Type email, phone or name..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                {userSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {/* Dropdown results */}
              {userResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {userResults.map(u => (
                    <button key={u._id} onClick={() => selectUser(u)}
                      className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-100 last:border-0 transition">
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email || '—'} · {u.phone || '—'}</p>
                    </button>
                  ))}
                </div>
              )}
              {/* Selected user badge */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800 truncate">{selectedUser.name}</p>
                    <p className="text-xs text-green-600 truncate">{selectedUser.email || selectedUser.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserQuery(''); setSaForm(f => ({ ...f, userId: '' })); }}
                    className="text-gray-400 hover:text-red-500 text-sm font-bold flex-shrink-0">✕</button>
                </div>
              )}
            </div>

            {/* Rest of form fields */}
            {[
              ['name',         'Full Name *',     'text'],
              ['businessName', 'Business Name',   'text'],
              ['contactPhone', 'Phone',           'tel'],
              ['contactEmail', 'Email',           'email'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={saForm[k]} onChange={e => setSaForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowSaCreate(false); setUserQuery(''); setUserResults([]); setSelectedUser(null); }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={createSellerAdmin} disabled={saCreating || !saForm.userId || !saForm.name}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Seller modal (SuperAdmin only) ── */}
      {editSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Edit Seller</h3>
                <p className="text-xs text-gray-500">{editSeller.businessName}</p>
              </div>
              <button onClick={() => setEditSeller(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            {[
              ['ownerName',    'Owner Name',     'text'],
              ['businessName', 'Business Name',  'text'],
              ['stallNumber',  'Stall Number',   'text'],
              ['marketSection','Market Section', 'text'],
              ['description',  'Description',    'text'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={editForm[k]}
                  onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}

            {/* Contact fields — highlighted */}
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 space-y-2">
              <p className="text-xs font-bold text-blue-700">📞 Contact Details</p>
              <div>
                <label className="text-xs text-gray-500 font-medium">Phone</label>
                <input type="tel" value={editForm.contactPhone}
                  onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Email</label>
                <input type="email" value={editForm.contactEmail}
                  onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* Sync to Eptomart account toggle — only shown if seller has a linked account */}
            {editSeller.user && (
              <label className="flex items-start gap-2 cursor-pointer p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <input type="checkbox" checked={editForm.syncToAccount}
                  onChange={e => setEditForm(f => ({ ...f, syncToAccount: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Also update linked Eptomart account</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Syncs phone &amp; email to the seller's login account ({editSeller.user?.email || editSeller.user?.phone || 'linked account'}) so they can log in with the new details.
                  </p>
                </div>
              </label>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditSeller(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={saveEditSeller} disabled={editSaving}
                className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Product modal (admin) ── */}
      {showAddProduct && addProdSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Add Product</h3>
                  <p className="text-xs text-gray-500">For: {addProdSeller.businessName} · {addProdSeller.ownerName}</p>
                </div>
                <button onClick={() => setShowAddProduct(false)} className="text-gray-400 text-xl">✕</button>
              </div>

              <KoyambeduVariantProductForm
                form={kbdProdForm}
                onChange={setKbdProdForm}
                categories={kbdCategories}
              />

              <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={submitAddProduct} disabled={addProdSaving}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {addProdSaving ? 'Adding…' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Review SA Edit modal (SuperAdmin only) ── */}
      {reviewEditSeller && reviewEditSeller.pendingEdit && (
        <div className="fixed inset-0 bg-black/50 z-[9996] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Review Proposed Edit</h3>
                <p className="text-xs text-gray-500">{reviewEditSeller.businessName} · submitted {new Date(reviewEditSeller.pendingEdit.submittedAt).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => setReviewEditSeller(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ Approving will immediately apply these changes to the live seller profile. Rejecting will discard them.
            </p>

            {/* Diff view */}
            <div className="space-y-2">
              {[
                ['Owner Name',     'ownerName'],
                ['Business Name',  'businessName'],
                ['Stall Number',   'stallNumber'],
                ['Market Section', 'marketSection'],
                ['Description',    'description'],
              ].map(([label, key]) => {
                const current  = reviewEditSeller[key] || '—';
                const proposed = reviewEditSeller.pendingEdit[key];
                if (proposed === undefined) return null;
                const changed = proposed !== current;
                return (
                  <div key={key} className={`rounded-xl px-3 py-2.5 border ${changed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {changed ? (
                        <>
                          <span className="text-xs text-red-500 line-through">{current}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs font-semibold text-green-700">{proposed || '—'}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">{current} <span className="text-gray-400">(no change)</span></span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contact fields */}
              {reviewEditSeller.pendingEdit.contact && [
                ['Phone',     'contact.phone',    'phone'],
                ['Email',     'contact.email',    'email'],
                ['Alt Phone', 'contact.altPhone', 'altPhone'],
              ].map(([label, _, key]) => {
                const current  = reviewEditSeller.contact?.[key] || '—';
                const proposed = reviewEditSeller.pendingEdit.contact?.[key];
                if (proposed === undefined) return null;
                const changed = proposed !== current;
                return (
                  <div key={key} className={`rounded-xl px-3 py-2.5 border ${changed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{label} (contact)</p>
                    <div className="flex items-center gap-2 mt-1">
                      {changed ? (
                        <>
                          <span className="text-xs text-red-500 line-through">{current}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs font-semibold text-blue-700">{proposed || '—'}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">{current} <span className="text-gray-400">(no change)</span></span>
                      )}
                    </div>
                  </div>
                );
              })}

              {reviewEditSeller.user && reviewEditSeller.pendingEdit.contact && (
                reviewEditSeller.pendingEdit.contact.phone || reviewEditSeller.pendingEdit.contact.email
              ) && (
                <p className="text-[10px] text-blue-500 px-1">
                  ℹ️ Phone/email changes will also sync to the seller's Eptomart login account.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setReviewEditSeller(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => reviewSellerEdit(false)} disabled={reviewEditSaving}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600 disabled:opacity-60">
                {reviewEditSaving ? '...' : '✕ Reject'}
              </button>
              <button onClick={() => reviewSellerEdit(true)} disabled={reviewEditSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {reviewEditSaving ? '...' : '✓ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DANGER ZONE TAB ── */}
      {tab === 'danger' && <DangerZone />}

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
