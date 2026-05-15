// ============================================
// HOME PAGE — Premium Blinkit/Zepto-style
// Fixed glass bottom nav · Products first · Scroll only products
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowRight, FiSearch,
  FiZap, FiChevronRight, FiMic,
} from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import ProductCard from '../components/product/ProductCard';
import { ProductGridSkeleton } from '../components/common/Loader';
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

// ── Categories strip (DB categories — navigates to shop page) ──
function CategoriesStrip({ categories }) {
  const navigate = useNavigate();
  const icons = ['🥗','🥛','🏠','👕','📱','⚽','🎨','💊','🛠️','🐾','📚','🍜'];
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={() => navigate('/shop')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap border bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100">
          🛒 All
        </button>
        {categories.slice(0, 14).map((cat, i) => {
          const imgEl = cat.image?.url
            ? <img src={cat.image.url} alt="" className="w-4 h-4 object-cover rounded-full flex-shrink-0" />
            : <span className="flex-shrink-0">{icons[i % icons.length]}</span>;
          return (
            <button key={cat._id}
              onClick={() => navigate(`/shop?category=${cat._id}`)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap border bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600">
              {imgEl}
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

// ── Mobile search bar with real input + mic ───────────────────
function MobileSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);

  const submit = (q) => {
    const v = (q || query).trim();
    if (v) navigate(`/shop?search=${encodeURIComponent(v)}`);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice search not supported in this browser'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setQuery(t);
      submit(t);
    };
    rec.start();
  };

  return (
    <div className="md:hidden sticky top-0 z-40 px-4 pt-3 pb-2"
      style={{ background: 'rgba(245,245,247,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }}
        className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-200/80">
        <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products, brands…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none font-medium"
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')}
            className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">×</button>
        ) : (
          <button type="button" onClick={startVoice}
            className={`flex-shrink-0 p-1 rounded-lg transition-all ${listening ? 'text-red-500 animate-pulse' : 'text-orange-400 hover:text-orange-600'}`}>
            <FiMic size={17} />
          </button>
        )}
      </form>
    </div>
  );
}

// ── Static non-perishable category grid ──────────────────────
const STATIC_CATS = [
  { emoji: '📱', label: 'Electronics',     slug: 'electronics' },
  { emoji: '👕', label: 'Fashion',          slug: 'fashion' },
  { emoji: '🏠', label: 'Home & Kitchen',   slug: 'home-kitchen' },
  { emoji: '💄', label: 'Beauty',           slug: 'beauty' },
  { emoji: '⚽', label: 'Sports',           slug: 'sports' },
  { emoji: '📚', label: 'Books',            slug: 'books' },
  { emoji: '🧸', label: 'Toys & Kids',      slug: 'toys-kids' },
  { emoji: '🐾', label: 'Pet Supplies',     slug: 'pet-supplies' },
  { emoji: '🔧', label: 'Tools & DIY',      slug: 'tools-diy' },
  { emoji: '🎨', label: 'Art & Craft',      slug: 'art-craft' },
  { emoji: '🌿', label: 'Health & Wellness',slug: 'health-wellness' },
  { emoji: '🧴', label: 'Personal Care',    slug: 'personal-care' },
];

function StaticCategoriesGrid() {
  const navigate = useNavigate();
  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold text-gray-800 tracking-tight">Shop by Category</h2>
        <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {STATIC_CATS.map(cat => (
          <button key={cat.slug}
            onClick={() => navigate(`/shop?category=${cat.slug}`)}
            className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3 px-1 border border-gray-100 shadow-sm active:scale-95 transition-all hover:border-orange-200 hover:shadow-md group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
            <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Horizontal category shelf ─────────────────────────────────
function CategoryShelf({ cat, products }) {
  const navigate = useNavigate();
  return (
    <section>
      <div className="flex items-center justify-between px-4 mb-2">
        <button
          onClick={() => navigate(`/shop?category=${cat._id}`)}
          className="flex items-center gap-2 group active:scale-95 transition-transform">
          {cat.image?.url
            ? <img src={cat.image.url} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <span className="text-lg">{cat.emoji || '🛍️'}</span>}
          <span className="text-sm font-extrabold text-gray-900 group-hover:text-orange-500 transition-colors">
            {cat.name}
          </span>
          <FiChevronRight size={13} className="text-gray-400 group-hover:text-orange-400" />
        </button>
        <button onClick={() => navigate(`/shop?category=${cat._id}`)}
          className="text-[11px] font-bold text-orange-500 border border-orange-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all">
          See all
        </button>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
        {products.map(p => (
          <div key={p._id} className="flex-shrink-0 w-36">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main Home ─────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();

  const [categories,  setCategories]  = useState([]);
  const [allProducts, setAllProducts] = useState([]);   // featured + recent combined
  const [loading,     setLoading]     = useState(true);

  // Lazy-loaded tabs
  const [tabData,     setTabData]     = useState({});   // { new: [], top: [] }
  const [tabLoading,  setTabLoading]  = useState({});
  const [activeTab,   setActiveTab]   = useState('shelves'); // shelves | new | top

  // ── Mount: only 2 API calls ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories?limit=20'),
          api.get('/products?limit=24&sort=-createdAt'),
        ]);
        setCategories(catRes.data.categories || []);
        setAllProducts(prodRes.data.products || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Lazy-load tab data ────────────────────────────────────
  const switchTab = async (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'shelves' || tabData[tabId]) return;
    setTabLoading(prev => ({ ...prev, [tabId]: true }));
    try {
      const sort = tabId === 'new' ? '-createdAt' : '-ratings.average';
      const { data } = await api.get(`/products?limit=12&sort=${sort}`);
      setTabData(prev => ({ ...prev, [tabId]: data.products || [] }));
    } catch {}
    finally { setTabLoading(prev => ({ ...prev, [tabId]: false })); }
  };

  // ── Group products by category ───────────────────────────
  const catShelves = categories.slice(0, 8).map(cat => {
    const prods = allProducts.filter(p =>
      p.category?._id === cat._id || p.category === cat._id
    );
    return { cat, products: prods };
  }).filter(s => s.products.length > 0);

  // Featured = products with discountPrice or high rating
  const featuredProducts = allProducts.filter(p => p.discountPrice || p.featured).slice(0, 8);
  const currentTabProducts = activeTab === 'new'
    ? (tabData.new || [])
    : (tabData.top || []);
  const isTabLoading = tabLoading[activeTab];

  const TABS = [
    { id: 'shelves', label: '🏷️ By Category' },
    { id: 'new',     label: '🆕 New' },
    { id: 'top',     label: '🏆 Top Rated' },
  ];

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
        <MobileSearchBar />

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
            STATIC CATEGORIES GRID
        ══════════════════════════════════════ */}
        <div className="pb-4">
          <StaticCategoriesGrid />
        </div>

        <Divider />

        {/* ══════════════════════════════════════
            DB CATEGORY PILLS (scroll → navigate)
        ══════════════════════════════════════ */}
        {categories.length > 0 && (
          <div className="py-3">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-sm font-extrabold text-gray-800">Our Departments</h2>
              <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
                See all <FiChevronRight size={12} />
              </Link>
            </div>
            <CategoriesStrip categories={categories} />
          </div>
        )}

        {/* ══════════════════════════════════════
            FLASH DEALS
        ══════════════════════════════════════ */}
        <div className="pb-5">
          <FlashBar products={featuredProducts} />
        </div>

        <Divider />

        {/* ══════════════════════════════════════
            BROWSE TABS
        ══════════════════════════════════════ */}
        <>
          {/* Sticky tab bar */}
          <div className="sticky top-[60px] z-30 bg-[#f5f5f7] px-4 pt-3 pb-2"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => (
                <button key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 border
                    ${activeTab === tab.id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── By Category shelves ── */}
          {activeTab === 'shelves' && (
            <div className="pt-2 pb-6 space-y-6">
              {loading ? (
                // Skeleton shelves
                [0,1,2].map(i => (
                  <div key={i} className="px-4 space-y-2 animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 rounded-lg" />
                    <div className="flex gap-3">
                      {[0,1,2].map(j => (
                        <div key={j} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden border border-gray-100">
                          <div className="aspect-square bg-gray-100" />
                          <div className="p-3 space-y-2">
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                            <div className="h-4 bg-gray-100 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : catShelves.length > 0 ? (
                catShelves.map(({ cat, products }) => (
                  <CategoryShelf key={cat._id} cat={cat} products={products} />
                ))
              ) : (
                // Fallback: show all products in a grid if no category grouping
                <div className="px-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-extrabold text-gray-800">All Products</h2>
                    <Link to="/shop" className="text-xs font-bold text-orange-500">See all</Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allProducts.slice(0, 12).map(p => <ProductCard key={p._id} product={p} />)}
                  </div>
                </div>
              )}

              {/* See all categories CTA */}
              {!loading && (
                <div className="px-4 text-center">
                  <Link to="/shop"
                    className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                    Browse all products <FiArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── New / Top Rated tab ── */}
          {activeTab !== 'shelves' && (
            <div className="px-4 pt-3 pb-6">
              {isTabLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : currentTabProducts.length ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentTabProducts.map(p => <ProductCard key={p._id} product={p} />)}
                  </div>
                  <div className="mt-4 text-center">
                    <Link to={activeTab === 'new' ? '/shop?sort=-createdAt' : '/shop?sort=-ratings.average'}
                      className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                      See all <FiArrowRight size={14} />
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
          )}

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
      </main>

      {/* ══════════════════════════════════════
          FIXED GLASS BOTTOM NAV (mobile only)
      ══════════════════════════════════════ */}
      <BottomNav />
    </>
  );
}
