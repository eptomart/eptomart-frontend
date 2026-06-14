// ============================================
// KOYAMBEDU PRODUCT DETAIL
// Compact native-mobile layout — no Navbar
// 8 AM cutoff enforced (ignores stale sameDayCutoff from DB)
// ============================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiStar, FiShoppingBag, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const IMG_PLACEHOLDER = 'https://placehold.co/400x300/dcfce7/166534?text=🌿+Fresh';

// 8 AM global cutoff — ignore product.sameDayCutoff from DB (may be stale)
const isBefore8AM = () => new Date().getHours() < 8;

export default function KoyambeduProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getQty, updateItem, loading: cartLoading, itemCount, subtotal } = useKoyambeduCart();

  const [product,      setProduct]   = useState(null);
  const [loading,      setLoading]   = useState(true);
  const [activeImg,    setActiveImg] = useState(0);
  const [deliveryType, setDelivery]  = useState('tomorrow');
  const [qty,          setQty]       = useState(1);
  const [before8,      setBefore8]   = useState(isBefore8AM());

  useEffect(() => {
    api.get(`/koyambedu/products/${productId}`)
      .then(r => {
        const p = r.data.product;
        setProduct(p);
        setQty(Math.max(1, p.qtyStep || 1));
        // Today only available before 8 AM
        if (p.isSameDay && isBefore8AM()) setDelivery('today');
        else setDelivery('tomorrow');
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));

    // Re-check at minute boundary
    const id = setInterval(() => setBefore8(isBefore8AM()), 60000);
    return () => clearInterval(id);
  }, [productId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#f5f5f7' }}>
      <FaLeaf size={40} className="text-green-300" />
      <p className="text-gray-500 font-medium">Product not found</p>
      <button onClick={() => navigate('/koyambedu/shop')} className="text-green-600 font-semibold text-sm">← Back to shop</button>
    </div>
  );

  const cartQty = getQty(productId);
  const images  = product.images?.filter(i => i.url)?.length ? product.images : [{ url: IMG_PLACEHOLDER }];
  // Minimum 1 KG / 1 PC — never allow 0.5 step
  const step    = Math.max(1, product.qtyStep || 1);
  const minQty  = Math.max(1, product.minQty || 1);
  const todayAvailable = product.isSameDay && before8;

  const handleAddOrUpdate = () => {
    // Context handles toast (first-add only) — no double toast here
    updateItem(productId, qty, deliveryType);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f5f5f7' }}>

      {/* ── Sticky compact header ── */}
      <div className="sticky top-0 z-30 bg-white"
        style={{ boxShadow: '0 1px 0 #e5e7eb', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#f0fdf4' }}>
            <FiArrowLeft size={18} className="text-green-700" />
          </button>
          <p className="flex-1 font-bold text-gray-800 text-sm truncate">{product.name}</p>
          <Link to="/koyambedu/cart" className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#f0fdf4' }}>
            <FiShoppingBag size={17} className="text-green-700" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Product image ── */}
      <div className="bg-white">
        <div className="relative overflow-hidden" style={{ height: 220 }}>
          <img
            src={images[activeImg]?.url || IMG_PLACEHOLDER}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.badges?.includes('fresh_arrival') && (
              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <FaLeaf size={8} /> Fresh Arrival
              </span>
            )}
            {todayAvailable && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⚡ Same Day</span>
            )}
            {product.isNextDay && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">📅 Next Day</span>
            )}
            {product.badges?.includes('low_stock') && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Low Stock</span>
            )}
          </div>
        </div>
        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition ${activeImg === i ? 'border-green-500' : 'border-gray-100'}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-3">

        {/* ── Product info card ── */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h1 className="font-extrabold text-gray-900 text-xl leading-tight">{product.name}</h1>
          {product.nameTamil && <p className="text-gray-400 text-xs mt-0.5">{product.nameTamil}</p>}

          <div className="flex items-baseline gap-2 mt-2.5">
            <span className="text-green-700 font-black text-3xl">₹{product.currentPrice}</span>
            <span className="text-gray-400 text-sm font-medium">per {product.unitLabel}</span>
          </div>

          {product.marketPriceMin > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <span className="text-amber-600 text-[11px] font-semibold">
                📊 Market rate today: ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unitLabel}
              </span>
            </div>
          )}

          {product.freshArrivalTime && (
            <p className="mt-2 text-green-600 text-xs font-semibold flex items-center gap-1">
              🌅 Arrived today at {product.freshArrivalTime}
            </p>
          )}

          {product.description && (
            <p className="mt-3 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-3">{product.description}</p>
          )}

          {/* Seller */}
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <FiPackage size={14} className="text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Sold by</p>
              <p className="font-bold text-gray-800 text-sm truncate">{product.seller?.businessName}</p>
              {product.seller?.stallNumber && (
                <p className="text-[10px] text-gray-400">Stall {product.seller.stallNumber} · {product.seller.marketSection}</p>
              )}
            </div>
            {product.seller?.rating > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <FiStar size={11} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-gray-700">{product.seller.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Price fluctuation notice ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <FiAlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-[11px] leading-relaxed">
            Fresh produce prices may vary slightly based on daily market arrivals. Buyer approval will be requested before dispatch if price changes.
          </p>
        </div>

        {/* ── Delivery option ── */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-bold text-gray-800 text-sm mb-3">Delivery Option</p>
          <div className="grid grid-cols-2 gap-2">
            {todayAvailable ? (
              <button onClick={() => setDelivery('today')}
                className={`p-3.5 rounded-xl border-2 text-left transition active:scale-95 ${deliveryType === 'today' ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <p className="text-lg mb-1">⚡</p>
                <p className="font-extrabold text-gray-900 text-sm">Today</p>
                <p className="text-[11px] text-green-600 font-semibold mt-0.5">Order before 8:00 AM</p>
              </button>
            ) : product.isSameDay ? (
              <div className="p-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 text-left">
                <p className="text-lg mb-1">⚡</p>
                <p className="font-extrabold text-gray-500 text-sm">Today</p>
                <p className="text-[11px] text-red-400 font-semibold mt-0.5">Cutoff passed (8 AM)</p>
              </div>
            ) : null}
            {product.isNextDay && (
              <button onClick={() => setDelivery('tomorrow')}
                className={`p-3.5 rounded-xl border-2 text-left transition active:scale-95 ${deliveryType === 'tomorrow' ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <p className="text-lg mb-1">📅</p>
                <p className="font-extrabold text-gray-900 text-sm">Tomorrow</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Early morning sourcing</p>
              </button>
            )}
          </div>
          {/* If neither same-day nor next-day, show default tomorrow */}
          {!product.isSameDay && !product.isNextDay && (
            <div className="p-3.5 rounded-xl border-2 border-green-500 bg-green-50">
              <p className="text-lg mb-1">📅</p>
              <p className="font-extrabold text-gray-900 text-sm">Tomorrow</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Default delivery</p>
            </div>
          )}
        </div>

        {/* ── Quantity ── */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 text-sm">Quantity</p>
              {product.minQty > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Min: {product.minQty} {product.unitLabel} · Max: {product.maxQty} {product.unitLabel}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(minQty, parseFloat((q - step).toFixed(2))))}
                className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center active:scale-90 transition">
                −
              </button>
              <span className="font-black text-gray-900 min-w-[48px] text-center text-base">
                {qty} <span className="text-xs font-semibold text-gray-400">{product.unitLabel}</span>
              </span>
              <button
                onClick={() => setQty(q => Math.min(product.maxQty || 50, parseFloat((q + step).toFixed(2))))}
                className="w-10 h-10 rounded-full bg-green-600 text-white font-bold text-xl flex items-center justify-center active:scale-90 transition">
                +
              </button>
            </div>
          </div>
          {product.isBulkAvailable && product.bulkMinQty && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <p className="text-xs text-green-700 font-semibold">
                📦 Bulk price: ₹{product.bulkPricePerUnit}/{product.unitLabel} for {product.bulkMinQty}+ {product.unitLabel}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 flex gap-3 z-40"
        style={{ borderTop: '1px solid #e5e7eb', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="flex-1">
          <p className="text-[11px] text-gray-400">{qty} {product.unitLabel} × ₹{product.currentPrice}</p>
          <p className="font-black text-green-700 text-base leading-tight">₹{(qty * product.currentPrice).toFixed(2)}</p>
        </div>
        <button
          onClick={handleAddOrUpdate}
          disabled={cartLoading}
          className="flex-1 font-extrabold py-3 rounded-2xl text-sm transition active:scale-95 disabled:opacity-60"
          style={{ background: cartQty > 0 ? '#059669' : '#16a34a', color: '#fff', boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}>
          {cartLoading ? '...' : cartQty > 0 ? '✓ Update Cart' : '+ Add to Cart'}
        </button>
      </div>

    </div>
  );
}
