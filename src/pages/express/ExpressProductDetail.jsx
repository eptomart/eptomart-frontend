// ============================================
// EPTOMART EXPRESS — Product Detail
// Reached by tapping a product's image/name on ExpressShop.jsx's grid (the
// inline Add/stepper on the grid card itself is untouched — this page is an
// additional, deeper view, same relationship as FruitBasketProductDetail.jsx
// has to FruitBasketShop.jsx). Shows combo contents when the product is a
// combo (native or Koyambedu-linked, either way comboContents is already a
// name/unit/qty snapshot on the ExpressProduct — no extra lookups needed).
// ============================================
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiShoppingCart, FiMinus, FiPlus, FiZap, FiPackage, FiCheckCircle } from 'react-icons/fi';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';

// Pack-size options are built per product from its admin-configured
// minOrderQty (e.g. radish starts at 0.25 kg) rather than one fixed
// 250g/500g/1kg set for every product — see the matching helper in
// ExpressShop.jsx.
const formatWeight = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg % 1 === 0 ? kg : kg.toFixed(2)} kg`);
const weightOptionsFor = (minOrderQty) => {
  const base = Number(minOrderQty) > 0 ? Number(minOrderQty) : 0.25;
  const candidates = [base, base * 2, base * 4, 1].filter(v => v >= base);
  const rounded = candidates.map(v => Math.round(v * 1000) / 1000);
  const unique = Array.from(new Set(rounded)).sort((a, b) => a - b);
  return unique.map(kg => ({ kg, label: formatWeight(kg) }));
};

export default function ExpressProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { selectedStore, cart, fetchCart, addToCart, updateItem, loading: cartLoading } = useExpressCart();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weightKg, setWeightKg] = useState(null);

  useEffect(() => {
    if (!selectedStore?._id) {
      navigate('/express/location');
      return;
    }
    api.get(`/express/stores/${selectedStore._id}/online-catalogue/${productId}`)
      .then(({ data }) => {
        setData(data);
        // Default the pack-size selector to this product's own minimum
        // order quantity, not a one-size-fits-all 1 kg.
        setWeightKg(data?.product?.minOrderQty || 0.25);
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
    fetchCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, productId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="w-full aspect-square rounded-2xl bg-gray-100 animate-pulse mb-4" />
        <div className="h-5 w-2/3 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6">
        <FiPackage size={40} className="text-gray-300" />
        <p className="text-gray-500 font-semibold">Product not found</p>
        <button onClick={() => navigate('/express/shop')} className="font-bold text-sm text-indigo-600">
          ← Back to shop
        </button>
      </div>
    );
  }

  const { product, pricePerUnit, mrp, discountPercent, stockQty } = data;
  const isKg = product.unit === 'kg';
  const minOrderQty = product.minOrderQty || 0.25;
  // Merchant-set per-order cap (distinct from stock) — null/undefined means
  // no cap, so the effective ceiling just falls back to stockQty.
  const maxOrderQty = product.maxOrderQty;
  const effectiveMax = maxOrderQty != null ? Math.min(stockQty, maxOrderQty) : stockQty;
  const packKg = weightKg ?? minOrderQty;
  const qtyInCart = cart.items?.find(i => String(i.product) === String(product._id))?.quantity || 0;
  const outOfStock = stockQty === 0;
  const total = isKg ? Math.round(pricePerUnit * packKg) : pricePerUnit;
  const mrpTotal = mrp ? (isKg ? Math.round(mrp * packKg) : mrp) : null;
  const showDiscount = mrp > pricePerUnit;

  const handleAdd = () => addToCart(product._id, isKg ? packKg : 1);
  // Capped at min(stockQty, maxOrderQty) — see the matching fix in
  // ExpressShop.jsx's own +/- stepper for why (previously nothing stopped a
  // customer from stepping past what was actually in stock/allowed here
  // either).
  const handleQtyChange = (direction) => {
    const step = isKg ? packKg : 1;
    if (qtyInCart === 0 && direction > 0) return handleAdd();
    const uncapped = Math.max(0, Math.round((qtyInCart + direction * step) * 100) / 100);
    const next = Math.min(uncapped, effectiveMax);
    if (direction > 0 && next <= qtyInCart) {
      toast(
        maxOrderQty != null && maxOrderQty < stockQty
          ? `Max ${maxOrderQty}${isKg ? ' kg' : ''} of this item per order`
          : `Only ${stockQty}${isKg ? ' kg' : ''} of this item in stock`,
        { icon: '📦' }
      );
      return;
    }
    updateItem(product._id, next);
  };

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 active:scale-90 transition">
          <FiArrowLeft size={18} className="text-indigo-700" />
        </button>
        <p className="flex-1 font-bold text-gray-800 text-sm truncate">{product.name}</p>
        <Link to="/express/checkout" className="relative w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <FiShoppingCart size={16} className="text-indigo-700" />
          {cart.itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-amber-900 text-[9px] font-black flex items-center justify-center">
              {cart.itemCount}
            </span>
          )}
        </Link>
      </div>

      {/* Hero image */}
      <div className="relative bg-white">
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {product.image
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            : <FiZap className="text-gray-300" size={48} />}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-bold">Out of Stock</span>
          </div>
        )}
        {qtyInCart > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg bg-indigo-600">
            <FiCheckCircle size={11} /> {qtyInCart}{isKg ? ' kg' : ''} in cart
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-3">
        <div className="bg-white border rounded-2xl p-4">
          {product.category && (
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mb-2">
              {product.category}
            </span>
          )}
          <h1 className="font-extrabold text-gray-900 text-xl leading-tight">{product.name}</h1>
          <p className="font-black text-2xl text-indigo-700 mt-2 flex items-center gap-2 flex-wrap">
            <span>₹{pricePerUnit}<span className="text-sm font-semibold text-gray-400">/{product.unit}</span></span>
            {showDiscount && (
              <>
                <span className="text-base font-semibold text-gray-300 line-through">₹{mrp}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{discountPercent}% off</span>
              </>
            )}
          </p>

          {product.description && (
            <p className="mt-3 text-gray-500 text-sm leading-relaxed border-t pt-3">{product.description}</p>
          )}

          {stockQty > 0 && stockQty <= 5 && (
            <p className="mt-2 text-xs font-bold text-red-500">Only {stockQty} left!</p>
          )}
        </div>

        {product.isCombo && product.comboContents?.length > 0 && (
          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-wide mb-2 flex items-center gap-1.5 text-indigo-700">
              <FiPackage size={12} /> What&apos;s in this combo
            </p>
            <ul className="space-y-1.5">
              {product.comboContents.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5 text-gray-700 text-sm">
                  <FiCheckCircle size={12} className="shrink-0 text-indigo-500" />
                  <span>{c.name} <span className="text-gray-400">— {c.qty} {c.unit}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!outOfStock && isKg && (
          <div className="bg-white border rounded-2xl p-4">
            <p className="font-bold text-gray-800 text-sm mb-2">Pack size</p>
            <div className="flex gap-2">
              {weightOptionsFor(minOrderQty).map(s => (
                <button key={s.kg} onClick={() => setWeightKg(s.kg)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                  style={packKg === s.kg ? { background: '#4338ca', color: '#fff', borderColor: '#4338ca' } : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Min order: {formatWeight(minOrderQty)}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {!outOfStock && (
        <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-2xl z-30 p-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 leading-none">{isKg ? `${weightKg} kg` : 'each'} · ₹{pricePerUnit}/{product.unit}</p>
              <p className="font-black text-base text-gray-800 flex items-center gap-1.5">
                <span>₹{total}</span>
                {showDiscount && <span className="text-xs font-semibold text-gray-300 line-through">₹{mrpTotal}</span>}
              </p>
            </div>
            {qtyInCart === 0 ? (
              <button onClick={handleAdd} disabled={cartLoading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                <FiShoppingCart size={16} /> Add to Cart
              </button>
            ) : (
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2.5 gap-4">
                <button onClick={() => handleQtyChange(-1)} disabled={cartLoading} className="text-indigo-700 disabled:opacity-40"><FiMinus size={16} /></button>
                <span className="font-bold text-base text-indigo-900">{qtyInCart}{isKg ? ' kg' : ''}</span>
                <button onClick={() => handleQtyChange(1)} disabled={cartLoading || qtyInCart >= effectiveMax} className="text-indigo-700 disabled:opacity-40"><FiPlus size={16} /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
