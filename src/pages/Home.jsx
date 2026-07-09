// ============================================
// HOME PAGE — Koyambedu Daily Market Focus
// Mobile: Immersive animated market experience
// Desktop: Existing multi-vertical layout
// ============================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EptoSEO from '../components/common/EptoSEO';
import {
  FiArrowRight, FiSearch, FiZap, FiStar,
  FiTruck, FiShield, FiCheckCircle, FiRefreshCw,
  FiTag, FiShoppingBag, FiChevronRight,
} from 'react-icons/fi';
import {
  FaLeaf, FaCarrot, FaTractor, FaDrumstickBite,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../utils/api';

// ── Recently viewed (localStorage) — keep export so ProductDetail can use it
const RV_KEY = 'eptomart_rv';
const MAX_RV  = 12;
export const trackRecentlyViewed = (product) => {
  try {
    const list  = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
    const fresh = [product, ...list.filter(p => p._id !== product._id)].slice(0, MAX_RV);
    localStorage.setItem(RV_KEY, JSON.stringify(fresh));
  } catch {}
};

// ── Market open/closed (before 9 AM = open) ──────────────────────
function useMarketStatus() {
  const [status, setStatus] = useState(() => {
    const h = new Date().getHours();
    return h >= 4 && h < 9 ? 'open' : h >= 9 ? 'closed' : 'pre';
  });
  useEffect(() => {
    const t = setInterval(() => {
      const h = new Date().getHours();
      setStatus(h >= 4 && h < 9 ? 'open' : h >= 9 ? 'closed' : 'pre');
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  return status;
}

// ══════════════════════════════════════════════════════════
// ANIMATION CSS — injected once into the DOM
// ══════════════════════════════════════════════════════════
const KBD_CSS = `
@keyframes kbdSlideUp {
  from { opacity:0; transform:translateY(32px) scale(.94); }
  to   { opacity:1; transform:translateY(0)    scale(1);   }
}
@keyframes kbdFadeRight {
  from { opacity:0; transform:translateX(-20px); }
  to   { opacity:1; transform:translateX(0);     }
}
@keyframes kbdPulse {
  0%,100% { opacity:1;   transform:scale(1);    }
  50%      { opacity:.35; transform:scale(.75);  }
}
@keyframes kbdTicker {
  0%   { transform:translateX(0);    }
  100% { transform:translateX(-50%); }
}
@keyframes kbdGlow {
  0%,100% { box-shadow:0 0 0 0 rgba(22,163,74,.6); }
  50%      { box-shadow:0 0 0 10px rgba(22,163,74,0); }
}
@keyframes kbdShimmerCard {
  0%   { background-position:-300px 0; }
  100% { background-position: 300px 0; }
}
@keyframes kbdBounceIn {
  0%   { opacity:0; transform:scale(.5) rotate(-8deg); }
  60%  { transform:scale(1.15) rotate(3deg); }
  80%  { transform:scale(.95); }
  100% { opacity:1; transform:scale(1) rotate(0deg); }
}
@keyframes kbdHeaderSlide {
  from { opacity:0; transform:translateY(-12px); }
  to   { opacity:1; transform:translateY(0);     }
}
.kbd-card-enter { animation: kbdSlideUp .42s cubic-bezier(.22,.68,0,1.2) both; }
.kbd-header-enter { animation: kbdHeaderSlide .35s ease both; }
`;

// ══════════════════════════════════════════════════════════
// HERO — cinematic dark-green market header
// ══════════════════════════════════════════════════════════
function KBDMarketHero() {
  const navigate = useNavigate();
  const status   = useMarketStatus();
  const [query, setQuery] = useState('');

  const statusConfig = {
    open:   { dot: '#4ade80', label: 'Market Open', bg: 'rgba(74,222,128,.12)', text: '#4ade80' },
    closed: { dot: '#f87171', label: 'Market Closed', bg: 'rgba(248,113,113,.12)', text: '#f87171' },
    pre:    { dot: '#fbbf24', label: 'Opening Soon', bg: 'rgba(251,191,36,.12)', text: '#fbbf24' },
  }[status];

  return (
    <div
      className="relative overflow-hidden px-4 pt-5 pb-6"
      style={{
        background: 'linear-gradient(160deg, #051c0e 0%, #0b3d1f 40%, #0f5c2e 70%, #14532d 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle,#4ade80,transparent)' }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle,#86efac,transparent)' }} />

      {/* Market status pill */}
      <div className="flex items-center gap-2 mb-3 kbd-header-enter" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: statusConfig.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusConfig.dot, animation: 'kbdPulse 1.4s ease-in-out infinite' }} />
          <span className="text-[10px] font-black tracking-wide" style={{ color: statusConfig.text }}>{statusConfig.label}</span>
        </div>
        <span className="text-[10px] text-white/40 font-medium">Chennai's Largest Produce Market</span>
      </div>

      {/* Main title */}
      <div className="mb-4 kbd-header-enter" style={{ animationDelay: '60ms' }}>
        <h1 className="text-white font-black leading-tight" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
          🌿 Koyambedu<br />
          <span style={{ color: '#4ade80' }}>Daily Market</span>
        </h1>
        <p className="text-white/55 text-sm font-medium mt-1">
          Farm-fresh · Direct prices · Delivered to your door
        </p>
      </div>

      {/* Search bar */}
      <div className="relative kbd-header-enter" style={{ animationDelay: '120ms' }}>
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              navigate(`/koyambedu/shop?search=${encodeURIComponent(query.trim())}`);
            }
          }}
          placeholder="Search vegetables, fruits, flowers…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium placeholder-white/35 text-white focus:outline-none"
          style={{ background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.15)' }}
        />
        {query && (
          <button
            onClick={() => navigate(`/koyambedu/shop?search=${encodeURIComponent(query.trim())}`)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-black text-white"
            style={{ background: '#16a34a' }}
          >
            Go
          </button>
        )}
      </div>

      {/* Trust pills */}
      <div className="flex gap-2 mt-4 flex-wrap kbd-header-enter" style={{ animationDelay: '180ms' }}>
        {['✅ Verified Sellers', '🚚 Same Day Delivery', '💰 Best Prices'].map(t => (
          <span key={t} className="text-[10px] font-bold text-white/65 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}>
            {t}
          </span>
        ))}
      </div>

      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" style={{ height: 24 }}>
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" fill="#f0faf5" />
        </svg>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PRICE TICKER — scrolling product price marquee
// ══════════════════════════════════════════════════════════
function KBDPriceTicker({ sections }) {
  const items = useMemo(() => {
    const out = [];
    sections.forEach(s => {
      s.products.forEach(p => {
        const price = p.lowestUnitPrice;
        if (price) out.push({ name: p.name, price, icon: s.category.icon || '🌿', unit: p.unit });
      });
    });
    return out;
  }, [sections]);

  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden py-2.5" style={{ background: '#051c0e' }}>
      <div style={{
        display: 'flex', gap: 32, whiteSpace: 'nowrap',
        width: 'max-content', animation: 'kbdTicker 28s linear infinite',
      }}>
        {doubled.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2" style={{ fontSize: 11 }}>
            <span>{it.icon}</span>
            <span className="font-bold text-white/80">{it.name}</span>
            <span className="text-green-400 font-black">₹{it.price}/{it.unit}</span>
            <span className="text-white/20">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CATEGORY PILL STRIP — tap scrolls to section
// ══════════════════════════════════════════════════════════
function KBDCategoryPillStrip({ sections, loading, activeCat, sectionRefs }) {
  const stripRef = useRef(null);

  const scrollTo = useCallback((catId) => {
    const el = sectionRefs.current?.[catId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Scroll the pill into view
    const pill = stripRef.current?.querySelector(`[data-cat="${catId}"]`);
    pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [sectionRefs]);

  if (loading) {
    return (
      <div className="flex gap-2 px-4 py-3 overflow-hidden" style={{ background: '#f0faf5' }}>
        {[80, 60, 90, 70, 100].map((w, i) => (
          <div key={i} className="flex-shrink-0 h-8 rounded-full"
            style={{ width: w, background: 'linear-gradient(90deg,#d1fae5 0%,#a7f3d0 50%,#d1fae5 100%)', backgroundSize: '300px 100%', animation: 'kbdShimmerCard 1.5s ease infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div ref={stripRef} className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide sticky top-0 z-20"
      style={{ background: '#f0faf5', borderBottom: '1px solid rgba(22,163,74,.1)', backdropFilter: 'blur(12px)' }}>
      {/* "All" pill */}
      <button
        data-cat="all"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95"
        style={{ background: activeCat ? 'rgba(22,163,74,.1)' : '#16a34a', color: activeCat ? '#16a34a' : '#fff', border: activeCat ? '1.5px solid rgba(22,163,74,.3)' : 'none' }}
      >
        🌿 All
      </button>
      {sections.map(s => (
        <button
          key={s.category._id}
          data-cat={s.category._id}
          onClick={() => scrollTo(s.category._id)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95"
          style={{
            background: activeCat === s.category._id ? '#16a34a' : 'rgba(22,163,74,.08)',
            color: activeCat === s.category._id ? '#fff' : '#166534',
            border: activeCat === s.category._id ? 'none' : '1.5px solid rgba(22,163,74,.2)',
          }}
        >
          {s.category.icon || '🌿'} {s.category.name}
        </button>
      ))}
      {/* Shop all link */}
      <Link to="/koyambedu/shop"
        className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95"
        style={{ background: '#fff', color: '#16a34a', border: '1.5px solid rgba(22,163,74,.3)' }}>
        Browse All <FiChevronRight size={11} />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PRODUCT CARD — animated entrance
// ══════════════════════════════════════════════════════════
function KBDProductCard({ product: p, index, visible }) {
  const navigate = useNavigate();
  const price = p.lowestUnitPrice;

  return (
    <div
      className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
      style={{
        width: 148,
        opacity: visible ? 1 : 0,
        animation: visible ? `kbdSlideUp .4s cubic-bezier(.22,.68,0,1.15) ${index * 75}ms both` : 'none',
      }}
      onClick={() => navigate(`/koyambedu/product/${p._id}`)}
    >
      <div className="rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,.08)', background: '#fff' }}>

        {/* Image */}
        <div className="relative" style={{ aspectRatio: '4/3', background: '#dcfce7' }}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(5,46,22,.6) 0%, transparent 55%)' }} />

          {/* Category icon */}
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)' }}>
            {p.category?.icon || '🌿'}
          </div>

          {/* Price on image */}
          {price && (
            <div className="absolute bottom-2 left-2 right-2">
              <span className="text-white font-black text-sm drop-shadow">
                ₹{price}<span className="text-white/70 text-[10px] font-semibold">/{p.unit}</span>
              </span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="px-2.5 py-2">
          <p className="font-bold text-gray-800 text-xs leading-tight line-clamp-2">{p.name}</p>
          {p.nameTamil && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{p.nameTamil}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            {price ? (
              <span className="text-[10px] font-black text-green-600">From ₹{price}/{p.unit}</span>
            ) : (
              <span className="text-[10px] text-gray-400">See price</span>
            )}
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#16a34a' }}>
              <FiArrowRight size={9} color="#fff" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CATEGORY SECTION — IntersectionObserver scroll-triggered
// ══════════════════════════════════════════════════════════
function KBDCategorySection({ section, onRef, index }) {
  const [visible, setVisible] = useState(false);
  const sectionEl = useRef(null);
  const ACCENT_COLORS = [
    '#16a34a', '#0d9488', '#7c3aed', '#d97706', '#dc2626', '#0284c7', '#9333ea',
  ];
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  useEffect(() => {
    const el = sectionEl.current;
    if (!el) return;
    if (onRef) onRef(section.category._id, el);
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [section.category._id, onRef]);

  return (
    <div ref={sectionEl} className="mb-1 pt-5 pb-2" id={`cat-${section.category._id}`}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)', transition: 'all .4s ease' }}>
        <div className="flex items-center gap-2.5">
          {/* Animated color bar */}
          <div className="w-1 h-6 rounded-full flex-shrink-0"
            style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}88)` }} />
          <span className="text-xl">{section.category.icon || '🌿'}</span>
          <div>
            <h2 className="font-black text-gray-900 text-sm leading-tight">{section.category.name}</h2>
            {section.category.nameTamil && (
              <p className="text-[10px] text-gray-400">{section.category.nameTamil}</p>
            )}
          </div>
          <span className="text-[10px] font-bold text-gray-400 ml-0.5">
            ({section.products.length})
          </span>
        </div>
        <Link
          to={`/koyambedu/shop?category=${section.category._id}`}
          className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full transition-all active:scale-95"
          style={{ background: `${accent}15`, color: accent }}>
          See all <FiChevronRight size={11} />
        </Link>
      </div>

      {/* Horizontal product scroll */}
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
        {section.products.map((p, i) => (
          <KBDProductCard key={p._id} product={p} index={i} visible={visible} />
        ))}

        {/* "See all" ghost card */}
        <div
          className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
          style={{
            width: 80, minHeight: 160, background: `${accent}08`,
            border: `2px dashed ${accent}40`,
            opacity: visible ? 1 : 0,
            animation: visible ? `kbdSlideUp .4s cubic-bezier(.22,.68,0,1.15) ${section.products.length * 75 + 60}ms both` : 'none',
          }}
          onClick={() => window.location.href = `/koyambedu/shop?category=${section.category._id}`}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            style={{ background: `${accent}20` }}>
            <FiArrowRight size={16} style={{ color: accent }} />
          </div>
          <span className="text-[10px] font-black text-center leading-tight px-1" style={{ color: accent }}>
            View All
          </span>
        </div>
      </div>

      {/* Subtle divider */}
      <div className="mx-4 mt-4 h-px" style={{ background: 'rgba(22,163,74,.08)' }} />
    </div>
  );
}

// Skeleton for loading state
function KBDSkeletonSections() {
  return (
    <div className="pt-4">
      {[0, 1, 2].map(s => (
        <div key={s} className="mb-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 rounded-full bg-green-100" />
            <div className="w-20 h-5 bg-green-100 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map(c => (
              <div key={c} className="flex-shrink-0 w-[148px] rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(90deg,#dcfce7 0%,#bbf7d0 50%,#dcfce7 100%)', backgroundSize: '300px 100%', animation: `kbdShimmerCard ${1.4 + c * .1}s ease infinite`, height: 190 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Coming soon when no products at all
function KBDComingSoon() {
  return (
    <div className="mx-4 mt-8 rounded-3xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px dashed #86efac' }}>
      <div className="text-5xl mb-4" style={{ animation: 'kbdBounceIn .8s ease both' }}>🌿</div>
      <h2 className="font-black text-green-800 text-xl mb-2">Coming Soon</h2>
      <p className="text-green-600 text-sm font-medium">
        We're sourcing the freshest produce from Koyambedu Market. Check back shortly!
      </p>
      <Link to="/koyambedu"
        className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl font-black text-sm text-white"
        style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }}>
        Explore Koyambedu Daily <FiArrowRight size={14} />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ECOSYSTEM TEASER — bottom strip for other verticals
// ══════════════════════════════════════════════════════════
function KBDEcoSystemTeaser() {
  return (
    <div className="px-4 pt-6 pb-8">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Also on Eptomart</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Farmer Fresh */}
        <Link to="/uzhavar"
          className="relative rounded-2xl overflow-hidden flex flex-col justify-end active:scale-95 transition-transform"
          style={{ minHeight: 100, background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <FaTractor size={56} color="#fff" />
          </div>
          <div className="relative p-3">
            <span className="text-[10px] font-black text-teal-200 uppercase tracking-wide">Farm Direct</span>
            <p className="text-white font-black text-sm leading-tight">Farmer Fresh</p>
            <p className="text-teal-200 text-[10px] mt-0.5">உழவர் சந்தை</p>
          </div>
        </Link>

        {/* EptoFresh Proteins */}
        <Link to="/eptofresh"
          className="relative rounded-2xl overflow-hidden flex flex-col justify-end active:scale-95 transition-transform"
          style={{ minHeight: 100, background: 'linear-gradient(135deg,#431407,#c2410c)' }}>
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <FaDrumstickBite size={56} color="#fff" />
          </div>
          <div className="relative p-3">
            <span className="text-[10px] font-black text-orange-200 uppercase tracking-wide">Hyperlocal</span>
            <p className="text-white font-black text-sm leading-tight">EptoFresh Proteins</p>
            <p className="text-orange-200 text-[10px] mt-0.5">Chicken · Mutton · Fish</p>
          </div>
        </Link>
      </div>

      {/* Trust row */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-400 font-semibold">
        <span>🔒 Secure Checkout</span>
        <span>•</span>
        <span>✅ Verified Sellers</span>
        <span>•</span>
        <span>🚚 Same Day</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN MOBILE MARKET PAGE
// ══════════════════════════════════════════════════════════
function KBDMobileMarket() {
  const [sections, setSections]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeCat, setActiveCat] = useState(null);
  const sectionRefs               = useRef({});

  useEffect(() => {
    api.get('/koyambedu/products/by-category?limit=8')
      .then(r => setSections(r.data?.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  // Track active category via IntersectionObserver on section headers
  useEffect(() => {
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveCat(e.target.dataset.catId);
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach(s => {
      const el = document.getElementById(`cat-${s.category._id}`);
      if (el) { el.dataset.catId = s.category._id; obs.observe(el); }
    });
    return () => obs.disconnect();
  }, [sections]);

  const handleRef = useCallback((catId, el) => {
    sectionRefs.current[catId] = el;
  }, []);

  return (
    <div style={{ background: '#f0faf5', minHeight: '100vh' }}>
      <style>{KBD_CSS}</style>

      <KBDMarketHero />

      {/* Price ticker only when data is loaded and there are products */}
      {!loading && sections.length > 0 && <KBDPriceTicker sections={sections} />}

      {/* Category pills */}
      <KBDCategoryPillStrip
        sections={sections}
        loading={loading}
        activeCat={activeCat}
        sectionRefs={sectionRefs}
      />

      {/* Product sections */}
      {loading ? <KBDSkeletonSections /> : (
        sections.length === 0
          ? <KBDComingSoon />
          : sections.map((section, i) => (
              <KBDCategorySection
                key={section.category._id}
                section={section}
                index={i}
                onRef={handleRef}
              />
            ))
      )}

      {/* Other verticals at the bottom */}
      <KBDEcoSystemTeaser />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DESKTOP COMPONENTS (preserved from previous version)
// ══════════════════════════════════════════════════════════

// Desktop hero slides
const HERO_SLIDES = [
  {
    gradient: 'linear-gradient(135deg,#14532d 0%,#16a34a 55%,#4ade80 100%)',
    tag: 'MARKET FRESH', title: 'Koyambedu\nDaily Fresh', sub: 'Farm to table · Best prices',
    cta: 'Order Now', to: '/koyambedu',
  },
  {
    gradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 55%,#2dd4bf 100%)',
    tag: 'FARM DIRECT', title: 'Farmer\nFresh', sub: 'உழவர் சந்தை · No middlemen',
    cta: 'Explore', to: '/uzhavar',
  },
  {
    gradient: 'linear-gradient(135deg,#431407 0%,#c2410c 55%,#fb923c 100%)',
    tag: 'GPS · NEARBY', title: 'Fresh\nProteins', sub: 'Chicken · Mutton · Fish · Seafood',
    cta: 'Order Now', to: '/eptofresh',
  },
];

function DesktopHero() {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    timerRef.current = setInterval(() => setActive(a => (a + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const s = HERO_SLIDES[active];
  return (
    <div className="relative overflow-hidden rounded-3xl mb-4" style={{ background: s.gradient, minHeight: 240 }}>
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-black/10" />
      <div className="relative z-10 flex items-stretch min-h-[240px]">
        <div key={active} className="flex flex-col justify-center pl-9 pr-6 py-6 w-[45%]">
          <span className="inline-block bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-3 border border-white/30">{s.tag}</span>
          <h1 className="text-[32px] font-black text-white leading-tight whitespace-pre-line">{s.title}</h1>
          <p className="text-white/75 text-sm mt-2 font-medium">{s.sub}</p>
          <button onClick={() => navigate(s.to)}
            className="mt-4 inline-flex items-center gap-2 bg-white font-black text-sm px-6 py-2.5 rounded-2xl w-fit hover:shadow-xl hover:scale-105 transition-all"
            style={{ color: '#f4941c' }}>
            {s.cta} <FiArrowRight size={15} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-end pr-8 gap-3 overflow-hidden">
          {[
            { emoji: '🥬', name: 'Vegetables', link: '/koyambedu' },
            { emoji: '🍅', name: 'Tomatoes',   link: '/koyambedu' },
            { emoji: '🍌', name: 'Fruits',     link: '/koyambedu' },
            { emoji: '🌸', name: 'Flowers',    link: '/koyambedu' },
            { emoji: '🥕', name: 'Root Vegs',  link: '/koyambedu' },
          ].map(cat => (
            <Link key={cat.name} to={cat.link}
              className="flex-shrink-0 flex flex-col items-center bg-white/95 rounded-2xl px-4 pt-4 pb-3.5 w-[100px] hover:scale-105 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 text-2xl bg-green-50">{cat.emoji}</div>
              <p className="text-[11px] font-bold text-gray-800 text-center">{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-10 flex gap-1.5 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => { setActive(i); clearInterval(timerRef.current); timerRef.current = setInterval(() => setActive(a => (a + 1) % HERO_SLIDES.length), 5000); }}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
}

// Desktop sub-app spotlight (simplified)
function DesktopSubAppRow() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { to: '/koyambedu', gradient: 'linear-gradient(135deg,#14532d,#16a34a)', emoji: '🌿', name: 'Koyambedu Daily', sub: 'Fresh Market Produce' },
        { to: '/uzhavar',   gradient: 'linear-gradient(135deg,#134e4a,#0d9488)', emoji: '🌾', name: 'Farmer Fresh',    sub: 'Direct from Farms'  },
        { to: '/eptofresh', gradient: 'linear-gradient(135deg,#431407,#c2410c)', emoji: '🥩', name: 'EptoFresh',       sub: 'Chicken · Mutton · Fish' },
      ].map(v => (
        <Link key={v.to} to={v.to}
          className="relative rounded-2xl overflow-hidden p-5 flex flex-col justify-between hover:scale-105 hover:shadow-xl transition-all active:scale-95"
          style={{ background: v.gradient, minHeight: 120 }}>
          <span className="text-4xl absolute right-4 top-4 opacity-30">{v.emoji}</span>
          <div>
            <p className="text-white font-black text-lg leading-tight">{v.name}</p>
            <p className="text-white/60 text-xs mt-1">{v.sub}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-white text-xs font-bold mt-4">
            Shop Now <FiArrowRight size={11} />
          </span>
        </Link>
      ))}
    </div>
  );
}

// Desktop Koyambedu category sections
function DesktopKBDSections({ sections, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-24 h-5 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[0,1,2,3].map(j => (
                <div key={j} className="rounded-xl overflow-hidden">
                  <div className="h-36 bg-gray-100 animate-pulse" />
                  <div className="p-2 space-y-1">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <div className="text-5xl mb-4">🌿</div>
        <h3 className="font-black text-gray-800 text-xl mb-2">Coming Soon</h3>
        <p className="text-gray-500">Fresh products arriving from Koyambedu market shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.category._id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{section.category.icon}</span>
              <h3 className="font-black text-gray-900">{section.category.name}</h3>
              <span className="text-xs text-gray-400">({section.products.length})</span>
            </div>
            <Link to={`/koyambedu/shop?category=${section.category._id}`}
              className="text-xs font-black text-green-600 flex items-center gap-1 hover:gap-2 transition-all">
              See all <FiChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {section.products.slice(0, 4).map(p => (
              <Link key={p._id} to={`/koyambedu/product/${p._id}`}
                className="group rounded-xl overflow-hidden hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="relative" style={{ aspectRatio: '1', background: '#dcfce7' }}>
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">{section.category.icon}</div>
                  )}
                  {p.lowestUnitPrice && (
                    <div className="absolute bottom-0 left-0 right-0 p-2"
                      style={{ background: 'linear-gradient(to top,rgba(5,46,22,.7),transparent)' }}>
                      <span className="text-white font-black text-sm">₹{p.lowestUnitPrice}</span>
                      <span className="text-white/70 text-[10px]">/{p.unit}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                  {p.lowestUnitPrice && (
                    <p className="text-[11px] font-black text-green-600 mt-1">From ₹{p.lowestUnitPrice}/{p.unit}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// HOME PAGE — root component
// ══════════════════════════════════════════════════════════
export default function Home() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/koyambedu/products/by-category?limit=8')
      .then(r => setSections(r.data?.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <EptoSEO app="main" page="home" />
      <Navbar />

      <main className="min-h-screen pb-24 md:pb-8">

        {/* ══ DESKTOP LAYOUT ══ */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pt-4">
          <DesktopHero />
          <DesktopSubAppRow />

          {/* Trust strip */}
          <div className="flex items-center justify-between gap-2 bg-white rounded-2xl px-5 py-2.5 border border-gray-100 shadow-sm mb-6">
            {[
              { Icon: FiTruck,       color: '#f4941c', label: 'Fast Pan-India Delivery' },
              { Icon: FiCheckCircle, color: '#16a34a', label: 'Verified Sellers' },
              { Icon: FiRefreshCw,   color: '#3b82f6', label: '7-Day Easy Returns' },
              { Icon: FiTag,         color: '#9333ea', label: 'Direct Seller Prices' },
              { Icon: FiShield,      color: '#0d9488', label: 'Secure Razorpay Checkout' },
            ].map((b, i, arr) => (
              <React.Fragment key={b.label}>
                {i > 0 && <span className="w-px h-5 bg-gray-100 flex-shrink-0" />}
                <div className="flex items-center gap-2 min-w-0">
                  <b.Icon size={15} style={{ color: b.color }} className="flex-shrink-0" />
                  <p className="text-xs font-bold text-gray-700 truncate">{b.label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Koyambedu category sections */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
                <span>🌿</span> Fresh from Koyambedu Daily
              </h2>
              <Link to="/koyambedu/shop"
                className="text-sm font-black text-green-600 flex items-center gap-1 hover:gap-2 transition-all">
                Shop All <FiArrowRight size={14} />
              </Link>
            </div>
            <DesktopKBDSections sections={sections} loading={loading} />
          </div>
        </div>

        {/* ══ MOBILE LAYOUT — fully Koyambedu Daily ══ */}
        <div className="md:hidden">
          <KBDMobileMarket />
        </div>

      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
