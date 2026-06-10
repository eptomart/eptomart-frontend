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
import Footer from '../components/common/Footer';
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

// ── Product Card (used in both grid and slider) ────────────────
function ProductGridCard({ product: p, accent = '#f4941c' }) {
  const orig = p.price || 0;
  const disc = p.discountPrice && p.discountPrice < orig ? p.discountPrice : null;
  const pct  = disc ? Math.round(((orig - disc) / orig) * 100) : 0;
  const img  = p.images?.find(i => i.isDefault)?.url || p.images?.[0]?.url || '';
  return (
    <Link to={`/product/${p.slug || p._id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-95 group flex flex-col">
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {img
          ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        }
        {pct >= 5 && (
          <div className="absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md"
            style={{ background: accent }}>
            {pct}% OFF
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-[12px] font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="text-sm font-extrabold text-gray-900">₹{(disc || orig).toLocaleString('en-IN')}</span>
          {disc && <span className="text-[10px] text-gray-400 line-through">₹{orig.toLocaleString('en-IN')}</span>}
        </div>
        {p.ratings?.average > 0 && (
          <span className="text-[10px] text-amber-500 font-semibold">⭐ {p.ratings.average.toFixed(1)}</span>
        )}
      </div>
    </Link>
  );
}

// ── Desktop: static 5-col product grid (no animation "train") ─
function DesktopProductGrid({ products, accent }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;
  const pages = Math.ceil(products.length / PER_PAGE);
  const visible = products.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div>
      <div className="grid grid-cols-5 gap-4 px-4">
        {visible.map((p, i) => <ProductGridCard key={`${p._id}-${i}`} product={p} accent={accent} />)}
        {/* Fill empty slots */}
        {visible.length < PER_PAGE && [...Array(PER_PAGE - visible.length)].map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4 px-4">
          {[...Array(pages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile: smooth CSS-transform slider (no "train" scroll) ────
function MobileProductSlider({ products, accent }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const total = products.length;
  // Show 2 cards per "frame" on mobile
  const VISIBLE = 2;
  const maxIdx = Math.max(0, total - VISIBLE);

  const advance = useCallback(() => {
    setIdx(i => (i >= maxIdx ? 0 : i + 1));
  }, [maxIdx]);

  useEffect(() => {
    timerRef.current = setInterval(advance, 3000);
    return () => clearInterval(timerRef.current);
  }, [advance]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 3000);
  };

  return (
    <div className="px-4 overflow-hidden">
      <div
        className="flex gap-3"
        style={{
          transform: `translateX(calc(-${idx} * (50% + 6px)))`,
          transition: idx === 0 && products.length > 0 ? 'none' : 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {products.map((p, i) => (
          <div key={`${p._id}-${i}`} className="flex-shrink-0" style={{ width: 'calc(50% - 6px)' }}>
            <ProductGridCard product={p} accent={accent} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {total > VISIBLE && (
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(maxIdx + 1)].map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); resetTimer(); }}
              className={`h-1 rounded-full transition-all ${i === idx ? 'w-4 bg-orange-500' : 'w-1 bg-gray-300'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Combined carousel: desktop grid / mobile slider ────────────
function ProductCarouselTrack({ products, accent }) {
  return (
    <>
      <div className="hidden md:block"><DesktopProductGrid products={products} accent={accent} /></div>
      <div className="md:hidden"><MobileProductSlider products={products} accent={accent} /></div>
    </>
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
    <div className="px-4 space-y-2.5">

      {/* Row 1: Koyambedu + Uzhavar side by side */}
      <div className="grid grid-cols-2 gap-2.5">

        {/* Koyambedu Daily */}
        <Link to="/koyambedu"
          className="relative rounded-2xl overflow-hidden active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(145deg,#0f3d1f 0%,#15803d 55%,#22c55e 100%)', minHeight: 175 }}>
          {/* Scattered food bg */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <span className="absolute text-[60px] opacity-[0.18]" style={{ top: -12, right: -12, transform: 'rotate(15deg)' }}>🥬</span>
            <span className="absolute text-[32px] opacity-[0.14]" style={{ bottom: 22, right: 6, transform: 'rotate(-10deg)' }}>🥕</span>
            <span className="absolute text-[22px] opacity-[0.12]" style={{ top: 58, right: 20, transform: 'rotate(5deg)' }}>🥦</span>
            <span className="absolute text-[18px] opacity-[0.13]" style={{ bottom: 8, left: 50, transform: 'rotate(-5deg)' }}>🌸</span>
            <span className="absolute text-[16px] opacity-[0.10]" style={{ top: 28, right: 36 }}>🍅</span>
            <div className="absolute rounded-full" style={{ width: 90, height: 90, background: 'rgba(74,222,128,0.12)', top: -25, right: -25 }} />
          </div>
          <div className="relative z-10 p-3.5 flex flex-col" style={{ minHeight: 175 }}>
            <span className="inline-block text-[8px] font-black px-2 py-1 rounded-full w-fit"
              style={{ background: '#facc15', color: '#14532d' }}>ORDER BY 10 AM</span>
            <div className="mt-2 flex-1">
              <p className="text-white font-black text-[13px] leading-tight">Koyambedu Daily</p>
              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#bbf7d0' }}>
                Veggies · Fruits<br />Flowers · Temple
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
              Order Now <FiArrowRight size={9} />
            </span>
          </div>
        </Link>

        {/* Uzhavar Fresh */}
        <Link to="/uzhavar"
          className="relative rounded-2xl overflow-hidden active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(145deg,#0a2e2b 0%,#0d766e 55%,#14b8a6 100%)', minHeight: 175 }}>
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <span className="absolute text-[56px] opacity-[0.18]" style={{ top: -10, right: -10, transform: 'rotate(-10deg)' }}>🌾</span>
            <span className="absolute text-[30px] opacity-[0.14]" style={{ bottom: 20, right: 8, transform: 'rotate(8deg)' }}>🌽</span>
            <span className="absolute text-[20px] opacity-[0.12]" style={{ top: 55, right: 22 }}>🌿</span>
            <span className="absolute text-[18px] opacity-[0.11]" style={{ bottom: 10, left: 44 }}>🥬</span>
            <span className="absolute text-[15px] opacity-[0.10]" style={{ top: 30, right: 38 }}>🍋</span>
            <div className="absolute rounded-full" style={{ width: 90, height: 90, background: 'rgba(45,212,191,0.12)', top: -25, right: -25 }} />
          </div>
          <div className="relative z-10 p-3.5 flex flex-col" style={{ minHeight: 175 }}>
            <span className="inline-block text-[8px] font-black px-2 py-1 rounded-full w-fit"
              style={{ background: '#a3e635', color: '#134e4a' }}>FARM DIRECT</span>
            <div className="mt-2 flex-1">
              <p className="text-white font-black text-[13px] leading-tight">Uzhavar Fresh</p>
              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#99f6e4' }}>
                உழவர் சந்தை<br />No middlemen
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-white text-[11px] font-bold mt-2">
              Explore <FiArrowRight size={9} />
            </span>
          </div>
        </Link>

      </div>

      {/* Row 2: EptoFresh Proteins — full width hero */}
      <Link to="/eptofresh"
        className="relative rounded-2xl overflow-hidden active:scale-95 transition-transform flex"
        style={{ background: 'linear-gradient(135deg,#1a0a00 0%,#7c2d12 38%,#c2410c 72%,#f97316 100%)', minHeight: 120 }}>
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <span className="absolute text-[80px] opacity-[0.14]" style={{ top: -18, right: -18, transform: 'rotate(10deg)' }}>🥩</span>
          <span className="absolute text-[44px] opacity-[0.12]" style={{ bottom: -6, right: 55, transform: 'rotate(-8deg)' }}>🍗</span>
          <span className="absolute text-[34px] opacity-[0.10]" style={{ top: 8, right: 88, transform: 'rotate(5deg)' }}>🐟</span>
          <span className="absolute text-[26px] opacity-[0.10]" style={{ bottom: 4, right: 108, transform: 'rotate(-5deg)' }}>🦐</span>
          <span className="absolute text-[20px] opacity-[0.08]" style={{ top: 18, right: 138 }}>🥚</span>
          <div className="absolute rounded-full" style={{ width: 130, height: 130, background: 'rgba(249,115,22,0.14)', top: -45, right: -25 }} />
          <div className="absolute rounded-full" style={{ width: 70, height: 70, background: 'rgba(194,65,12,0.18)', bottom: -25, left: 25 }} />
        </div>
        <div className="relative z-10 p-4 flex flex-col justify-between w-full" style={{ minHeight: 120 }}>
          <div className="flex items-center gap-2">
            <span className="inline-block text-[8px] font-black px-2 py-1 rounded-full"
              style={{ background: '#fb923c', color: '#fff' }}>HYPERLOCAL</span>
            <span className="text-white/55 text-[9px] font-semibold tracking-wide">GPS-Based · Fresh Daily</span>
          </div>
          <div>
            <p className="text-white font-black text-xl leading-tight">EptoFresh Proteins</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#fed7aa' }}>
              Chicken · Mutton · Fish · Seafood · Ready to Cook
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-white text-xs font-bold">
            Order Now <FiArrowRight size={10} />
          </span>
        </div>
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

// ── Desktop category data ──────────────────────────────────────
const EPTOMART_CATS = [
  { name: 'Grocery & Staples',   slug: 'grocery-staples',    emoji: '🛒', color: '#3b82f6', from: '₹49' },
  { name: 'Masalas & Spices',    slug: 'masalas-spices',     emoji: '🌶️', color: '#ef4444', from: '₹29' },
  { name: 'Snacks & Namkeen',    slug: 'snacks-namkeen',     emoji: '🍿', color: '#ec4899', from: '₹39' },
  { name: 'Dry Fruits & Nuts',   slug: 'dry-fruits-nuts',    emoji: '🥜', color: '#92400e', from: '₹99' },
  { name: 'Oils & Ghee',         slug: 'oils-ghee',          emoji: '🫙', color: '#d97706', from: '₹89' },
  { name: 'Pickles & Condiments',slug: 'pickles-condiments', emoji: '🥒', color: '#16a34a', from: '₹59' },
  { name: 'Bakery & Dairy',      slug: 'bakery-dairy',       emoji: '🥖', color: '#f59e0b', from: '₹29' },
  { name: 'Health & Organic',    slug: 'health-organic',     emoji: '🌿', color: '#059669', from: '₹79' },
];

// ── Desktop Hero (JioMart-style, hidden on mobile) ─────────────
const HERO_SLIDES = [
  {
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 55%, #dc2626 100%)',
    tag: '🔥 Hot Deals This Week',
    title: 'Shop Fresh,\nSave Big!',
    sub: 'Groceries · Masalas · Organic Foods',
    cta: 'Shop Now', to: '/shop',
    cats: ['Grocery & Staples', 'Masalas & Spices', 'Snacks & Namkeen', 'Oils & Ghee'],
  },
  {
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 55%, #4ade80 100%)',
    tag: '🥬 Order by 10 AM, Get Today',
    title: 'Koyambedu\nDaily Fresh',
    sub: 'Vegetables · Fruits · Flowers · Temple',
    cta: 'Order Now', to: '/koyambedu',
    cats: ['Fruits', 'Vegetables', 'Flowers & Greens', 'Pooja & Coconut'],
  },
  {
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #2dd4bf 100%)',
    tag: '🌾 Farm-to-Door in Tamil Nadu',
    title: 'Uzhavar Fresh\nஉழவர் சந்தை',
    sub: 'Farm direct · No middlemen · Pure & Natural',
    cta: 'Explore', to: '/uzhavar',
    cats: ['Farm Fresh', 'Homemade & Organic', 'Farm Produce'],
  },
  {
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 40%, #c2410c 75%, #f97316 100%)',
    tag: '🥩 Hyperlocal · GPS-Based · Fresh Daily',
    title: 'EptoFresh\nProteins',
    sub: 'Chicken · Mutton · Fish · Seafood · Ready to Cook',
    cta: 'Order Now', to: '/eptofresh',
    cats: ['Chicken', 'Mutton', 'Fish', 'Seafood', 'Ready to Cook'],
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
  const catItems = EPTOMART_CATS.concat([
    { name: 'Koyambedu Daily',    slug: null, emoji: '🥬', color: '#16a34a', from: 'Fresh' },
    { name: 'Uzhavar Fresh',      slug: null, emoji: '🌾', color: '#0d9488', from: 'Farm' },
    { name: 'EptoFresh Proteins', slug: null, emoji: '🥩', color: '#c2410c', from: 'Nearby' },
  ]);

  return (
    <div className="relative overflow-hidden rounded-3xl mb-5" style={{ background: s.gradient, minHeight: 300 }}>
      {/* BG decoration */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-black/10" />
      <div className="absolute right-64 -bottom-10 w-36 h-36 rounded-full bg-white/8" />

      <div className="relative z-10 flex items-stretch min-h-[300px]">
        {/* Left: text + CTA */}
        <div className="flex flex-col justify-center pl-10 pr-6 py-8 w-[42%]">
          <span className="inline-block bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-3 border border-white/30">
            {s.tag}
          </span>
          <h1 className="text-4xl font-black text-white leading-tight whitespace-pre-line drop-shadow-sm">
            {s.title}
          </h1>
          <p className="text-white/75 text-sm mt-2.5 font-medium">{s.sub}</p>
          <button
            onClick={() => navigate(s.to)}
            className="mt-5 inline-flex items-center gap-2 bg-white font-black text-sm px-7 py-3 rounded-2xl w-fit hover:shadow-xl hover:scale-105 transition-all active:scale-95"
            style={{ color: '#f4941c' }}
          >
            {s.cta} <FiArrowRight size={15} />
          </button>
        </div>

        {/* Right: category cards carousel */}
        <div className="flex-1 flex items-center justify-end pr-8 pl-4 py-8 gap-3 overflow-hidden">
          {EPTOMART_CATS.slice(0, 5).map((cat, i) => (
            <Link
              key={cat.slug}
              to={`/shop/${cat.slug}`}
              className="flex-shrink-0 flex flex-col items-center bg-white/95 backdrop-blur-sm rounded-2xl px-4 pt-4 pb-3.5 w-[108px] hover:scale-105 hover:shadow-xl transition-all active:scale-95 group"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2 transition-transform group-hover:scale-110"
                style={{ background: `${cat.color}18` }}>
                {cat.emoji}
              </div>
              <p className="text-[11px] font-bold text-gray-800 text-center leading-tight line-clamp-2">{cat.name}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: '#f4941c' }}>From {cat.from}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-4 left-10 flex gap-1.5 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button key={i}
            onClick={() => { setActive(i); clearInterval(timerRef.current); timerRef.current = setInterval(() => setActive(a => (a + 1) % HERO_SLIDES.length), 5000); }}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Desktop Category Strip (JioMart-style row, hidden mobile) ──
function DesktopCategoryStrip() {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">Shop by Category</h2>
        <Link to="/categories" className="text-sm font-bold text-orange-500 flex items-center gap-1 hover:gap-2 transition-all">
          All categories <FiChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-8 gap-3">
        {EPTOMART_CATS.map(cat => (
          <Link key={cat.slug} to={`/shop/${cat.slug}`}
            className="relative flex flex-col items-center gap-2.5 rounded-2xl pt-5 pb-4 px-2 overflow-hidden active:scale-95 transition-all group text-center hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: `linear-gradient(145deg, ${cat.color}12 0%, ${cat.color}06 100%)`, border: `1.5px solid ${cat.color}20` }}>
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
              style={{ background: `linear-gradient(145deg, ${cat.color}22 0%, ${cat.color}10 100%)` }} />
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-115 flex-shrink-0 shadow-sm"
              style={{ background: `${cat.color}20` }}>
              {cat.emoji}
            </div>
            <div className="relative">
              <p className="text-[11px] font-extrabold leading-snug line-clamp-2" style={{ color: cat.color }}>
                {cat.name}
              </p>
              <span className="text-[9px] font-semibold text-gray-400 mt-0.5 block">From {cat.from}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Desktop 4-col Promo Banners (hidden mobile) ────────────────
function DesktopPromoGrid({ onScrollTo }) {
  const navigate = useNavigate();
  const banners = [
    {
      gradient: 'linear-gradient(135deg,#14532d,#16a34a,#4ade80)',
      tag: 'ORDER BY 10 AM', emoji: '🥬',
      title: 'Koyambedu Daily',
      sub: 'Fresh Veggies · Fruits · Flowers',
      cta: 'Order Now', action: () => navigate('/koyambedu'),
    },
    {
      gradient: 'linear-gradient(135deg,#134e4a,#0f766e,#2dd4bf)',
      tag: 'FARM DIRECT', emoji: '🌾',
      title: 'Uzhavar Fresh',
      sub: 'உழவர் சந்தை · No middlemen',
      cta: 'Explore', action: () => navigate('/uzhavar'),
    },
    {
      gradient: 'linear-gradient(135deg,#1a0a00,#7c2d12,#f97316)',
      tag: 'GPS · HYPERLOCAL', emoji: '🥩',
      title: 'EptoFresh Proteins',
      sub: 'Chicken · Mutton · Fish · Seafood',
      cta: 'Order Now', action: () => navigate('/eptofresh'),
    },
    {
      gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626,#fb923c)',
      tag: '⚡ ENDS SOON', emoji: '🔥',
      title: 'Flash Deals',
      sub: 'Up to 60% off · Today only',
      cta: 'Grab Now', action: () => onScrollTo('section-flash'),
    },
    {
      gradient: 'linear-gradient(135deg,#312e81,#4f46e5,#818cf8)',
      tag: '⭐ HANDPICKED', emoji: '✨',
      title: 'Featured Products',
      sub: 'Curated · Premium Quality',
      cta: 'Shop Now', action: () => onScrollTo('section-featured'),
    },
  ];
  return (
    <div className="grid grid-cols-4 gap-4 mb-5">
      {banners.map(b => (
        <button key={b.title} onClick={b.action}
          className="relative flex flex-col justify-between rounded-2xl p-5 overflow-hidden text-left active:scale-95 transition-transform hover:shadow-xl group"
          style={{ background: b.gradient, minHeight: 130 }}>
          <div className="absolute -bottom-4 -right-4 text-6xl opacity-15 select-none pointer-events-none transition-transform group-hover:scale-125 group-hover:opacity-25">
            {b.emoji}
          </div>
          <div className="relative z-10">
            <span className="bg-white/25 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">
              {b.tag}
            </span>
            <p className="text-white font-black text-base mt-2 leading-tight">{b.title}</p>
            <p className="text-white/70 text-[11px] mt-0.5">{b.sub}</p>
          </div>
          <span className="relative z-10 inline-flex items-center gap-1 text-white text-xs font-bold mt-3 group-hover:gap-2 transition-all">
            {b.cta} <FiArrowRight size={11} />
          </span>
        </button>
      ))}
    </div>
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

  // Featured: up to 10 on desktop (shown as grid), 4 on mobile (slider)
  const featuredProducts = useMemo(() => allProducts.slice(0, 10), [allProducts]);

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
        <title>Eptomart — Online Shopping India | Groceries, Fashion, Electronics</title>
        <meta name="description" content="Shop on Eptomart — India's trusted online store. Fresh groceries, Koyambedu Daily produce, Uzhavar farm-direct, electronics, fashion & more. Fast pan-India delivery. GST invoices. Verified sellers." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href="https://www.eptomart.com/" />
        <meta name="keywords" content="online shopping india, buy groceries online, koyambedu market online, farmer fresh vegetables, eptomart, indian ecommerce, buy electronics india, fashion online india, fresh produce delivery" />
        {/* Homepage structured data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": "https://www.eptomart.com/#webpage",
          "url": "https://www.eptomart.com/",
          "name": "Eptomart — Online Shopping India",
          "isPartOf": { "@id": "https://www.eptomart.com/#website" },
          "about": { "@id": "https://www.eptomart.com/#organization" },
          "description": "India's trusted multi-category online shopping platform. Shop electronics, fashion, groceries, fresh produce and more.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.eptomart.com/" }]
          }
        })}</script>
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-8">

        {/* ══════════════════════════════════════════
            DESKTOP LAYOUT (md and above)
        ══════════════════════════════════════════ */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pt-4">
          {/* 1. Big hero banner */}
          <DesktopHero />

          {/* 2. Category card strip */}
          <DesktopCategoryStrip />

          {/* 3. Promo 4-col banners */}
          <DesktopPromoGrid onScrollTo={(id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} />

          {/* 4. Trust strip */}
          <div className="flex gap-3 mb-5">
            {[
              { icon: '⚡', label: 'Fast Delivery', sub: 'Pan-India via Shiprocket' },
              { icon: '✅', label: 'Verified Sellers', sub: 'GST & FSSAI checked' },
              { icon: '🔄', label: 'Easy Returns', sub: '7-day return policy' },
              { icon: '💸', label: 'Best Prices', sub: 'Direct from seller' },
              { icon: '🛡️', label: 'Secure Pay', sub: 'Razorpay encrypted' },
            ].map(b => (
              <div key={b.label} className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
                <span className="text-2xl leading-none">{b.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{b.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MOBILE LAYOUT (below md)
        ══════════════════════════════════════════ */}
        <div className="md:hidden">
          <div className="pb-4 pt-3"><SubAppBanners /></div>
          <div className="pb-4"><PromoBanner /></div>
          <div className="pb-4"><TrustStrip /></div>
        </div>

        {/* ── FEATURED PRODUCTS — shown on both ── */}
        <div className="md:max-w-7xl md:mx-auto">
          <Divider />
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
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-2.5 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
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

          {/* ── FLASH DEALS ── */}
          <section className="pt-4 pb-5">
            {loading
              ? <div className="flex gap-2.5 px-4 overflow-hidden">
                  {[...Array(4)].map((_, i) => (
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

          {/* ── NEW ARRIVALS ── */}
          <section id="section-new" className="pt-4 pb-6">
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
        </div>

        {/* ── WHY EPTOMART (desktop only) ── */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pb-12">
          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
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

      {/* ── QUICK LINKS + POLICY SECTION ── */}
      <div style={{ background: '#f8f9fb' }} className="border-t border-gray-200 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  { label: '🏠 Home',        path: '/'          },
                  { label: '🛍️ Shop',         path: '/shop'      },
                  { label: '📦 My Orders',    path: '/orders'    },
                  { label: '👤 My Profile',   path: '/profile'   },
                  { label: '❤️ Wishlist',     path: '/wishlist'  },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <Link to={path} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Categories</h4>
              <ul className="space-y-2">
                {[
                  { label: '🥦 Vegetables',    path: '/shop?category=vegetables'  },
                  { label: '🍎 Fruits',         path: '/shop?category=fruits'      },
                  { label: '👗 Fashion',         path: '/shop?category=fashion'     },
                  { label: '📱 Electronics',     path: '/shop?category=electronics' },
                  { label: '🗂️ All Categories', path: '/categories'                },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <Link to={path} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help & Support */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Help & Support</h4>
              <ul className="space-y-2">
                {[
                  { label: '📞 Contact Us',       path: '/contact'         },
                  { label: '❓ FAQ',               path: '/faq'             },
                  { label: '🚚 Shipping Policy',   path: '/shipping-policy' },
                  { label: '↩️ Return Policy',     path: '/return-policy'   },
                  { label: '🏪 Sell on Eptomart',  path: '/seller/profile'  },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <Link to={path} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal / Policies */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Policies</h4>
              <ul className="space-y-2">
                {[
                  { label: '🔒 Privacy Policy',   path: '/privacy-policy'  },
                  { label: '📋 Terms of Service',  path: '/terms'           },
                  { label: '🧾 GST Invoices',      path: '/faq#gst'         },
                  { label: '🌿 Uzhavar Fresh',      path: '/uzhavar'         },
                  { label: '🏢 Koyambedu Daily',   path: '/koyambedu'       },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <Link to={path} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
