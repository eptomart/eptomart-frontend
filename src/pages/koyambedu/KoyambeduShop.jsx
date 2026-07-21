import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import EptoSEO from '../../components/common/EptoSEO';
import {
  FiArrowLeft, FiShoppingBag, FiMapPin,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
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

// Grade badge colours
const GRADE_COLORS = {
  premium: { badge: 'bg-purple-600', bg: 'bg-purple-50' },
  mixed:   { badge: 'bg-blue-500',   bg: 'bg-blue-50'   },
  economy: { badge: 'bg-green-600',  bg: 'bg-green-50'  },
};

/**
 * GradeCard — renders one grade of a graded product as its own card.
 * Used when gradesEnabled=true so each grade appears separately in the grid.
 */
const GradeCard = ({ product, grade }) => {
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || null;
  const colors = GRADE_COLORS[grade.gradeKey] || GRADE_COLORS.economy;
  const gradePrice = (() => {
    if (!grade.variants?.length) return null;
    const prices = grade.variants.map(v => Number(v.finalPrice) || 0).filter(p => p > 0);
    return prices.length ? Math.min(...prices) : null;
  })();

  return (
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
      <Link to={`/koyambedu/product/${product._id}`}>
        <div className="relative">
          {img
            ? <img src={img} alt={product.name} className="w-full h-[72px] object-cover" />
            : <div className={`w-full h-[72px] ${colors.bg} flex items-center justify-center`}>
                <FaLeaf size={20} className="text-green-200" />
              </div>}
          {product.badges?.includes('fresh_arrival') && (
            <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Fresh</span>
          )}
          <span className={`absolute top-1.5 right-1.5 ${colors.badge} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-wide uppercase`}>
            {grade.gradeName || grade.gradeKey}
          </span>
        </div>
      </Link>
      <div className="p-2">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="text-xs font-semibold text-gray-800 line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-[10px] text-gray-400 leading-tight">{product.nameTamil}</p>}
        </Link>
        <div className="mt-1.5">
          {gradePrice ? (
            <div>
              <span className="text-[9px] text-gray-400 font-medium">From </span>
              <span className="text-green-700 font-bold text-xs">₹{gradePrice}</span>
              <span className="text-gray-400 text-[10px]">/{product.unit}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span className="text-green-700 font-bold text-xs">₹{product.currentPrice}</span>
              <span className="text-gray-400 text-[10px]">/{product.unit}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
            ? <img src={img} alt={product.name} className="w-full h-[72px] object-cover" />
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

  const search       = searchParams.get('search')   || '';
  const categoryId   = searchParams.get('category') || '';
  const sortBy       = searchParams.get('sort')      || 'default';

  const loadProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20, sort: sortBy });
      if (search)     params.set('search',   search);
      if (categoryId) params.set('category', categoryId);
      const { data } = await api.get(`/koyambedu/products?${params}`);
      setProducts(pg === 1 ? data.products : prev => {
        const seen = new Set(prev.map(p => p._id));
        return [...prev, ...data.products.filter(p => !seen.has(p._id))];
      });
      setTotal(data.total);
      setPage(pg);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, sortBy]);

  useEffect(() => {
    fetchCart();
    api.get('/koyambedu/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(1); }, [search, categoryId, sortBy]);

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

          {/* ── Product grid ──
               Graded products are expanded: each active grade gets its own card
               so all variants (e.g. Premium, Mixed, Economy) appear individually. */}
          <div className="px-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.flatMap(p =>
              p.gradesEnabled && p.grades?.some(g => g.isActive)
                ? p.grades
                    .filter(g => g.isActive)
                    .map(g => <GradeCard key={`${p._id}-${g.gradeKey}`} product={p} grade={g} />)
                : [<ProductCard key={p._id} product={p} />]
            )}
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
