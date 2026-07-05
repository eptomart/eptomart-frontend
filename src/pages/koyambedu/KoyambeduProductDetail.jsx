// ============================================
// KOYAMBEDU PRODUCT DETAIL — v3
// • Bottom bar z-[9990] (above BottomNav z-[9980])
// • Add to Cart + Buy Now dual buttons
// • Delivery: Tomorrow / Day-After-Tomorrow with real dates
// • 8 AM TODAY cutoff for Tomorrow delivery
// • Enriched layout: category, vendor, market info, badges
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EptoSEO, { buildProductSchema } from '../../components/common/EptoSEO';
import {
  FiArrowLeft, FiShoppingBag,
  FiZap, FiClock, FiTrendingUp, FiTag, FiMapPin,
  FiCheckCircle, FiShoppingCart,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const IMG_PLACEHOLDER = 'https://placehold.co/400x300/dcfce7/166534?text=Fresh';

export default function KoyambeduProductDetail() {
  const { productId } = useParams();
  const navigate      = useNavigate();
  const { getQty, updateItem, loading: cartLoading, itemCount } = useKoyambeduCart();

  const [product,      setProduct]  = useState(null);
  const [loading,      setLoading]  = useState(true);
  const [activeImg,    setActiveImg] = useState(0);
  const [qty,      setQty]      = useState(1);
  const [qtyInput, setQtyInput] = useState('1'); // local string for editable input
  const [qtyInvalid, setQtyInvalid] = useState(false); // true when typed value is below minQty
  const [priceHistory, setPriceHistory] = useState([]);
  const [showQtySheet, setShowQtySheet] = useState(false); // variant qty bottom sheet
  const [activeGradeKey, setActiveGradeKey] = useState(null); // grade system
  const autoCommitRef = useRef(null);

  useEffect(() => {
    // Read cart qty synchronously at mount — before the async product fetch
    // so we can initialise the stepper to the existing cart quantity.
    const existingCartQty = getQty(productId);

    api.get(`/koyambedu/products/${productId}`)
      .then(r => {
        const p = r.data.product;
        setProduct(p);
        // Auto-select Premium first; fallback to first active grade
        if (p.gradesEnabled && p.grades?.length > 0) {
          const activeGrades = p.grades.filter(g => g.isActive);
          if (activeGrades.length > 0) {
            const premium = activeGrades.find(g => g.gradeKey === 'premium');
            setActiveGradeKey((premium || activeGrades[0]).gradeKey);
          }
        }
        // If product is already in cart, start stepper at that qty (not minQty)
        const minQ    = Math.max(1, p.minQty || p.qtyStep || 1);
        const initQty = existingCartQty > 0 ? existingCartQty : minQ;
        setQty(initQty);
        setQtyInput(String(initQty));
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));

    api.get(`/koyambedu/products/${productId}/price-history`)
      .then(r => setPriceHistory(r.data.history || []))
      .catch(() => {});
  }, [productId]);

  // Keep qtyInput display in sync whenever qty changes via +/− buttons or chips
  // ⚠ Must be before any early returns so hook count is stable across renders
  useEffect(() => { setQtyInput(String(qty)); setQtyInvalid(false); }, [qty]);

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
  // For graded products, track qty per grade independently
  const hasGradesQuick = !!(product.gradesEnabled && product.grades?.length > 0);
  const cartQty = hasGradesQuick && activeGradeKey
    ? getQty(productId, activeGradeKey)
    : getQty(productId);
  const images     = product.images?.filter(i => i.url)?.length ? product.images : [{ url: IMG_PLACEHOLDER }];

  // ── Grade system: resolve active grade and its variants ──────
  const hasGrades   = !!(product.gradesEnabled && product.grades?.length > 0);
  const activeGrades = hasGrades ? product.grades.filter(g => g.isActive) : [];
  const activeGrade  = hasGrades
    ? (activeGrades.find(g => g.gradeKey === activeGradeKey) || activeGrades[0] || null)
    : null;
  // When grades are enabled, use the active grade's variants; otherwise use product.variants
  const activeVariants = hasGrades
    ? (activeGrade?.variants || [])
    : (product.variants || []);
  const hasVariants = activeVariants.length > 0;

  // Find which variant the current qty falls into
  // Open-ended last tier: toQty is empty/0 → matches any qty >= fromQty
  const activeVariant = hasVariants
    ? activeVariants.find(v => {
        if (!v.toQty) return qty >= v.fromQty; // open-ended last tier
        return qty >= v.fromQty && qty <= v.toQty;
      }) ||
      activeVariants.reduce((best, v) => {
        if (!best || v.finalPrice < best.finalPrice) return v;
        return best;
      }, null)
    : null;

  const activeFinalPrice = activeVariant ? activeVariant.finalPrice : product.currentPrice;
  // For variant products, always step by 1 — fromQty is the *minimum*, not the increment
  const step   = hasVariants ? 1 : Math.max(1, product.qtyStep || 1);
  const minQty = hasVariants ? (activeVariants[0]?.fromQty || 1) : Math.max(1, product.minQty || 1);
  // Open-ended last tier: no upper cap (toQty is null)
  const lastVariant = hasVariants ? activeVariants[activeVariants.length - 1] : null;
  const isLastVariantOpen = hasVariants && !lastVariant?.toQty;
  const maxQty = hasVariants
    ? (isLastVariantOpen ? null : (lastVariant?.toQty || 9999))
    : (product.maxQty || 500);
  const isOpenEndedActive = !!(activeVariant && !activeVariant.toQty);
  // Use live qtyInput for total so price updates as user types (not just after blur/commit)
  const displayQty = (() => {
    const parsed = parseInt(qtyInput, 10);
    const withinMax = maxQty === null ? true : parsed <= maxQty;
    return (!isNaN(parsed) && parsed >= minQty && withinMax) ? parsed : qty;
  })();
  const total   = (displayQty * activeFinalPrice).toFixed(2);

  // Best Value variant = lowest per-unit finalPrice
  const bestVariant = hasVariants
    ? activeVariants.reduce((b, v) => (!b || Number(v.finalPrice) < Number(b.finalPrice)) ? v : b, null)
    : null;

  // Format qty for display: 0.25 kg → "250 g", 0.5 kg → "500 g", 1 kg → "1 kg"
  const fmtQty = (qty, unit) => {
    const n = Number(qty);
    if (unit === 'kg' && n < 1) return `${Math.round(n * 1000)} g`;
    return `${n} ${unit}`;
  };

  // ── Resolve current qty from input (clears pending auto-commit) ──────────
  // If the user clicks Add to Cart / Buy Now before the 3-second timer fires,
  // we parse qtyInput immediately so the typed value — not the stale qty — is used.
  const resolveQty = () => {
    clearTimeout(autoCommitRef.current);
    const parsed = parseInt(qtyInput, 10);
    const withinMax = maxQty === null ? true : parsed <= maxQty;
    if (!isNaN(parsed) && parsed >= minQty && withinMax) {
      setQty(parsed);
      setQtyInvalid(false);
      return parsed;
    }
    return qty; // fallback to last committed qty
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleAddToCart = () => {
    const effectiveQty = resolveQty();
    updateItem(productId, effectiveQty, 'tomorrow', {
      productData: product,
      gradeKey:  activeGrade?.gradeKey  || null,
      gradeName: activeGrade?.gradeName || null,
    });
  };

  const handleBuyNow = () => {
    const effectiveQty = resolveQty();
    updateItem(productId, effectiveQty, 'tomorrow', {
      productData: product,
      gradeKey:  activeGrade?.gradeKey  || null,
      gradeName: activeGrade?.gradeName || null,
    });
    navigate('/koyambedu/cart');
  };

  // Select a tier chip: snap qty to fromQty if out of range, then open the bottom sheet
  const selectVariant = (v) => {
    const inRange = !v.toQty ? qty >= v.fromQty : (qty >= v.fromQty && qty <= v.toQty);
    if (!inRange) setQty(v.fromQty);
    setShowQtySheet(true);
  };

  // ── Render ───────────────────────────────────────────────────
  const primaryImage = images.find(i => i.isPrimary)?.url || images[0]?.url;
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F4F2',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
        overflowX: 'hidden',
      }}
    >
      <EptoSEO
        app="koyambedu"
        page="product"
        title={`${product.name} — Koyambedu Daily | Eptomart`}
        description={product.description || `Buy fresh ${product.name} at ₹${product.currentPrice}/${product.unit}. Sourced from Koyambedu wholesale market.`}
        canonical={`https://www.eptomart.com/koyambedu/product/${productId}`}
        image={primaryImage}
        jsonLd={buildProductSchema({
          name:         product.name,
          description:  product.description || `Fresh ${product.name} from Koyambedu Market`,
          image:        images.map(i => i.url).filter(Boolean),
          price:        product.currentPrice,
          availability: product.isAvailable ? 'InStock' : 'OutOfStock',
          url:          `https://www.eptomart.com/koyambedu/product/${productId}`,
          seller:       product.seller?.businessName || 'Koyambedu Daily Seller',
        })}
        breadcrumb={[
          { name: 'Home', url: 'https://www.eptomart.com/' },
          { name: 'Koyambedu Daily', url: 'https://www.eptomart.com/koyambedu' },
          { name: 'Shop', url: 'https://www.eptomart.com/koyambedu/shop' },
          { name: product.name, url: `https://www.eptomart.com/koyambedu/product/${productId}` },
        ]}
      />

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
              <FiCheckCircle size={11} /> {cartQty} {product.unit} in cart
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
          {hasVariants ? (
            <div className="mt-3">

              {/* ── Grade tabs (only when gradesEnabled) ── */}
              {hasGrades && activeGrades.length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                  {activeGrades.map(g => {
                    const isActive = g.gradeKey === (activeGrade?.gradeKey);
                    const gradeColors = {
                      premium: { active: 'bg-purple-600 text-white border-purple-600', inactive: 'text-purple-700 border-purple-200 bg-purple-50' },
                      mixed:   { active: 'bg-blue-600 text-white border-blue-600',   inactive: 'text-blue-700 border-blue-200 bg-blue-50'   },
                      economy: { active: 'bg-gray-600 text-white border-gray-500',   inactive: 'text-gray-600 border-gray-200 bg-gray-50'   },
                    };
                    const colors = gradeColors[g.gradeKey] || gradeColors.economy;
                    const minPrice = Math.min(...(g.variants || []).map(v => v.finalPrice || Infinity).filter(f => f !== Infinity));
                    return (
                      <button key={g.gradeKey}
                        onClick={() => { setActiveGradeKey(g.gradeKey); setShowQtySheet(false); }}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition active:scale-95 ${isActive ? colors.active : colors.inactive}`}>
                        <div>{g.gradeName || g.gradeKey}</div>
                        {minPrice !== Infinity && (
                          <div className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                            from ₹{minPrice}/{product.unit}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Grade label when only one active grade */}
              {hasGrades && activeGrades.length === 1 && activeGrade && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  <span>⭐</span> {activeGrade.gradeName || activeGrade.gradeKey}
                </div>
              )}

              {/* Current active price */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-green-700 font-black text-2xl">₹{activeFinalPrice}</span>
                  <span className="text-gray-400 text-sm">/ {product.unit}</span>
                </div>
                {activeVariant && activeVariant === bestVariant && (
                  <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    ✦ BEST VALUE
                  </span>
                )}
                {/* Show lowest available price across all grades when viewing a higher grade */}
                {hasGrades && activeGrades.length > 1 && (() => {
                  const lowestAcross = Math.min(
                    ...activeGrades.flatMap(g => (g.variants || []).map(v => v.finalPrice || Infinity))
                    .filter(f => f !== Infinity && f > 0)
                  );
                  if (lowestAcross < Infinity && lowestAcross < activeFinalPrice) {
                    return (
                      <span className="text-[10px] text-gray-400 font-medium">
                        (from ₹{lowestAcross}/{product.unit})
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Variant pricing table — all variants with per-unit + package total */}
              <div className="rounded-xl overflow-hidden border border-gray-100 mt-2">
                {/* Header */}
                <div className="grid grid-cols-3 gap-0 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-3 py-1.5">
                  <span>Variant</span>
                  <span className="text-center">₹/{product.unit}</span>
                  <span className="text-right">Value</span>
                </div>
                {/* Rows — sorted smallest qty first */}
                {[...activeVariants]
                  .sort((a, b) => Number(a.fromQty) - Number(b.fromQty))
                  .map((v, i) => {
                    const isActive    = activeVariant === v || (!v.toQty ? qty >= v.fromQty : (qty >= v.fromQty && qty <= v.toQty));
                    const isBestValue = bestVariant && String(v.fromQty) === String(bestVariant.fromQty);
                    const qtyLabel    = v.toQty
                      ? `${fmtQty(v.fromQty, product.unit)} – ${fmtQty(v.toQty, product.unit)}`
                      : `${fmtQty(v.fromQty, product.unit)}+`;
                    return (
                      <button key={i} onClick={() => selectVariant(v)}
                        className={`w-full grid grid-cols-3 gap-0 px-3 py-2.5 text-sm border-t border-gray-50 transition text-left active:scale-[0.99] ${
                          isActive ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}>
                        {/* Variant name */}
                        <span className={`font-semibold flex items-center gap-1 ${isActive ? 'text-green-700' : 'text-gray-700'}`}>
                          {qtyLabel}
                          {isBestValue && (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold leading-none">
                              BEST
                            </span>
                          )}
                        </span>
                        {/* Per-unit price */}
                        <span className={`text-center font-bold ${isActive ? 'text-green-700' : 'text-gray-800'}`}>
                          ₹{v.finalPrice}
                        </span>
                        {/* Selected chip */}
                        <span className="text-right text-[10px]">
                          {isActive ? (
                            <span className="font-bold bg-green-600 text-white px-1.5 py-0.5 rounded text-[9px]">✓ Active</span>
                          ) : (
                            <span className="text-gray-300">→</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Best value tip */}
              {bestVariant && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                  <span>✦</span>
                  <span>
                    <strong>Best value:</strong> {fmtQty(bestVariant.fromQty, product.unit)} at ₹{bestVariant.finalPrice}/{product.unit}
                    {' — '}total ₹{(Number(bestVariant.fromQty) * Number(bestVariant.finalPrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-green-700 font-black text-3xl">₹{product.currentPrice}</span>
              <span className="text-gray-400 text-sm font-medium">per {product.unit}</span>
              {product.originalPrice > product.currentPrice && (
                <span className="text-gray-400 text-sm line-through">₹{product.originalPrice}</span>
              )}
            </div>
          )}

          {/* Market rate */}
          {product.marketPriceMin > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <FiTrendingUp size={12} className="text-amber-600 shrink-0" />
              <span className="text-amber-700 text-[11px] font-semibold">
                Market rate: ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unit}
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

        {/* ══ Quantity ══ */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {hasVariants ? (
            <>
              <p className="font-bold text-gray-800 text-sm mb-2">Select Quantity Range</p>
              <div className="flex gap-2 flex-wrap">
                {activeVariants.map((v, i) => (
                  <button key={i} onClick={() => selectVariant(v)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition active:scale-95 ${
                      activeVariant === v
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    }`}>
                    {v.toQty ? `${v.fromQty}–${v.toQty}` : `Above ${v.fromQty}`} {product.unit}
                    <span className="ml-1 text-[10px] opacity-80">₹{v.finalPrice}</span>
                  </button>
                ))}
              </div>
              {/* Tap hint when no variant picked yet */}
              {!activeVariant && (
                <div className="mt-3 rounded-xl px-4 py-3 text-center"
                  style={{ background: '#f0fdf4', border: '1.5px dashed #16a34a' }}>
                  <p className="text-green-700 text-sm font-bold">👆 Tap a range above to set quantity</p>
                </div>
              )}
              {/* Compact summary when variant is chosen — tapping reopens sheet */}
              {activeVariant && (
                <button onClick={() => setShowQtySheet(true)}
                  className="mt-3 w-full flex items-center justify-between rounded-xl px-4 py-3 active:scale-[0.98] transition"
                  style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px solid #16a34a' }}>
                  <div className="text-left">
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Selected</p>
                    <p className="text-green-800 font-black text-base">{qty} {product.unit}
                      <span className="text-xs font-semibold ml-2 text-green-600">@ ₹{activeFinalPrice}/{product.unit}</span>
                    </p>
                  </div>
                  <span className="text-green-700 text-sm font-black">✏ Edit →</span>
                </button>
              )}
            </>
          ) : (
            /* No-variant mode: compact inline stepper */
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-sm">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(q => Math.max(minQty, parseFloat((q - step).toFixed(2))))}
                  disabled={qty <= minQty}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl active:scale-90 transition disabled:opacity-40"
                  style={{ background: '#f0fdf4', color: '#15803d' }}>
                  −
                </button>
                <div className="flex flex-col items-center">
                  <p className="text-[9px] text-green-600 font-bold mb-0.5 uppercase tracking-wide">✏ Type qty</p>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={qtyInput} maxLength={5}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                      setQtyInput(raw); setQtyInvalid(false);
                      clearTimeout(autoCommitRef.current);
                      autoCommitRef.current = setTimeout(() => {
                        const val = parseInt(raw, 10);
                        const withinMax = maxQty === null ? true : val <= maxQty;
                        if (!isNaN(val) && val >= minQty && withinMax) { setQty(val); setQtyInvalid(false); }
                        else if (!isNaN(val) && val < minQty) setQtyInvalid(true);
                      }, 3000);
                    }}
                    onBlur={e => {
                      clearTimeout(autoCommitRef.current);
                      const val = parseInt(e.target.value, 10);
                      const withinMax = maxQty === null ? true : val <= maxQty;
                      if (!isNaN(val) && val >= minQty && withinMax) { setQty(val); setQtyInvalid(false); }
                      else if (!isNaN(val) && val < minQty) { toast.error(`Minimum quantity is ${minQty} ${product.unit}`); setQtyInvalid(true); }
                      else { setQtyInput(String(qty)); setQtyInvalid(false); }
                    }}
                    className={`font-black w-[64px] text-center text-lg bg-white border-2 rounded-xl px-1 py-1 focus:outline-none transition ${
                      qtyInvalid ? 'border-red-500 text-red-600' : 'border-green-400 text-gray-900 focus:border-green-600'
                    }`}
                    style={{ appearance: 'textfield', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
                  />
                  <span className="text-[10px] font-semibold text-gray-400 mt-0.5">{product.unit}</span>
                </div>
                <button
                  onClick={() => setQty(q => Math.min(product.maxQty || 500, parseFloat((q + step).toFixed(2))))}
                  disabled={qty >= (product.maxQty || 500)}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl text-white active:scale-90 transition disabled:opacity-40"
                  style={{ background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}>
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══ Price fluctuation notice ══ */}

      </div>


      {/* ══ STICKY BOTTOM ACTION BAR ══════════════════════════════
          z-[9990] sits ABOVE BottomNav (z-[9980])
          paddingBottom clears the BottomNav height (68px) + safe area  */}
      <div
        className="fixed left-0 right-0 bottom-0 above-bottom-nav bg-white z-[9970]"
        style={{
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
          paddingTop: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {/* Price + buttons in one compact row */}
        <div className="flex items-center gap-2">
          {/* Price summary */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 leading-none">
              {displayQty} {product.unit} × ₹{activeFinalPrice}
            </p>
            <p className="font-black text-green-700 text-base leading-tight">₹{total}</p>
          </div>

          {/* Add to Cart */}
          <button
            onPointerDown={e => e.preventDefault()}
            onClick={handleAddToCart}
            disabled={cartLoading || qtyInvalid}
            className="flex items-center gap-1 font-bold px-3 py-2 rounded-xl text-xs transition active:scale-95 disabled:opacity-60 shrink-0"
            style={{
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1.5px solid #16a34a',
            }}
          >
            <FiShoppingCart size={12} />
            {cartLoading ? '…' : cartQty > 0 ? 'Update' : 'Add to Cart'}
          </button>

          {/* Buy Now */}
          <button
            onPointerDown={e => e.preventDefault()}
            onClick={handleBuyNow}
            disabled={cartLoading || qtyInvalid}
            className="flex items-center gap-1 font-bold px-3 py-2 rounded-xl text-xs text-white transition active:scale-95 disabled:opacity-60 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
              boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
            }}
          >
            <FiZap size={12} />
            Buy Now
          </button>
        </div>
      </div>

      {/* ══ Variant Qty Bottom Sheet ══ */}
      {hasVariants && showQtySheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9980]"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setShowQtySheet(false)}
          />

          {/* Sheet panel */}
          <div
            className="fixed left-0 right-0 bottom-0 z-[9990] bg-white rounded-t-3xl px-4 pt-4"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
            }}
          >
            {/* Drag handle + close */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: '#d1d5db', position: 'absolute', left: '50%', transform: 'translateX(-50%) translateY(-8px)' }} />
              <p className="text-gray-800 font-black text-sm">Set Quantity</p>
              <button onClick={() => setShowQtySheet(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 text-lg active:bg-gray-100">
                ✕
              </button>
            </div>

            {/* Active tier badge */}
            {activeVariant && (
              <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #16a34a' }}>
                <span className="text-green-700 text-xs font-black">
                  ✓ {activeVariant.toQty
                    ? `${activeVariant.fromQty}–${activeVariant.toQty} ${product.unit}`
                    : `${activeVariant.fromQty}+ ${product.unit}`}
                </span>
                <span className="ml-auto text-green-800 font-bold text-xs">₹{activeFinalPrice}/{product.unit}</span>
              </div>
            )}

            {/* Label */}
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide mb-2">✏ Type exact quantity</p>

            {/* Large input + − + */}
            <div className="flex items-center gap-4 mb-4">
              {/* − */}
              <button
                onClick={() => {
                  const newQty = qty - 1;
                  if (activeVariant && newQty >= activeVariant.fromQty) {
                    setQty(newQty); setQtyInput(String(newQty));
                  } else {
                    const idx = activeVariants.indexOf(activeVariant);
                    const prev = activeVariants[idx - 1];
                    if (prev) { setQty(prev.toQty); setQtyInput(String(prev.toQty)); }
                  }
                }}
                disabled={qty <= minQty}
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl active:scale-90 transition disabled:opacity-40 shrink-0"
                style={{ background: '#f0fdf4', color: '#15803d', border: '2px solid #bbf7d0' }}>
                −
              </button>

              {/* Input */}
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={qtyInput} maxLength={5}
                  autoFocus
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                    setQtyInput(raw); setQtyInvalid(false);
                    clearTimeout(autoCommitRef.current);
                    autoCommitRef.current = setTimeout(() => {
                      const val = parseInt(raw, 10);
                      const withinMax = maxQty === null ? true : val <= maxQty;
                      if (!isNaN(val) && val >= minQty && withinMax) { setQty(val); setQtyInvalid(false); }
                      else if (!isNaN(val) && val < minQty) setQtyInvalid(true);
                    }, 3000);
                  }}
                  onBlur={e => {
                    clearTimeout(autoCommitRef.current);
                    const val = parseInt(e.target.value, 10);
                    const withinMax = maxQty === null ? true : val <= maxQty;
                    if (!isNaN(val) && val >= minQty && withinMax) { setQty(val); setQtyInvalid(false); }
                    else if (!isNaN(val) && val < minQty) { toast.error(`Minimum is ${minQty} ${product.unit}`); setQtyInvalid(true); }
                    else { setQtyInput(String(qty)); setQtyInvalid(false); }
                  }}
                  className={`w-full text-center text-3xl font-black bg-white rounded-2xl px-2 py-3 focus:outline-none transition ${
                    qtyInvalid ? 'border-2 border-red-500 text-red-600' : 'border-2 border-green-400 text-gray-900 focus:border-green-600'
                  }`}
                  style={{ appearance: 'textfield', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
                />
                <span className="text-xs font-bold text-green-600 mt-1">{product.unit}</span>
              </div>

              {/* + */}
              <button
                onClick={() => {
                  const newQty = qty + 1;
                  if (isOpenEndedActive) {
                    setQty(newQty); setQtyInput(String(newQty));
                  } else if (activeVariant && newQty <= (activeVariant.toQty || Infinity)) {
                    setQty(newQty); setQtyInput(String(newQty));
                  } else {
                    const idx = activeVariants.indexOf(activeVariant);
                    const next = activeVariants[idx + 1];
                    if (next) { setQty(next.fromQty); setQtyInput(String(next.fromQty)); }
                  }
                }}
                disabled={!isOpenEndedActive && qty >= (maxQty ?? Infinity)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl text-white active:scale-90 transition disabled:opacity-40 shrink-0"
                style={{ background: 'linear-gradient(135deg,#16a34a,#059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
                +
              </button>
            </div>

            {qtyInvalid && (
              <p className="text-xs text-red-500 font-semibold mb-3 text-center">Min {minQty} {product.unit} for this tier</p>
            )}

            {/* Running total */}
            <div className="text-center mb-4">
              <p className="text-gray-400 text-xs">{displayQty} {product.unit} × ₹{activeFinalPrice}</p>
              <p className="text-green-700 font-black text-xl">₹{total}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onPointerDown={e => e.preventDefault()}
                onClick={() => { handleAddToCart(); setShowQtySheet(false); }}
                disabled={cartLoading || qtyInvalid}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm transition active:scale-95 disabled:opacity-60"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '2px solid #16a34a' }}>
                <FiShoppingCart size={15} />
                {cartLoading ? '…' : cartQty > 0 ? 'Update Cart' : 'Add to Cart'}
              </button>
              <button
                onPointerDown={e => e.preventDefault()}
                onClick={() => { handleBuyNow(); setShowQtySheet(false); }}
                disabled={cartLoading || qtyInvalid}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' }}>
                <FiZap size={15} />
                Buy Now
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
