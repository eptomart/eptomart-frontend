// ============================================
// HOME PAGE — Premium Blinkit/Zepto-style
// Fixed glass bottom nav · Products first · Scroll only products
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowRight, FiSearch, FiShoppingCart,
  FiZap, FiStar, FiChevronRight, FiHome,
  FiGrid, FiPackage,
} from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import ProductCard from '../components/product/ProductCard';
import { ProductGridSkeleton } from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Countdown ────────────────────────────────────────────────
function useCountdown(hours = 4) {
  const end = useRef(Date.now() + hours * 3600_000).current;
  const [left, setLeft] = useState(end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  return {
    h: String(Math.floor(left / 3600_000)).padStart(2, '0'),
    m: String(Math.floor((left % 3600_000) / 60_000)).padStart(2, '0'),
    s: String(Math.floor((left % 60_000) / 1_000)).padStart(2, '0'),
  };
}

// ── Skeleton card ─────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
    <div className="aspect-square bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

// ── Horizontal product shelf ──────────────────────────────────
function ProductShelf({ title, emoji, products, link, loading }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h2 className="text-base font-extrabold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <Link to={link} className="flex items-center gap-1 text-xs font-bold text-orange-500">
          See all <FiChevronRight size={13} />
        </Link>
      </div>
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Flash banner ──────────────────────────────────────────────
function FlashBar({ products }) {
  const { h, m, s } = useCountdown(4);
  const deals = (products || []).filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 6);
  if (!deals.length) return null;
  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-xl">
            <FiZap size={12} style={{ fill: 'white' }} /> FLASH DEALS
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-xs">
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{h}</span>
            <span className="text-gray-400">:</span>
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{m}</span>
            <span className="text-gray-400">:</span>
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{s}</span>
          </div>
        </div>
        <Link to="/shop?sort=-discount" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {deals.map(p => (
          <Link key={p._id} to={`/product/${p.slug}`}
            className="flex-shrink-0 w-32 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-95 group">
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
              <img src={p.images?.[0]?.url || ''} alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {Math.round(((p.price - p.discountPrice) / p.price) * 100)}% OFF
              </div>
            </div>
            <div className="p-2">
              <p className="text-[11px] text-gray-600 line-clamp-2 leading-tight mb-1">{p.name}</p>
              <p className="font-bold text-sm text-gray-900">₹{p.discountPrice?.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-400 line-through">₹{p.price?.toLocaleString('en-IN')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Categories strip ──────────────────────────────────────────
function CategoriesStrip({ categories, active, onChange }) {
  const all = [{ _id: '', name: 'All', icon: '🛒', slug: '' }, ...categories.slice(0, 12)];
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {all.map((cat, i) => {
          const isActive = active === cat._id;
          const icons = ['🥗','🥛','🏠','👕','📱','⚽','🎨','💊','🛠️','🐾','📚','🍜'];
          const icon = cat.icon || cat.image?.url ? (
            cat.image?.url
              ? <img src={cat.image.url} alt="" className="w-5 h-5 object-cover rounded-full" />
              : <span>{icons[i % icons.length]}</span>
          ) : <span>{icons[i % icons.length]}</span>;
          return (
            <button key={cat._id || 'all'} onClick={() => onChange(cat._id, cat.slug)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap border
                ${isActive
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:text-orange-600'
                }`}>
              {typeof icon === 'string' ? <span>{icon}</span> : icon}
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-app banners ───────────────────────────────────────────
function SubAppBanners() {
  return (
    <div className="px-4 grid grid-cols-2 gap-3">
      {/* Koyambedu Daily */}
      <Link to="/koyambedu"
        className="relative flex flex-col justify-between rounded-2xl p-3.5 overflow-hidden min-h-[110px] active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #4ade80 100%)' }}>
        <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 select-none">🥬</div>
        <div>
          <span className="bg-yellow-400 text-green-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">ORDER BY 10 AM</span>
          <p className="text-white font-black text-sm mt-1 leading-tight">Koyambedu<br />Daily</p>
          <p className="text-green-200 text-[10px] mt-0.5">Veggies · Fruits · Flowers</p>
        </div>
        <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
          Order Now <FiArrowRight size={10} />
        </span>
      </Link>

      {/* Uzhavar Fresh */}
      <Link to="/uzhavar"
        className="relative flex flex-col justify-between rounded-2xl p-3.5 overflow-hidden min-h-[110px] active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #2dd4bf 100%)' }}>
        <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 select-none">🌾</div>
        <div>
          <span className="bg-lime-400 text-teal-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">FARM DIRECT</span>
          <p className="text-white font-black text-sm mt-1 leading-tight">Uzhavar<br />Fresh</p>
          <p className="text-teal-200 text-[10px] mt-0.5">உழவர் சந்தை · No middlemen</p>
        </div>
        <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
          Explore <FiArrowRight size={10} />
        </span>
      </Link>
    </div>
  );
}

// ── Why strip (trust badges) ──────────────────────────────────
function TrustStrip() {
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {[
          { icon: '⚡', label: 'Fast Delivery' },
          { icon: '✅', label: 'Verified Sellers' },
          { icon: '🔄', label: 'Easy Returns' },
          { icon: '💸', label: 'Best Prices' },
          { icon: '🛡️', label: 'Secure Pay' },
        ].map(t => (
          <div key={t.label}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-base">{t.icon}</span>
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────
const Divider = () => (
  <div className="px-4">
    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
  </div>
);

// ── Bottom Nav ────────────────────────────────────────────────
function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const tabs = [
    { id: 'home',     icon: FiHome,    label: 'Home',     path: '/' },
    { id: 'uzhavar',  emoji: '🌾',    label: 'Uzhavar',  path: '/uzhavar' },
    { id: 'koyambedu',emoji: '🥬',    label: 'Koyambedu',path: '/koyambedu' },
    { id: 'categories',icon: FiGrid,   label: 'Categories',path: '/shop' },
  ];

  const active = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      {/* frosted glass */}
      <div
        className="border-t border-gray-200/60 px-1 pt-2 pb-3"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const isActive = active(tab.path);
            return (
              <button key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-90 relative">
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                )}
                <div className={`w-10 h-9 flex items-center justify-center rounded-xl transition-all
                  ${isActive ? 'bg-orange-50' : ''}`}>
                  {tab.emoji ? (
                    <span className={`text-xl transition-all ${isActive ? 'scale-110' : 'opacity-60'}`}>
                      {tab.emoji}
                    </span>
                  ) : (
                    <tab.icon size={20}
                      className={`transition-all ${isActive ? 'text-orange-500 scale-110' : 'text-gray-400'}`} />
                  )}
                </div>
                <span className={`text-[10px] font-bold transition-all
                  ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ── Promo banner carousel ─────────────────────────────────────
const PROMOS = [
  { bg: 'from-violet-600 to-indigo-600', tag: '⚡ Limited Time', title: 'Up to 70% OFF', sub: 'Shop top deals now', to: '/shop?sort=-discount', cta: 'Grab Deals' },
  { bg: 'from-orange-500 to-pink-500',   tag: '🆕 Just Arrived', title: 'New Arrivals',   sub: 'Fresh products daily', to: '/shop?sort=-createdAt', cta: 'Shop Now' },
  { bg: 'from-teal-600 to-emerald-500',  tag: '⭐ Handpicked',   title: 'Featured Picks', sub: 'Curated for quality', to: '/shop?featured=true',    cta: 'Explore' },
];

function PromoBanner() {
  const [active, setActive] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    timer.current = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4000);
    return () => clearInterval(timer.current);
  }, []);
  const p = PROMOS[active];
  return (
    <div className="px-4">
      <Link to={p.to} className={`relative flex items-center justify-between bg-gradient-to-r ${p.bg}
        rounded-2xl px-5 py-4 overflow-hidden active:scale-[0.98] transition-transform`}>
        {/* Background glow */}
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -left-5 -bottom-8 w-24 h-24 rounded-full bg-black/10" />
        <div className="relative z-10">
          <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">{p.tag}</span>
          <p className="text-white font-black text-xl leading-tight">{p.title}</p>
          <p className="text-white/70 text-xs mt-0.5">{p.sub}</p>
        </div>
        <div className="relative z-10 flex-shrink-0">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap border border-white/30">
            {p.cta} →
          </span>
        </div>
        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {PROMOS.map((_, i) => (
            <button key={i} onClick={e => { e.preventDefault(); setActive(i); }}
              className={`h-1 rounded-full transition-all ${i === active ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
          ))}
        </div>
      </Link>
    </div>
  );
}

// ── Main Home ─────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();

  const [categories,       setCategories]       = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals,      setNewArrivals]      = useState([]);
  const [topRated,         setTopRated]         = useState([]);
  const [loading,          setLoading]          = useState(true);

  const [activeCategory,   setActiveCategory]   = useState('');
  const [catProducts,      setCatProducts]      = useState([]);
  const [catLoading,       setCatLoading]       = useState(false);

  // Section tabs: featured | new | top
  const [activeTab, setActiveTab] = useState('featured');

  useEffect(() => {
    (async () => {
      try {
        const [catRes, featRes, newRes, topRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?featured=true&limit=8'),
          api.get('/products?limit=8&sort=-createdAt'),
          api.get('/products?limit=6&sort=-ratings.average'),
        ]);
        setCategories(catRes.data.categories || []);
        setFeaturedProducts(featRes.data.products || []);
        setNewArrivals(newRes.data.products || []);
        setTopRated(topRes.data.products || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleCategoryChange = useCallback(async (id, slug) => {
    setActiveCategory(id);
    if (!id) { setCatProducts([]); return; }
    setCatLoading(true);
    try {
      const { data } = await api.get(`/products?category=${id}&limit=12`);
      setCatProducts(data.products || []);
    } catch {}
    finally { setCatLoading(false); }
  }, []);

  const TABS = [
    { id: 'featured', label: '⭐ Featured' },
    { id: 'new',      label: '🆕 New' },
    { id: 'top',      label: '🏆 Top Rated' },
  ];

  const currentProducts = activeCategory
    ? catProducts
    : activeTab === 'featured' ? featuredProducts
    : activeTab === 'new'      ? newArrivals
    : topRated;

  const isCurrentLoading = activeCategory ? catLoading : loading;

  return (
    <>
      <Helmet>
        <title>Eptomart — Shop Everything Online | India's Best Online Store</title>
        <meta name="description" content="Shop electronics, fashion, groceries and more. Uzhavar Fresh farm-direct produce. Koyambedu Daily wholesale veggies. Fast delivery across India." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.eptomart.com/" />
      </Helmet>

      {/* ── Desktop Navbar ── */}
      <Navbar />

      {/* ── Page body ── */}
      {/* pb-24 reserves space for mobile bottom nav */}
      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-8">

        {/* ══════════════════════════════════════
            MOBILE SEARCH BAR (below navbar)
        ══════════════════════════════════════ */}
        <div className="md:hidden sticky top-0 z-40 bg-[#f5f5f7] px-4 pt-3 pb-2"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <button onClick={() => navigate('/shop')}
            className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200/80 active:scale-[0.98] transition-transform">
            <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
            <span className="text-sm text-gray-400 font-medium">Search for products, brands…</span>
            <span className="ml-auto text-xs font-bold text-orange-500 flex-shrink-0">🎤</span>
          </button>
        </div>

        {/* ══════════════════════════════════════
            PROMO BANNER CAROUSEL
        ══════════════════════════════════════ */}
        <div className="pt-2 pb-3">
          <PromoBanner />
        </div>

        {/* ══════════════════════════════════════
            SUB-APP BANNERS
        ══════════════════════════════════════ */}
        <div className="pb-4">
          <SubAppBanners />
        </div>

        {/* ══════════════════════════════════════
            TRUST BADGES STRIP
        ══════════════════════════════════════ */}
        <div className="pb-4">
          <TrustStrip />
        </div>

        {/* ══════════════════════════════════════
            CATEGORY FILTER PILLS
        ══════════════════════════════════════ */}
        <div className="pb-3">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-sm font-extrabold text-gray-800">Browse</h2>
            <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
              All Categories <FiChevronRight size={12} />
            </Link>
          </div>
          <CategoriesStrip categories={categories} active={activeCategory} onChange={handleCategoryChange} />
        </div>

        {/* ══════════════════════════════════════
            CATEGORY PRODUCTS (if filtered)
        ══════════════════════════════════════ */}
        {activeCategory && (
          <section className="pb-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-extrabold text-gray-900">
                {categories.find(c => c._id === activeCategory)?.name || 'Products'}
              </h2>
              <button onClick={() => handleCategoryChange('', '')}
                className="text-xs text-gray-400 font-semibold border border-gray-200 px-2.5 py-1 rounded-lg">
                ✕ Clear
              </button>
            </div>
            <div className="px-4">
              {catLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : catProducts.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {catProducts.map(p => <ProductCard key={p._id} product={p} />)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">🛒</p>
                  <p className="text-gray-400 text-sm">No products in this category yet</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════
            PRODUCT SECTION TABS
        ══════════════════════════════════════ */}
        {!activeCategory && (
          <>
            {/* Flash deals */}
            <div className="pb-5">
              <FlashBar products={featuredProducts} />
            </div>

            <Divider />

            {/* Tab selector */}
            <div className="px-4 pt-4 pb-3 flex gap-2">
              {TABS.map(tab => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 border
                    ${activeTab === tab.id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="px-4 pb-6">
              {isCurrentLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : currentProducts.length ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentProducts.map(p => <ProductCard key={p._id} product={p} />)}
                  </div>
                  <div className="mt-4 text-center">
                    <Link to="/shop" className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                      See all products <FiArrowRight size={14} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">📦</p>
                  <p className="text-gray-400">No products yet — check back soon!</p>
                </div>
              )}
            </div>

            <Divider />

            {/* ── Desktop: full sections below ── */}
            <div className="hidden md:block max-w-7xl mx-auto px-4 mt-8 space-y-12">
              {/* Sub-app banners — desktop wider version */}
              <section className="grid grid-cols-2 gap-4">
                <Link to="/koyambedu"
                  className="relative flex items-center justify-between rounded-2xl px-6 py-5 overflow-hidden group hover:shadow-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                  <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🥬</span>
                      <span className="text-white font-black text-lg tracking-tight">KOYAMBEDU DAILY</span>
                      <span className="bg-yellow-400 text-green-900 text-[10px] font-black px-2 py-0.5 rounded-full">ORDER BY 10 AM</span>
                    </div>
                    <p className="text-green-100 text-sm">Wholesale market-direct veggies, fruits & flowers</p>
                    <p className="text-green-200 text-xs mt-0.5">கோயம்பேடு · Chennai's freshest market</p>
                  </div>
                  <span className="flex items-center gap-1.5 bg-white text-emerald-700 font-black text-sm px-5 py-3 rounded-xl shadow group-hover:shadow-md transition-all whitespace-nowrap flex-shrink-0 ml-4">
                    Order Now <FiArrowRight size={14} />
                  </span>
                </Link>
                <Link to="/uzhavar"
                  className="relative flex items-center justify-between rounded-2xl px-6 py-5 overflow-hidden group hover:shadow-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #134e4a, #0f766e)' }}>
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🌾</span>
                      <span className="text-white font-black text-lg tracking-tight">UZHAVAR FRESH</span>
                      <span className="bg-lime-400 text-teal-900 text-[10px] font-black px-2 py-0.5 rounded-full">FARM DIRECT</span>
                    </div>
                    <p className="text-teal-100 text-sm">Buy from farmers @ your doorstep · Farm fresh daily</p>
                    <p className="text-teal-200 text-xs mt-0.5">உழவர் சந்தை · No middlemen</p>
                  </div>
                  <span className="flex items-center gap-1.5 bg-white text-teal-700 font-black text-sm px-5 py-3 rounded-xl shadow group-hover:shadow-md transition-all whitespace-nowrap flex-shrink-0 ml-4">
                    Explore <FiArrowRight size={14} />
                  </span>
                </Link>
              </section>

              {/* Full product grid sections */}
              <ProductShelf title="Featured Products" emoji="⭐" products={featuredProducts} link="/shop?featured=true" loading={loading} />
              <ProductShelf title="New Arrivals" emoji="🆕" products={newArrivals} link="/shop?sort=-createdAt" loading={loading} />
              {topRated.filter(p => p.ratings?.count > 0).length > 0 && (
                <ProductShelf title="Top Rated" emoji="🏆" products={topRated.filter(p => p.ratings?.count > 0)} link="/shop?sort=-ratings.average" loading={loading} />
              )}

              {/* Why Eptomart */}
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-extrabold text-center text-gray-900 mb-1">Why Shop at Eptomart?</h2>
                <p className="text-center text-sm text-gray-400 mb-8">India's fastest growing multi-seller marketplace</p>
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { emoji: '🛡️', title: 'Verified Sellers', desc: 'KYC verified with GST & FSSAI compliance' },
                    { emoji: '🚚', title: 'Pan-India Delivery', desc: 'Powered by Shiprocket — to every pincode' },
                    { emoji: '💸', title: 'Best Prices', desc: 'Direct from sellers — no middlemen, no markups' },
                    { emoji: '📞', title: 'Real Support', desc: 'Human support via WhatsApp, 7 days a week' },
                  ].map(item => (
                    <div key={item.title} className="text-center">
                      <div className="text-4xl mb-3">{item.emoji}</div>
                      <h3 className="font-bold text-sm text-gray-800 mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* ══════════════════════════════════════
          FIXED GLASS BOTTOM NAV (mobile only)
      ══════════════════════════════════════ */}
      <BottomNav />
    </>
  );
}
