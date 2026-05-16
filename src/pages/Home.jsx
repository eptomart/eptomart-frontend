// ============================================
// HOME PAGE — Eptomart Premium
// ============================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiSearch, FiZap, FiChevronRight, FiMic, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import ProductCard from '../components/product/ProductCard';
import api from '../utils/api';

// ── Countdown ─────────────────────────────────────────────────
function useCountdown(hours = 6) {
  const end = useRef(Date.now() + hours * 3_600_000).current;
  const [left, setLeft] = useState(end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  return {
    h: String(Math.floor(left / 3_600_000)).padStart(2, '0'),
    m: String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, '0'),
    s: String(Math.floor((left % 60_000) / 1_000)).padStart(2, '0'),
  };
}

// ── Skeleton ───────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
    <div className="aspect-square bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
    </div>
  </div>
);

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ emoji, title, link, linkLabel = 'See all', dotColor = 'bg-orange-500' }) {
  return (
    <div className="flex items-center justify-between mb-3 px-4">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-base leading-none">{emoji}</span>
        <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
          {linkLabel} <FiChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Shared Product Carousel Card ──────────────────────────────
function CarouselCard({ product: p, accent = '#f4941c' }) {
  const orig = p.price || 0;
  const disc = p.discountPrice && p.discountPrice < orig ? p.discountPrice : null;
  const pct  = disc ? Math.round(((orig - disc) / orig) * 100) : 0;
  const img  = p.images?.[0]?.url || '';
  return (
    <Link to={`/product/${p.slug || p._id}`}
      style={{ scrollSnapAlign: 'start', flexShrink: 0, width: '148px' }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all active:scale-95 group">

      {/* Image */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {img
          ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        }
        {pct >= 5 && (
          <div className="absolute top-2 left-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow"
            style={{ background: accent }}>
            {pct}% OFF
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[28px]">{p.name}</p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-extrabold text-gray-900">
            ₹{(disc || orig).toLocaleString('en-IN')}
          </span>
          {disc && (
            <span className="text-[10px] text-gray-400 line-through">
              ₹{orig.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {p.ratings?.average > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            <span className="text-[9px] text-amber-500 font-bold">⭐ {p.ratings.average.toFixed(1)}</span>
            {p.soldCount > 0 && <span className="text-[9px] text-gray-400 ml-1">· {p.soldCount} sold</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Auto-cycling carousel used by BOTH Featured + Flash ────────
function ProductCarouselTrack({ products, accent }) {
  const trackRef = useRef(null);
  const timerRef = useRef(null);

  const advance = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 20;
    if (nearEnd) {
      el.scrollTo({ left: 0, behavior: 'instant' });
    } else {
      el.scrollBy({ left: 158, behavior: 'smooth' }); // 148px card + 10px gap
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(advance, 3200);
    return () => clearInterval(timerRef.current);
  }, [advance]);

  // Manual swipe resets timer so auto-scroll resumes cleanly
  const handleScroll = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 3200);
  }, [advance]);

  return (
    <div className="relative group/carousel">
      {/* Desktop prev arrow */}
      <button
        onClick={() => { const el = trackRef.current; el?.scrollBy({ left: -316, behavior: 'smooth' }); }}
        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-400 hover:text-orange-500 transition-all opacity-0 group-hover/carousel:opacity-100">
        <FiChevronRight size={15} className="rotate-180" />
      </button>

      <div ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-2.5 px-4 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {products.map((p, i) => <CarouselCard key={`${p._id}-${i}`} product={p} accent={accent} />)}
      </div>

      {/* Desktop next arrow */}
      <button
        onClick={() => { const el = trackRef.current; el?.scrollBy({ left: 316, behavior: 'smooth' }); }}
        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-400 hover:text-orange-500 transition-all opacity-0 group-hover/carousel:opacity-100">
        <FiChevronRight size={15} />
      </button>
    </div>
  );
}

// ── Flash Deals section (uses shared carousel) ─────────────────
function FlashDeals({ products }) {
  const { h, m, s } = useCountdown(6);
  if (!products.length) return null;
  return (
    <section id="section-flash">
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-sm">
            <FiZap size={11} fill="white" /> FLASH DEALS
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-xs">
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{h}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{m}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded-md">{s}</span>
          </div>
        </div>
        <Link to="/shop" className="text-xs font-bold text-red-500 flex items-center gap-0.5">
          See all <FiChevronRight size={12} />
        </Link>
      </div>
      <ProductCarouselTrack products={products} accent="#ef4444" />
    </section>
  );
}

// ── Sub-app banners ────────────────────────────────────────────
function SubAppBanners() {
  return (
    <div className="px-4 grid grid-cols-2 gap-3">
      <Link to="/koyambedu"
        className="relative flex flex-col justify-between rounded-2xl p-4 overflow-hidden min-h-[115px] active:scale-95 transition-transform shadow-sm"
        style={{ background: 'linear-gradient(135deg,#14532d 0%,#16a34a 60%,#4ade80 100%)' }}>
        <div className="absolute -bottom-3 -right-3 text-5xl opacity-20 select-none pointer-events-none">🥬</div>
        <div>
          <span className="bg-yellow-400 text-green-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">ORDER BY 10 AM</span>
          <p className="text-white font-black text-sm mt-1.5 leading-tight">Koyambedu<br/>Daily</p>
          <p className="text-green-200 text-[10px] mt-0.5">Veggies · Fruits · Flowers</p>
        </div>
        <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
          Order Now <FiArrowRight size={10} />
        </span>
      </Link>
      <Link to="/uzhavar"
        className="relative flex flex-col justify-between rounded-2xl p-4 overflow-hidden min-h-[115px] active:scale-95 transition-transform shadow-sm"
        style={{ background: 'linear-gradient(135deg,#134e4a 0%,#0f766e 60%,#2dd4bf 100%)' }}>
        <div className="absolute -bottom-3 -right-3 text-5xl opacity-20 select-none pointer-events-none">🌾</div>
        <div>
          <span className="bg-lime-400 text-teal-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">FARM DIRECT</span>
          <p className="text-white font-black text-sm mt-1.5 leading-tight">Uzhavar<br/>Fresh</p>
          <p className="text-teal-200 text-[10px] mt-0.5">உழவர் சந்தை · No middlemen</p>
        </div>
        <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
          Explore <FiArrowRight size={10} />
        </span>
      </Link>
    </div>
  );
}

// ── Trust badges ───────────────────────────────────────────────
function TrustStrip() {
  const badges = [
    { icon: '⚡', label: 'Fast Delivery' },
    { icon: '✅', label: 'Verified Sellers' },
    { icon: '🔄', label: 'Easy Returns' },
    { icon: '💸', label: 'Best Prices' },
    { icon: '🛡️', label: 'Secure Pay' },
  ];
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {badges.map(b => (
          <div key={b.label}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-base leading-none">{b.icon}</span>
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Promo banner auto-carousel ─────────────────────────────────
const PROMOS = [
  { bg: 'from-violet-600 to-indigo-600', tag: '⚡ Limited Time', title: 'Up to 70% OFF', sub: 'Shop top deals now',    to: '/shop?sort=-discount',  cta: 'Grab Deals' },
  { bg: 'from-orange-500 to-pink-500',   tag: '🆕 Just Arrived', title: 'New Arrivals',  sub: 'Fresh products daily', to: '/shop?sort=-createdAt', cta: 'Shop Now'   },
  { bg: 'from-teal-600 to-emerald-500',  tag: '⭐ Handpicked',   title: 'Top Picks',     sub: 'Curated for quality',  to: '/shop',                 cta: 'Explore'    },
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
      <Link to={p.to}
        className={`relative flex items-center justify-between bg-gradient-to-r ${p.bg} rounded-2xl px-5 py-4 overflow-hidden active:scale-[0.98] transition-transform`}>
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -left-5 -bottom-8 w-24 h-24 rounded-full bg-black/10" />
        <div className="relative z-10">
          <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">{p.tag}</span>
          <p className="text-white font-black text-xl leading-tight">{p.title}</p>
          <p className="text-white/70 text-xs mt-0.5">{p.sub}</p>
        </div>
        <span className="relative z-10 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap border border-white/30 flex-shrink-0 ml-3">
          {p.cta} →
        </span>
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

// ── Eptomart-only category grid (NO Koyambedu / Uzhavar cats) ─
const EPTOMART_CATS = [
  { name: 'Grocery & Staples',  slug: 'grocery-staples',   emoji: '🛒', color: '#3b82f6' },
  { name: 'Masalas & Spices',   slug: 'masalas-spices',    emoji: '🌶️', color: '#ef4444' },
  { name: 'Rice & Millets',     slug: 'rice',              emoji: '🍚', color: '#f59e0b' },
  { name: 'Dry Fruits',         slug: 'dry-fruits',        emoji: '🥜', color: '#92400e' },
  { name: 'Oils',               slug: 'oils',              emoji: '🫙', color: '#d97706' },
  { name: 'Snacks',             slug: 'snacks',            emoji: '🍿', color: '#ec4899' },
  { name: 'Health Foods',       slug: 'health-foods',      emoji: '💪', color: '#10b981' },
  { name: 'Natural Products',   slug: 'natural-products',  emoji: '🌿', color: '#059669' },
];

function HomeCategoriesGrid() {
  const navigate = useNavigate();
  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold text-gray-800 tracking-tight">Shop by Category</h2>
        <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {EPTOMART_CATS.map(cat => (
          <button key={cat.slug}
            onClick={() => navigate(`/shop/${cat.slug}`)}
            className="flex flex-col items-center gap-1.5 bg-white rounded-2xl pt-3 pb-2.5 px-1 border border-gray-100 shadow-sm active:scale-95 transition-all hover:shadow-md hover:border-orange-200 group">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `${cat.color}18` }}>
              <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}>{cat.emoji}</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight line-clamp-2 w-full px-0.5">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Mobile search bar ─────────────────────────────────────────
function MobileSearchBar() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [listening,   setListening]   = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim() || query.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=7`);
        setSuggestions(data.products || []);
        setOpen(true);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 280);
  }, [query]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submit = async (q) => {
    const v = (q || query).trim();
    if (!v) return;
    setOpen(false);
    navigate(`/shop?search=${encodeURIComponent(v)}`);
    if (suggestions.length === 0 && v.length >= 3) {
      try {
        await api.post('/settings/product-inquiry', { query: v, name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
        toast.success(`We've noted your search for "${v}" — we'll source it soon! 🙌`, { duration: 4500, icon: '📬' });
      } catch {}
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice search not supported'); return; }
    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false;
    rec.onstart = () => setListening(true); rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); submit(t); };
    rec.start();
  };

  return (
    <div ref={wrapRef} className="md:hidden sticky top-0 z-40 px-4 pt-3 pb-2 relative"
      style={{ background: 'rgba(245,245,247,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }}
        className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-200/80">
        <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
        <input ref={inputRef} id="mobile-search-input" type="text" value={query}
          onChange={e => setQuery(e.target.value)} onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search products, brands…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none font-medium" />
        {query
          ? <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }} className="flex-shrink-0 text-gray-300 hover:text-gray-500"><FiX size={16} /></button>
          : <button type="button" onClick={startVoice} className={`flex-shrink-0 p-1 rounded-lg transition-all ${listening ? 'text-red-500 animate-pulse' : 'text-orange-400 hover:text-orange-600'}`}><FiMic size={17} /></button>
        }
      </form>
      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {loading
            ? <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2"><span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />Searching…</div>
            : suggestions.length > 0
              ? <>
                  {suggestions.map(p => (
                    <button key={p._id} onClick={() => { setOpen(false); navigate(`/product/${p.slug || p._id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left group">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-orange-600">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.category?.name || ''}</p>
                      </div>
                      <span className="text-xs font-bold text-orange-500 flex-shrink-0">₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                  <button onClick={() => submit(query)} className="w-full px-4 py-2.5 text-xs font-bold text-orange-500 border-t border-gray-100 hover:bg-orange-50 transition-colors text-left flex items-center gap-2">
                    <FiSearch size={12} /> See all results for "{query}"
                  </button>
                </>
              : query.length >= 3
                ? <div className="px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">No results for "{query}"</p>
                    <p className="text-xs text-gray-400 mb-3">We don't have it yet — but we can source it!</p>
                    <button onClick={() => submit(query)} className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors">📬 Notify Team & Search</button>
                  </div>
                : null
          }
        </div>
      )}
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────
const Divider = () => (
  <div className="px-4 my-1">
    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
  </div>
);

// ── Main Home ──────────────────────────────────────────────────
export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/products?limit=40&sort=-createdAt');
        setAllProducts(data.products || []);
      } catch (e) {
        console.error('Home products fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Featured carousel = first 4 products only (tight spotlight rotation)
  const featuredProducts = useMemo(() => allProducts.slice(0, 4), [allProducts]);

  // Flash deals = discounted products first, then fill with all products (also cycles through everything)
  const flashProducts = useMemo(() => {
    const withDiscount = allProducts.filter(p => p.discountPrice && p.discountPrice < p.price);
    return withDiscount.length >= 3 ? [...withDiscount, ...allProducts.filter(p => !withDiscount.includes(p))] : allProducts;
  }, [allProducts]);

  // New arrivals = all products sorted newest first
  const newArrivals = allProducts.slice(0, 10);

  return (
    <>
      <Helmet>
        <title>Eptomart — Shop Everything Online | India's Best Online Store</title>
        <meta name="description" content="Shop groceries, masalas, health foods and more. Koyambedu Daily for fresh produce. Uzhavar Fresh farm-direct. Fast delivery across India." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.eptomart.com/" />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-8">

        {/* Promo banner */}
        <div className="pt-2 pb-4"><PromoBanner /></div>

        {/* Koyambedu + Uzhavar entry banners */}
        <div className="pb-4"><SubAppBanners /></div>

        {/* Trust badges */}
        <div className="pb-4"><TrustStrip /></div>

        <Divider />

        {/* ── FEATURED PRODUCTS — auto-cycling carousel ── */}
        <section id="section-featured" className="pt-4 pb-5">
          <div className="flex items-center justify-between mb-3 px-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              <span className="text-base leading-none">⭐</span>
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">Featured Products</h2>
            </div>
            <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
              See all <FiChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="flex gap-2.5 px-4 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <ProductCarouselTrack products={featuredProducts} accent="#f4941c" />
          ) : (
            <div className="text-center py-10 px-4">
              <p className="text-4xl mb-2">🌟</p>
              <p className="text-gray-500 text-sm font-medium">Featured products coming soon</p>
              <Link to="/shop" className="mt-3 inline-block text-xs text-orange-500 font-bold">Browse all products →</Link>
            </div>
          )}
        </section>

        <Divider />

        {/* ── FLASH DEALS — matching auto-cycling carousel ── */}
        <section className="pt-4 pb-5">
          {loading
            ? <div className="flex gap-2.5 px-4 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-2.5 space-y-1.5"><div className="h-3 bg-gray-100 rounded w-3/4" /><div className="h-4 bg-gray-100 rounded w-1/2" /></div>
                  </div>
                ))}
              </div>
            : <FlashDeals products={flashProducts} />
          }
        </section>

        <Divider />

        {/* ── NEW ARRIVALS — 2-col grid ── */}
        <section className="pt-4 pb-6">
          <SectionHeader emoji="🆕" title="New Arrivals" link="/shop?sort=-createdAt" />
          {loading ? (
            <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : newArrivals.length > 0 ? (
            <>
              <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {newArrivals.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
              <div className="text-center mt-5 px-4">
                <Link to="/shop"
                  className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                  Browse all products <FiArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-10 px-4">
              <p className="text-4xl mb-2">🆕</p>
              <p className="text-gray-500 text-sm font-medium">New products arriving soon</p>
              <Link to="/shop" className="mt-3 inline-block text-xs text-orange-500 font-bold">Explore the shop →</Link>
            </div>
          )}
        </section>

        {/* Desktop — Why Eptomart */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pb-12 mt-2">
          <Divider />
          <section className="mt-8 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-extrabold text-center text-gray-900 mb-1">Why Shop at Eptomart?</h2>
            <p className="text-center text-sm text-gray-400 mb-8">India's fastest growing multi-seller marketplace</p>
            <div className="grid grid-cols-4 gap-6">
              {[
                { emoji: '🛡️', title: 'Verified Sellers',   desc: 'KYC verified with GST & FSSAI compliance' },
                { emoji: '🚚', title: 'Pan-India Delivery', desc: 'Powered by Shiprocket — to every pincode' },
                { emoji: '💸', title: 'Best Prices',        desc: 'Direct from sellers — no middlemen' },
                { emoji: '📞', title: 'Real Support',       desc: 'Human support via WhatsApp, 7 days a week' },
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

      </main>

      <BottomNav />
    </>
  );
}
