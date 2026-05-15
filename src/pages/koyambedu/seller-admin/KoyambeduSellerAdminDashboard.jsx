import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const TABS = ['sellers', 'products'];

const STATUS_COLOR = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-700',
  suspended:      'bg-orange-100 text-orange-700',
};

const EMPTY_SELLER = {
  ownerName: '', businessName: '', stallNumber: '', marketSection: '',
  contactPhone: '', contactEmail: '', description: '',
};

export default function KoyambeduSellerAdminDashboard() {
  const navigate = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [tab,      setTab]      = useState('sellers');
  const [sellers,  setSellers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Seller create modal
  const [showCreate, setShowCreate] = useState(false);
  const [sellerForm, setSellerForm] = useState(EMPTY_SELLER);
  const [userQuery,  setUserQuery]  = useState('');
  const [userResults,setUserResults]= useState([]);
  const [selectedUser,setSelectedUser]= useState(null);
  const [searching,  setSearching]  = useState(false);

  // Product edit modal
  const [products,    setProducts]    = useState([]);
  const [sellerFilter,setSellerFilter]= useState('');
  const [editProduct, setEditProduct] = useState(null);
  const [prodForm,    setProdForm]    = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (tab === 'sellers') loadSellers();
    if (tab === 'products' && sellerFilter) loadProducts(sellerFilter);
  }, [tab]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/koyambedu/seller-admin/profile');
      setProfile(data.sellerAdmin);
      if (data.sellerAdmin.status !== 'approved') return; // blocked below
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

  const searchUsers = async (q) => {
    setUserQuery(q);
    setSelectedUser(null);
    setSellerForm(f => ({ ...f, userId: '' }));
    if (q.trim().length < 3) { setUserResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/user-search?q=${encodeURIComponent(q.trim())}`);
      setUserResults(data.users || []);
    } catch { setUserResults([]); }
    finally { setSearching(false); }
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery(u.email || u.phone || '');
    setSellerForm(f => ({ ...f, userId: u._id, contactPhone: f.contactPhone || u.phone || '', contactEmail: f.contactEmail || u.email || '' }));
  };

  const createSeller = async () => {
    if (!sellerForm.userId || !sellerForm.ownerName || !sellerForm.businessName) {
      toast.error('User, owner name and business name required'); return;
    }
    setSaving(true);
    try {
      await api.post('/koyambedu/seller-admin/sellers', { ...sellerForm });
      toast.success('Seller created — pending SuperAdmin approval');
      setShowCreate(false);
      setSellerForm(EMPTY_SELLER);
      setSelectedUser(null); setUserQuery(''); setUserResults([]);
      loadSellers();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const openEditProduct = (p) => {
    setEditProduct(p);
    setProdForm({
      currentPrice:    p.currentPrice,
      stockQty:        p.stockQty,
      minQty:          p.minQty,
      isAvailable:     p.isAvailable,
      isSameDay:       p.isSameDay,
      isNextDay:       p.isNextDay,
      sameDayCutoff:   p.sameDayCutoff || '10:00',
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

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;

  // Not approved yet
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

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-4 py-1.5 rounded-xl transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
              {t === 'sellers' ? '🏪 Sellers' : '📦 Products'}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{s.businessName}</p>
                      <p className="text-xs text-gray-500">{s.ownerName} · {s.contact?.phone}</p>
                      <p className="text-xs text-gray-400">Stall {s.stallNumber || '—'} · {s.marketSection || '—'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {(s.status || '').replace(/_/g,' ')}
                    </span>
                  </div>
                  {s.status === 'approved' && (
                    <button
                      onClick={() => { setSellerFilter(s._id); setTab('products'); loadProducts(s._id); }}
                      className="mt-3 text-xs font-bold text-green-700 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-50">
                      View Products →
                    </button>
                  )}
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
            {/* Seller picker */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 font-medium">Select Seller</label>
              <select value={sellerFilter} onChange={e => { setSellerFilter(e.target.value); if (e.target.value) loadProducts(e.target.value); }}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">-- Choose a seller --</option>
                {sellers.filter(s => s.status === 'approved').map(s => (
                  <option key={s._id} value={s._id}>{s.businessName} · {s.ownerName}</option>
                ))}
              </select>
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
                <p className="text-center text-gray-400 py-8 text-sm">No products for this seller</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Seller Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add New Seller</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-500">The seller must already have an Eptomart account.</p>

            {/* User search */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Search Eptomart User * (email or phone)</label>
              <div className="relative mt-1">
                <input type="text" value={userQuery} onChange={e => searchUsers(e.target.value)}
                  placeholder="Type email or phone..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                {searching && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}
              </div>
              {userResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {userResults.map(u => (
                    <button key={u._id} onClick={() => selectUser(u)}
                      className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-100 last:border-0">
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email || '—'} · {u.phone || '—'}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-green-500">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800 truncate">{selectedUser.name}</p>
                    <p className="text-xs text-green-600 truncate">{selectedUser.email || selectedUser.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserQuery(''); setSellerForm(f => ({ ...f, userId: '' })); }}
                    className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                </div>
              )}
            </div>

            {/* Seller details */}
            {[
              ['ownerName',    'Owner Name *',    'text'],
              ['businessName', 'Business Name *', 'text'],
              ['stallNumber',  'Stall Number',    'text'],
              ['marketSection','Market Section',  'text'],
              ['contactPhone', 'Phone',           'tel'],
              ['contactEmail', 'Email',           'email'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={sellerForm[k]} onChange={e => setSellerForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={createSeller} disabled={saving || !sellerForm.userId}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Seller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Product Modal ── */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Edit: {editProduct.name}</h3>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-400">You can update price, stock, and availability only.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Price (₹) *</label>
                <input type="number" value={prodForm.currentPrice} onChange={e => setProdForm(f => ({ ...f, currentPrice: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Stock Qty</label>
                <input type="number" value={prodForm.stockQty} onChange={e => setProdForm(f => ({ ...f, stockQty: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Min Qty</label>
                <input type="number" step="0.5" value={prodForm.minQty} onChange={e => setProdForm(f => ({ ...f, minQty: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
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
