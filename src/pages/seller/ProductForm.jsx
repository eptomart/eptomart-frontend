import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiUploadCloud, FiX, FiInfo, FiEye, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiZap } from 'react-icons/fi';
import { usePincodeAutofill } from '../../hooks/usePincodeAutofill';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import { GST_SLABS, extractBasePrice } from '../../utils/gst';
import toast from 'react-hot-toast';

const BLANK = {
  name: '', description: '', shortDescription: '',
  price: '', gstRate: 18, priceIncludesGst: true,
  discountPrice: '', stock: '', category: '', subCategory: '',
  brand: '', sku: '', tags: '',
  codAvailable: true, approvalStatus: 'draft',
  location: { city: '', state: '', pincode: '' },
  hsnCode: '',
  variants: [],
  // Mandatory pricing fields (platformMargin removed — same as eptomartMargin)
  costPrice: '', sellerPrice: '', eptomartMargin: '',
  freeShippingAbove: 499,
};

export default function ProductForm() {
  const { id }   = useParams();
  const isEdit   = !!id;
  const navigate = useNavigate();

  const [form,          setForm]          = useState(BLANK);
  const [images,        setImages]        = useState([]);
  const [existingImages,setExistingImages]= useState([]);
  const [deletingImgId, setDeletingImgId] = useState(null);
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [loading,       setLoading]       = useState(isEdit);
  const [aiLoading,     setAiLoading]     = useState(false);

  useEffect(() => {
    api.get('/categories?all=true').then(r => {
      const all = r.data.categories || [];
      setCategories(all.filter(c => !c.parentCategory));
      setSubCategories(all.filter(c => !!c.parentCategory));
    }).catch(() => {});
    if (isEdit) {
      api.get(`/products/${id}/preview`).catch(() => api.get(`/products/${id}?byId=true`)).then(r => {
        const p = r.data.product;
        setExistingImages(p.images || []);
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
          subCategory:     p.subCategory?._id || p.subCategory || '',
          brand:           p.brand || '',
          sku:             p.sku || '',
          tags:            (p.tags || []).join(', '),
          codAvailable:    p.codAvailable !== false,
          approvalStatus:  p.approvalStatus || 'draft',
          location:        p.location || { city: '', state: '', pincode: '' },
          hsnCode:         p.hsnCode || '',
          variants:        p.variants || [],
          costPrice:       p.costPrice || '',
          sellerPrice:     p.sellerPrice || '',
          eptomartMargin:  p.eptomartMargin ?? p.platformMargin ?? '',
          freeShippingAbove: p.freeShippingAbove || 499,
        });
      }).catch(() => toast.error('Failed to load product')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Pincode autofill for product location
  const { lookupPincode: lookupLocationPincode, pincodeLoading: locationPincodeLoading } = usePincodeAutofill(
    useCallback(({ city, state }) => setForm(f => ({ ...f, location: { ...f.location, city, state } })), [])
  );

  // Derived margin calculations (read-only, auto-computed from inputs)
  const cp  = parseFloat(form.costPrice)      || 0;
  const sp  = parseFloat(form.sellerPrice)    || 0;
  const epm = parseFloat(form.eptomartMargin) || 0;
  const eptomartCommissionAmt = sp > 0 && epm > 0 ? sp * epm / 100 : 0;
  const sellerPayout          = sp - eptomartCommissionAmt;
  const sellerMarginPct       = cp > 0 && sellerPayout > 0 ? ((sellerPayout - cp) / cp * 100) : null;

  // ── Variant price sync ─────────────────────────────────────
  // If any variant carries a price, the product's base price is auto-derived
  // from the lowest priced variant — the seller must NOT set it manually.
  const pricedVariants   = (form.variants || []).filter(v => v.price !== '' && Number(v.price) > 0);
  const variantsDrivePrice = pricedVariants.length > 0;
  const autoSyncedPrice  = variantsDrivePrice
    ? Math.min(...pricedVariants.map(v => Number(v.price)))
    : null;

  // Computed preview price — uses autoSyncedPrice when variants drive it
  const effectivePriceInput = variantsDrivePrice ? autoSyncedPrice : (form.price || 0);
  const basePrice  = effectivePriceInput
    ? (form.priceIncludesGst ? extractBasePrice(Number(effectivePriceInput), Number(form.gstRate)) : Number(effectivePriceInput))
    : 0;
  const gstAmount  = basePrice * Number(form.gstRate) / 100;
  const finalPrice = basePrice + gstAmount;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
  };

  const handleRemoveExistingImage = async (imageId) => {
    if (!confirm('Remove this image? This cannot be undone.')) return;
    setDeletingImgId(imageId);
    try {
      const { data } = await api.delete(`/products/${id}/image/${imageId}`);
      setExistingImages(data.images || []);
      toast.success('Image removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove image');
    } finally {
      setDeletingImgId(null);
    }
  };

  const handleSave = async (submitForApproval = false) => {
    // Price is required — unless variants carry their own prices (autoSyncedPrice takes over)
    if (!form.name || (!form.price && !variantsDrivePrice) || !form.stock || !form.category) {
      return toast.error('Name, price, stock and category are required');
    }
    if (variantsDrivePrice && !autoSyncedPrice) {
      return toast.error('At least one variant must have a valid price');
    }
    if (!form.hsnCode) {
      return toast.error('HSN Code is required');
    }
    if (submitForApproval) {
      if (!form.costPrice)     return toast.error('Cost price is required for submission');
      if (!form.sellerPrice)   return toast.error('Seller price is required for submission');
      if (!form.eptomartMargin && form.eptomartMargin !== 0) return toast.error('Eptomart margin % is required for submission');
      if (!form.gstRate && form.gstRate !== 0)  return toast.error('GST % is required for submission');
      if (!form.stock)         return toast.error('Stock quantity is required for submission');
    }
    setSaving(true);
    try {
      const fd = new FormData();
      // Strip Mongoose _id from variant subdocuments before sending
      const cleanVariants = (form.variants || []).map(({ _id, ...rest }) => ({
        label:  rest.label  || '',
        value:  rest.value  !== '' ? Number(rest.value)  : undefined,
        unit:   rest.unit   || 'g',
        price:  rest.price  !== '' ? Number(rest.price)  : undefined,
        stock:  rest.stock  !== '' && rest.stock !== undefined ? Number(rest.stock) : undefined,
      })).filter(v => v.label);

      // When variants carry prices, auto-set product.price = lowest variant price
      // (ensures DB price is always a valid, real variant price — no random/stale value)
      const resolvedPrice = variantsDrivePrice
        ? autoSyncedPrice
        : Number(form.priceIncludesGst ? basePrice.toFixed(2) : form.price);

      const payload = {
        ...form,
        price:          resolvedPrice,
        gstRate:        Number(form.gstRate),
        discountPrice:  form.discountPrice ? Number(form.discountPrice) : undefined,
        stock:          Number(form.stock),
        costPrice:      form.costPrice ? Number(form.costPrice) : undefined,
        sellerPrice:    form.sellerPrice ? Number(form.sellerPrice) : undefined,
        eptomartMargin: form.eptomartMargin !== '' ? Number(form.eptomartMargin) : undefined,
        platformMargin: form.eptomartMargin !== '' ? Number(form.eptomartMargin) : undefined, // sync alias
        tags:           form.tags.split(',').map(t => t.trim()).filter(Boolean),
        variants:       cleanVariants,
        subCategory:    form.subCategory || undefined,
        approvalStatus: submitForApproval ? 'pending' : (form.approvalStatus === 'approved' ? 'pending' : form.approvalStatus || 'draft'),
        submittedAt:    submitForApproval ? new Date().toISOString() : undefined,
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
        <div className="flex items-center gap-3">
          <Link to="/seller/products" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <FiArrowLeft size={18} />
          </Link>
          <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
        </div>
        {isEdit && (
          <Link to={`/preview/${id}`} target="_blank" className="flex items-center gap-1.5 text-sm text-primary-600 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-orange-50">
            <FiEye size={13} /> Preview
          </Link>
        )}
      </div>

      {/* Approval status banners */}
      {isEdit && form.approvalStatus === 'approved' && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2">
          <FiInfo size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            This product is <strong>live</strong>. Any changes you save will send it back for admin review and temporarily pause it from the store.
          </p>
        </div>
      )}
      {isEdit && form.approvalStatus === 'correction_needed' && form.approvalNote && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 mb-2">
          <FiAlertCircle size={15} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Correction required by admin</p>
            <p className="text-sm text-orange-700 mt-0.5">{form.approvalNote}</p>
          </div>
        </div>
      )}
      {isEdit && form.approvalStatus === 'rejected' && form.approvalNote && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-2">
          <FiAlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Product rejected</p>
            <p className="text-sm text-red-700 mt-0.5">{form.approvalNote}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Samsung 43 inch LED TV" className="input-field" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Description *</label>
              <button
                type="button"
                disabled={!form.name || aiLoading}
                onClick={async () => {
                  setAiLoading(true);
                  try {
                    const { data } = await api.post('/ai/generate-description', {
                      productName:  form.name,
                      category:     form.category,
                      keyFeatures:  form.shortDescription || '',
                      weight:       form.sku || '',
                    });
                    set('description', data.description);
                    toast.success('AI description generated!');
                  } catch {
                    toast.error('Could not generate description. Try again.');
                  } finally { setAiLoading(false); }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff' }}
                title={!form.name ? 'Enter a product name first' : 'Generate description with AI'}
              >
                {aiLoading
                  ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating…</>
                  : <><FiZap size={11} /> Write with AI</>
                }
              </button>
            </div>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Detailed product description..." className="input-field resize-none" />
            {!form.description && form.name && (
              <p className="text-[11px] text-orange-500 mt-1">💡 Click "Write with AI" to auto-generate a compelling description</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
            <input value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="Brief one-line description" className="input-field" />
          </div>
          {/* Category → Sub-category cascade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => {
                  set('category', e.target.value);
                  set('subCategory', ''); // reset sub when parent changes
                }}
                className="input-field"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}{c.requiresFSSAI ? ' 🍽' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-category — only shown when selected parent has children */}
            {(() => {
              const subs = subCategories.filter(s => {
                // Works for raw ObjectId, populated object, or plain string
                const pid = s.parentCategory?._id?.toString() || s.parentCategory?.toString();
                return pid === form.category;
              });
              if (!form.category || subs.length === 0) return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Samsung" className="input-field" />
                </div>
              );
              return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-category <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <select
                    value={form.subCategory}
                    onChange={e => set('subCategory', e.target.value)}
                    className="input-field border-orange-300 focus:border-orange-500"
                  >
                    <option value="">— Select sub-category —</option>
                    {subs.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.icon ? `${s.icon} ` : ''}{s.name}{s.requiresFSSAI ? ' 🍽' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5">Helps buyers find your product faster</p>
                </div>
              );
            })()}
          </div>

          {/* Brand — shown below when sub-category dropdown is also visible */}
          {(() => {
            const subs = subCategories.filter(s => {
              const pid = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
              return pid?.toString() === form.category;
            });
            if (!form.category || subs.length === 0) return null; // brand already shown above
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Samsung" className="input-field" />
              </div>
            );
          })()}

          {/* FSSAI warning when food category is selected */}
          {(() => {
            const selectedCat = categories.find(c => c._id === form.category);
            if (!selectedCat?.requiresFSSAI) return null;
            return (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2">
                <span className="text-lg">🍽</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">FSSAI License Required</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This is a food/beverage category. Your seller profile must have a valid FSSAI license number
                    before this product can be submitted for approval.
                    <a href="/seller/profile" target="_blank" className="ml-1 underline font-medium">Update Profile →</a>
                  </p>
                </div>
              </div>
            );
          })()}
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

          {/* Variant-driven price notice */}
          {variantsDrivePrice && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <FiInfo size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Price auto-set from variants</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Your variants have their own prices. The product base price is automatically set to the
                  <strong> lowest variant price: {formatINR(autoSyncedPrice)}</strong>.
                  You don't need to fill in the price field below.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="inclGst" checked={form.priceIncludesGst} onChange={e => set('priceIncludesGst', e.target.checked)} className="accent-primary-500 w-4 h-4" />
            <label htmlFor="inclGst" className="text-sm font-medium text-gray-700">Price I enter includes GST</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {variantsDrivePrice
                  ? 'Base Price (auto from variants)'
                  : form.priceIncludesGst ? 'Price (incl. GST) *' : 'Base Price (excl. GST) *'}
              </label>
              {variantsDrivePrice ? (
                <div className="input-field bg-gray-50 text-gray-500 cursor-not-allowed flex items-center">
                  {formatINR(autoSyncedPrice)}
                  <span className="ml-2 text-xs text-blue-500">(lowest variant)</span>
                </div>
              ) : (
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 590" className="input-field" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate *</label>
              <select value={form.gstRate} onChange={e => set('gstRate', Number(e.target.value))} className="input-field">
                {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
              </select>
            </div>
          </div>

          {/* GST preview */}
          {(variantsDrivePrice || form.price > 0) && basePrice > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium text-gray-700">Price Breakdown Preview
                {variantsDrivePrice && <span className="text-xs text-blue-500 ml-1">(based on lowest variant)</span>}
              </p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code *</label>
              <input value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} placeholder="e.g. 8528" className="input-field" required />
              <p className="text-xs text-gray-400 mt-0.5">Harmonized System of Nomenclature code (required)</p>
            </div>
          </div>
        </div>

        {/* Seller Mandatory Pricing Fields */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">
            Seller Pricing Details <span className="text-xs text-red-500 font-normal ml-1">* Required before submission</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹) *</label>
              <input type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)}
                placeholder="Your purchase cost" min="0" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">What you paid for this product</p>
            </div>

            {/* Seller Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seller Price (₹) *</label>
              <input type="number" value={form.sellerPrice} onChange={e => set('sellerPrice', e.target.value)}
                placeholder="Your listed price" min="0" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">The price you sell at</p>
            </div>

            {/* Eptomart Margin % — MANUAL, this is platform commission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eptomart Commission (%) *
              </label>
              <input type="number" value={form.eptomartMargin} onChange={e => set('eptomartMargin', e.target.value)}
                placeholder="e.g. 10" min="0" max="100" className="input-field border-orange-300 focus:border-orange-500" />
              <p className="text-xs text-gray-400 mt-1">Commission % you pay Eptomart</p>
            </div>
          </div>

          {/* Auto-computed breakdown — shown once all 3 are filled */}
          {sp > 0 && epm > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">
                Commission & Margin Breakdown
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-600">Seller price</span>
                  <span className="font-medium">{formatINR(sp)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 bg-orange-50">
                  <span className="text-orange-700 font-medium">
                    Eptomart commission ({epm}%)
                  </span>
                  <span className="font-bold text-orange-700">− {formatINR(eptomartCommissionAmt)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-600">You receive</span>
                  <span className="font-semibold text-gray-800">{formatINR(sellerPayout)}</span>
                </div>
                {cp > 0 && sellerMarginPct !== null && (
                  <div className={`flex justify-between px-4 py-2.5 ${sellerMarginPct >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`font-semibold ${sellerMarginPct >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      Your profit margin <span className="font-normal text-xs">(auto-calculated)</span>
                    </span>
                    <span className={`font-bold ${sellerMarginPct >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {sellerMarginPct >= 0 ? '+' : ''}{sellerMarginPct.toFixed(1)}%
                      &nbsp;({formatINR(sellerPayout - cp)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <div className="relative">
                <input value={form.location.pincode}
                  onChange={e => { set('location', { ...form.location, pincode: e.target.value }); lookupLocationPincode(e.target.value); }}
                  placeholder="600001" maxLength={6} className="input-field pr-8" />
                {locationPincodeLoading && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">City & state auto-filled</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Location — City *</label>
              <input value={form.location.city} onChange={e => set('location', { ...form.location, city: e.target.value })} placeholder="Auto-filled or enter manually" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input value={form.location.state} onChange={e => set('location', { ...form.location, state: e.target.value })} placeholder="Auto-filled or enter manually" className="input-field" />
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
            <button type="button"
              onClick={() => set('variants', [...(form.variants || []), { label: '', value: '', unit: 'g', price: '', stock: '' }])}
              className="text-xs text-primary-600 border border-primary-300 rounded-lg px-3 py-1 hover:bg-primary-50">
              + Add Variant
            </button>
          </div>

          {/* Column headers */}
          {(form.variants || []).length > 0 && (
            <div className="grid grid-cols-6 gap-2 px-3 text-xs text-gray-400 font-medium">
              <span>Label *</span>
              <span>Value</span>
              <span>Unit</span>
              <span>Price (₹)</span>
              <span>Stock</span>
              <span></span>
            </div>
          )}

          {(form.variants || []).map((v, idx) => {
            // Immutable field updater — avoids direct state mutation
            const setField = (field, val) =>
              set('variants', form.variants.map((item, i) =>
                i === idx ? { ...item, [field]: val } : item
              ));

            return (
              <div key={v._id?.toString() || idx} className="grid grid-cols-6 gap-2 items-end bg-gray-50 rounded-xl p-3">
                <div>
                  <input
                    value={v.label || ''}
                    placeholder="e.g. 500g"
                    onChange={e => setField('label', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={v.value || ''}
                    placeholder="500"
                    onChange={e => setField('value', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <select
                    value={v.unit || 'g'}
                    onChange={e => setField('unit', e.target.value)}
                    className="input-field text-sm"
                  >
                    {['g', 'kg', 'ml', 'l', 'pieces', 'pack', 'other'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    value={v.price || ''}
                    placeholder="Optional"
                    onChange={e => setField('price', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={v.stock ?? ''}
                    placeholder="Stock"
                    min={0}
                    onChange={e => setField('stock', e.target.value)}
                    className={`input-field text-sm ${v.stock === 0 ? 'border-red-300 bg-red-50' : ''}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set('variants', form.variants.filter((_, i) => i !== idx))}
                  className="pb-0.5 text-red-400 hover:text-red-600 text-lg font-bold self-end"
                >×</button>
              </div>
            );
          })}

          {(form.variants || []).length === 0 && (
            <p className="text-sm text-gray-400">No variants added. Click "+ Add Variant" to add sizes like 250g, 500ml, 1kg etc.</p>
          )}
        </div>

        {/* Shipping */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Shipping</h3>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Above (₹)</label>
            <input type="number" value={form.freeShippingAbove} onChange={e => set('freeShippingAbove', e.target.value)} placeholder="499" min="0" className="input-field" />
            <p className="text-xs text-gray-400 mt-1">Orders above this amount get free shipping</p>
          </div>
        </div>

        {/* Images */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Product Images (max 5)</h3>
          {/* Existing images */}
          {existingImages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Saved Images <span className="normal-case font-normal text-gray-400">— hover to remove</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img, idx) => (
                  <div key={img._id || idx} className="relative group w-20 h-20">
                    <img
                      src={img.url}
                      alt={`Product ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                    />
                    {img.isDefault && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-primary-500 text-white rounded-b-xl py-0.5">
                        Main
                      </span>
                    )}
                    {/* Delete button — visible on hover */}
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(img._id)}
                        disabled={deletingImgId === img._id}
                        title="Remove image"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold
                                   flex items-center justify-center shadow
                                   opacity-0 group-hover:opacity-100 transition-opacity
                                   disabled:opacity-50 hover:bg-red-600"
                      >
                        {deletingImgId === img._id ? '…' : '×'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Upload new images below to add more</p>
            </div>
          )}
          {/* New image upload */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-8 cursor-pointer transition-colors">
            <FiUploadCloud size={28} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Click to upload new images (JPG, PNG, WEBP)</p>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
          </label>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700 max-w-[120px] truncate">{f.name}</span>
                </div>
              ))}
            </div>
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
