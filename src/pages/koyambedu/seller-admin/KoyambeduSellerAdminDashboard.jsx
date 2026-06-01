import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── AI helpers ───────────────────────────────
const useAI = () => {
  const [translating, setTranslating] = useState(false);
  const [describing,  setDescribing]  = useState(false);

  const translate = async (text, onResult) => {
    if (!text?.trim()) { toast.error('Enter a product name first'); return; }
    setTranslating(true);
    try {
      const { data } = await api.post('/koyambedu/ai/translate', { text });
      onResult(data.tamil);
      toast.success('Translated to Tamil!');
    } catch { toast.error('Translation failed'); }
    finally { setTranslating(false); }
  };

  const describe = async ({ name, nameTamil, category, unit }, onResult) => {
    if (!name?.trim()) { toast.error('Enter a product name first'); return; }
    setDescribing(true);
    try {
      const { data } = await api.post('/koyambedu/ai/describe', { name, nameTamil, category, unit });
      onResult(data.description);
      toast.success('Description generated!');
    } catch { toast.error('AI description failed'); }
    finally { setDescribing(false); }
  };

  return { translate, describe, translating, describing };
};

const TABS = ['sellers', 'products', 'categories'];

const UNITS   = ['kg','g','piece','bunch','dozen','litre','pack','leaf'];
const BADGES  = ['fresh_arrival','low_stock','best_seller','seasonal','organic','festival_special','bulk_deal'];

const STATUS_COLOR = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-700',
  suspended:      'bg-orange-100 text-orange-700',
};

const EMPTY_SELLER = {
  ownerName: '', businessName: '', stallNumber: '', marketSection: '',
  contactPhone: '', contactEmail: '', description: '',
  // account creation (optional)
  createAccount: false, accountPhone: '', accountEmail: '',
};

const EMPTY_PRODUCT = {
  categoryId: '', name: '', nameTamil: '', unit: 'kg', unitLabel: 'kg',
  currentPrice: '', stockQty: 0, minQty: 0.5, maxQty: 50,
  weightKg: 1, marketPriceMin: '', marketPriceMax: '',
  freshArrivalTime: '', sameDayCutoff: '10:00',
  isSameDay: true, isNextDay: true, isAvailable: true,
  badges: [], description: '',
};

export default function KoyambeduSellerAdminDashboard() {
  const navigate = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [tab,      setTab]      = useState('sellers');
  const [sellers,  setSellers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Seller create modal
  const [showCreate,  setShowCreate]  = useState(false);
  const [sellerForm,  setSellerForm]  = useState(EMPTY_SELLER);

  // Categories tab
  const [catList,       setCatList]       = useState([]);
  const [showCatForm,   setShowCatForm]   = useState(false);
  const [catForm,       setCatForm]       = useState({ name:'', nameTamil:'', icon:'🌿', description:'' });
  const [catSaving,     setCatSaving]     = useState(false);

  // Product create modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProdSellerId, setAddProdSellerId] = useState('');
  const [prodCreateForm,  setProdCreateForm]  = useState(EMPTY_PRODUCT);
  const [categories,      setCategories]      = useState([]);

  // Edit seller (pending-approval flow)
  const [showEditSeller,  setShowEditSeller]  = useState(false);
  const [editSellerTarget, setEditSellerTarget] = useState(null);
  const [editSellerForm,  setEditSellerForm]  = useState({});
  const [editSellerSaving, setEditSellerSaving] = useState(false);

  // Product edit modal
  const [products,     setProducts]     = useState([]);
  const [sellerFilter, setSellerFilter] = useState('');
  const [editProduct,  setEditProduct]  = useState(null);
  const [prodForm,     setProdForm]     = useState({});
  const { translate, describe, translating, describing } = useAI();

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => {
    if (tab === 'sellers')    loadSellers();
    if (tab === 'products' && sellerFilter) loadProducts(sellerFilter);
    if (tab === 'categories') loadCatList();
  }, [tab]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/koyambedu/seller-admin/profile');
      setProfile(data.sellerAdmin);
      if (data.sellerAdmin.status !== 'approved') return;
      loadSellers();
    } catch {
      toast.error('Not authorised as Seller Admin');
      navigate('/koyambedu');
    } finally { setLoading(false); }
  };

  const loadSellers = async () => {
    try {
      const { data } = await api.get('/koyambedu/seller-admin/sellers');
      setSellers(data.sellers || []);
    } catch { toast.error('Failed to load sellers'); }
  };

  const loadProducts = async (sellerId) => {
    try {
      const { data } = await api.get(`/koyambedu/seller-admin/sellers/${sellerId}/products`);
      setProducts(data.products || []);
    } catch { toast.error('Failed to load products'); }
  };

  const loadCategories = async () => {
    if (categories.length) return;
    try {
      const { data } = await api.get('/koyambedu/categories');
      setCategories(data.categories || []);
    } catch {}
  };

  const loadCatList = async () => {
    try {
      // Fetch all categories (including pending) visible to this SA
      const { data } = await api.get('/koyambedu/seller-admin/categories');
      setCatList(data.categories || []);
    } catch { toast.error('Failed to load categories'); }
  };

  const submitCategory = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setCatSaving(true);
    try {
      await api.post('/koyambedu/seller-admin/categories', catForm);
      toast.success('Category submitted for admin approval');
      setShowCatForm(false);
      setCatForm({ name:'', nameTamil:'', icon:'🌿', description:'' });
      loadCatList();
      // Also refresh the categories dropdown used in product form
      setCategories([]);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setCatSaving(false); }
  };

  // ── Create Seller ─────────────────────────────────────
  const createSeller = async () => {
    if (!sellerForm.ownerName || !sellerForm.businessName || !sellerForm.contactPhone) {
      toast.error('Owner name, business name and phone are required'); return;
    }
    setSaving(true);
    try {
      await api.post('/koyambedu/seller-admin/sellers', { ...sellerForm });
      toast.success('Seller created — pending SuperAdmin approval');
      setShowCreate(false);
      setSellerForm(EMPTY_SELLER);
      loadSellers();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Edit Seller (pending-approval) ───────────────────
  const openEditSeller = (s) => {
    setEditSellerTarget(s);
    setEditSellerForm({
      ownerName:      s.ownerName     || '',
      businessName:   s.businessName  || '',
      stallNumber:    s.stallNumber   || '',
      marketSection:  s.marketSection || '',
      description:    s.description   || '',
      contactPhone:   s.contact?.phone    || '',
      contactEmail:   s.contact?.email    || '',
      contactAltPhone:s.contact?.altPhone || '',
    });
    setShowEditSeller(true);
  };

  const submitEditRequest = async () => {
    if (!editSellerTarget) return;
    setEditSellerSaving(true);
    try {
      await api.patch(`/koyambedu/seller-admin/sellers/${editSellerTarget._id}/edit-request`, editSellerForm);
      toast.success('Edit request submitted — awaiting SuperAdmin review');
      setShowEditSeller(false);
      setEditSellerTarget(null);
      loadSellers();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to submit edit'); }
    finally { setEditSellerSaving(false); }
  };

  // ── Add Product (for a seller) ────────────────────────
  const openAddProduct = async (sellerId) => {
    setAddProdSellerId(sellerId);
    setProdCreateForm(EMPTY_PRODUCT);
    await loadCategories();
    setShowAddProduct(true);
  };

  const submitAddProduct = async () => {
    if (!prodCreateForm.categoryId || !prodCreateForm.name || !prodCreateForm.currentPrice) {
      toast.error('Category, name and price are required'); return;
    }
    setSaving(true);
    try {
      await api.post(`/koyambedu/seller-admin/sellers/${addProdSellerId}/products`, prodCreateForm);
      toast.success('Product added!');
      setShowAddProduct(false);
      if (sellerFilter === addProdSellerId) loadProducts(addProdSellerId);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Edit Product ──────────────────────────────────────
  const openEditProduct = (p) => {
    setEditProduct(p);
    setProdForm({
      currentPrice:  p.currentPrice,
      stockQty:      p.stockQty,
      minQty:        p.minQty,
      isAvailable:   p.isAvailable,
      isSameDay:     p.isSameDay,
      isNextDay:     p.isNextDay,
      sameDayCutoff: p.sameDayCutoff || '10:00',
    });
  };

  const saveProduct = async () => {
    setSaving(true);
    try {
      await api.put(`/koyambedu/seller-admin/sellers/${sellerFilter}/products/${editProduct._id}`, prodForm);
      toast.success('Product updated');
      setEditProduct(null);
      loadProducts(sellerFilter);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!profile) return null;

  if (profile.status !== 'approved') return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 gap-4">
      <p className="text-5xl">⏳</p>
      <h2 className="font-black text-gray-800 text-xl text-center">Account Pending Approval</h2>
      <p className="text-gray-500 text-sm text-center max-w-xs">
        Your Seller Admin account is <span className="font-bold">{profile.status.replace(/_/g,' ')}</span>.
        A SuperAdmin needs to approve it before you can access the dashboard.
      </p>
      <button onClick={() => navigate('/koyambedu')} className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
        Back to Koyambedu
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-10">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/koyambedu')} className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-white font-black text-lg leading-none">Seller Admin Portal</h1>
            <p className="text-green-200 text-[11px] mt-0.5">{profile.name} · {profile.businessName || 'Koyambedu Daily'}</p>
          </div>
          <span className="bg-green-400/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
            Seller Admin
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-4 py-1.5 rounded-xl transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
              {t === 'sellers' ? '🏪 Sellers' : t === 'products' ? '📦 Products' : '🏷️ Categories'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">

        {/* ── SELLERS TAB ── */}
        {tab === 'sellers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-700">{sellers.length} seller{sellers.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowCreate(true)}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700">
                + Add Seller
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4 text-xs text-blue-700">
              ℹ️ New sellers require SuperAdmin approval before they can list products.
            </div>
            <div className="space-y-3">
              {sellers.map(s => (
                <div key={s._id} className="bg-white rounded-2xl border border-green-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800">{s.businessName}</p>
                      <p className="text-xs text-gray-500">{s.ownerName} · {s.contact?.phone}</p>
                      <p className="text-xs text-gray-400">Stall {s.stallNumber || '—'} · {s.marketSection || '—'}</p>
                      {s.user && <p className="text-xs text-green-600 mt-0.5">✓ Has Eptomart account</p>}
                      {s.pendingEdit?.submittedAt && (
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">⏳ Edit Pending Review</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {(s.status || '').replace(/_/g,' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => openEditSeller(s)}
                      disabled={!!s.pendingEdit?.submittedAt}
                      className="text-xs font-bold text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      ✏️ Edit Details
                    </button>
                    {s.status === 'approved' && (
                      <>
                        <button
                          onClick={() => { setSellerFilter(s._id); setTab('products'); loadProducts(s._id); }}
                          className="text-xs font-bold text-green-700 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-50">
                          View Products →
                        </button>
                        <button
                          onClick={() => openAddProduct(s._id)}
                          className="text-xs font-bold text-white bg-green-600 px-3 py-1.5 rounded-xl hover:bg-green-700">
                          + Add Product
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {sellers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">🏪</p>
                  <p className="text-gray-500 text-sm">No sellers yet</p>
                  <button onClick={() => setShowCreate(true)} className="mt-3 bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm">
                    + Add Your First Seller
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Select Seller</label>
                <select value={sellerFilter} onChange={e => { setSellerFilter(e.target.value); if (e.target.value) loadProducts(e.target.value); }}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">-- Choose a seller --</option>
                  {sellers.filter(s => s.status === 'approved').map(s => (
                    <option key={s._id} value={s._id}>{s.businessName} · {s.ownerName}</option>
                  ))}
                </select>
              </div>
              {sellerFilter && (
                <button onClick={() => openAddProduct(sellerFilter)}
                  className="mt-5 bg-green-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-green-700 whitespace-nowrap">
                  + Add Product
                </button>
              )}
            </div>

            {!sellerFilter && (
              <div className="text-center py-10 text-gray-400 text-sm">Select a seller to view their products</div>
            )}

            <div className="space-y-3">
              {products.map(p => (
                <div key={p._id} className="bg-white rounded-2xl border border-green-100 p-4">
                  <div className="flex gap-3">
                    {p.images?.[0]?.url && (
                      <img src={p.images[0].url} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                      {p.nameTamil && <p className="text-[10px] text-gray-400">{p.nameTamil}</p>}
                      <p className="text-green-700 font-bold text-sm mt-0.5">₹{p.currentPrice}/{p.unitLabel}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.isAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <span className="text-[10px] text-gray-400">Stock: {p.stockQty} units</span>
                      </div>
                    </div>
                    <button onClick={() => openEditProduct(p)}
                      className="text-xs text-blue-600 font-semibold flex-shrink-0 self-start">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {sellerFilter && products.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm mb-3">No products for this seller yet</p>
                  <button onClick={() => openAddProduct(sellerFilter)}
                    className="bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm">
                    + Add First Product
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── CATEGORIES TAB ── */}
        {tab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-700">{catList.length} categor{catList.length !== 1 ? 'ies' : 'y'}</p>
              <button onClick={() => setShowCatForm(true)}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700">
                + Request Category
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 mb-4 text-xs text-yellow-700">
              ℹ️ New categories need admin approval before they appear in product forms. Approved categories are shown below.
            </div>

            <div className="space-y-2">
              {catList.map(c => (
                <div key={c._id} className="bg-white rounded-2xl border border-green-100 p-3 flex items-center gap-3">
                  <span className="text-2xl">{c.icon || '🌿'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                    {c.nameTamil && <p className="text-xs text-gray-400">{c.nameTamil}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    c.status === 'approved' ? 'bg-green-100 text-green-700' :
                    c.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
              {catList.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">🏷️</p>
                  <p className="text-gray-500 text-sm">No categories yet</p>
                  <button onClick={() => setShowCatForm(true)} className="mt-3 bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm">
                    + Request First Category
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════
          REQUEST CATEGORY MODAL
      ══════════════════════════════════════════ */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Request New Category</h3>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-500">The admin will review and approve before it goes live.</p>

            <div>
              <label className="text-xs text-gray-500 font-medium">Category Name *</label>
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Leafy Greens"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Tamil Name</label>
              <input value={catForm.nameTamil} onChange={e => setCatForm(f => ({ ...f, nameTamil: e.target.value }))}
                placeholder="e.g. கீரை வகைகள்"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Icon (emoji)</label>
              <input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🌿"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Description</label>
              <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCatForm(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={submitCategory} disabled={catSaving || !catForm.name.trim()}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {catSaving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CREATE SELLER MODAL
      ══════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add New Seller</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-500">Fill in the seller's details. No prior Eptomart account needed.</p>

            {[
              ['ownerName',    'Owner Name *',    'text'],
              ['businessName', 'Business Name *', 'text'],
              ['stallNumber',  'Stall Number',    'text'],
              ['marketSection','Market Section',  'text'],
              ['contactPhone', 'Contact Phone *', 'tel'],
              ['contactEmail', 'Contact Email',   'email'],
              ['description',  'Description',     'text'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={sellerForm[k]} onChange={e => setSellerForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            {/* ── Optional: Create Eptomart Login Account ── */}
            <div className="border border-green-200 rounded-xl p-3 bg-green-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sellerForm.createAccount}
                  onChange={e => setSellerForm(f => ({ ...f, createAccount: e.target.checked }))}
                  className="w-4 h-4 accent-green-600" />
                <span className="text-sm font-semibold text-gray-700">Create Eptomart Login Account</span>
              </label>
              <p className="text-xs text-gray-500 pl-6">The seller can use this to log in and manage their own products.</p>

              {sellerForm.createAccount && (
                <div className="pl-6 space-y-2 pt-1">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Login Phone</label>
                    <input type="tel" value={sellerForm.accountPhone}
                      onChange={e => setSellerForm(f => ({ ...f, accountPhone: e.target.value }))}
                      placeholder="Mobile number for OTP login"
                      className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Login Email</label>
                    <input type="email" value={sellerForm.accountEmail}
                      onChange={e => setSellerForm(f => ({ ...f, accountEmail: e.target.value }))}
                      placeholder="Email for OTP login"
                      className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <p className="text-[10px] text-orange-600">⚠️ The seller will need to verify their phone/email via OTP on first login.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={createSeller}
                disabled={saving || !sellerForm.ownerName || !sellerForm.businessName || !sellerForm.contactPhone}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Seller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADD PRODUCT MODAL
      ══════════════════════════════════════════ */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Add Product</h3>
                <button onClick={() => setShowAddProduct(false)} className="text-gray-400 text-xl">✕</button>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Category *</label>
                <select value={prodCreateForm.categoryId} onChange={e => setProdCreateForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="text-xs text-gray-500 font-medium">Product Name *</label>
                <input value={prodCreateForm.name} onChange={e => setProdCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tomato, Banana, Rose"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>

              {/* Tamil Name + Auto-Translate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500 font-medium">Tamil Name</label>
                  <button type="button"
                    onClick={() => translate(prodCreateForm.name, (tamil) => setProdCreateForm(f => ({ ...f, nameTamil: tamil })))}
                    disabled={translating || !prodCreateForm.name?.trim()}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-50 transition">
                    {translating
                      ? <><span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" /> Translating...</>
                      : <>🌐 Auto-Translate</>}
                  </button>
                </div>
                <input value={prodCreateForm.nameTamil} onChange={e => setProdCreateForm(f => ({ ...f, nameTamil: e.target.value }))}
                  placeholder="Tamil translation will appear here"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>

              {/* Description + AI Write */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500 font-medium">Description</label>
                  <button type="button"
                    onClick={() => describe(
                      { name: prodCreateForm.name, nameTamil: prodCreateForm.nameTamil, category: categories.find(c => c._id === prodCreateForm.categoryId)?.name, unit: prodCreateForm.unit },
                      (desc) => setProdCreateForm(f => ({ ...f, description: desc }))
                    )}
                    disabled={describing || !prodCreateForm.name?.trim()}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 disabled:opacity-50 transition">
                    {describing
                      ? <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" /> Writing...</>
                      : <>✨ AI Write</>}
                  </button>
                </div>
                <textarea value={prodCreateForm.description} onChange={e => setProdCreateForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  placeholder="Describe your product — or click ✨ AI Write to generate one"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Unit</label>
                  <select value={prodCreateForm.unit} onChange={e => setProdCreateForm(f => ({ ...f, unit: e.target.value, unitLabel: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Unit Label</label>
                  <input value={prodCreateForm.unitLabel} onChange={e => setProdCreateForm(f => ({ ...f, unitLabel: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="e.g. 500g, 1 bunch" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Price (₹) *</label>
                  <input type="number" value={prodCreateForm.currentPrice} onChange={e => setProdCreateForm(f => ({ ...f, currentPrice: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Stock Qty</label>
                  <input type="number" value={prodCreateForm.stockQty} onChange={e => setProdCreateForm(f => ({ ...f, stockQty: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Weight per unit (kg)</label>
                  <input type="number" step="0.001" value={prodCreateForm.weightKg} onChange={e => setProdCreateForm(f => ({ ...f, weightKg: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="e.g. 1, 0.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Same Day Cutoff</label>
                  <input type="time" value={prodCreateForm.sameDayCutoff} onChange={e => setProdCreateForm(f => ({ ...f, sameDayCutoff: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Badges</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {BADGES.map(b => (
                    <button key={b} type="button"
                      onClick={() => setProdCreateForm(f => ({ ...f, badges: f.badges.includes(b) ? f.badges.filter(x => x !== b) : [...f.badges, b] }))}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${prodCreateForm.badges.includes(b) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {b.replace(/_/g,' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[['isSameDay','Same Day'],['isNextDay','Next Day'],['isAvailable','In Stock']].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={prodCreateForm[k]} onChange={e => setProdCreateForm(f => ({ ...f, [k]: e.target.checked }))} className="w-4 h-4 accent-green-600" />
                    <span className="text-xs text-gray-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={submitAddProduct}
                  disabled={saving || !prodCreateForm.categoryId || !prodCreateForm.name || !prodCreateForm.currentPrice}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {saving ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDIT SELLER MODAL (pending-approval flow)
      ══════════════════════════════════════════ */}
      {showEditSeller && editSellerTarget && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Edit Seller Details</h3>
              <button onClick={() => setShowEditSeller(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
              ⚠️ Your changes will be submitted for SuperAdmin review. They won't go live until approved.
            </div>

            {[
              ['ownerName',     'Owner Name',     'text'],
              ['businessName',  'Business Name',  'text'],
              ['stallNumber',   'Stall / Shop No','text'],
              ['marketSection', 'Market Section', 'text'],
              ['description',   'Description',    'text'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={editSellerForm[k]}
                  onChange={e => setEditSellerForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}

            <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/40 space-y-2">
              <p className="text-xs font-semibold text-blue-700">Contact Details</p>
              {[
                ['contactPhone',    'Phone',        'tel'],
                ['contactEmail',    'Email',        'email'],
                ['contactAltPhone', 'Alt. Phone',   'tel'],
              ].map(([k, label, type]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 font-medium">{label}</label>
                  <input type={type} value={editSellerForm[k]}
                    onChange={e => setEditSellerForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
              <p className="text-[10px] text-blue-500">Contact changes to phone/email will also update the seller's Eptomart login once approved.</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowEditSeller(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={submitEditRequest} disabled={editSellerSaving}
                className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60">
                {editSellerSaving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDIT PRODUCT MODAL
      ══════════════════════════════════════════ */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Edit: {editProduct.name}</h3>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-400">Update price, stock, and availability.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Price (₹) *</label>
                <input type="number" value={prodForm.currentPrice} onChange={e => setProdForm(f => ({ ...f, currentPrice: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Stock Qty</label>
                <input type="number" value={prodForm.stockQty} onChange={e => setProdForm(f => ({ ...f, stockQty: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Min Qty</label>
                <input type="number" step="0.5" value={prodForm.minQty} onChange={e => setProdForm(f => ({ ...f, minQty: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Same Day Cutoff</label>
                <input type="time" value={prodForm.sameDayCutoff} onChange={e => setProdForm(f => ({ ...f, sameDayCutoff: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[['isAvailable','In Stock'],['isSameDay','Same Day'],['isNextDay','Next Day']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2">
                  <input type="checkbox" checked={prodForm[k]} onChange={e => setProdForm(f => ({ ...f, [k]: e.target.checked }))} className="w-4 h-4 accent-green-600" />
                  <span className="text-xs text-gray-700 font-medium">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditProduct(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={saveProduct} disabled={saving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
