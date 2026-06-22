// ============================================
// KOYAMBEDU PRODUCT DETAIL — v3
// • Bottom bar z-[9990] (above BottomNav z-[9980])
// • Add to Cart + Buy Now dual buttons
// • Delivery: Tomorrow / Day-After-Tomorrow with real dates
// • 8 AM TODAY cutoff for Tomorrow delivery
// • Enriched layout: category, vendor, market info, badges
// ============================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiStar, FiShoppingBag, FiPackage, FiAlertTriangle,
  FiZap, FiCalendar, FiClock, FiTrendingUp, FiTag, FiMapPin,
  FiCheckCircle, FiShoppingCart,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const IMG_PLACEHOLDER = 'https://placehold.co/400x300/dcfce7/166534?text=Fresh';

// ── Delivery date helpers ──────────────────────────────────────
const getDeliveryDates = () => {
  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dat = new Date(now);
  dat.setDate(now.getDate() + 2);

  // Cutoff for "tomorrow" delivery: 8 AM TODAY
  // Seller must know before 8 AM to source at market the following morning
  const todayCutoff = new Date(now);
  todayCutoff.setHours(8, 0, 0, 0);
  const tomorrowAvailable = now < todayCutoff;

  // DAT is always open — advance booking
  const fmt = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return {
    tomorrowLabel: fmt(tomorrow),
    datLabel: fmt(dat),
    tomorrowAvailable,
  };
};

export default function KoyambeduProductDetail() {
  const { productId } = useParams();
  const navigate      = useNavigate();
  const { getQty, updateItem, loading: cartLoading, itemCount } = useKoyambeduCart();

  const [product,      setProduct]  = useState(null);
  const [loading,      setLoading]  = useState(true);
  const [activeImg,    setActiveImg] = useState(0);
  const [deliveryType, setDelivery] = useState('tomorrow');
  const [qty,          setQty]      = useState(1);
  const [dates,        setDates]    = useState(getDeliveryDates());
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    api.get(`/koyambedu/products/${productId}`)
      .then(r => {
        const p = r.data.product;
        setProduct(p);
        setQty(Math.max(1, p.minQty || p.qtyStep || 1));
        const d = getDeliveryDates();
        setDelivery(d.tomorrowAvailable ? 'tomorrow' : 'dat');
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));

    api.get(`/koyambedu/products/${productId}/price-history`)
      .then(r => setPriceHistory(r.data.history || []))
      .catch(() => {});

    // Refresh cutoff check every minute
    const id = setInterval(() => setDates(getDeliveryDates()), 60_000);
    return () => clearInterval(id);
  }, [productId]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: '#F5F4F2' }}>
      <FaLeaf size={40} className="text-green-300" />
      <p className="text-gray-500 font-semibold">Product not found</p>
      <button onClick={() => navigate('/koyambedu/shop')}
        className="text-green-600 font-bold text-sm bg-green-50 px-5 py-2.5 rounded-xl active:scale-95 transition">
        ← Back to shop
      </button>
    </div>
  );

  // ── Derived values ───────────────────────────────────────────
  const cartQty = getQty(productId);
  const images  = product.images?.filter(i => i.url)?.length ? product.images : [{ url: IMG_PLACEHOLDER }];
  const step    = Math.max(1, product.qtyStep || 1);
  const minQty  = Math.max(1, product.minQty  || 1);
  const total   = (qty * product.currentPrice).toFixed(2);

  // ── Handlers ─────────────────────────────────────────────────
  const handleAddToCart = () => {
    updateItem(productId, qty, deliveryType, { productData: product });
  };

  const handleBuyNow = () => {
    updateItem(productId, qty, deliveryType, { productData: product });
    navigate('/koyambedu/checkout');
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F4F2',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 160px)',
        overflowX: 'hidden',
      }}
    >

      {/* ══ Sticky header ══ */}
      <div className="sticky top-0 z-30 bg-white"
        style={{ boxShadow: '0 1px 0 #e5e7eb', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: '#f0fdf4' }}>
            <FiArrowLeft size={18} className="text-green-700" />
          </button>
          <p className="flex-1 font-bold text-gray-800 text-sm truncate">{product.name}</p>
          <Link to="/koyambedu/cart"
            className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#f0fdf4' }}>
            <FiShoppingBag size={17} className="text-green-700" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ══ Hero image ══ */}
      <div className="bg-white">
        <div className="relative overflow-hidden" style={{ height: 240 }}>
          <img
            src={images[activeImg]?.url || IMG_PLACEHOLDER}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.badges?.includes('fresh_arrival') && (
              <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <FaLeaf size={8} /> Fresh Arrival
              </span>
            )}
            {product.badges?.includes('low_stock') && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                Low Stock
              </span>
            )}
          </div>
          {/* In-cart indicator */}
          {cartQty > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-green-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <FiCheckCircle size={11} /> {cartQty} {product.unitLabel} in cart
            </div>
          )}
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

        {/* ══ Product info card ══ */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Category pill */}
          {product.category?.name && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <FiTag size={9} /> {product.category.name}
              </span>
            </div>
          )}

          <h1 className="font-extrabold text-gray-900 text-xl leading-tight">{product.name}</h1>
          {product.nameTamil && (
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{product.nameTamil}</p>
          )}

          {/* Price row */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-green-700 font-black text-3xl">₹{product.currentPrice}</span>
            <span className="text-gray-400 text-sm font-medium">per {product.unitLabel}</span>
            {product.originalPrice > product.currentPrice && (
              <span className="text-gray-400 text-sm line-through">₹{product.originalPrice}</span>
            )}
          </div>

          {/* Market rate */}
          {product.marketPriceMin > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <FiTrendingUp size={12} className="text-amber-600 shrink-0" />
              <span className="text-amber-700 text-[11px] font-semibold">
                Market rate: ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unitLabel}
              </span>
            </div>
          )}

          {/* Fresh arrival time */}
          {product.freshArrivalTime && (
            <p className="mt-2 text-green-600 text-xs font-semibold flex items-center gap-1">
              <FiClock size={11} /> Arrived at market {product.freshArrivalTime}
            </p>
          )}

          {/* Description */}
          {product.description && (
            <p className="mt-3 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-3">
              {product.description}
            </p>
          )}

          {/* Market source */}
          {product.marketSection && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <FiMapPin size={11} className="text-green-600 shrink-0" />
              <span>
                Sourced from{' '}
                <span className="font-semibold text-gray-700">Koyambedu Market</span>
                {' '}· {product.marketSection}
              </span>
            </div>
          )}

          {/* Vendor card */}
          {product.seller?.businessName && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <FiPackage size={16} className="text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Sold by</p>
                <p className="font-bold text-gray-800 text-sm truncate">{product.seller.businessName}</p>
                {product.seller.stallNumber && (
                  <p className="text-[10px] text-gray-400">
                    Stall {product.seller.stallNumber}
                    {product.seller.marketSection ? ` · ${product.seller.marketSection}` : ''}
                  </p>
                )}
              </div>
              {product.seller.rating > 0 && (
                <div className="flex items-center gap-0.5 shrink-0 px-2 py-1 rounded-lg"
                  style={{ background: '#fffbeb' }}>
                  <FiStar size={11} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-700">{product.seller.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ Price History ══ */}
        {priceHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FiTrendingUp size={15} className="text-green-600" />
              <p className="font-bold text-gray-800 text-sm">Price History <span className="text-xs text-gray-400 font-normal">(last 30 days)</span></p>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {priceHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">
                    {new Date(h.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </span>
                  <span className="text-sm font-bold text-green-700">₹{h.price}</span>
                  {h.note && <span className="text-[10px] text-gray-400 italic truncate max-w-[80px]">{h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Delivery option ══ */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-bold text-gray-800 text-sm mb-3">Choose Delivery</p>

          <div className="grid grid-cols-2 gap-2">

            {/* Tomorrow */}
            <button
              onClick={() => dates.tomorrowAvailable && setDelivery('tomorrow')}
              className={`relative p-3.5 rounded-xl border-2 text-left transition active:scale-95 ${
                !dates.tomorrowAvailable
                  ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                  : deliveryType === 'tomorrow'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <FiZap size={17} className={`mb-1.5 ${dates.tomorrowAvailable ? 'text-orange-500' : 'text-gray-400'}`} />
              <p className="font-extrabold text-gray-900 text-sm">Tomorrow</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{dates.tomorrowLabel}</p>
              {dates.tomorrowAvailable ? (
                <p className="text-[10px] text-green-600 font-semibold mt-1">Order before 8:00 AM</p>
              ) : (
                <p className="text-[10px] text-red-400 font-semibold mt-1">Cutoff passed (8 AM)</p>
              )}
              {deliveryType === 'tomorrow' && dates.tomorrowAvailable && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <FiCheckCircle size={10} className="text-white" />
                </div>
              )}
            </button>

            {/* Day After Tomorrow */}
            <button
              onClick={() => setDelivery('dat')}
              className={`relative p-3.5 rounded-xl border-2 text-left transition active:scale-95 ${
                deliveryType === 'dat'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <FiCalendar size={17} className="mb-1.5 text-blue-500" />
              <p className="font-extrabold text-gray-900 text-sm">Day After</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{dates.datLabel}</p>
              <p className="text-[10px] text-blue-500 font-semibold mt-1">Always available</p>
              {deliveryType === 'dat' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <FiCheckCircle size={10} className="text-white" />
                </div>
              )}
            </button>

          </div>

          <p className="text-[10px] text-gray-400 mt-2.5 text-center">
            Sourced fresh from Koyambedu market every morning · delivered by 10 AM
          </p>
        </div>

        {/* ══ Quantity ══ */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 text-sm">Quantity</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Min {minQty} {product.unitLabel}
                {product.maxQty ? ` · Max ${product.maxQty} ${product.unitLabel}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(minQty, parseFloat((q - step).toFixed(2))))}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl active:scale-90 transition"
                style={{ background: '#f0fdf4', color: '#15803d' }}>
                −
              </button>
              <span className="font-black text-gray-900 min-w-[52px] text-center text-base">
                {qty} <span className="text-xs font-semibold text-gray-400">{product.unitLabel}</span>
              </span>
              <button
                onClick={() => setQty(q => Math.min(product.maxQty || 99, parseFloat((q + step).toFixed(2))))}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl text-white active:scale-90 transition"
                style={{ background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}>
                +
              </button>
            </div>
          </div>

          {/* Bulk pricing */}
          {product.isBulkAvailable && product.bulkMinQty && (
            <div className="mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <FiPackage size={12} className="text-green-700 shrink-0" />
              <p className="text-xs text-green-700 font-semibold">
                Bulk price ₹{product.bulkPricePerUnit}/{product.unitLabel} for {product.bulkMinQty}+ {product.unitLabel}
              </p>
            </div>
          )}
        </div>

        {/* ══ Price fluctuation notice ══ */}
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <FiAlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-[11px] leading-relaxed">
            Fresh produce prices may vary based on daily market arrivals. We'll notify you before dispatch if the price changes.
          </p>
        </div>

      </div>


      {/* ══ STICKY BOTTOM ACTION BAR ══════════════════════════════
          z-[9990] sits ABOVE BottomNav (z-[9980])
          paddingBottom clears the BottomNav height (68px) + safe area  */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-white z-[9990]"
        style={{
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
          paddingTop: 12,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Price summary */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-[11px] text-gray-400">
              {qty} {product.unitLabel} × ₹{product.currentPrice}
            </p>
            <p className="font-black text-green-700 text-lg leading-tight">₹{total}</p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: deliveryType === 'tomorrow' ? '#f0fdf4' : '#eff6ff',
              color: deliveryType === 'tomorrow' ? '#16a34a' : '#2563eb',
            }}
          >
            {deliveryType === 'tomorrow'
              ? `Tomorrow · ${dates.tomorrowLabel}`
              : `Day After · ${dates.datLabel}`}
          </span>
        </div>

        {/* Dual buttons */}
        <div className="flex gap-2">
          {/* Add to Cart — outlined */}
          <button
            onClick={handleAddToCart}
            disabled={cartLoading}
            className="flex-1 flex items-center justify-center gap-1.5 font-extrabold py-3.5 rounded-2xl text-sm transition active:scale-95 disabled:opacity-60"
            style={{
              background: '#f0fdf4',
              color: '#16a34a',
              border: '2px solid #16a34a',
            }}
          >
            <FiShoppingCart size={14} />
            {cartLoading ? '…' : cartQty > 0 ? 'Update Cart' : 'Add to Cart'}
          </button>

          {/* Buy Now — filled */}
          <button
            onClick={handleBuyNow}
            disabled={cartLoading}
            className="flex-1 flex items-center justify-center gap-1.5 font-extrabold py-3.5 rounded-2xl text-sm text-white transition active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
              boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
            }}
          >
            <FiZap size={14} />
            Buy Now
          </button>
        </div>
      </div>

    </div>
  );
}
