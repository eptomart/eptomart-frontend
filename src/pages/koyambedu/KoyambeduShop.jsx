import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import EptoSEO from '../../components/common/EptoSEO';
import {
  FiArrowLeft, FiShoppingBag, FiMapPin,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
import { imgCard } from '../../utils/cloudinary';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import BottomNav from '../../components/common/BottomNav';
import toast from 'react-hot-toast';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// No external placeholder — avoids giant "Fresh" text rendering in card
const IMG_PLACEHOLDER = null;

// ── Back-navigation state cache ─────────────────────────────────
// Module-scope (survives remounts, cleared on full page reload). Keyed by the
// active filter combination (search/category/sort). Previously, navigating
// into a product's detail page and back re-mounted this component, which
// always re-fetched only page 1 — discarding any extra pages the user had
// scrolled through and their scroll position. Because the "same-type
// produce together" grouping (see processBatch below) depends on the whole
// dataset seen so far, running it over a smaller page-1-only dataset than
// before produced a
// different sort order every time, which looked like the grid was randomly
// reshuffling. Caching the fetched state (and scroll position) per filter
// key and restoring it on remount fixes both symptoms without touching the
// grouping algorithm itself.
const shopStateCache = new Map(); // key -> { products, total, page, scrollY, savedAt }
// No TTL: the cache is only ever invalidated by an actual filter change (see
// the effect below) or a full page reload (which clears this module-scope
// Map naturally). A 5-minute expiry used to live here, so returning from a
// product's detail page after spending "too long" reading it would silently
// discard the cache, re-fetch only page 1, and re-run the grouping over a
// smaller/different product set — which reshuffled the grid into a
// different order than the one the customer had just been browsing. Since
// browsing a product page for a few minutes is completely normal, this
// caused the exact "comes back to a different row" complaint. The cache is
// cheap (just the already-fetched product list) and always reflects exactly
// what the customer was looking at, so there's no good reason to expire it.

/**
 * Lowest per-unit final price across all variants.
 * Used for "From ₹X/unit" display.
 * variants[].finalPrice is already price-per-unit (per kg, per piece, etc.).
 */
const getLowestUnitPrice = (variants) => {
  if (!variants?.length) return null;
  let min = Infinity;
  for (const v of variants) {
    const p = Number(v.finalPrice) || 0;
    if (p > 0 && p < min) min = p;
  }
  return min === Infinity ? null : min;
};

const ProductCard = ({ product }) => {
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || null;
  const hasGrades   = !!(product.gradesEnabled && product.grades?.length > 0);
  const hasVariants = !hasGrades && product.variants?.length > 0;

  // Lowest per-unit price: grades → min across all active grade variants; else min variant
  const lowestUnitPrice = hasGrades
    ? (() => {
        const prices = (product.grades || [])
          .filter(g => g.isActive)
          .flatMap(g => (g.variants || []).map(v => Number(v.finalPrice) || 0))
          .filter(p => p > 0);
        return prices.length ? Math.min(...prices) : null;
      })()
    : (hasVariants ? getLowestUnitPrice(product.variants) : null);

  const displayPrice = lowestUnitPrice ?? product.currentPrice;

  return (
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
      <Link to={`/koyambedu/product/${product._id}`}>
        <div className="relative">
          {img
            ? <img src={imgCard(img)} alt={product.name} className="w-full h-[72px] object-cover" />
            : <div className="w-full h-[72px] bg-green-50 flex items-center justify-center">
                <FaLeaf size={20} className="text-green-200" />
              </div>}
          {product.badges?.includes('fresh_arrival') && (
            <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Fresh</span>
          )}
          {hasGrades && (
            <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-wide">GRADES</span>
          )}
          {hasVariants && !hasGrades && (
            <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-wide">BULK RATES</span>
          )}
        </div>
      </Link>
      <div className="p-2">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="text-xs font-semibold text-gray-800 line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-[10px] text-gray-400 leading-tight">{product.nameTamil}</p>}
        </Link>
        <div className="mt-1.5">
          {lowestUnitPrice ? (
            <div>
              <span className="text-[9px] text-gray-400 font-medium">From </span>
              <span className="text-green-700 font-bold text-xs">₹{lowestUnitPrice}</span>
              <span className="text-gray-400 text-[10px]">/{product.unit}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span className="text-green-700 font-bold text-xs">₹{displayPrice}</span>
              <span className="text-gray-400 text-[10px]">/{product.unit}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function KoyambeduShop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchCart, itemCount, subtotal, userLocation, locationLabel } = useKoyambeduCart();

  // Distance from user's saved location to Koyambedu market
  const distToMarket = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;
  const navigate = useNavigate();

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  // Near-matches from the main Eptomart marketplace for the current search —
  // shown as a small strip so searching "wherever" in the app covers the
  // whole Eptomart ecosystem, not just Koyambedu Daily. Never touches the
  // Koyambedu grid's own pagination/sort order (see processBatch below).
  const [alsoOnEptomart, setAlsoOnEptomart] = useState([]);

  // Infinite scroll — use callback ref so observer attaches when sentinel mounts
  const sentinelRef  = useRef(null);
  const observerRef  = useRef(null);
  const loadingRef   = useRef(false); // shadow ref so observer doesn't capture stale state
  // Guards against race conditions: a stale in-flight request (e.g. from a
  // scroll-triggered page load) resolving after the user changed search/
  // category/sort should never overwrite the newer results, and should
  // never be treated as a "duplicate" of the current request.
  const requestIdRef = useRef(0);
  // Grouping state for "same-type produce together" — see processBatch()
  // below. freq is cumulative across every page loaded for the current
  // filter combination; groupKeyCache permanently remembers each product's
  // assigned group key by _id once set, and seenIds dedupes across pages.
  // Reset whenever the active filter combination changes (a genuinely new
  // product set) or the cache is restored (see effect below).
  const freqRef = useRef({});
  const groupKeyCacheRef = useRef(new Map());
  const seenIdsRef = useRef(new Set());

  const search       = searchParams.get('search')   || '';
  const categoryId   = searchParams.get('category') || '';
  const sortBy       = searchParams.get('sort')      || 'default';

  // Words to ignore when finding the category keyword (colours, sizes, common adjectives)
  const IGNORE_WORDS = useMemo(() => new Set([
    'red','green','yellow','white','black','blue','purple','pink','brown','golden','dark','light',
    'big','small','large','medium','mini','baby','giant',
    'fresh','organic','raw','dry','dried','ripe','sweet','sour','tender',
    'local','country','hybrid','imported','village',
    'new','old','the','and','or','of','in','on','at',
  ]), []);

  const nameWords = (name) => name.toLowerCase()
    .split(/[\s\-/]+/)
    .filter(w => w.length > 2 && !IGNORE_WORDS.has(w));

  // Group same-type produce together regardless of where the type word
  // appears in the name (e.g. "apple" from "Pink Lady Apple", "Fuji Apple").
  //
  // Why items used to jump during infinite scroll: this used to re-sort the
  // FULL accumulated product list every time a new page loaded. A new page's
  // items get inserted wherever their group key alphabetically belongs —
  // almost always somewhere in the MIDDLE of the list, not the end — which
  // pushed already-visible items into different rows every time the user
  // scrolled far enough to trigger the next page load.
  //
  // Fix: never re-sort products that are already on screen. Each new batch
  // is sorted ONLY among itself (using the cumulative word-frequency table
  // so far) and appended after everything already shown — existing items'
  // positions are permanently fixed the moment they're first rendered.
  const processBatch = (items) => {
    if (!items.length) return items;
    for (const p of items) {
      for (const w of new Set(nameWords(p.name))) {
        freqRef.current[w] = (freqRef.current[w] || 0) + 1;
      }
    }
    const groupKey = (name) => {
      const words = nameWords(name);
      if (!words.length) return name.toLowerCase();
      return words.reduce((best, w) =>
        (freqRef.current[w] || 0) > (freqRef.current[best] || 0) ? w : best, words[0]);
    };
    for (const p of items) {
      if (!groupKeyCacheRef.current.has(p._id)) {
        groupKeyCacheRef.current.set(p._id, groupKey(p.name));
      }
    }
    return [...items].sort((a, b) => {
      const ka = groupKeyCacheRef.current.get(a._id);
      const kb = groupKeyCacheRef.current.get(b._id);
      if (ka !== kb) return ka.localeCompare(kb);
      return a.name.localeCompare(b.name);
    });
  };

  const loadProducts = useCallback(async (pg = 1) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20, sort: sortBy });
      if (search)     params.set('search',   search);
      if (categoryId) params.set('category', categoryId);
      const { data } = await api.get(`/koyambedu/products?${params}`);
      if (reqId !== requestIdRef.current) return; // superseded by a newer request — ignore stale response

      if (pg === 1) {
        seenIdsRef.current = new Set();
        freqRef.current = {};
        groupKeyCacheRef.current = new Map();
      }
      const freshItems = data.products.filter(p => !seenIdsRef.current.has(p._id));
      freshItems.forEach(p => seenIdsRef.current.add(p._id));
      const sortedBatch = processBatch(freshItems); // mutates freq/groupKey refs, returns items sorted among themselves only

      setProducts(prev => pg === 1 ? sortedBatch : [...prev, ...sortedBatch]);
      setTotal(data.total);
      setPage(pg);
      if (pg === 1) setAlsoOnEptomart(data.alsoOnEptomart || []);
    } catch {
      if (reqId === requestIdRef.current) toast.error('Failed to load products');
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [search, categoryId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCart();
    api.get('/koyambedu/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const cacheKey = `${search}|${categoryId}|${sortBy}`;

  // Restore cached results for this exact filter combination instead of
  // always re-fetching page 1 — see shopStateCache comment above.
  useEffect(() => {
    // New filter combination → the grouping computed for the old product
    // set no longer applies; let processBatch rebuild it from scratch.
    freqRef.current = {};
    groupKeyCacheRef.current = new Map();

    const cached = shopStateCache.get(cacheKey);
    if (cached) {
      // Cached products are already in their final, fixed display order —
      // restore as-is (no re-sort) so nothing jumps. seenIds is repopulated
      // so any further infinite-scroll pages correctly dedupe against them;
      // freq/groupKeyCache start fresh and only affect NEW items loaded
      // from here on, never the already-placed ones.
      seenIdsRef.current = new Set(cached.products.map(p => p._id));
      setProducts(cached.products);
      setTotal(cached.total);
      setPage(cached.page);
      setAlsoOnEptomart(cached.alsoOnEptomart || []);
      // Wait for the restored grid to paint before jumping to the saved scroll position
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, cached.scrollY || 0)));
    } else {
      seenIdsRef.current = new Set();
      setAlsoOnEptomart([]);
      loadProducts(1);
    }
  }, [search, categoryId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the cache in sync as more pages load via infinite scroll, so
  // scrolling down and then navigating away/back restores the full list.
  useEffect(() => {
    if (!products.length) return;
    const prevScrollY = shopStateCache.get(cacheKey)?.scrollY || 0;
    shopStateCache.set(cacheKey, { products, total, page, alsoOnEptomart, scrollY: prevScrollY, savedAt: Date.now() });
  }, [products, total, page, alsoOnEptomart, cacheKey]);

  // Track live scroll position and persist it into the cache when the user
  // navigates away (e.g. taps a product), so returning restores both the
  // list AND where they were looking at it.
  const scrollYRef = useRef(0);
  useEffect(() => {
    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    return () => {
      const existing = shopStateCache.get(cacheKey);
      if (existing) shopStateCache.set(cacheKey, { ...existing, scrollY: scrollYRef.current });
    };
  }, [cacheKey]);

  // Keep shadow ref in sync so the IntersectionObserver closure is never stale
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Callback ref: attaches observer whenever the sentinel element mounts/unmounts.
  // This is crucial — useEffect with sentinelRef would miss the moment the sentinel
  // first appears (after products load), because deps don't change at that point.
  const sentinelCallbackRef = useCallback((node) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (!node) return;
    sentinelRef.current = node;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          const nextPage = Number(node.dataset.page);
          loadProducts(nextPage);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, [loadProducts]); // re-create when loadProducts changes (i.e. search/category/sort change)

  // ── Fix: infinite scroll stalling until the user scrolls up and back down ──
  // An IntersectionObserver only invokes its callback when intersection STATUS
  // CHANGES (entering/leaving the viewport threshold). On wide screens/grids
  // — or whenever a loaded batch doesn't push the sentinel far enough down —
  // the sentinel can remain continuously intersecting across a page load. In
  // that case no new callback ever fires, so loading silently stalls, even
  // though the sentinel is still sitting at the bottom of the visible list.
  // The only way it "unsticks" previously was the user scrolling away and
  // back, which produces a fresh enter event. Re-observing the same node
  // after every successful load forces the browser to recompute intersection
  // immediately, so loading continues automatically without any manual
  // scroll action — while `loadingRef`/`requestIdRef` above still prevent any
  // duplicate or overlapping requests.
  useEffect(() => {
    if (observerRef.current && sentinelRef.current) {
      observerRef.current.unobserve(sentinelRef.current);
      observerRef.current.observe(sentinelRef.current);
    }
  }, [products]);

  const setParam = (key, val) => {
    const np = new URLSearchParams(searchParams);
    if (val) np.set(key, val); else np.delete(key);
    setSearchParams(np);
  };

  const activeCategory = categories.find(c => c._id === categoryId);

  return (
    <div className="min-h-screen bg-[#f5f5f7]" style={{ paddingBottom: itemCount > 0 ? 160 : 100 }}>
      <EptoSEO
        app="koyambedu"
        page="shop"
        title={activeCategory ? `${activeCategory.name} — Koyambedu Daily | Eptomart` : undefined}
        breadcrumb={[
          { name: 'Home', url: 'https://www.eptomart.com/' },
          { name: 'Koyambedu Daily', url: 'https://www.eptomart.com/koyambedu' },
          ...(activeCategory ? [{ name: activeCategory.name, url: `https://www.eptomart.com/koyambedu/shop?category=${activeCategory._id}` }] : []),
        ]}
      />

      {/* ── Compact sticky green header (no Navbar) ── */}
      <div className="sticky top-0 z-30 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg,#14532d,#16a34a)',
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <img
          src="/categories/koyambedu.jpg"
          alt="" aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[45%] object-cover pointer-events-none select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            opacity: 0.28,
          }}
        />
        {/* Title row */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <button onClick={() => navigate('/koyambedu')}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-white text-base leading-tight">
              {activeCategory ? `${activeCategory.name}` : 'Shop Fresh Market'}
            </h1>
            {distToMarket != null && (
              <p className="text-white/75 text-[11px] mt-0.5 flex items-center gap-1">
                <FiMapPin size={9} />
                {locationLabel ? `${locationLabel} · ` : ''}{distToMarket} km from market
              </p>
            )}
          </div>
          <Link to="/koyambedu/cart" className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: itemCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}>
            <FiShoppingBag size={17} className="text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
            )}
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 relative">
          <input
            value={search}
            onChange={e => setParam('search', e.target.value)}
            placeholder="Search vegetables, fruits, flowers..."
            className="w-full rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
            style={{ fontSize: 16 }}
          />
          {search && (
            <button onClick={() => setParam('search', '')}
              className="absolute right-7 top-2.5 text-gray-400 font-bold">✕</button>
          )}
        </div>

        {/* Sort strip */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <select value={sortBy} onChange={e => setParam('sort', e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 bg-white/20 text-white border border-white/30 focus:outline-none">
            <option value="default" className="text-gray-800">Default</option>
            <option value="price_asc" className="text-gray-800">Price ↑</option>
            <option value="price_desc" className="text-gray-800">Price ↓</option>
            <option value="fresh" className="text-gray-800">Freshest</option>
            <option value="popular" className="text-gray-800">Popular</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">

          {/* ── Category pills ── */}
          {categories.length > 0 && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              <button onClick={() => setParam('category', '')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                  !categoryId ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>All</button>
              {categories.map(cat => (
                <button key={cat._id} onClick={() => setParam('category', cat._id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                    categoryId === cat._id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Results count ── */}
          <p className="px-4 text-xs text-gray-500 mb-3">
            {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
          </p>

          {/* ── Also on Eptomart — ecosystem-wide search results ──
               Searching here also checks the main Eptomart marketplace, since
               a customer typing "vegetables" or a brand name shouldn't have
               to know which vertical stocks it. Kept as a separate row so it
               never disturbs Koyambedu's own grid/pagination/sort order. */}
          {!loading && search && alsoOnEptomart.length > 0 && (
            <div className="px-4 mb-4">
              <p className="text-[11px] font-bold text-orange-600 mb-2">🛒 Also on Eptomart</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {alsoOnEptomart.map(p => (
                  <button key={p._id} onClick={() => navigate(p.link)}
                    className="flex-shrink-0 w-28 bg-white rounded-xl border border-orange-100 overflow-hidden text-left">
                    <div className="w-full h-20 bg-gray-100">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[11px] font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                      {p.price ? <p className="text-[11px] font-bold text-orange-500">₹{p.price}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Product grid ──
               Products sorted so same-type produce groups together
               (all Apples adjacent, all Grapes adjacent, etc.) */}
          <div className="px-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map(p => <ProductCard key={p._id} product={p} />)}
          </div>

          {!loading && products.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.12)' }}>
                <FaLeaf size={32} className="text-green-300" />
              </div>
              <p className="text-gray-800 font-bold text-base">No products found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── Infinite scroll sentinel ── */}
          {products.length < total && (
            <div
              ref={sentinelCallbackRef}
              data-page={page + 1}
              className="h-10"
            />
          )}

      </div>

      <BottomNav />

      {itemCount > 0 && (
        <div className="fixed left-4 right-4 max-w-lg mx-auto z-[9985]" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}>
          <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between rounded-2xl shadow-xl">
            <div>
              <p className="text-xs opacity-80">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
              <p className="font-bold text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
            </div>
            <Link to="/koyambedu/cart" className="bg-white text-green-700 font-bold text-sm px-5 py-2 rounded-xl">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
