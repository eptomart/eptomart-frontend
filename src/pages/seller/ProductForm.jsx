import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUploadCloud, FiX, FiInfo } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import { GST_SLABS, extractBasePrice } from '../../utils/gst';
import toast from 'react-hot-toast';

const BLANK = {
  name: '', description: '', shortDescription: '',
  price: '', gstRate: 18, priceIncludesGst: true,
  discountPrice: '', stock: '', category: '',
  brand: '', sku: '', tags: '',
  codAvailable: true, approvalStatus: 'draft',
  location: { city: '', state: '', pincode: '' },
  hsnCode: '',
  variants: [],   // [{label, value, unit, price, stock}]
  platformMargin: '', sellerMargin: '',
  freeShippingAbove: 499,
};

export default function ProductForm() {
  const { id }   = useParams();
  const isEdit   = !!id;
  const navigate = useNavigate();

  const [form,       setForm]       = useState(BLANK);
  const [images,     setImages]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(isEdit);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
    if (isEdit) {
      api.get(`/products/${id}?byId=true`).then(r => {
        const p = r.data.product;
        setForm({
          name:            p.name || '',
          description:     p.description || '',
          shortDescription:p.shortDescription || '',
          price:           p.price || '',
          gstRate:         p.gstRate || 18,
          priceIncludesGst:p.priceIncludesGst !== false,
          discountPrice:   p.discountPrice || '',
          stock:           p.stock || '',
          category:        p.category?._id || p.category || '',
          brand:           p.brand || '',
          sku:             p.sku || '',
          tags:            (p.tags || []).join(', '),
          codAvailable:    p.codAvailable !== false,
          approvalStatus:  p.approvalStatus || 'draft',
          location:        p.location || { city: '', state: '', pincode: '' },
          hsnCode:         p.hsnCode || '',
          variants:        p.variants || [],    // CRITICAL: restore variants from DB so edit doesn't wipe them
        });
      }).catch(() => toast.error('Failed to load product')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Computed preview price
  const basePrice = form.price ? (form.priceIncludesGst ? extractBasePrice(Number(form.price), Number(form.gstRate)) : Number(form.price)) : 0;
  const gstAmount = basePrice * Number(form.gstRate) / 100;
  const finalPrice = basePrice + gstAmount;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
  };

  const handleSave = async (submitForApproval = false) => {
    if (!form.name || !form.price || !form.stock || !form.category) {
      return toast.error('Name, price, stock and category are required');
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const payload = {
        ...form,
        price:        Number(form.priceIncludesGst ? basePrice.toFixed(2) : form.price),
        gstRate:      Number(form.gstRate),
        discountPrice:form.discountPrice ? Number(form.discountPrice) : undefined,
        stock:        Number(form.stock),
        tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
        approvalStatus: submitForApproval ? 'pending' : (form.approvalStatus === 'approved' ? 'pending' : form.approvalStatus || 'draft'),
        submittedAt:  submitForApproval ? new Date().toISOString() : undefined,
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== '') fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
      });
      images.forEach(f => fd.append('images', f));

      const headers = { 'Content-Type': 'multipart/form-data' };
      if (isEdit) await api.put(`/products/${id}`, fd, { headers });
      else        await api.post('/products', fd, { headers });

      toast.success(submitForApproval ? 'Submitted for approval!' : 'Product saved as draft');
      navigate('/seller/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Samsung 43 inch LED TV" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Detailed product description..." className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
            <input value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="Brief one-line description" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Samsung" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Optional unique code" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tv, led, 4k (comma separated)" className="input-field" />
            </div>
          </div>
        </div>

        {/* Pricing & GST */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Pricing & GST</h3>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="inclGst" checked={form.priceIncludesGst} onChange={e => set('priceIncludesGst', e.target.checked)} className="accent-primary-500 w-4 h-4" />
            <label htmlFor="inclGst" className="text-sm font-medium text-gray-700">Price I enter includes GST</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.priceIncludesGst ? 'Price (incl. GST) *' : 'Base Price (excl. GST) *'}
              </label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 590" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate *</label>
              <select value={form.gstRate} onChange={e => set('gstRate', Number(e.target.value))} className="input-field">
                {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
              </select>
            </div>
          </div>

          {/* GST preview */}
          {form.price > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium text-gray-700">Price Breakdown Preview</p>
              <p className="text-gray-600">Base price (excl. GST): {formatINR(basePrice)}</p>
              <p className="text-gray-600">GST ({form.gstRate}%): {formatINR(gstAmount)}</p>
              <p className="font-semibold text-primary-600">Customer pays: {formatINR(finalPrice)}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (optional)</label>
              <input type="number" value={form.discountPrice} onChange={e => set('discountPrice', e.target.value)} placeholder="Sale price" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
              <input value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} placeholder="e.g. 8528" className="input-field" />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Inventory & Delivery</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input type="number" min={0} value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Location — City *</label>
              <input value={form.location.city} onChange={e => set('location', { ...form.location, city: e.target.value })} placeholder="Chennai" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input value={form.location.state} onChange={e => set('location', { ...form.location, state: e.target.value })} placeholder="Tamil Nadu" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <input value={form.location.pincode} onChange={e => set('location', { ...form.location, pincode: e.target.value })} placeholder="600001" className="input-field" />
            </div>
          </div>

          <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${form.codAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <input type="checkbox" id="cod" checked={form.codAvailable} onChange={e => set('codAvailable', e.target.checked)} className="accent-green-600 w-4 h-4 mt-0.5" />
            <div>
              <label htmlFor="cod" className="text-sm font-semibold cursor-pointer">💵 Cash on Delivery available</label>
              <p className="text-xs text-gray-500 mt-0.5">
                {form.codAvailable ? 'COD enabled — customers can pay on delivery' : 'COD disabled — online payment required'}
              </p>
            </div>
          </div>
        </div>

        {/* Variants (g, ml, kg, l, pieces, pack) */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold text-gray-800">Product Variants <span className="text-xs font-normal text-gray-400">(optional — e.g. 500g, 1L)</span></h3>
            <button type="button" onClick={() => set('variants', [...(form.variants || []), { label: '', value: '', unit: 'g', price: '', stock: '' }])}
              className="text-xs text-primary-600 border border-primary-300 rounded-lg px-3 py-1 hover:bg-primary-50">
              + Add Variant
            </button>
          </div>
          {(form.variants || []).map((v, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 items-end bg-gray-50 rounded-xl p-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label *</label>
                <input value={v.label} placeholder="e.g. 500g" onChange={e => { const arr = [...form.variants]; arr[idx].label = e.target.value; set('variants', arr); }} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <input type="number" value={v.value} placeholder="500" onChange={e => { const arr = [...form.variants]; arr[idx].value = e.target.value; set('variants', arr); }} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                <select value={v.unit} onChange={e => { const arr = [...form.variants]; arr[idx].unit = e.target.value; set('variants', arr); }} className="input-field text-sm">
                  {['g', 'kg', 'ml', 'l', 'pieces', 'pack', 'other'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                <input type="number" value={v.price} placeholder="Optional" onChange={e => { const arr = [...form.variants]; arr[idx].price = e.target.value; set('variants', arr); }} className="input-field text-sm" />
              </div>
              <button type="button" onClick={() => { const arr = [...form.variants]; arr.splice(idx, 1); set('variants', arr); }}
                className="pb-0.5 text-red-400 hover:text-red-600 text-lg font-bold self-end">×</button>
            </div>
          ))}
          {(form.variants || []).length === 0 && (
            <p className="text-sm text-gray-400">No variants added. Click "Add Variant" to add sizes like 250g, 500ml, 1kg etc.</p>
          )}
        </div>

        {/* Margin & Shipping */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Pricing & Shipping</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Margin (%)</label>
              <input type="number" value={form.platformMargin} onChange={e => set('platformMargin', e.target.value)} placeholder="e.g. 10" min="0" max="100" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Eptomart commission %</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seller Margin (%)</label>
              <input type="number" value={form.sellerMargin} onChange={e => set('sellerMargin', e.target.value)} placeholder="e.g. 20" min="0" max="100" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Your target profit %</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Above (₹)</label>
              <input type="number" value={form.freeShippingAbove} onChange={e => set('freeShippingAbove', e.target.value)} placeholder="499" min="0" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Free if order total ≥ this</p>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Product Images (max 5)</h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-8 cursor-pointer transition-colors">
            <FiUploadCloud size={28} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Click to upload images (JPG, PNG, WEBP)</p>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
          </label>
          {images.length > 0 && (
            <p className="text-sm text-green-600 font-medium">✓ {images.length} file(s) selected</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-outline flex-1">
            {saving ? 'Saving...' : '💾 Save as Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Submitting...' : '🚀 Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
