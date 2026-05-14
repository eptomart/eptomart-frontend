import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const UNITS = ['kg','g','piece','bunch','dozen','litre','pack','leaf'];
const BADGES = ['fresh_arrival','low_stock','best_seller','seasonal','organic','festival_special','bulk_deal'];

const EMPTY_FORM = {
  name:'', nameTamil:'', description:'', categoryId:'',
  unit:'kg', unitLabel:'kg', minQty:0.5, maxQty:50, qtyStep:0.5,
  marketPriceMin:0, marketPriceMax:0, currentPrice:'', stockQty:0,
  freshArrivalTime:'', isSameDay:true, isNextDay:true, sameDayCutoff:'10:00',
  badges:[], tags:'', isBulkAvailable:false, bulkMinQty:'', bulkPricePerUnit:'',
  isActive:true, isAvailable:true,
};

export default function KoyambeduSellerProducts() {
  const navigate = useNavigate();
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/koyambedu/seller/products'),
      api.get('/koyambedu/categories'),
    ]).then(([pRes, cRes]) => {
      setProducts(pRes.data.products || []);
      setCategories(cRes.data.categories || []);
    }).catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit   = (p) => {
    setForm({
      ...EMPTY_FORM, ...p,
      categoryId: p.category?._id || p.category || '',
      tags: (p.tags || []).join(', '),
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.currentPrice || !form.categoryId) {
      toast.error('Name, price and category are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        currentPrice: Number(form.currentPrice),
      };
      if (editId) {
        const { data } = await api.put(`/koyambedu/seller/products/${editId}`, payload);
        setProducts(prev => prev.map(p => p._id === editId ? data.product : p));
        toast.success('Product updated');
      } else {
        const { data } = await api.post('/koyambedu/seller/products', payload);
        setProducts(prev => [data.product, ...prev]);
        toast.success('Product created');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvail = async (productId) => {
    try {
      const { data } = await api.patch(`/koyambedu/seller/products/${productId}/toggle`);
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, isAvailable: data.isAvailable } : p));
    } catch { toast.error('Failed'); }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/koyambedu/seller/products/${productId}`);
      setProducts(prev => prev.filter(p => p._id !== productId));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-10">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/koyambedu/seller')} className="text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-black text-lg flex-1">My Products</h1>
        <button onClick={openCreate}
          className="bg-white text-green-700 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-green-50">
          + Add Product
        </button>
      </div>

      {/* Product list */}
      <div className="px-4 mt-4 space-y-3">
        {products.map(p => (
          <div key={p._id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 flex gap-3">
            {p.images?.[0] && (
              <img src={p.images[0].url} alt={p.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm line-clamp-1">{p.name}</p>
                  {p.nameTamil && <p className="text-[10px] text-gray-400">{p.nameTamil}</p>}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => toggleAvail(p._id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isAvailable ? 'In Stock' : 'Out'}
                  </button>
                </div>
              </div>
              <p className="text-green-700 font-bold text-sm mt-1">₹{p.currentPrice}/{p.unitLabel}</p>
              <p className="text-xs text-gray-400">{p.category?.name}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(p)} className="text-xs text-blue-600 font-semibold">Edit</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => deleteProduct(p._id)} className="text-xs text-red-500 font-semibold">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-gray-500 font-medium">No products yet</p>
            <button onClick={openCreate} className="mt-3 bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              + Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-base">{editId ? 'Edit Product' : 'Add Product'}</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-500 font-medium">Category *</label>
                <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              {[['name','Product Name *'],['nameTamil','Tamil Name'],['description','Description']].map(([k,label]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 font-medium">{label}</label>
                  {k === 'description' ? (
                    <textarea value={form[k]} onChange={e => set(k, e.target.value)} rows={2}
                      className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                  ) : (
                    <input type="text" value={form[k]} onChange={e => set(k, e.target.value)}
                      className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  )}
                </div>
              ))}

              {/* Unit + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Unit</label>
                  <select value={form.unit} onChange={e => { set('unit', e.target.value); set('unitLabel', e.target.value); }}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Unit Label</label>
                  <input value={form.unitLabel} onChange={e => set('unitLabel', e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="e.g. 500g, 1 bunch" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Price (₹) *</label>
                  <input type="number" value={form.currentPrice} onChange={e => set('currentPrice', e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Stock Qty</label>
                  <input type="number" value={form.stockQty} onChange={e => set('stockQty', e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Market Min (₹)</label>
                  <input type="number" value={form.marketPriceMin} onChange={e => set('marketPriceMin', e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Market Max (₹)</label>
                  <input type="number" value={form.marketPriceMax} onChange={e => set('marketPriceMax', e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              {/* Fresh arrival */}
              <div>
                <label className="text-xs text-gray-500 font-medium">Fresh Arrival Time (e.g. 4:30 AM)</label>
                <input value={form.freshArrivalTime} onChange={e => set('freshArrivalTime', e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>

              {/* Badges */}
              <div>
                <label className="text-xs text-gray-500 font-medium">Badges</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {BADGES.map(b => (
                    <button key={b} onClick={() => set('badges', form.badges.includes(b) ? form.badges.filter(x => x !== b) : [...form.badges, b])}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${form.badges.includes(b) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {b.replace(/_/g,' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2">
                {[['isSameDay','Same Day'],['isNextDay','Next Day'],['isAvailable','In Stock'],['isActive','Active']].map(([k,label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
