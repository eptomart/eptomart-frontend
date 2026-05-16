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

// ── Auto-scrolling product strip ──────────────────────────────
function AutoScrollStrip({ title, emoji, products, link, loading, accent = 'orange' }) {
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const CARD_W   = 148; // px per card + gap

  useEffect(() => {
    if (!products?.length) return;
    timerRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: CARD_W, behavior: 'smooth' });
      }
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, [products]);

  const colors = {
    orange: { dot: 'bg-orange-500', label: 'text-orange-500', badge: 'bg-orange-500' },
    red:    { dot: 'bg-red-500',    label: 'text-red-500',    badge: 'bg-red-500'    },
  };
  const c = colors[accent] || colors.orange;

  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className="text-lg">{emoji}</span>
          <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <Link to={link} className={`text-xs font-bold ${c.label} flex items-center gap-0.5`}>
          See all <FiChevronRight size={12} />
        </Link>
      </div>
      <div ref={trackRef} className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1 touch-pan-x"
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={() => {
          timerRef.current = setInterval(() => {
            const el = trackRef.current;
            if (!el) return;
            const maxScroll = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= maxScroll - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
            else el.scrollBy({ left: CARD_W, behavior: 'smooth' });
          }, 3200);
        }}>
        {loading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          : products.map(p => (
              <div key={p._id} className="flex-shrink-0 w-36">
                <ProductCard product={p} />
              </div>
            ))
        }
      </div>
    </section>
  );
}

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

// ── Flash deals bar — auto-scrolling ─────────────────────────
function FlashBar({ products }) {
  const { h, m, s } = useCountdown(4);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const deals = (products || []).filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 8);

  useEffect(() => {
    if (!deals.length) return;
    timerRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: 140, behavior: 'smooth' });
    }, 2800);
    return () => clearInterval(timerRef.current);
  }, [deals.length]);

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
        <Link to="/shop?sort=-discount" className="text-xs font-bold text-red-500 flex items-center gap-0.5">
          All <FiChevronRight size={12} />
        </Link>
      </div>
      <div ref={trackRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={() => {
          timerRef.current = setInterval(() => {
            const el = trackRef.current;
            if (!el) return;
            const maxScroll = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= maxScroll - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
            else el.scrollBy({ left: 140, behavior: 'smooth' });
          }, 2800);
        }}>
        {deals.map(p => {
          const discPct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
          // Stock bar: use stock count if available, else simulate
          const maxStock  = p.stockCount > 0 ? p.stockCount : 20;
          const curStock  = p.stock       > 0 ? p.stock      : Math.max(1, Math.floor(maxStock * 0.3));
          const stockPct  = Math.min(100, Math.round((curStock / maxStock) * 100));
          const stockColor = stockPct < 30 ? '#ef4444' : stockPct < 60 ? '#f97316' : '#22c55e';
          return (
            <Link key={p._id} to={`/product/${p.slug}`}
              className="flex-shrink-0 w-32 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-95 group">
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
                {/* Stock progress bar */}
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
    </section>
  );
}

// ── Categories pill strip — navigates to /shop/:slug ──────────
function CategoriesStrip({ categories }) {
  const navigate = useNavigate();
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={() => navigate('/shop')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap border bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100">
          🛒 All
        </button>
        {categories.slice(0, 16).map(cat => (
          <button key={cat._id}
            onClick={() => navigate(`/shop/${cat.slug}`)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap border bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600">
            {cat.image?.url
              ? <img src={cat.image.url} alt="" className="w-4 h-4 object-cover rounded-full flex-shrink-0" />
              : null}
            {cat.name}
          </button>
        ))}
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
const HOME_CATS = [
  { name: 'Fruits',             slug: 'fruits',            emoji: '🍊', bg: '#fff7ed' },
  { name: 'Vegetables',         slug: 'vegetables',        emoji: '🥦', bg: '#f0fdf4' },
  { name: 'Flowers & Greens',   slug: 'flowers-greens',    emoji: '🌸', bg: '#fdf2f8' },
  { name: 'Grocery & Staples',  slug: 'grocery-staples',   emoji: '🛒', bg: '#eff6ff' },
  { name: 'Masalas & Spices',   slug: 'masalas-spices',    emoji: '🌶️', bg: '#fff1f2' },
  { name: 'Farm Fresh',         slug: 'farm-fresh',        emoji: '🌾', bg: '#f7fee7' },
  { name: 'Homemade & Organic', slug: 'homemade-organic',  emoji: '🏡', bg: '#fefce8' },
  { name: 'Pooja & Coconut',    slug: 'pooja-coconut',     emoji: '🪔', bg: '#faf5ff' },
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
      <div className="grid grid-cols-4 gap-2.5">
        {HOME_CATS.map((cat) => (
          <button key={cat.slug}
            onClick={() => navigate(`/shop/${cat.slug}`)}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 border border-gray-100 shadow-sm active:scale-95 transition-all hover:border-orange-200 hover:shadow-md group"
            style={{ background: cat.bg }}>
            <span className="text-2xl group-hover:scale-110 transition-transform leading-none">{cat.emoji}</span>
            <span className="text-[10px] font-bold text-gray-600 text-center leading-tight line-clamp-2 px-0.5">{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Horizontal category shelf ─────────────────────────────────
function CategoryShelf({ cat, products }) {
  const navigate = useNavigate();
  const catPath = `/shop/${cat.slug}`;
  return (
    <section>
      <div className="flex items-center justify-between px-4 mb-2">
        <button
          onClick={() => navigate(catPath)}
          className="flex items-center gap-2 group active:scale-95 transition-transform">
          {cat.image?.url
            ? <img src={cat.image.url} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <span className="text-lg">🛍️</span>}
          <span className="text-sm font-extrabold text-gray-900 group-hover:text-orange-500 transition-colors">
            {cat.name}
          </span>
          <FiChevronRight size={13} className="text-gray-400 group-hover:text-orange-400" />
        </button>
        <button onClick={() => navigate(catPath)}
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

  // ── Group products by category ───────────────────────────
  const catShelves = categories.slice(0, 8).map(cat => {
    const prods = allProducts.filter(p =>
      p.category?._id === cat._id || p.category === cat._id
    );
    return { cat, products: prods };
  }).filter(s => s.products.length > 0);

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
            CATEGORY PILL STRIP (horizontal scroll)
        ══════════════════════════════════════ */}
        {categories.length > 0 && (
          <div className="pb-3">
            <CategoriesStrip categories={categories} />
          </div>
        )}

        {/* ══════════════════════════════════════
            FEATURED AUTO-SCROLL STRIP
        ══════════════════════════════════════ */}
        {(featuredProducts.length > 0 || loading) && (
          <div className="pb-5">
            <AutoScrollStrip
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
            FLASH DEALS — auto-scroll
        ══════════════════════════════════════ */}
        <div className="pb-5">
          <FlashBar products={featuredProducts} />
        </div>

        <Divider />

        {/* ══════════════════════════════════════
            CATEGORY SHELVES (no tabs)
        ══════════════════════════════════════ */}
        <>
          <div className="pt-3 pb-6 space-y-6">
            {loading ? (
              [0,1,2].map(i => (
                <div key={i} className="px-4 space-y-2 animate-pulse">
                  <div className="h-4 w-32 bg-gray-200 rounded-lg" />
                  <div className="flex gap-3">
                    {[0,1,2,3].map(j => (
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
            ) : allProducts.length > 0 ? (
              <div className="px-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-extrabold text-gray-800">All Products</h2>
                  <Link to="/shop" className="text-xs font-bold text-orange-500">See all</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {allProducts.slice(0, 12).map(p => <ProductCard key={p._id} product={p} />)}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">📦</p>
                <p className="text-gray-400">Products coming soon — check back!</p>
              </div>
            )}

            {!loading && (
              <div className="px-4 text-center">
                <Link to="/shop"
                  className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                  Browse all products <FiArrowRight size={14} />
                </Link>
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
              <ProductShelf title="New Arrivals" emoji="🆕" products={allProducts} link="/shop?sort=-createdAt" loading={loading} />
              {allProducts.filter(p => p.ratings?.count > 0).length > 0 && (
                <ProductShelf title="Top Rated" emoji="🏆" products={allProducts.filter(p => p.ratings?.count > 0).slice(0,8)} link="/shop?sort=-ratings.average" loading={loading} />
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
