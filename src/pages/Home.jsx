// ============================================
// HOME PAGE — Premium Blinkit/Zepto-style
// Fixed glass bottom nav · Products first · Scroll only products
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowRight, FiSearch,
  FiZap, FiChevronRight, FiMic, FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
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

// ── Featured product strip — swipe on mobile, arrows on desktop ─
function FeaturedStrip({ title, emoji, products, link, loading, accent = 'orange' }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  };

  const labelColor   = accent === 'red' ? 'text-red-500'    : 'text-orange-500';
  const dotColor     = accent === 'red' ? 'bg-red-500'      : 'bg-orange-500';
  const arrowHover   = accent === 'red' ? 'hover:text-red-500' : 'hover:text-orange-500';

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-lg leading-none">{emoji}</span>
          <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <Link to={link} className={`text-xs font-bold ${labelColor} flex items-center gap-0.5`}>
          See all <FiChevronRight size={12} />
        </Link>
      </div>

      {/* Strip with desktop arrow buttons */}
      <div className="relative group/strip">
        {/* Left arrow */}
        <button
          onClick={() => scroll(-1)}
          className={`hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10
            w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100
            items-center justify-center text-gray-400 ${arrowHover} transition-all
            opacity-0 group-hover/strip:opacity-100 active:scale-90`}
        >
          <FiChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {loading
            ? [...Array(5)].map((_, i) => (
                <div key={i}
                  className="flex-shrink-0 w-[44vw] sm:w-44 bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
                  style={{ scrollSnapAlign: 'start' }}>
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            : products.map(p => (
                <div key={p._id}
                  className="flex-shrink-0 w-[44vw] sm:w-44"
                  style={{ scrollSnapAlign: 'start' }}>
                  <ProductCard product={p} />
                </div>
              ))
          }
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll(1)}
          className={`hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10
            w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100
            items-center justify-center text-gray-400 ${arrowHover} transition-all
            opacity-0 group-hover/strip:opacity-100 active:scale-90`}
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

// ── Flash deals bar ──────────────────────────────────────────
function FlashBar({ products }) {
  const { h, m, s } = useCountdown(4);
  const trackRef = useRef(null);
  const deals = (products || []).filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 8);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  };

  if (!deals.length) return null;
  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4">
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
        <Link to="/shop?sort=-discount" className="text-xs font-bold text-red-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>

      {/* Swipeable strip */}
      <div className="relative group/flash">
        <button onClick={() => scroll(-1)}
          className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover/flash:opacity-100 active:scale-90">
          <FiChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>

        <div ref={trackRef}
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {deals.map(p => {
          const discPct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
          const maxStock  = p.stockCount > 0 ? p.stockCount : 20;
          const curStock  = p.stock       > 0 ? p.stock      : Math.max(1, Math.floor(maxStock * 0.3));
          const stockPct  = Math.min(100, Math.round((curStock / maxStock) * 100));
          const stockColor = stockPct < 30 ? '#ef4444' : stockPct < 60 ? '#f97316' : '#22c55e';
          return (
            <Link key={p._id} to={`/product/${p.slug}`}
              style={{ scrollSnapAlign: 'start' }}
              className="flex-shrink-0 w-[42vw] sm:w-36 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-95 group">
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img src={p.images?.[0]?.url || ''} alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                  {discPct}% OFF
                </div>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-gray-600 line-clamp-2 leading-tight mb-1">{p.name}</p>
                <p className="font-bold text-sm text-gray-900">₹{p.discountPrice?.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-gray-400 line-through">₹{p.price?.toLocaleString('en-IN')}</p>
                <div className="mt-1.5">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${stockPct}%`, background: stockColor }} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{stockPct < 30 ? '🔥 Almost gone' : 'Available'}</p>
                </div>
              </div>
            </Link>
          );
        })}
        </div>

        <button onClick={() => scroll(1)}
          className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover/flash:opacity-100 active:scale-90">
          <FiChevronRight size={16} />
        </button>
      </div>
    </section>
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

// ── Mobile search bar — live suggest + not-found inquiry ─────
function MobileSearchBar() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [listening,   setListening]   = useState(false);
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const debounce  = useRef(null);

  // Live suggestions
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = async (q) => {
    const v = (q || query).trim();
    if (!v) return;
    setOpen(false);
    navigate(`/shop?search=${encodeURIComponent(v)}`);
    // If no results found, log inquiry silently
    if (suggestions.length === 0 && v.length >= 3) {
      try {
        await api.post('/settings/product-inquiry', {
          query: v,
          name:  user?.name  || '',
          email: user?.email || '',
          phone: user?.phone || '',
        });
        toast.success(`We've noted your search for "${v}" and will get back to you soon! 🙌`, { duration: 4500, icon: '📬' });
      } catch {}
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice search not supported on this browser'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => setListening(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); submit(t); };
    rec.start();
  };

  return (
    <div ref={wrapRef} className="md:hidden sticky top-0 z-40 px-4 pt-3 pb-2 relative"
      style={{ background: 'rgba(245,245,247,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }}
        className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-200/80">
        <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
        <input
          ref={inputRef}
          id="mobile-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search products, brands…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none font-medium"
        />
        {query ? (
          <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
            <FiX size={16} />
          </button>
        ) : (
          <button type="button" onClick={startVoice}
            className={`flex-shrink-0 p-1 rounded-lg transition-all ${listening ? 'text-red-500 animate-pulse' : 'text-orange-400 hover:text-orange-600'}`}>
            <FiMic size={17} />
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Searching…
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map(p => (
                <button key={p._id}
                  onClick={() => { setOpen(false); navigate(`/product/${p.slug || p._id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left group">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images?.[0]?.url
                      ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-orange-600">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.category?.name || ''}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-500 flex-shrink-0">₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}</span>
                </button>
              ))}
              <button onClick={() => submit(query)}
                className="w-full px-4 py-2.5 text-xs font-bold text-orange-500 border-t border-gray-100 hover:bg-orange-50 transition-colors text-left flex items-center gap-2">
                <FiSearch size={12} /> See all results for "{query}"
              </button>
            </>
          ) : query.length >= 3 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-0.5">No results for "{query}"</p>
              <p className="text-xs text-gray-400 mb-3">We don't have it yet — but we can source it!</p>
              <button onClick={() => submit(query)}
                className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors active:scale-95">
                📬 Notify Team & Search
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Fixed 8-category homepage grid ───────────────────────────
// module: 'koyambedu' → routes to Koyambedu Daily
//         'uzhavar'   → routes to Uzhavar Fresh
//         'eptomart'  → routes to main /shop
const HOME_CATS = [
  { name: 'Fruits',             slug: 'fruits',            emoji: '🍊', color: '#f97316', module: 'koyambedu' },
  { name: 'Vegetables',         slug: 'vegetables',        emoji: '🥦', color: '#22c55e', module: 'koyambedu' },
  { name: 'Flowers & Greens',   slug: 'flowers-greens',    emoji: '🌸', color: '#ec4899', module: 'koyambedu' },
  { name: 'Grocery & Staples',  slug: 'grocery-staples',   emoji: '🛒', color: '#3b82f6', module: 'eptomart'  },
  { name: 'Masalas & Spices',   slug: 'masalas-spices',    emoji: '🌶️', color: '#ef4444', module: 'eptomart'  },
  { name: 'Farm Fresh',         slug: 'farm-fresh',        emoji: '🌾', color: '#84cc16', module: 'uzhavar'   },
  { name: 'Homemade & Organic', slug: 'homemade-organic',  emoji: '🏡', color: '#f59e0b', module: 'uzhavar'   },
  { name: 'Pooja & Coconut',    slug: 'pooja-coconut',     emoji: '🪔', color: '#a855f7', module: 'koyambedu' },
];

// Small badge shown on perishable category cards
const MODULE_BADGE = {
  koyambedu: { label: 'Koyambedu', bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  uzhavar:   { label: 'Uzhavar',   bg: 'rgba(132,204,22,0.15)', color: '#65a30d' },
};

function HomeCategoriesGrid() {
  const navigate = useNavigate();

  const handleCatClick = (cat) => {
    if (cat.module === 'koyambedu') navigate(`/koyambedu/shop?search=${encodeURIComponent(cat.name)}`);
    else if (cat.module === 'uzhavar') navigate('/uzhavar');
    else navigate(`/shop/${cat.slug}`);
  };

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold text-gray-800 tracking-tight">Shop by Category</h2>
        <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>
      {/* 4 cols mobile → 8 cols desktop */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {HOME_CATS.map((cat) => {
          const badge = MODULE_BADGE[cat.module];
          return (
            <button key={cat.slug}
              onClick={() => handleCatClick(cat)}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl pt-3 pb-2 px-1 border border-gray-100 shadow-sm active:scale-95 transition-all hover:shadow-md hover:border-orange-200 group">
              {/* Coloured icon circle */}
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ background: `${cat.color}15` }}>
                <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{cat.emoji}</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight line-clamp-2 w-full px-0.5">
                {cat.name}
              </span>
              {/* Substore badge for perishable categories */}
              {badge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Main Home ─────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Mount: single API call ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/products?limit=24&sort=-createdAt');
        setAllProducts(data.products || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Featured = products with discountPrice or featured flag
  const featuredProducts = allProducts.filter(p => p.discountPrice || p.featured).slice(0, 12);

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
            HOMEPAGE CATEGORY GRID — 8 fixed
        ══════════════════════════════════════ */}
        <div className="pb-3">
          <HomeCategoriesGrid />
        </div>

        {/* ══════════════════════════════════════
            FEATURED STRIP  (swipe / arrows)
        ══════════════════════════════════════ */}
        {(featuredProducts.length > 0 || loading) && (
          <div id="section-featured" className="pb-5">
            <FeaturedStrip
              title="Featured Products"
              emoji="⭐"
              products={featuredProducts}
              link="/shop?featured=true"
              loading={loading}
              accent="orange"
            />
          </div>
        )}

        {/* ══════════════════════════════════════
            FLASH DEALS  (swipe / arrows)
        ══════════════════════════════════════ */}
        <div id="section-flash" className="pb-5">
          <FlashBar products={featuredProducts} />
        </div>

        <Divider />

        {/* ══════════════════════════════════════
            NEW ARRIVALS — clean product grid
            (no per-category shelves on home)
        ══════════════════════════════════════ */}
        <div className="pt-4 pb-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-lg leading-none">🆕</span>
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">New Arrivals</h2>
            </div>
            <Link to="/shop?sort=-createdAt" className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
              See all <FiChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : allProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {allProducts.slice(0, 10).map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-14">
              <p className="text-5xl mb-3">📦</p>
              <p className="text-gray-400 text-sm">Products coming soon — check back!</p>
            </div>
          )}

          {!loading && allProducts.length > 0 && (
            <div className="text-center mt-5">
              <Link to="/shop"
                className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                Browse all products <FiArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
            DESKTOP-ONLY: WHY EPTOMART
        ══════════════════════════════════════ */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pb-12">
          <Divider />
          <section className="mt-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
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

      </main>

      {/* ══════════════════════════════════════
          FIXED GLASS BOTTOM NAV (mobile only)
      ══════════════════════════════════════ */}
      <BottomNav />
    </>
  );
}
