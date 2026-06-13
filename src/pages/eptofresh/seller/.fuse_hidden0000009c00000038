// ============================================
// EPTOFRESH SELLER PRODUCTS
// Add, Edit, Update daily stock & pricing
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPlus, FiEdit2, FiRefreshCw, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const CATEGORIES = ['chicken','mutton','fish','seafood','beef','pork','ready_to_cook'];
const CUT_TYPES  = ['whole','curry_cut','boneless','keema','half','quarter','leg','breast','liver','gizzard','other'];

const EMPTY_FORM = {
  name: '', nameLocal: '', category: 'chicken', subCategory: '', description: '',
  cutTypes: [], basePrice: '', stock: '', unit: 'kg',
  variants: [{ weight: 500, label: '500g', price: '', isAvailable: true }],
  tags: { cutToOrder: false, freshToday: false, fastDelivery: false },
};

export default function EptoFreshSellerProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [images, setImages]     = useState([]);
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockForm, setStockForm] = useState({ stock: '', todayPrice: '', freshToday: false });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/eptofresh/seller/products');
      if (data.success) setProducts(data.products);
    } catch { toast.error('Failed to load products'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.basePrice) return toast.error('Name, category and price required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'variants' || k === 'tags' || k === 'cutTypes') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      images.forEach(f => fd.append('images', f));

      const { data } = await api.post('/eptofresh/seller/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) {
        toast.success('Product submitted for approval');
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
        setImages([]);
        fetchProducts();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const updateStock = async (productId) => {
    try {
      const { data } = await api.patch(`/eptofresh/seller/products/${productId}/daily`, stockForm);
      if (data.success) { toast.success('Updated!'); setEditingStockId(null); fetchProducts(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, { weight: '', label: '', price: '', isAvailable: true }] }));
  const updateVariant = (idx, key, val) => setForm(f => {
    const v = [...f.variants]; v[idx] = { ...v[idx], [key]: val }; return { ...f, variants: v };
  });

  if (!showForm) {
    return (
      <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
        <div className="flex items-center justify-between px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/eptofresh/seller')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}><FiArrowLeft className="text-white" /></button>
            <h1 className="text-white font-bold text-lg">My Products</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f4941c', color: '#fff' }}>
            <FiPlus size={14} /> Add
          </button>
        </div>

        {loading && <div className="px-4 space-y-3 mt-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>}

        <div className="px-4 mt-4 space-y-3">
          {products.map(p => (
            <div key={p._id} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-700 shrink-0 flex items-center justify-center">
                  {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-xl">🥩</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{
                      background: p.status === 'approved' ? 'rgba(52,211,153,0.1)' : p.status === 'pending_approval' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                      color: p.status === 'approved' ? '#34d399' : p.status === 'pending_approval' ? '#fbbf24' : '#f87171',
                    }}>
                      {p.status === 'approved' ? '✓ Live' : p.status === 'pending_approval' ? '⏳ Review' : '✗ Rejected'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs capitalize">{p.category.replace('_', ' ')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-orange-400 text-xs font-semibold">₹{p.todayPrice || p.basePrice}/{p.unit}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.isInStock ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                      {p.isInStock ? `Stock: ${p.stock}${p.unit}` : 'Out of stock'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => { setEditingStockId(p._id); setStockForm({ stock: p.stock, todayPrice: p.todayPrice || p.basePrice, freshToday: p.tags?.freshToday || false }); }}
                    className="p-1.5 rounded-lg" style={{ background: 'rgba(244,148,28,0.12)', color: '#f4941c' }}>
                    <FiRefreshCw size={13} />
                  </button>
                </div>
              </div>

              {/* Quick stock update */}
              {editingStockId === p._id && (
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                  <p className="text-white text-xs font-semibold">Update Daily Stock & Price</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 text-[10px]">Stock ({p.unit})</label>
                      <input type="number" value={stockForm.stock} onChange={e => setStockForm(s => ({ ...s, stock: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="text-gray-500 text-[10px]">Today's Price (₹)</label>
                      <input type="number" value={stockForm.todayPrice} onChange={e => setStockForm(s => ({ ...s, todayPrice: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={stockForm.freshToday} onChange={e => setStockForm(s => ({ ...s, freshToday: e.target.checked }))} className="w-4 h-4 accent-green-400" />
                    <span className="text-green-400 text-xs">🌿 Mark as Fresh Today</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingStockId(null)} className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: '#fff' }}>Cancel</button>
                    <button onClick={() => updateStock(p._id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#f4941c' }}>Update</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Add product form
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      <div className="flex items-center gap-3 px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => setShowForm(false)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}><FiArrowLeft className="text-white" /></button>
        <h1 className="text-white font-bold text-lg">Add Product</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {[
          { key: 'name', label: 'Product Name *', type: 'text' },
          { key: 'nameLocal', label: 'Tamil / Local Name', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'basePrice', label: 'Base Price (₹/kg) *', type: 'number' },
          { key: 'stock', label: 'Current Stock (kg)', type: 'number' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
          </div>
        ))}

        {/* Category */}
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Category *</label>
          <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none capitalize"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }}>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900 capitalize">{c.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* Cut types */}
        <div>
          <label className="text-gray-400 text-xs mb-2 block">Cut Types Available</label>
          <div className="flex flex-wrap gap-2">
            {CUT_TYPES.map(c => (
              <button key={c} onClick={() => setForm(f => ({
                ...f, cutTypes: f.cutTypes.includes(c) ? f.cutTypes.filter(x => x !== c) : [...f.cutTypes, c],
              }))}
                className="px-2.5 py-1 rounded-full text-xs capitalize transition-all"
                style={{ background: form.cutTypes.includes(c) ? '#f4941c' : 'rgba(255,255,255,0.07)', color: form.cutTypes.includes(c) ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {c.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Weight variants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-400 text-xs">Weight Variants</label>
            <button onClick={addVariant} className="text-orange-400 text-xs flex items-center gap-1"><FiPlus size={12} /> Add</button>
          </div>
          {form.variants.map((v, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input placeholder="Weight (g)" value={v.weight} onChange={e => updateVariant(i, 'weight', e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg text-white text-xs outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
              <input placeholder="Label (500g)" value={v.label} onChange={e => updateVariant(i, 'label', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
              <input placeholder="Price ₹" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg text-white text-xs outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
            </div>
          ))}
        </div>

        {/* Tags */}
        <div>
          <label className="text-gray-400 text-xs mb-2 block">Freshness Tags</label>
          <div className="space-y-2">
            {[
              { key: 'cutToOrder',   label: '🔪 Cut to Order' },
              { key: 'freshToday',   label: '🌿 Fresh Today' },
              { key: 'fastDelivery', label: '⚡ Fast Delivery' },
            ].map(t => (
              <label key={t.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tags[t.key]} onChange={e => setForm(f => ({ ...f, tags: { ...f.tags, [t.key]: e.target.checked } }))} className="w-4 h-4 accent-orange-400" />
                <span className="text-white text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Product Photos (up to 5)</label>
          <label className="cursor-pointer block w-full py-3 rounded-xl text-sm text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
            {images.length > 0 ? `${images.length} photo(s) selected` : '📷 Select Photos'}
            <input type="file" multiple accept="image/*" className="hidden" onChange={e => setImages(Array.from(e.target.files))} />
          </label>
        </div>

        <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-60" style={{ background: '#f4941c' }}>
          {saving ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  );
}
