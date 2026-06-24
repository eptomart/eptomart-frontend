// ============================================
// KOYAMBEDU DAILY — Buyer Landing Page
// Compact native-mobile layout matching EptoFresh
// No Navbar — sticky green gradient header
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EptoSEO from '../../components/common/EptoSEO';
import {
  FiSearch, FiChevronRight, FiMapPin, FiShoppingBag, FiSun,
  FiTruck, FiPackage, FiCheckCircle, FiZap, FiUsers, FiGrid,
  FiArrowLeft, FiChevronDown,
} from 'react-icons/fi';
import { FaLeaf, FaCarrot } from 'react-icons/fa';
import BottomNav from '../../components/common/BottomNav';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Inline fallback — never show a giant "Fresh" text placeholder
const IMG_PH = null;

const KOYAMBEDU_LAT = 13.0748, KOYAMBEDU_LNG = 80.2136;
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const CAT_ICONS = {
  vegetables:'🥦', fruits:'🍊', flowers:'🌸', greens:'🌿',
  coconut:'🥥', banana_leaves:'🍃', pooja_items:'🪔', seasonal:'🌾', bulk:'📦',
};

function ProductCard({ product }) {
  const { getQty, updateItem } = useKoyambeduCart();
  const qty  = getQty(product._id);
  const img  = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || null;
  // Minimum 1 KG / 1 PC — never 0.5
  const step   = Math.max(1, product.qtyStep || 1);
  const minQty = Math.max(1, product.minQty || 1);

  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
      <Link to={`/koyambedu/product/${product._id}`} className="block relative active:opacity-80 transition">
        {img
          ? <img src={img} alt={product.name} className="w-full h-16 object-cover" />
          : <div className="w-full h-16 bg-green-50 flex items-center justify-center">
              <FaLeaf size={18} className="text-green-200" />
            </div>}
        {product.badges?.includes('fresh_arrival') && (
          <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <FaLeaf size={7} /> Fresh
          </span>
        )}
        {product.badges?.includes('low_stock') && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">Low</span>
        )}
      </Link>
      <div className="p-2">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="font-semibold text-gray-800 text-xs leading-tight line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{product.nameTamil}</p>}
        </Link>
        <div className="flex items-center justify-between mt-1.5">
          <div>
            <span className="text-green-700 font-bold text-xs">₹{product.currentPrice}</span>
            <span className="text-gray-600 text-[10px] ml-0.5">/{product.unitLabel}</span>
          </div>
          {qty === 0 ? (
            <button
              onClick={() => updateItem(product._id, minQty, 'tomorrow', { productData: product })}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
              style={{ boxShadow: '0 2px 8px rgba(22,163,74,0.35)' }}>
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const next = qty - step;
                  updateItem(product._id, next < minQty ? 0 : next, 'tomorrow', { silent: true });
                }}
                className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center active:scale-90 transition-transform">
                −
              </button>
              <span className="text-sm font-bold text-green-700 min-w-[28px] text-center">
                {qty}<span className="text-[9px] font-medium text-gray-600 ml-0.5">{product.unitLabel}</span>
              </span>
              <button
                onClick={() => updateItem(product._id, Math.min(product.maxQty || 50, qty + step), 'tomorrow', { silent: true })}
                className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center active:scale-90 transition-transform">
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionRow({ title, icon, products, viewAllLink }) {
  if (!products?.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-emerald-500 shrink-0" />
          {icon} {title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold">
            See all <FiChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {products.slice(0, 6).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}

// Special Occasion Request Form
const OCCASION_TYPES = ['wedding','birthday','festival','corporate','pooja','other'];

function SpecialRequestModal({ onClose }) {
  const { user } = useAuth?.() || {};
  const [form, setForm] = useState({
    buyerName: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    occasionType: 'other', occasionTypeOther: '',
    requiredDate: '', additionalNotes: '',
    requestedItems: [{ itemName: '', quantity: '', unit: 'kg', notes: '' }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem  = (i, k, v) => setForm(f => {
    const items = [...f.requestedItems];
    items[i] = { ...items[i], [k]: v };
    return { ...f, requestedItems: items };
  });
  const addItem  = () => setForm(f => ({ ...f, requestedItems: [...f.requestedItems, { itemName:'', quantity:'', unit:'kg', notes:'' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, requestedItems: f.requestedItems.filter((_,idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.buyerName || !form.phone || !form.requiredDate) { toast.error('Name, phone, and required date are mandatory'); return; }
    setSubmitting(true);
    try {
      await api.post('/koyambedu/special-request', form);
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-lg text-gray-900">🎉 Special Request</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">✕</button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="text-5xl mb-3">🎊</div>
            <h3 className="font-black text-xl text-gray-900 mb-2">Request Submitted!</h3>
            <p className="text-gray-700 text-sm mb-6">We'll contact you within 24 hours to confirm availability and pricing.</p>
            <button onClick={onClose} className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700">Your Name *</label>
                <input value={form.buyerName} onChange={e => setField('buyerName', e.target.value)} required
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Phone *</label>
                <input value={form.phone} onChange={e => setField('phone', e.target.value)} type="tel" required
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Email</label>
                <input value={form.email} onChange={e => setField('email', e.target.value)} type="email"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Occasion Type</label>
                <select value={form.occasionType} onChange={e => setField('occasionType', e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                  {OCCASION_TYPES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Required Date *</label>
                <input type="date" value={form.requiredDate} onChange={e => setField('requiredDate', e.target.value)} required
                  min={new Date().toISOString().slice(0,10)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Required Items</label>
                <button type="button" onClick={addItem} className="text-xs text-green-600 font-semibold">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {form.requestedItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input placeholder="Item name" value={item.itemName} onChange={e => setItem(i,'itemName',e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    <input placeholder="Qty" value={item.quantity} onChange={e => setItem(i,'quantity',e.target.value)}
                      className="w-16 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    <select value={item.unit} onChange={e => setItem(i,'unit',e.target.value)}
                      className="w-14 border border-gray-200 rounded-xl px-1 py-2 text-xs focus:outline-none">
                      {['kg','g','piece','bunch','dozen'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    {form.requestedItems.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 pt-2 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Additional Notes</label>
              <textarea rows={2} value={form.additionalNotes} onChange={e => setField('additionalNotes', e.target.value)}
                placeholder="Any special requirements…"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full bg-green-600 text-white font-black py-3.5 rounded-xl text-sm hover:bg-green-700 disabled:opacity-60">
              {submitting ? 'Submitting…' : '🎉 Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// IST = UTC+5:30 → check if current hour >= 9
const getISTHour = () => {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).getUTCHours();
};

export default function KoyambeduHome() {
  const { fetchCart, itemCount, subtotal, userLocation, locationLabel } = useKoyambeduCart();
  const navigate = useNavigate();
  const isMarketClosed = getISTHour() >= 9;

  const distToMarket = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;

  const [categories, setCategories] = useState([]);
  const [sections,   setSections]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [showSpecialReq, setShowSpecialReq] = useState(false);

  useEffect(() => {
    fetchCart();
    Promise.all([
      api.get('/koyambedu/categories').catch(() => ({ data: { categories: [] } })),
      api.get('/koyambedu/products/featured').catch(() => ({ data: { sections: {} } })),
    ]).then(([catRes, featRes]) => {
      setCategories(catRes.data.categories || []);
      setSections(featRes.data.sections || {});
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <EptoSEO app="koyambedu" page="home" />

      {/* ── Compact sticky green header ── */}
      <div className="sticky top-0 z-30 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.35)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Category background image — faded right accent */}
        <img
          src="/categories/koyambedu.jpg"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[45%] object-cover pointer-events-none select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            opacity: 0.28,
          }}
        />
        <div className="px-4 pt-3 pb-5">

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiArrowLeft size={15} className="text-white" />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-white text-base font-extrabold tracking-tight leading-none">Koyambedu Daily</h1>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>MARKET</span>
                </div>
                <p className="text-emerald-100 text-[10px] mt-0.5 opacity-80">கோயம்பேடு · Wholesale · Direct Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/koyambedu/shop')}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSearch size={15} className="text-white" />
              </button>
              <Link to="/koyambedu/cart"
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiShoppingBag size={15} className="text-white" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Location pill */}
          <button
            onClick={() => navigate('/koyambedu/location')}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 w-full transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              <FiMapPin size={11} className="text-white" />
            </div>
            <span className="text-white text-xs font-semibold flex-1 text-left truncate opacity-95">
              {locationLabel
                ? `${locationLabel}${distToMarket ? ` · ${distToMarket} km from market` : ''}`
                : 'Set your delivery area'}
            </span>
            <FiChevronDown size={13} className="text-white opacity-70 shrink-0" />
          </button>

          {/* Delivery info pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiTruck size={10} /> ₹125 per 4 km
            </span>
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiPackage size={10} /> + ₹15 platform fee
            </span>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={isMarketClosed
                ? { background: 'rgba(239,68,68,0.85)', color: '#fff' }
                : { background: 'rgba(250,204,21,0.85)', color: '#065f46' }}>
              <FiSun size={10} /> {isMarketClosed ? 'Market Closed' : 'Market Open'}
            </span>
          </div>
        </div>

        {/* Category pills — on white rounded strip */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', paddingTop: 14, paddingBottom: 2 }}>
          <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-hide">
            <Link to="/koyambedu/shop"
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: '#065f46', color: '#fff', boxShadow: '0 4px 14px rgba(6,95,70,0.35)' }}>
              All Products
            </Link>
            {categories.slice(0, 10).map(cat => (
              <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap active:scale-95 transition"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {cat.icon || CAT_ICONS[cat.slug] || '🌿'} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4" style={{ background: '#F5F4F2' }}>

        {/* ── Market Closed Banner ── */}
        {isMarketClosed && (
          <div className="mb-4 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 60%,#ef4444 100%)', boxShadow: '0 4px 20px rgba(185,28,28,0.35)' }}>
            <div className="p-4 relative overflow-hidden flex items-start gap-3">
              <div className="absolute right-0 top-0 text-[80px] opacity-10 select-none pointer-events-none leading-none">🏪</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSun size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight">Wholesale Koyambedu market closed for today</p>
                <p className="text-red-200 text-xs mt-1 leading-relaxed">
                  Today's procurement window has ended (9:00 AM IST cutoff). Orders placed now will be scheduled for <strong className="text-white">tomorrow's delivery</strong>.
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/25">
                    🕘 Next pickup: Tomorrow 5 AM
                  </span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/25">
                    📦 Still accepting orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No location nudge */}
        {!locationLabel && (
          <button onClick={() => navigate('/koyambedu/location')}
            className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: '#fff', boxShadow: '0 4px 20px rgba(6,95,70,0.14)', border: '1.5px solid rgba(6,95,70,0.12)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
              <FiMapPin className="text-white" size={19} />
            </div>
            <div className="text-left flex-1">
              <p className="text-gray-900 font-bold text-sm">Set your delivery area</p>
              <p className="text-gray-600 text-xs mt-0.5">See if we deliver to you + estimate delivery</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-green-50">
              <FiChevronRight size={14} className="text-green-700" />
            </div>
          </button>
        )}


        {/* ── Category Grid ── */}
        {categories.length > 0 && (
          <div className="mb-5">
            <p className="text-gray-800 font-black text-sm mb-3">Shop by Category</p>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/koyambedu/shop"
                className="flex flex-col items-center gap-1 bg-white rounded-2xl py-3 px-1 active:scale-95 transition"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <span className="text-2xl">🛒</span>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">All</span>
              </Link>
              {categories.slice(0, 11).map(cat => (
                <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                  className="flex flex-col items-center gap-1 bg-white rounded-2xl py-2 px-1 active:scale-95 transition overflow-hidden"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-12 object-cover rounded-xl" />
                    : <span className="text-2xl py-1">{cat.icon || CAT_ICONS[cat.slug] || '🌿'}</span>
                  }
                  <span className="text-[10px] font-bold text-gray-700 text-center leading-tight line-clamp-1 px-1">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Product sections */}
        {loading ? (
          <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
            <div className="animate-bounce"><FaLeaf size={40} className="text-emerald-400" /></div>
            <p className="text-sm">Loading today's market…</p>
          </div>
        ) : (
          <>
            <SectionRow title="Today's Fresh Arrivals" icon={<FiSun size={14} />} products={sections.freshArrivals} viewAllLink="/koyambedu/shop?badges=fresh_arrival" />
            <SectionRow title="Koyambedu Deals"        icon={<FiZap size={14} />} products={sections.deals}         viewAllLink="/koyambedu/shop?sort=popular" />
            <SectionRow title="Flower Express"         icon={<FaLeaf size={14} />} products={sections.flowers}       viewAllLink="/koyambedu/shop?category=flowers" />
            <SectionRow title="Seasonal Specials"      icon={<FaCarrot size={14} />} products={sections.seasonal}    viewAllLink="/koyambedu/shop?badges=seasonal" />
            <SectionRow title="Bulk Buyer Zone"        icon={<FiPackage size={14} />} products={sections.bulk}       viewAllLink="/koyambedu/shop?bulk=true" />
            {!Object.values(sections).some(s => s?.length) && (
              <div className="text-center py-16 px-4">
                <FaLeaf size={48} className="text-emerald-300 mx-auto mb-3" />
                <p className="font-bold text-gray-600 text-base">No products yet</p>
                <p className="text-gray-600 text-sm mt-1">Sellers are stocking up — check back soon!</p>
              </div>
            )}
          </>
        )}


        {/* How it works */}
        <div className="mb-6 bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 className="font-bold text-gray-800 text-sm mb-3">How it Works</h3>
          <div className="space-y-3">
            {[
              { Icon: FiShoppingBag, color: '#059669', title: 'Browse & Order',       desc: 'Shop fresh produce. Pay securely.' },
              { Icon: FiCheckCircle, color: '#16a34a', title: 'Instantly Accepted',   desc: 'Order goes directly to procurement queue.' },
              { Icon: FiTruck,       color: '#0d9488', title: 'Doorstep Delivery',    desc: 'Chennai delivery, same or next day.' },
            ].map((step, i) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}16` }}>
                  <step.Icon size={17} style={{ color: step.color }} />
                </div>
                <div className="pt-1">
                  <p className="font-bold text-gray-800 text-xs">{step.title}</p>
                  <p className="text-gray-700 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { Icon: FaLeaf,  color: '#059669', title: 'Farm Fresh',     desc: 'Harvested today' },
            { Icon: FiZap,   color: '#f59e0b', title: 'Fast Delivery',  desc: 'Same / next day' },
            { Icon: FiUsers, color: '#3b82f6', title: 'Wholesale Price', desc: 'No middlemen'   },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5" style={{ background: `${item.color}16` }}>
                <item.Icon size={17} style={{ color: item.color }} />
              </div>
              <p className="font-semibold text-xs text-gray-700">{item.title}</p>
              <p className="text-[10px] text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ── BANNER 1: NOW FROM KOYAMBEDU ──────── */}
        <div className="mb-4 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#14532d 0%,#166534 60%,#15803d 100%)', boxShadow: '0 4px 20px rgba(20,83,45,0.3)' }}>
          <div className="p-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 opacity-10 text-8xl select-none pointer-events-none">🥬</div>
            <span className="text-[10px] font-black text-emerald-300 tracking-widest uppercase">NOW FROM KOYAMBEDU</span>
            <h3 className="text-white font-black text-lg mt-1 leading-tight">Fresh Vegetables &amp; Fruits Daily</h3>
            <p className="text-emerald-200 text-xs mt-1.5">Shop Fresh Produce Directly from Koyambedu Market</p>
            <Link to="/koyambedu/shop"
              className="inline-block mt-3 bg-white text-emerald-700 font-black text-xs px-4 py-2 rounded-xl active:scale-95 transition">
              Shop Now →
            </Link>
          </div>
        </div>

        {/* ── BANNER 2: FLOWERS COMING SOON ───── */}
        <div className="mb-4 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}>
          <div className="p-5 relative overflow-hidden">
            <div className="absolute right-2 top-2 text-5xl opacity-20 select-none pointer-events-none">🌸</div>
            <span className="text-[10px] font-black text-purple-200 tracking-widest uppercase">Flowers</span>
            <h3 className="text-white font-black text-lg mt-0.5 leading-tight">Coming Soon</h3>
            <p className="text-purple-200 text-xs mt-1.5">Fresh Flowers for Every Occasion</p>
            <span className="inline-block mt-3 bg-white/20 text-white border border-white/30 font-bold text-xs px-4 py-2 rounded-xl">
              Notify Me 🔔
            </span>
          </div>
        </div>

        {/* ── SPECIAL OCCASION REQUEST ──────────── */}
        <div className="mb-6 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#b45309,#d97706)', boxShadow: '0 4px 20px rgba(180,83,9,0.25)' }}>
          <div className="p-5 relative overflow-hidden">
            <div className="absolute right-2 top-2 text-5xl opacity-20 select-none pointer-events-none">🎉</div>
            <span className="text-[10px] font-black text-amber-200 tracking-widest uppercase">Special Orders</span>
            <h3 className="text-white font-black text-base mt-0.5 leading-tight">Request Items for Special Occasions</h3>
            <p className="text-amber-100 text-xs mt-1">Weddings, festivals, pooja, bulk events — we arrange it all from Koyambedu</p>
            <button onClick={() => setShowSpecialReq(true)}
              className="inline-block mt-3 bg-white text-amber-700 font-black text-xs px-5 py-2 rounded-xl active:scale-95 transition">
              🎉 Make a Request →
            </button>
          </div>
        </div>

        {/* Seller CTA */}
        <div className="mb-6 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
          <div className="p-5">
            <p className="text-white font-black text-sm flex items-center gap-2"><FiGrid size={15} /> Are you a Koyambedu Seller?</p>
            <p className="text-emerald-200 text-xs mt-1">List your stall on Eptomart — reach Chennai homes directly.</p>
            <p className="text-emerald-300 text-[10px] mt-0.5">கோயம்பேடு வியாபாரியா? இப்போதே இணையுங்கள்</p>
            <Link to="/koyambedu/seller/register"
              className="inline-block mt-3 bg-white text-emerald-700 font-black text-sm px-5 py-2.5 rounded-xl active:scale-95 transition">
              Register as Seller →
            </Link>
          </div>
        </div>
      </div>

      {/* Special Request Modal */}
      {showSpecialReq && <SpecialRequestModal onClose={() => setShowSpecialReq(false)} />}

      <BottomNav />

      {itemCount > 0 && (
        <div className="fixed left-4 right-4 max-w-lg mx-auto z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}>
          <div className="bg-green-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs opacity-80">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
              <p className="font-black text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
            </div>
            <Link to="/koyambedu/cart" className="bg-white text-emerald-700 font-black text-sm px-5 py-2 rounded-xl">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
