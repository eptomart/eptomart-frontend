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
// scrolled through and their scroll position. Because groupedProducts groups
// items by the most frequent shared word ACROSS THE CURRENT DATASET, running
// that grouping over a smaller page-1-only dataset than before produced a
// different sort order every time, which looked like the grid was randomly
// reshuffling. Caching the fetched state (and scroll position) per filter
// key and restoring it on remount fixes both symptoms without touching the
// grouping algorithm itself.
const shopStateCache = new Map(); // key -> { products, total, page, scrollY, savedAt }
const SHOP_CACHE_TTL_MS = 5 * 60 * 1000; // stale after 5 min — refetch fresh instead

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

  // Infinite scroll — use callback ref so observer attaches when sentinel mounts
  const sentinelRef  = useRef(null);
  const observerRef  = useRef(null);
  const loadingRef   = useRef(false); // shadow ref so observer doesn't capture stale state
  // Guards against race conditions: a stale in-flight request (e.g. from a
  // scroll-triggered page load) resolving after the user changed search/
  // category/sort should never overwrite the newer results, and should
  // never be treated as a "duplicate" of the current request.
  const requestIdRef = useRef(0);
  // Frozen grouping state for groupedProducts — see comment there. Reset
  // whenever the active filter combination changes (new search/category/sort
  // means a genuinely new product set, so grouping should recompute fresh).
  const freqRef = useRef(null);
  const groupKeyCacheRef = useRef(new Map());

  const search       = searchParams.get('search')   || '';
  const categoryId   = searchParams.get('category') || '';
  const sortBy       = searchParams.get('sort')      || 'default';

  const loadProducts = useCallback(async (pg = 1) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20, sort: sortBy });
      if (search)     params.set('search',   search);
      if (categoryId) params.set('category', categoryId);
      const { data } = await api.get(`/koyambedu/products?${params}`);
      if (reqId !== requestIdRef.current) return; // superseded by a newer request — ignore stale response
      setProducts(pg === 1 ? data.products : prev => {
        const seen = new Set(prev.map(p => p._id));
        return [...prev, ...data.products.filter(p => !seen.has(p._id))];
      });
      setTotal(data.total);
      setPage(pg);
    } catch {
      if (reqId === requestIdRef.current) toast.error('Failed to load products');
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [search, categoryId, sortBy]);

  useEffect(() => {
    fetchCart();
    api.get('/koyambedu/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const cacheKey = `${search}|${categoryId}|${sortBy}`;

  // Restore cached results for this exact filter combination instead of
  // always re-fetching page 1 — see shopStateCache comment above.
  useEffect(() => {
    // New filter combination → the grouping computed for the old product
    // set no longer applies; let groupedProducts rebuild it from scratch.
    freqRef.current = null;
    groupKeyCacheRef.current = new Map();

    const cached = shopStateCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < SHOP_CACHE_TTL_MS) {
      setProducts(cached.products);
      setTotal(cached.total);
      setPage(cached.page);
      // Wait for the restored grid to paint before jumping to the saved scroll position
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, cached.scrollY || 0)));
    } else {
      loadProducts(1);
    }
  }, [search, categoryId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the cache in sync as more pages load via infinite scroll, so
  // scrolling down and then navigating away/back restores the full list.
  useEffect(() => {
    if (!products.length) return;
    const prevScrollY = shopStateCache.get(cacheKey)?.scrollY || 0;
    shopStateCache.set(cacheKey, { products, total, page, scrollY: prevScrollY, savedAt: Date.now() });
  }, [products, total, page, cacheKey]);

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

  // Words to ignore when finding the category keyword (colours, sizes, common adjectives)
  const IGNORE_WORDS = useMemo(() => new Set([
    'red','green','yellow','white','black','blue','purple','pink','brown','golden','dark','light',
    'big','small','large','medium','mini','baby','giant',
    'fresh','organic','raw','dry','dried','ripe','sweet','sour','tender',
    'local','country','hybrid','imported','village',
    'new','old','the','and','or','of','in','on','at',
  ]), []);

  // Group same-type produce together regardless of where the type word appears in the name.
  // Strategy: count how often each word appears across all product names.
  // The word with the highest frequency in a product's name is its "category key"
  // (e.g. "apple" from "Pink Lady Apple", "Fuji Apple", "Gala Apple" all share "apple").
  // Sort by that key → all apples together, all grapes together, etc.
  //
  // Why items used to reshuffle while browsing: this used to rebuild the
  // word-frequency map from `products` on every render of this memo, and
  // `products` grows on every infinite-scroll page load. Adding a new page
  // changes word frequencies (e.g. page 2 adds ten more "tomato" products),
  // which changes the *group key* — and therefore the sort position — of
  // products that were already on screen. The grid visibly reordered itself
  // every time the user scrolled far enough to trigger the next page.
  //
  // Fix: freeze the frequency map after it's built from the first batch, and
  // cache each product's resolved group key by _id the first time it's seen.
  // Later batches are grouped using that same frozen table, so a product's
  // position, once assigned, never changes again for this filter/search/sort
  // combination. The refs are reset whenever the active filters change (see
  // effect below) since a new product set should get a fresh grouping.
  const groupedProducts = useMemo(() => {
    if (!products.length) return products;

    if (freqRef.current === null) {
      const freq = {};
      for (const p of products) {
        const words = p.name.toLowerCase()
          .split(/[\s\-/]+/)
          .filter(w => w.length > 2 && !IGNORE_WORDS.has(w));
        for (const w of new Set(words)) freq[w] = (freq[w] || 0) + 1;
      }
      freqRef.current = freq;
    }
    const freq = freqRef.current;

    // Pick the most-shared word in a name as the group key
    const groupKey = (name) => {
      const words = name.toLowerCase()
        .split(/[\s\-/]+/)
        .filter(w => w.length > 2 && !IGNORE_WORDS.has(w));
      if (!words.length) return name.toLowerCase();
      return words.reduce((best, w) =>
        (freq[w] || 0) > (freq[best] || 0) ? w : best, words[0]);
    };

    for (const p of products) {
      if (!groupKeyCacheRef.current.has(p._id)) {
        groupKeyCacheRef.current.set(p._id, groupKey(p.name));
      }
    }

    return [...products].sort((a, b) => {
      const ka = groupKeyCacheRef.current.get(a._id);
      const kb = groupKeyCacheRef.current.get(b._id);
      if (ka !== kb) return ka.localeCompare(kb);
      return a.name.localeCompare(b.name);
    });
  }, [products, IGNORE_WORDS]);

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

          {/* ── Product grid ──
               Products sorted so same-type produce groups together
               (all Apples adjacent, all Grapes adjacent, etc.) */}
          <div className="px-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {groupedProducts.map(p => <ProductCard key={p._id} product={p} />)}
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
