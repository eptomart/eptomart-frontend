// ============================================
// EPTOMART EXPRESS — Shop
// Shows the nearest active store's catalogue (customer never sees which
// store is fulfilling them beyond a light mention — spec section 8). If no
// store has been selected yet (first visit, or cleared), redirects to the
// location picker. Surfaces the 12kg large-order warning inline in the
// cart summary (spec section 10). No checkout yet — Phase 3.
// ============================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiZap, FiMapPin, FiShoppingCart, FiPlus, FiMinus, FiAlertTriangle, FiPauseCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';

// Weight sub-unit options for kg-priced produce — lets the customer pick a
// smaller pack size than a full kilogram before adding to cart, instead of
// only ever being able to add/step by whole kilograms.
const WEIGHT_STEPS = [
  { label: '250 g', kg: 0.25 },
  { label: '500 g', kg: 0.5 },
  { label: '1 kg', kg: 1 },
];

export default function ExpressShop() {
  const navigate = useNavigate();
  const { selectedStore, cart, fetchCart, addToCart, updateItem } = useExpressCart();
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  // isPaused/pauseMessage come fresh from the online-catalogue response (not
  // the possibly-stale selectedStore in context) so a store put on hold
  // after the customer picked it is still reflected without a refetch of
  // the store list.
  const [storeStatus, setStoreStatus] = useState({ isPaused: false, pauseMessage: null });
  // productId -> chosen kg step (default 1kg). Only relevant for unit==='kg'
  // products; once an item is in the cart its stepper increments/decrements
  // by whatever step is currently selected here.
  const [weightStep, setWeightStep] = useState({});
  // Admin-created hero banners (flash sale / lowest-price / custom) — see
  // ExpressAdmin's Hero Banners tab. Independent of the store/catalogue
  // fetch below since banners aren't store-specific.
  const [banners, setBanners] = useState([]);
  // Category filter chips, derived live from whatever categories are
  // actually present in this store's catalogue (both native Express
  // categories and whatever a linked Koyambedu product carries) — never a
  // hardcoded list, so a store with no combos simply shows no Combos chip.
  const [activeCategory, setActiveCategory] = useState('All');
  const productGridRef = useRef(null);

  useEffect(() => {
    if (!selectedStore?._id) {
      navigate('/express/location');
      return;
    }
    api.get(`/express/stores/${selectedStore._id}/online-catalogue`)
      .then(({ data }) => {
        setCatalogue(data.catalogue || []);
        setStoreStatus({ isPaused: !!data.store?.isPaused, pauseMessage: data.store?.pauseMessage || null });
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
    fetchCart();
    api.get('/express/banners').then(({ data }) => setBanners(data.banners || [])).catch(() => {});
  }, [selectedStore]);

  // "Combos" is always surfaced as its own chip whenever any combo exists,
  // even if a particular combo's category text isn't literally "Combos"
  // (e.g. a Koyambedu-linked combo) — matched by isCombo, not just the
  // category string, so it never silently disappears.
  const categories = useMemo(() => {
    const names = new Set();
    let hasCombo = false;
    catalogue.forEach(({ product }) => {
      if (product.isCombo) hasCombo = true;
      else if (product.category) names.add(product.category);
    });
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted, ...(hasCombo ? ['Combos'] : [])];
  }, [catalogue]);

  const filteredCatalogue = useMemo(() => {
    if (activeCategory === 'All') return catalogue;
    if (activeCategory === 'Combos') return catalogue.filter(({ product }) => product.isCombo);
    return catalogue.filter(({ product }) => product.category === activeCategory);
  }, [catalogue, activeCategory]);

  const selectCategory = (cat) => {
    setActiveCategory(cat);
    productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const qtyInCart = (productId) => cart.items?.find(i => String(i.product) === String(productId))?.quantity || 0;
  const stepFor = (productId) => weightStep[productId] ?? 1;

  const handleAdd = (productId, unit) => addToCart(productId, unit === 'kg' ? stepFor(productId) : 1);
  const handleQtyChange = (productId, unit, direction) => {
    const step = unit === 'kg' ? stepFor(productId) : 1;
    const current = qtyInCart(productId);
    const next = Math.max(0, Math.round((current + direction * step) * 100) / 100);
    if (current === 0 && direction > 0) return handleAdd(productId, unit);
    updateItem(productId, next);
  };

  if (!selectedStore) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-28">
      <div className="flex items-center gap-2 mb-1">
        <img src="/images/express-logo.png" alt="Eptomart Express" className="w-7 h-7 rounded-full object-cover shrink-0" />
        <h1 className="text-xl font-black text-indigo-900">Eptomart Express</h1>
        {selectedStore?.estimatedDeliveryMinutes != null && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            Delivery in ~{selectedStore.estimatedDeliveryMinutes} min
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-4 flex-wrap">
        <FiMapPin size={12} className="shrink-0" />
        <span>Delivering from</span>
        <button onClick={() => navigate('/express/location?mode=stores')}
          className="font-bold text-gray-700 underline decoration-dotted decoration-gray-300 hover:text-indigo-600 hover:decoration-indigo-400 transition">
          {selectedStore?.name || 'your area'}
        </button>
        <span>·</span>
        <button onClick={() => navigate('/express/location?mode=stores')} className="hover:text-indigo-600 transition">
          Change store
        </button>
        <span>·</span>
        <button onClick={() => navigate('/express/location')} className="hover:text-indigo-600 transition">
          Change location
        </button>
      </div>

      {banners.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 mb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {banners.map(b => (
            <Link key={b._id} to={b.linkTo || '/express/shop'}
              className="relative shrink-0 w-[85%] sm:w-80 h-28 rounded-2xl overflow-hidden snap-start active:scale-[0.98] transition-transform"
              style={!b.image ? { background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})` } : undefined}>
              {b.image && (
                <>
                  <img src={b.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                </>
              )}
              <div className="relative z-10 h-full flex flex-col justify-end p-3">
                {b.type === 'flash-sale' && (
                  <span className="self-start mb-1 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full">
                    Flash Sale
                  </span>
                )}
                {b.type === 'lowest-price' && (
                  <span className="self-start mb-1 bg-emerald-400 text-emerald-900 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full">
                    Lowest Price
                  </span>
                )}
                <p className="text-white font-black text-sm leading-tight line-clamp-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  {b.title}
                </p>
                {b.subtitle && (
                  <p className="text-white/85 text-[11px] leading-snug line-clamp-1">{b.subtitle}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => selectCategory(cat)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition"
              style={activeCategory === cat
                ? { background: '#4338ca', color: '#fff', borderColor: '#4338ca' }
                : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {storeStatus.isPaused && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <FiPauseCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-bold text-amber-800">We'll be back shortly!</p>
            <p className="text-xs text-amber-700 mt-0.5">{storeStatus.pauseMessage || "We're currently busy with existing orders — we'll be back online shortly!"}</p>
          </div>
        </div>
      )}

      {cart.largeOrderWarning && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-amber-800">
            This is a large order ({cart.totalWeightKg} kg). For orders above {cart.largeOrderThresholdKg} kg, we recommend
            {' '}<Link to="/koyambedu" className="font-bold underline">Koyambedu Daily</Link> for better availability and delivery support.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-3 flex flex-col animate-pulse">
              <div className="w-full aspect-square rounded-lg bg-gray-100 mb-2" />
              <div className="h-3 w-4/5 rounded bg-gray-200 mb-2" />
              <div className="h-2.5 w-2/5 rounded bg-gray-100 mb-2" />
              <div className="h-7 w-full rounded-lg bg-gray-100 mt-auto" />
            </div>
          ))}
        </div>
      ) : catalogue.length === 0 ? (
        <p className="text-sm text-gray-400">No products available at this store right now.</p>
      ) : filteredCatalogue.length === 0 ? (
        <p ref={productGridRef} className="text-sm text-gray-400">No products in "{activeCategory}" right now.</p>
      ) : (
        <div ref={productGridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredCatalogue.map(({ product, pricePerUnit, stockQty }) => {
            const qty = qtyInCart(product._id);
            const isKg = product.unit === 'kg';
            return (
              <div key={product._id} className="bg-white border rounded-xl p-3 flex flex-col transition hover:shadow-md">
                <Link to={`/express/product/${product._id}`} className="block">
                  <div className="w-full aspect-square rounded-lg bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                    {product.image
                      ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      : <FiZap className="text-gray-300" size={24} />}
                  </div>
                  <p className="font-bold text-sm text-gray-800 truncate">{product.name}</p>
                </Link>
                <p className="text-xs text-gray-400 mb-2">₹{pricePerUnit}/{product.unit}</p>

                {isKg && qty === 0 && (
                  <select value={stepFor(product._id)} onChange={e => setWeightStep(w => ({ ...w, [product._id]: Number(e.target.value) }))}
                    className="mb-1.5 border rounded-lg px-2 py-1 text-xs">
                    {WEIGHT_STEPS.map(s => <option key={s.kg} value={s.kg}>{s.label}</option>)}
                  </select>
                )}

                {qty === 0 ? (
                  <button onClick={() => handleAdd(product._id, product.unit)} disabled={stockQty === 0 || storeStatus.isPaused}
                    className="mt-auto w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-40">
                    {storeStatus.isPaused ? 'Store busy' : stockQty === 0 ? 'Out of stock' : 'Add'}
                  </button>
                ) : (
                  <div className="mt-auto flex items-center justify-between bg-indigo-50 rounded-lg px-2 py-1.5">
                    <button onClick={() => handleQtyChange(product._id, product.unit, -1)} disabled={storeStatus.isPaused} className="text-indigo-700 disabled:opacity-40"><FiMinus size={14} /></button>
                    <span className="font-bold text-sm text-indigo-900">{qty}{isKg ? ' kg' : ''}</span>
                    <button onClick={() => handleQtyChange(product._id, product.unit, 1)} disabled={storeStatus.isPaused} className="text-indigo-700 disabled:opacity-40"><FiPlus size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cart.itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{cart.itemCount} item(s) · {cart.totalWeightKg} kg</p>
              <p className="font-bold text-gray-800">₹{cart.subtotal}</p>
            </div>
            <button onClick={() => navigate('/express/checkout')} disabled={storeStatus.isPaused}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-40">
              <FiShoppingCart size={16} /> {storeStatus.isPaused ? 'Store busy' : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
