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
import { useAuth } from '../../context/AuthContext';

// Geocoding (address text -> lat/lng) via Google Maps — same helper
// duplicated in ExpressCheckout.jsx (and the original in
// ExpressLocationPicker.jsx). A saved address frequently has no lat/lng at
// all (the global address book's manual-entry form never collected it),
// so geocoding the text is what actually gets most customers a working ETA
// badge — navigator.geolocation alone is not reliable enough in WKWebView
// to be the only path.
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    api.get('/eptofresh/maps/config')
      .then(({ data }) => {
        if (!data.key) { reject(new Error('No key')); return; }
        const cb = '__gmExpressShop_' + Date.now();
        window[cb] = () => { resolve(); delete window[cb]; };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&callback=${cb}`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      })
      .catch(reject);
  });
}
function geocodeAddressText(addr) {
  return loadGoogleMaps().then(() => new Promise(resolve => {
    const g = new window.google.maps.Geocoder();
    const text = [addr.addressLine1, addr.addressLine2, addr.city, addr.pincode].filter(Boolean).join(', ');
    if (!text) { resolve(null); return; }
    g.geocode({ address: text }, (results, status) => {
      if (status !== 'OK' || !results?.length) { resolve(null); return; }
      const loc = results[0].geometry.location;
      resolve({ lat: loc.lat(), lng: loc.lng() });
    });
  })).catch(() => null);
}

// Weight sub-unit options for kg-priced produce — lets the customer pick a
// smaller pack size than a full kilogram before adding to cart. Built per
// product from its admin-configured minOrderQty (e.g. radish starts at
// 0.25 kg) rather than one fixed 250g/500g/1kg set for every product, so a
// product the admin has set to only sell from, say, 1 kg upward never
// offers a smaller option, while a product with a lower minimum still
// offers that minimum plus a couple of larger steps and a 1 kg option.
const formatWeight = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg % 1 === 0 ? kg : kg.toFixed(2)} kg`);
const weightOptionsFor = (minOrderQty) => {
  const base = Number(minOrderQty) > 0 ? Number(minOrderQty) : 0.25;
  const candidates = [base, base * 2, base * 4, 1].filter(v => v >= base);
  const rounded = candidates.map(v => Math.round(v * 1000) / 1000);
  const unique = Array.from(new Set(rounded)).sort((a, b) => a - b);
  return unique.map(kg => ({ kg, label: formatWeight(kg) }));
};

export default function ExpressShop() {
  const navigate = useNavigate();
  const { selectedStore, setSelectedStore, cart, fetchCart, addToCart, updateItem } = useExpressCart();
  const { user } = useAuth();
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  // isPaused/pauseMessage come fresh from the online-catalogue response (not
  // the possibly-stale selectedStore in context) so a store put on hold
  // after the customer picked it is still reflected without a refetch of
  // the store list.
  const [storeStatus, setStoreStatus] = useState({ isPaused: false, pauseMessage: null });
  // Visit beacon so Admin → Visitors lists Express shop views with the user.
  useEffect(() => { api.post('/express/visit', { page: '/shop' }).catch(() => {}); }, []);
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
  // Hero banner carousel — auto-advances every 4.5s, pauses while the
  // customer is actively swiping/touching it, resumes after they let go.
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef(null);
  const bannerCardRefs = useRef([]);
  const bannerTimerRef = useRef(null);

  useEffect(() => {
    if (!selectedStore?._id) {
      navigate('/express/location');
      return;
    }
    let cancelled = false;
    const loadCatalogue = (showSpinner) => {
      if (showSpinner) setLoading(true);
      api.get(`/express/stores/${selectedStore._id}/online-catalogue`)
        .then(({ data }) => {
          if (cancelled) return;
          setCatalogue(data.catalogue || []);
          setStoreStatus({ isPaused: !!data.store?.isPaused, pauseMessage: data.store?.pauseMessage || null });
        })
        .catch(() => { if (!cancelled && showSpinner) toast.error('Failed to load products'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    loadCatalogue(true);
    fetchCart();
    api.get('/express/banners').then(({ data }) => setBanners(data.banners || [])).catch(() => {});

    // A customer already browsing when admin pauses/un-pauses the store
    // (or flips the master switch) previously never saw that change — the
    // catalogue/pause status was fetched exactly once, on mount, so the
    // "we'll be back soon" banner only appeared after a reload. Poll
    // quietly in the background (no spinner, no error toast — a single
    // missed poll isn't worth bothering the customer about) so it shows up
    // within a shop visit instead of requiring one.
    const poll = setInterval(() => loadCatalogue(false), 30000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [selectedStore]);

  // The "Delivery in ~X min" badge was computed once, at the moment the
  // customer picked their store (or picked from the list with no location
  // known at all, in which case it was never computed and the badge just
  // never showed) — then cached in localStorage indefinitely. Returning
  // customers could be shown a stale estimate, or none at all. Here we
  // silently refresh it from the browser's location.
  //
  // This used to be gated behind navigator.permissions.query({name:
  // 'geolocation'}) so it would never surface a permission prompt — but
  // Safari/WebKit (which is what the installed app's webview runs on)
  // doesn't support the Permissions API for geolocation at all, so that
  // check was silently bailing out on every single load there, even though
  // it worked fine in Chrome. getCurrentPosition itself doesn't need the
  // Permissions API — it just won't prompt again once the customer has
  // already granted (or denied) location access, which they did already
  // when picking a store, so dropping the gate is safe.
  useEffect(() => {
    if (!selectedStore?._id) return;
    let cancelled = false;

    const fetchEta = (lat, lng) => {
      if (cancelled) return;
      api.get(`/express/stores/${selectedStore._id}/eta`, { params: { lat, lng } })
        .then(({ data }) => {
          if (cancelled) return;
          setSelectedStore({ ...selectedStore, distanceKm: data.distanceKm, estimatedDeliveryMinutes: data.estimatedDeliveryMinutes });
        })
        .catch(() => {});
    };

    // Fall back to the customer's saved default address coordinates if
    // geolocation doesn't come through — some WKWebView builds (the
    // installed app) never fire getCurrentPosition's success OR error
    // callback at all when the OS permission prompt was never triggered by
    // a direct user tap (store selection via the saved-address or map-pin
    // flow never touches navigator.geolocation), so relying on that
    // callback alone can leave the ETA badge blank forever in the app even
    // though it works fine in Chrome.
    const fallbackToSavedAddress = () => {
      if (cancelled) return;
      const addrs = user?.addresses || [];
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (!def) return;
      if (def.lat != null && def.lng != null) { fetchEta(def.lat, def.lng); return; }
      // Most saved addresses have no lat/lng at all (the address-book's
      // manual-entry form never collected it) — geocode the address text
      // itself rather than giving up. This needs no device permission at
      // all, so it's the most reliable path in the installed app.
      geocodeAddressText(def).then(coords => { if (!cancelled && coords) fetchEta(coords.lat, coords.lng); });
    };

    if (!navigator.geolocation) {
      fallbackToSavedAddress();
      return () => { cancelled = true; };
    }

    // Our own timer, independent of the `timeout` option below — some
    // WKWebView builds don't honor that option and simply never call either
    // callback, which would otherwise leave this effect (and the badge)
    // hanging indefinitely.
    const watchdog = setTimeout(fallbackToSavedAddress, 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(watchdog);
        if (cancelled) return;
        fetchEta(pos.coords.latitude, pos.coords.longitude);
      },
      () => { clearTimeout(watchdog); fallbackToSavedAddress(); }, // denied/unavailable
      { maximumAge: 5 * 60 * 1000, timeout: 5000 },
    );
    return () => { cancelled = true; clearTimeout(watchdog); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore?._id, user]);

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

  // Auto-advance the hero banner carousel. Restarted (not just left running)
  // whenever the customer touches/swipes it, so manual browsing never fights
  // the auto-advance mid-gesture.
  const restartBannerAutoplay = () => {
    clearInterval(bannerTimerRef.current);
    if (banners.length < 2) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(i => (i + 1) % banners.length);
    }, 4500);
  };
  useEffect(() => {
    restartBannerAutoplay();
    return () => clearInterval(bannerTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);
  useEffect(() => {
    bannerCardRefs.current[bannerIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, [bannerIndex]);

  const qtyInCart = (productId) => cart.items?.find(i => String(i.product) === String(productId))?.quantity || 0;
  const stepFor = (productId, minOrderQty = 0.25) => weightStep[productId] ?? minOrderQty;

  const handleAdd = (productId, unit, minOrderQty) => addToCart(productId, unit === 'kg' ? stepFor(productId, minOrderQty) : 1);
  // Effective ceiling is whichever is tighter: physical stock, or the
  // merchant-set per-order cap (maxOrderQty, null = no cap).
  const effectiveMax = (stockQty, maxOrderQty) => maxOrderQty != null ? Math.min(stockQty, maxOrderQty) : stockQty;
  // Capped at effectiveMax right here in the UI — previously +/- had no
  // ceiling at all, so a customer could keep tapping past what was actually
  // in stock and only find out at checkout, where the mismatch read as a
  // confusing error instead of the stepper simply refusing to go further.
  // The server still validates independently (see expressCustomerController
  // .updateCartItem) as the source of truth, but this stops the problem
  // from ever being created in the first place.
  const handleQtyChange = (productId, unit, direction, minOrderQty, stockQty, maxOrderQty) => {
    const step = unit === 'kg' ? stepFor(productId, minOrderQty) : 1;
    const current = qtyInCart(productId);
    if (current === 0 && direction > 0) return handleAdd(productId, unit, minOrderQty);
    const max = effectiveMax(stockQty, maxOrderQty);
    const uncapped = Math.max(0, Math.round((current + direction * step) * 100) / 100);
    const next = Math.min(uncapped, max);
    if (direction > 0 && next <= current) {
      toast(
        maxOrderQty != null && maxOrderQty < stockQty
          ? `Max ${maxOrderQty} ${unit === 'kg' ? 'kg' : ''} of this item per order`.trim()
          : `Only ${stockQty} ${unit === 'kg' ? 'kg' : ''} of this item in stock`.trim(),
        { icon: '📦' }
      );
      return;
    }
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
        <>
          <div ref={bannerScrollRef} onTouchStart={restartBannerAutoplay} onMouseDown={restartBannerAutoplay}
            className="flex gap-3 overflow-x-auto pb-1 mb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {banners.map((b, i) => (
              <Link key={b._id} to={b.linkTo || '/express/shop'}
                ref={el => (bannerCardRefs.current[i] = el)}
                className="exp-banner-card relative shrink-0 w-[85%] sm:w-80 h-28 rounded-2xl overflow-hidden snap-start active:scale-[0.98] transition-transform"
                style={{ ...(!b.image ? { background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})` } : {}), animationDelay: `${i * 90}ms` }}>
                {b.image && (
                  <>
                    <img src={b.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </>
                )}
                <div className="exp-banner-shine" />
                <div className="relative z-10 h-full flex flex-col justify-end p-3">
                  {b.type === 'flash-sale' && (
                    <span className="exp-banner-pill self-start mb-1 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full">
                      Flash Sale
                    </span>
                  )}
                  {b.type === 'lowest-price' && (
                    <span className="exp-banner-pill self-start mb-1 bg-emerald-400 text-emerald-900 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full">
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
          {banners.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {banners.map((b, i) => (
                <span key={b._id} className={`exp-banner-dot ${i === bannerIndex ? 'active' : ''}`} />
              ))}
            </div>
          )}
        </>
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
            <p className="text-sm font-bold text-amber-800">Orders are on hold for now</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {storeStatus.pauseMessage || "We're experiencing high demand right now."} Feel free to keep browsing and add items to your cart — you can check out the moment we're back.
            </p>
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
          {filteredCatalogue.map(({ product, pricePerUnit, mrp, discountPercent, stockQty }) => {
            const qty = qtyInCart(product._id);
            const isKg = product.unit === 'kg';
            const minOrderQty = product.minOrderQty || 0.25;
            const maxOrderQty = product.maxOrderQty;
            const addCeiling = effectiveMax(stockQty, maxOrderQty);
            const weightOptions = isKg ? weightOptionsFor(minOrderQty) : [];
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
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1 flex-wrap">
                  <span>₹{pricePerUnit}/{product.unit}</span>
                  {mrp > pricePerUnit && (
                    <>
                      <span className="line-through text-gray-300">₹{mrp}</span>
                      <span className="text-[10px] font-bold text-emerald-600">{discountPercent}% off</span>
                    </>
                  )}
                </p>

                {/* Pack-size selector stays visible and editable even once the
                    item is in the cart (it used to disappear after the first
                    Add, leaving the customer stuck incrementing by whatever
                    size they happened to pick first, with no way to tell what
                    each +/- tap was adding) — so the customer can switch from
                    adding 250 g at a time to 1 kg at a time without having to
                    remove the item and start over. */}
                {isKg && (
                  <select value={stepFor(product._id, minOrderQty)} onChange={e => setWeightStep(w => ({ ...w, [product._id]: Number(e.target.value) }))}
                    className="mb-1 border rounded-lg px-2 py-1 text-xs">
                    {weightOptions.map(s => <option key={s.kg} value={s.kg}>{s.label}</option>)}
                  </select>
                )}
                {isKg && (
                  <p className="text-[10px] text-gray-400 mb-1.5">
                    {qty === 0
                      ? `Min order: ${formatWeight(minOrderQty)}`
                      : `+/- adjusts by ${formatWeight(stepFor(product._id, minOrderQty))}`}
                  </p>
                )}

                {/* Browsing and building a cart stay fully usable even while
                    the store is on hold — only checkout (below) is gated,
                    so nobody loses the items they picked out while waiting. */}
                {qty === 0 ? (
                  <button onClick={() => handleAdd(product._id, product.unit, minOrderQty)} disabled={stockQty === 0}
                    className="mt-auto w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-40">
                    {stockQty === 0 ? 'Out of stock' : 'Add'}
                  </button>
                ) : (
                  <div className="mt-auto flex items-center justify-between bg-indigo-50 rounded-lg px-1 py-1">
                    <button onClick={() => handleQtyChange(product._id, product.unit, -1, minOrderQty, stockQty, maxOrderQty)}
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-white text-indigo-700 shadow-sm active:scale-90 transition"><FiMinus size={14} /></button>
                    <span className="font-bold text-sm text-indigo-900">{qty}{isKg ? ' kg' : ''}</span>
                    <button onClick={() => handleQtyChange(product._id, product.unit, 1, minOrderQty, stockQty, maxOrderQty)}
                      disabled={qty >= addCeiling}
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-white text-indigo-700 shadow-sm active:scale-90 transition disabled:opacity-30 disabled:active:scale-100"><FiPlus size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cart.itemCount > 0 && (
        <div className="above-bottom-nav fixed left-0 right-0 z-[9970] bg-white border-t p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{cart.itemCount} item(s) · {cart.totalWeightKg} kg</p>
              <p className="font-bold text-gray-800">₹{cart.subtotal}</p>
            </div>
            {/* Not disabled even while paused — the checkout page itself
                shows the high-demand message once the customer gets as far
                as requesting a quote (that's also the moment their interest
                gets logged for Admin's call-back list, now with the name
                and phone they've actually entered for delivery). */}
            <button onClick={() => navigate('/express/checkout')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
              <FiShoppingCart size={16} /> Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
