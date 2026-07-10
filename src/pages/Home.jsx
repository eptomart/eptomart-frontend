// ============================================
// HOME PAGE — Eptomart Premium v4
// Mobile-first, conversion-focused
// Flow: Hero → Trust → Shop-by-Source → Categories → Continue Shopping → Products → New Arrivals
// ============================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import EptoSEO from '../components/common/EptoSEO';
import {
  FiArrowRight, FiSearch, FiZap, FiChevronRight, FiMic, FiX,
  FiStar, FiClock, FiTruck, FiShield, FiCheckCircle, FiRefreshCw,
  FiTag, FiPhone, FiPackage, FiMapPin, FiGrid, FiEye,
} from 'react-icons/fi';
import {
  FaShoppingBasket, FaPepperHot, FaCookieBite, FaSeedling, FaWineBottle,
  FaLemon, FaBreadSlice, FaLeaf, FaCarrot, FaTractor, FaDrumstickBite,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../utils/api';

// ── Recently viewed (localStorage) ────────────────────────────
const RV_KEY = 'eptomart_rv';
const MAX_RV  = 12;
export const trackRecentlyViewed = (product) => {
  try {
    const list  = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
    const fresh = [product, ...list.filter(p => p._id !== product._id)].slice(0, MAX_RV);
    localStorage.setItem(RV_KEY, JSON.stringify(fresh));
  } catch {}
};
const loadRecentlyViewed = () => {
  try { return JSON.parse(localStorage.getItem(RV_KEY) || '[]'); } catch { return []; }
};

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
    <div className="aspect-[5/4] bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
    </div>
  </div>
);

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ Icon, iconColor = '#f4941c', title, link, linkLabel = 'See all', dotColor = 'bg-orange-500' }) {
  return (
    <div className="flex items-center justify-between mb-1.5 px-4">
      <div className="flex items-center gap-2">
        <span className={`w-1 h-5 rounded-full flex-shrink-0 ${dotColor}`} />
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}16` }}>
            <Icon size={13} style={{ color: iconColor }} />
          </span>
        )}
        <h2 className="title-ink text-sm md:text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-xs font-bold text-orange-500 flex items-center gap-0.5 hover:gap-1.5 transition-all">
          {linkLabel} <FiChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Product grid card (Blinkit-style) ─────────────────────────
function ProductGridCard({ product: p, accent = '#f4941c', index = 0 }) {
  const navigate = useNavigate();
  const orig = p.price || 0;
  const disc = p.discountPrice && p.discountPrice < orig ? p.discountPrice : null;
  const pct  = disc ? Math.round(((orig - disc) / orig) * 100) : 0;
  const img  = p.images?.find(i => i.isDefault)?.url || p.images?.[0]?.url || '';
  const unit = p.unit || p.weight || p.size || '';
  const href = `/product/${p.slug || p._id}`;

  return (
    <div
      className="wow-card bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col group"
      style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}
    >
      <Link to={href} className="img-frame relative bg-gray-50 block overflow-hidden" style={{ aspectRatio: '5/4' }}>
        {img
          ? <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" />
          : <div className="w-full h-full flex items-center justify-center"><FiPackage size={30} className="text-gray-200" /></div>}
        {pct >= 5 && (
          <div className="absolute top-1.5 left-1.5 text-white text-center leading-none font-black rounded-md px-1 py-0.5"
            style={{ background: accent, fontSize: 8, minWidth: 28, boxShadow: `0 2px 6px ${accent}70` }}>
            <div style={{ fontSize: 10 }}>{pct}%</div>
            <div>OFF</div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.06), transparent)' }} />
      </Link>

      <div className="p-2 flex flex-col gap-0.5 flex-1">
        <Link to={href}>
          <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
          {unit && <p className="text-[9.5px] text-gray-600 mt-0.5">{unit}</p>}
        </Link>
        <div className="flex items-end justify-between mt-auto pt-1">
          <div>
            <span className="price-pop text-[12px] font-extrabold text-gray-900">₹{(disc || orig).toLocaleString('en-IN')}</span>
            {disc && <span className="text-[9.5px] text-gray-400 line-through ml-1">₹{orig.toLocaleString('en-IN')}</span>}
          </div>
          <button
            onClick={() => navigate(href)}
            className="tap-ripple w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 active:scale-90"
            style={{ background: accent, boxShadow: `0 3px 8px ${accent}55`, fontSize: 20, lineHeight: 1 }}
            aria-label="Add to cart"
          >+</button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop 5-col grid ─────────────────────────────────────────
function DesktopProductGrid({ products, accent }) {
  const [page, setPage] = useState(0);
  const PER = 5;
  const pages = Math.ceil(products.length / PER);
  const visible = products.slice(page * PER, (page + 1) * PER);
  return (
    <div>
      <div className="grid grid-cols-5 gap-3 px-4">
        {visible.map((p, i) => <ProductGridCard key={p._id} product={p} accent={accent} index={i} />)}
        {visible.length < PER && [...Array(PER - visible.length)].map((_, i) => <div key={`e${i}`} />)}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4 px-4">
          {[...Array(pages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-300'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile horizontal slider ───────────────────────────────────
function MobileProductSlider({ products, accent }) {
  return (
    <div className="flex gap-2 px-4 pb-1 overflow-x-auto scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      {products.map((p, i) => (
        <div key={p._id} className="flex-shrink-0" style={{ width: 'calc(30% - 4px)', scrollSnapAlign: 'start' }}>
          <ProductGridCard product={p} accent={accent} index={i} />
        </div>
      ))}
    </div>
  );
}

function ProductCarouselTrack({ products, accent }) {
  return (
    <>
      <div className="hidden md:block"><DesktopProductGrid products={products} accent={accent} /></div>
      <div className="md:hidden"><MobileProductSlider products={products} accent={accent} /></div>
    </>
  );
}

// ── Flash Deals ────────────────────────────────────────────────
function FlashDeals({ products }) {
  const { h, m, s } = useCountdown(6);
  if (!products.length) return null;
  return (
    <section id="section-flash">
      <div className="flex items-center justify-between mb-1.5 px-4">
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
        <Link to="/shop" className="text-xs font-bold text-red-500 flex items-center gap-0.5">See all <FiChevronRight size={12} /></Link>
      </div>
      <ProductCarouselTrack products={products} accent="#ef4444" />
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// SHOP BY SOURCE — Koyambedu · Farmer Fresh · Proteins
// Full-width premium image cards with gradient overlay
// ══════════════════════════════════════════════════════════════
const SOURCE_APPS = [
  {
    to: '/koyambedu',
    img: '/categories/koyambedu.jpg',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
    accentColor: '#34d399',
    badge: 'MARKET FRESH',
    BadgeIcon: FiCheckCircle,
    title: 'Koyambedu Daily',
    titleTamil: 'கோயம்பேடு சந்தை',
    desc: 'Fresh veggies, fruits & flowers direct from market',
    cta: 'Shop Now',
  },
  {
    to: '/uzhavar',
    img: '/categories/uzhavar.jpg',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)',
    accentColor: '#2dd4bf',
    badge: 'FARM DIRECT',
    BadgeIcon: FiCheckCircle,
    title: 'Farmer Fresh',
    titleTamil: 'உழவர் சந்தை',
    desc: 'Farm-to-door from Tamil Nadu farmers. No middlemen.',
    cta: 'Explore',
  },
  {
    to: '/eptofresh',
    img: '/categories/proteins.jpg',
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 50%, #c2410c 100%)',
    accentColor: '#fb923c',
    badge: 'GPS · HYPERLOCAL',
    BadgeIcon: FiMapPin,
    title: 'Proteins',
    titleTamil: 'மீட் & சீஃபுட்',
    desc: 'Fresh chicken, mutton, fish & seafood from nearby shops',
    cta: 'Order Now',
  },
];

// Highlighted 3-tile row — gradient dark backgrounds
const SOURCE_TILES = [
  {
    to: '/koyambedu', emoji: '🥬', label: 'Koyambedu', sub: 'Market Fresh',
    gradient: 'linear-gradient(145deg, #064e3b 0%, #059669 100%)',
    shadow: '0 6px 18px rgba(6,78,59,0.38)',
  },
  {
    to: '/uzhavar', emoji: '🌾', label: 'Farmer Fresh', sub: 'Farm Direct',
    gradient: 'linear-gradient(145deg, #134e4a 0%, #0d9488 100%)',
    shadow: '0 6px 18px rgba(13,148,136,0.32)',
  },
  {
    to: '/eptofresh', emoji: '🥩', label: 'Proteins', sub: 'Hyperlocal',
    gradient: 'linear-gradient(145deg, #7c2d12 0%, #ea580c 100%)',
    shadow: '0 6px 18px rgba(234,88,12,0.32)',
  },
];

function ShopBySource() {
  // Admin-configurable market video — plays as the live background of
  // the Koyambedu hero tile (falls back to the photo when not set)
  const [heroVideo, setHeroVideo] = useState(null);
  useEffect(() => {
    api.get('/settings')
      .then(r => {
        const v = r.data?.settings?.koyambeduHeroVideo;
        if (v?.enabled && v?.url) setHeroVideo(v);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-4 space-y-2">
      {/* Koyambedu Daily — HERO tile (live video when configured) */}
      <Link to="/koyambedu"
        className="tap-ripple relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform block"
        style={{ aspectRatio: '2.4/1', maxHeight: 165, boxShadow: '0 8px 28px rgba(6,78,59,0.50)' }}>
        {heroVideo ? (
          <video
            src={heroVideo.url}
            poster={heroVideo.poster || '/categories/koyambedu.jpg'}
            autoPlay muted loop playsInline preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setHeroVideo(null)}
          />
        ) : (
          <img src="/categories/koyambedu.jpg" alt="Koyambedu Market"
            className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(100deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.15) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          {/* Top: badges */}
          <div className="flex items-start justify-between">
            <span className="bg-emerald-500 text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow">
              MARKET FRESH · DAILY
            </span>
            <span className="bg-black/40 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/25">
              🏆 Asia's Largest
            </span>
          </div>
          {/* Middle: headline + stats */}
          <div>
            <p className="text-white font-black text-[22px] leading-tight tracking-tight"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              Koyambedu Daily
            </p>
            <div className="flex gap-1.5 mt-2">
              {[['2,000+','Vendors'],['300+','Varieties'],['1,000T','Daily Trade']].map(([num, label]) => (
                <div key={label} className="bg-white/20 rounded-lg px-2 py-1 border border-white/30">
                  <p className="text-white font-black text-[11px] leading-tight">{num}</p>
                  <p className="text-white text-[8px] opacity-80 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom: CTA */}
          <div className="flex justify-start">
            <span className="bg-emerald-500 text-white font-black text-[11px] px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg">
              Shop Now <FiArrowRight size={11} />
            </span>
          </div>
        </div>
      </Link>

      {/* Farmer Fresh + Proteins — "Coming Soon" tiles */}
      <div className="grid grid-cols-2 gap-2">
        {/* Farmer Fresh */}
        <Link to="/uzhavar"
          className="glow-float tease relative overflow-hidden rounded-xl active:scale-[0.96] transition-transform block"
          style={{ aspectRatio: '2/1', maxHeight: 100, boxShadow: '0 4px 16px rgba(13,148,136,0.35)' }}>
          <img src="/categories/uzhavar.jpg" alt="Farmer Fresh"
            className="absolute inset-0 w-full h-full object-cover" />
          {/* Stronger overlay to dim image for "coming soon" feel */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.20) 100%)' }} />
          {/* Coming Soon badge — top right */}
          <div className="absolute top-1.5 right-1.5">
            <span className="tease-badge text-white font-black tracking-wide px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(13,148,136,0.85)', fontSize: 7, backdropFilter: 'blur(4px)' }}>
              COMING SOON
            </span>
          </div>
          {/* Bottom text */}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2">
            <p className="text-white font-black text-[13px] leading-tight drop-shadow-sm">Farmer Fresh</p>
            <p className="text-[10px] font-bold"><span className="tease-sub" style={{ color: '#5eead4' }}>🌱 Coming Soon to Serve You</span></p>
          </div>
        </Link>

        {/* Proteins */}
        <Link to="/eptofresh"
          className="glow-float tease relative overflow-hidden rounded-xl active:scale-[0.96] transition-transform block"
          style={{ aspectRatio: '2/1', maxHeight: 100, boxShadow: '0 4px 16px rgba(234,88,12,0.35)' }}>
          <img src="/categories/proteins.jpg" alt="Proteins"
            className="absolute inset-0 w-full h-full object-cover" />
          {/* Stronger overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.20) 100%)' }} />
          {/* Coming Soon badge — top right */}
          <div className="absolute top-1.5 right-1.5">
            <span className="tease-badge text-white font-black tracking-wide px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(194,65,12,0.85)', fontSize: 7, backdropFilter: 'blur(4px)' }}>
              COMING SOON
            </span>
          </div>
          {/* Bottom text */}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2">
            <p className="text-white font-black text-[13px] leading-tight drop-shadow-sm">Proteins</p>
            <p className="text-[10px] font-bold"><span className="tease-sub" style={{ color: '#fdba74' }}>🥩 Coming Soon to Serve You</span></p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TRUST STRIP — horizontal scroll on mobile
// ══════════════════════════════════════════════════════════════
const TRUST_ITEMS = [
  { Icon: FiTruck,       color: '#f4941c', label: 'Direct Sourcing' },
  { Icon: FiCheckCircle, color: '#16a34a', label: 'Fresh Quality' },
  { Icon: FiShield,      color: '#3b82f6', label: 'Verified Sellers' },
  { Icon: FiTag,         color: '#9333ea', label: 'Secure Payments' },
  { Icon: FiRefreshCw,   color: '#0d9488', label: 'Reliable Delivery' },
];

function TrustStrip() {
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TRUST_ITEMS.map(b => (
          <div key={b.label}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-1.5"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <b.Icon size={14} style={{ color: b.color }} />
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROMO BANNERS — promotional, not generic branding
// Auto-rotates every 4 seconds
// ══════════════════════════════════════════════════════════════
const PROMOS = [
  {
    bg:   'linear-gradient(130deg, #065f46 0%, #16a34a 60%, #4ade80 100%)',
    glow: 'rgba(74,222,128,0.4)',
    Icon: FiTruck,
    tag: '🚚 Limited Time',
    title: 'Free Delivery Above ₹999',
    sub: 'On all orders across Eptomart',
    to: '/shop', cta: 'Shop Now',
  },
  {
    bg:   'linear-gradient(130deg, #064e3b 0%, #059669 60%, #34d399 100%)',
    glow: 'rgba(52,211,153,0.4)',
    Icon: FaCarrot,
    tag: '🌿 Just Arrived',
    title: 'Fresh Koyambedu Arrivals',
    sub: 'Veggies & fruits from today\'s market',
    to: '/koyambedu', cta: 'Order Now',
  },
  {
    bg:   'linear-gradient(130deg, #7c2d12 0%, #c2410c 60%, #f97316 100%)',
    glow: 'rgba(249,115,22,0.4)',
    Icon: FaLemon,
    tag: '🥒 New Launch',
    title: 'New Pickle Collection',
    sub: 'Traditional Tamil pickles & chutneys',
    to: '/shop/pickles-condiments', cta: 'Explore',
  },
  {
    bg:   'linear-gradient(130deg, #f97316 0%, #ef4444 60%, #dc2626 100%)',
    glow: 'rgba(239,68,68,0.45)',
    Icon: FiZap,
    tag: '⚡ This Week',
    title: 'Weekly Specials',
    sub: 'Up to 40% off on selected items',
    to: '/shop?sort=-discount', cta: 'Grab Deals',
  },
  {
    bg:   'linear-gradient(130deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)',
    glow: 'rgba(129,140,248,0.45)',
    Icon: FiStar,
    tag: '🌸 Season Special',
    title: 'Seasonal Offers',
    sub: 'Fresh seasonal produce at best prices',
    to: '/shop', cta: 'Explore',
  },
];

function PromoBanner() {
  const [active, setActive] = useState(0);
  const timer = useRef(null);
  const restart = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4000);
  };
  useEffect(() => { restart(); return () => clearInterval(timer.current); }, []);
  const p = PROMOS[active];

  return (
    <div className="px-4">
      <Link
        to={p.to}
        className="relative flex items-center gap-3 rounded-2xl px-4 py-3 overflow-hidden active:scale-[0.97] transition-transform duration-150"
        style={{ background: p.bg, boxShadow: `0 4px 18px ${p.glow}` }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 55%)' }} />

        {/* Icon badge */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
          style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(6px)' }}>
          <p.Icon size={16} className="text-white" />
        </div>

        {/* Text */}
        <div key={active} className="flex-1 min-w-0 relative z-10">
          <p className="text-white/70 text-[10px] font-semibold mb-0.5">{p.tag}</p>
          <p className="text-white font-black text-[15px] leading-tight truncate tracking-tight">{p.title}</p>
          <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.68)' }}>{p.sub}</p>
        </div>

        {/* CTA + dots */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 relative z-10">
          <span className="bg-white text-[11px] font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shadow"
            style={{ color: '#111827' }}>
            {p.cta} <FiArrowRight size={10} />
          </span>
          <div className="flex gap-1">
            {PROMOS.map((_, i) => (
              <button key={i} onClick={e => { e.preventDefault(); setActive(i); restart(); }}
                className={`h-1 rounded-full transition-all duration-300 ${i === active ? 'w-4 bg-white' : 'w-1 bg-white/35'}`} />
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CATEGORY STRIP — consistent circles, identical sizing
// ══════════════════════════════════════════════════════════════
const EPTOMART_CATS = [
  { name: 'Grocery & Staples',    short: 'Grocery',    slug: 'grocery-staples',    Icon: FaShoppingBasket, color: '#3b82f6', img: '/categories/grocery.jpg' },
  { name: 'Masalas & Spices',     short: 'Masalas',    slug: 'masalas-spices',     Icon: FaPepperHot,      color: '#ef4444', img: '/categories/masalas.jpg' },
  { name: 'Snacks & Namkeen',     short: 'Snacks',     slug: 'snacks-namkeen',     Icon: FaCookieBite,     color: '#ec4899', img: '/categories/snacks.jpg' },
  { name: 'Dry Fruits & Nuts',    short: 'Dry Fruits', slug: 'dry-fruits-nuts',    Icon: FaSeedling,       color: '#92400e', img: '/categories/dryfruits.jpg' },
  { name: 'Oils & Ghee',          short: 'Oils',       slug: 'oils-ghee',          Icon: FaWineBottle,     color: '#d97706', img: '/categories/oils.jpg' },
  { name: 'Pickles & Condiments', short: 'Pickles',    slug: 'pickles-condiments', Icon: FaLemon,          color: '#16a34a', img: '/categories/pickles.jpg' },
  { name: 'Bakery & Dairy',       short: 'Bakery',     slug: 'bakery-dairy',       Icon: FaBreadSlice,     color: '#f59e0b', img: '/categories/bakery.jpg' },
  { name: 'Health & Organic',     short: 'Organic',    slug: 'health-organic',     Icon: FaLeaf,           color: '#059669', img: '/categories/organic.jpg' },
];

// Unified circle size — 56px circles, identical border, shadow, padding, font
function MobileCategoryStrip() {
  const { pathname } = useLocation();

  const cats = [
    { key: 'all', label: 'All', img: null, Icon: FiGrid, color: '#f4941c', to: '/shop' },
    ...EPTOMART_CATS.map(c => ({ key: c.slug, label: c.short, img: c.img, Icon: c.Icon, color: c.color, to: `/shop/${c.slug}` })),
  ];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex overflow-x-auto scrollbar-hide px-3 py-2 gap-0">
        {cats.map(c => {
          const isActive = pathname === c.to || pathname.startsWith(c.to + '/');
          return (
            <Link key={c.key} to={c.to}
              className="flex-shrink-0 flex flex-col items-center w-[68px] active:scale-90 transition-transform duration-150 relative pb-1.5">
              {/* Standardised circle — identical size & shadow across all items */}
              <div
                className="w-[56px] h-[56px] rounded-full overflow-hidden mb-1.5 relative flex-shrink-0"
                style={{
                  border: isActive ? `2.5px solid ${c.color}` : '2px solid #f0f0f0',
                  boxShadow: isActive ? `0 0 0 3px ${c.color}22, 0 2px 8px rgba(0,0,0,0.08)` : '0 1px 4px rgba(0,0,0,0.06)',
                  background: '#fafafa',
                }}
              >
                {c.img ? (
                  <img src={c.img} alt={c.label} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(145deg, ${c.color}cc, ${c.color})` }}>
                    <c.Icon size={22} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }} />
                  </div>
                )}
              </div>
              {/* Label — identical font weight + size for all */}
              <span
                className="text-[10px] font-semibold text-center leading-tight w-full"
                style={{
                  color: isActive ? c.color : '#374151',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                {c.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full" style={{ background: c.color }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Desktop Category Grid (8 cols) ─────────────────────────────
function DesktopCategoryStrip() {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-lg font-extrabold text-gray-900">Shop by Category</h2>
        <Link to="/categories" className="text-sm font-bold text-orange-500 flex items-center gap-1 hover:gap-2 transition-all">
          All categories <FiChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-8 gap-3">
        {EPTOMART_CATS.map(cat => (
          <Link key={cat.slug} to={`/shop/${cat.slug}`}
            className="relative flex flex-col items-center gap-2 rounded-2xl pt-4 pb-3 px-2 overflow-hidden active:scale-95 transition-all group text-center hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: `linear-gradient(145deg, ${cat.color}12 0%, ${cat.color}06 100%)`, border: `1.5px solid ${cat.color}20` }}>
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0 shadow-sm"
              style={{ background: `${cat.color}1c` }}>
              <cat.Icon size={24} style={{ color: cat.color }} />
            </div>
            <p className="text-[11px] font-extrabold leading-snug line-clamp-2" style={{ color: cat.color }}>{cat.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CONTINUE SHOPPING — recently viewed categories/products
// Shown only when user has history
// ══════════════════════════════════════════════════════════════
function ContinueShopping() {
  const [items, setItems] = useState([]);
  useEffect(() => { setItems(loadRecentlyViewed()); }, []);
  if (items.length < 2) return null;

  return (
    <section className="pt-1 pb-3">
      <SectionHeader Icon={FiRefreshCw} iconColor="#3b82f6" dotColor="bg-blue-500" title="Continue Shopping" />
      <div className="flex gap-2.5 px-4 overflow-x-auto scrollbar-hide">
        {items.slice(0, 8).map(p => {
          const img  = p.images?.find(i => i.isDefault)?.url || p.images?.[0]?.url || '';
          const disc = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : null;
          return (
            <Link key={p._id} to={`/product/${p.slug || p._id}`}
              className="flex-shrink-0 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              style={{ width: 76 }}>
              <div className="w-[64px] h-[64px] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100"
                style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                {img
                  ? <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center"><FiPackage size={24} className="text-gray-300" /></div>}
              </div>
              <p className="text-[10px] font-semibold text-gray-700 text-center leading-tight line-clamp-2">{p.name}</p>
              <p className="text-[10px] font-extrabold text-orange-500">₹{(disc || p.price || 0).toLocaleString('en-IN')}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// RECENTLY VIEWED — products user opened before
// ══════════════════════════════════════════════════════════════
function RecentlyViewed() {
  const [items, setItems] = useState([]);
  useEffect(() => { setItems(loadRecentlyViewed()); }, []);
  if (items.length < 2) return null;

  return (
    <section className="pt-2 pb-2">
      <SectionHeader Icon={FiEye} iconColor="#8b5cf6" dotColor="bg-purple-500" title="Recently Viewed" />
      <ProductCarouselTrack products={items.slice(0, 8)} accent="#8b5cf6" />
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// MOBILE HERO — compact branded banner
// ══════════════════════════════════════════════════════════════
function MobileHero() {
  const { user } = useAuth();
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const rawFirst = user?.name?.split(' ')[0];
  // Don't greet with the brand name if test/fallback account
  const first = rawFirst && rawFirst.toLowerCase() !== 'eptomart' ? rawFirst : null;
  return (
    <div className="px-4 pt-2 pb-0">
      <Link to="/shop"
        className="relative rounded-2xl overflow-hidden block active:scale-[0.99] transition-transform"
        style={{
          background: 'radial-gradient(ellipse 120% 140% at 100% 0%, #1b4a7a 0%, #123660 38%, #0B1729 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="absolute pointer-events-none" style={{ width: 160, height: 160, borderRadius: '50%', top: -70, right: -40, background: 'radial-gradient(circle, rgba(244,148,28,0.22) 0%, transparent 65%)' }} />
        <div className="relative z-10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.50)', fontSize: 10.5 }}>
              {greeting}{first ? `, ${first}` : ' 👋'}
            </p>
            <p className="text-white font-extrabold leading-tight tracking-tight" style={{ fontSize: 17 }}>
              Fresh groceries, <span style={{ color: '#f4941c' }}>delivered fast</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }} className="mt-0.5 font-medium flex items-center gap-1.5 truncate">
              <FiTruck size={10} style={{ color: '#6DB651' }} className="flex-shrink-0" />
              Free delivery above ₹999 · Verified sellers
            </p>
          </div>
          <span className="flex-shrink-0 text-white text-[10px] font-bold pl-3 pr-2.5 py-1.5 rounded-xl whitespace-nowrap inline-flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#ff9d30,#f4941c)', boxShadow: '0 4px 14px rgba(244,148,28,0.35)' }}>
            Shop now <FiArrowRight size={11} />
          </span>
        </div>
      </Link>
    </div>
  );
}

// ── Desktop Hero ───────────────────────────────────────────────
const HERO_SLIDES = [
  {
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 55%, #dc2626 100%)',
    tag: 'Hot Deals This Week',
    title: 'Shop Fresh,\nSave Big!',
    sub: 'Groceries · Masalas · Organic Foods',
    cta: 'Shop Now', to: '/shop',
  },
  {
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 55%, #4ade80 100%)',
    tag: 'Market Fresh · Direct Delivery',
    title: 'Koyambedu\nDaily Fresh',
    sub: 'Vegetables · Fruits · Flowers · Temple',
    cta: 'Order Now', to: '/koyambedu',
  },
  {
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #2dd4bf 100%)',
    tag: 'Farm-to-Door · No Middlemen',
    title: 'Farmer Fresh\nஉழவர் சந்தை',
    sub: 'Farm direct · Pure & Natural · Tamil Nadu',
    cta: 'Explore', to: '/uzhavar',
  },
  {
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 40%, #c2410c 75%, #f97316 100%)',
    tag: 'Hyperlocal · GPS-Based · Fresh Daily',
    title: 'EptoFresh\nProteins',
    sub: 'Chicken · Mutton · Fish · Seafood',
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
    <div className="relative overflow-hidden rounded-3xl mb-4" style={{ background: s.gradient, minHeight: 250 }}>
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-black/10" />
      <div className="relative z-10 flex items-stretch min-h-[250px]">
        <div key={active} className="flex flex-col justify-center pl-9 pr-6 py-6 w-[42%]">
          <span className="inline-block bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-3 border border-white/30">{s.tag}</span>
          <h1 className="text-[34px] font-black text-white leading-tight whitespace-pre-line drop-shadow-sm">{s.title}</h1>
          <p className="text-white/75 text-sm mt-2 font-medium">{s.sub}</p>
          <button onClick={() => navigate(s.to)}
            className="mt-4 inline-flex items-center gap-2 bg-white font-black text-sm px-6 py-2.5 rounded-2xl w-fit hover:shadow-xl hover:scale-105 transition-all active:scale-95"
            style={{ color: '#f4941c' }}>
            {s.cta} <FiArrowRight size={15} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-end pr-8 pl-4 py-8 gap-3 overflow-hidden">
          {EPTOMART_CATS.slice(0, 5).map((cat) => (
            <Link key={cat.slug} to={`/shop/${cat.slug}`}
              className="flex-shrink-0 flex flex-col items-center bg-white/95 backdrop-blur-sm rounded-2xl px-4 pt-4 pb-3.5 w-[108px] hover:scale-105 hover:shadow-xl transition-all active:scale-95 group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ background: `${cat.color}16` }}>
                <cat.Icon size={24} style={{ color: cat.color }} />
              </div>
              <p className="text-[11px] font-bold text-gray-800 text-center leading-tight line-clamp-2">{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-10 flex gap-1.5 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button key={i}
            onClick={() => { setActive(i); clearInterval(timerRef.current); timerRef.current = setInterval(() => setActive(a => (a + 1) % HERO_SLIDES.length), 5000); }}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
}

// ── Desktop 5-col Promo Banners ────────────────────────────────
function DesktopPromoGrid({ onScrollTo }) {
  const navigate = useNavigate();
  const banners = [
    { gradient: 'linear-gradient(135deg,#14532d,#16a34a,#4ade80)', tag: 'MARKET FRESH',  Icon: FaCarrot,        title: 'Koyambedu Daily',    sub: 'Fresh Veggies · Fruits · Flowers', cta: 'Order Now', action: () => navigate('/koyambedu') },
    { gradient: 'linear-gradient(135deg,#134e4a,#0f766e,#2dd4bf)', tag: 'FARM DIRECT',  Icon: FaTractor,        title: 'Farmer Fresh',       sub: 'உழவர் சந்தை · No middlemen',     cta: 'Explore',   action: () => navigate('/uzhavar') },
    { gradient: 'linear-gradient(135deg,#1a0a00,#7c2d12,#f97316)', tag: 'GPS · NEARBY', Icon: FaDrumstickBite,  title: 'Proteins',           sub: 'Chicken · Mutton · Fish · Seafood', cta: 'Order Now', action: () => navigate('/eptofresh') },
    { gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626,#fb923c)', tag: 'ENDS SOON',   Icon: FiZap,             title: 'Flash Deals',        sub: 'Up to 60% off · Today only',       cta: 'Grab Now',  action: () => onScrollTo('section-flash') },
    { gradient: 'linear-gradient(135deg,#312e81,#4f46e5,#818cf8)', tag: 'HANDPICKED',  Icon: FiStar,            title: 'Featured Products',  sub: 'Curated · Premium Quality',         cta: 'Shop Now',  action: () => onScrollTo('section-featured') },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {banners.map(b => (
        <button key={b.title} onClick={b.action}
          className="relative flex flex-col justify-between rounded-2xl p-4 overflow-hidden text-left active:scale-95 transition-all hover:shadow-lg hover:-translate-y-0.5 group"
          style={{ background: b.gradient, minHeight: 116 }}>
          <b.Icon className="absolute -bottom-3 -right-3 select-none pointer-events-none transition-transform group-hover:scale-110"
            size={64} style={{ color: 'rgba(255,255,255,0.13)' }} />
          <div className="relative z-10">
            <span className="bg-white/25 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">{b.tag}</span>
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

// ── Mobile Search Bar (unchanged) ──────────────────────────────
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
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage size={18} className="text-gray-400" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-orange-600">{p.name}</p>
                        <p className="text-[10px] text-gray-600">{p.category?.name || ''}</p>
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
                    <p className="text-xs text-gray-600 mb-3">We don't have it yet — but we can source it!</p>
                    <button onClick={() => submit(query)} className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5"><FiSearch size={12} /> Notify Team & Search</button>
                  </div>
                : null
          }
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GENERIC SUB-APP SPOTLIGHT
// Used for Koyambedu Daily, Farmer Fresh, Proteins
// ══════════════════════════════════════════════════════════════

// Scrolling tape — shared by all verticals, colour-configurable
function SpotlightTape({ items, bg }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden my-2" style={{ background: bg }}>
      <div style={{ display: 'flex', gap: 28, whiteSpace: 'nowrap', width: 'max-content', padding: '8px 0', animation: 'spotTape 26s linear infinite' }}>
        {doubled.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 11, fontWeight: 600 }}>
            <span style={{ fontSize: 13 }}>{c.emoji}</span>
            <span style={{ opacity: 0.92 }}>{c.text}</span>
            <span style={{ opacity: 0.25, marginLeft: 8 }}>✦</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes spotTape { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANIMATION HOOK — IntersectionObserver-based in-view detection
// ══════════════════════════════════════════════════════════════
function useInView(threshold = 0.12, once = true) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const ob = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); if (once) ob.disconnect(); }
    }, { threshold });
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold, once]);
  return [ref, inView];
}

// ══════════════════════════════════════════════════════════════
// KOYAMBEDU PRODUCT CARD — enhanced, animated, grade-aware
// ══════════════════════════════════════════════════════════════
function KbdProductCard({ product: p, index = 0, visible = true }) {
  const navigate = useNavigate();
  const img       = p.images?.[0]?.url || '';
  const href      = `/koyambedu/product/${p._id}`;
  const price     = p.lowestUnitPrice;
  const numGrades = p.gradesEnabled && p.grades?.length > 0 ? p.grades.length : 0;
  const catName   = p.category?.name || '';

  return (
    <div
      className="wow-card bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col group"
      style={{
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${index * 55}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${index * 55}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
      }}
    >
      <Link to={href} className="img-frame relative bg-gray-50 block overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {img ? (
          <img src={img} alt={p.name} loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <FaLeaf size={30} style={{ color: '#a7f3d0' }} />
          </div>
        )}
        {catName && (
          <div className="absolute top-1.5 left-1.5 text-white font-black rounded-md px-1.5 py-0.5"
            style={{ background: '#059669', fontSize: 8, boxShadow: '0 2px 6px rgba(5,150,105,0.45)' }}>
            {catName}
          </div>
        )}
        {numGrades > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-white text-emerald-700 font-bold rounded-md px-1.5 py-0.5 border border-emerald-100"
            style={{ fontSize: 8 }}>
            {numGrades} grades
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
          style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.10),transparent)' }} />
      </Link>

      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        <Link to={href}>
          <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
          {p.seller?.businessName && (
            <p className="text-[9px] text-gray-500 mt-0.5 truncate">{p.seller.businessName}</p>
          )}
        </Link>
        <div className="flex items-end justify-between mt-auto pt-1">
          <div>
            {price ? (
              <>
                <p className="text-[8px] text-gray-400 font-semibold leading-none mb-0.5">From</p>
                <span className="price-pop text-[12px] font-extrabold text-gray-900">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-gray-500 ml-0.5">/{p.unit || 'unit'}</span>
              </>
            ) : (
              <span className="text-[10px] text-gray-400">View price</span>
            )}
          </div>
          <button
            onClick={() => navigate(href)}
            className="tap-ripple w-[28px] h-[28px] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 active:scale-90 transition-transform"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 3px 8px rgba(5,150,105,0.40)', fontSize: 18, lineHeight: 1 }}
            aria-label="View product">+</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KOYAMBEDU SHOWCASE — category-wise product display
// Primary product section shown immediately below Sub Apps
// ══════════════════════════════════════════════════════════════
const KBD_TAPE_DATA = {
  bg: 'linear-gradient(90deg,#064e3b 0%,#065f46 50%,#064e3b 100%)',
  items: [
    { emoji: '🏆', text: "Asia's Largest Produce Market" },
    { emoji: '🌿', text: '300+ Varieties Daily' },
    { emoji: '🚚', text: 'Morning Delivery by 6AM' },
    { emoji: '🤝', text: '2,000+ Verified Vendors' },
    { emoji: '📦', text: '1,000 Tonnes Traded Daily' },
    { emoji: '✅', text: 'Market-Fresh Guaranteed' },
  ],
};

function KoyambeduShowcase() {
  const [sections,       setSections]       = useState([]);
  const [flatProducts,   setFlatProducts]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sectionRef, inView] = useInView(0.05);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r1 = await api.get('/koyambedu/products/by-category?limit=8');
        if (cancelled) return;
        const s = r1.data?.sections || [];
        setSections(s);
        if (s.length === 0) {
          const r2 = await api.get('/koyambedu/products/homepage?limit=20');
          if (!cancelled) setFlatProducts(r2.data?.products || []);
        }
      } catch {
        if (!cancelled) {
          try {
            const r2 = await api.get('/koyambedu/products/homepage?limit=20');
            if (!cancelled) setFlatProducts(r2.data?.products || []);
          } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => [
    { key: 'all', name: 'All', icon: null },
    ...sections.map(s => ({ key: String(s.category._id), name: s.category.name, icon: s.category.icon || null })),
  ], [sections]);

  const displaySections = useMemo(() =>
    activeCategory === 'all' ? sections : sections.filter(s => String(s.category._id) === activeCategory),
  [sections, activeCategory]);

  const viewAllLink = activeCategory === 'all'
    ? '/koyambedu'
    : `/koyambedu/shop?category=${activeCategory}`;

  return (
    <section ref={sectionRef} className="pt-3 pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full flex-shrink-0 bg-emerald-500" />
          <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#05966912' }}>
            <FaLeaf size={13} style={{ color: '#059669' }} />
          </span>
          <h2 className="text-sm md:text-lg font-extrabold text-gray-900 tracking-tight">
            Fresh from Koyambedu Daily
          </h2>
        </div>
        <Link to="/koyambedu"
          className="text-xs font-bold flex items-center gap-0.5 transition-all hover:gap-1.5"
          style={{ color: '#059669' }}>
          See all <FiChevronRight size={12} />
        </Link>
      </div>

      {/* Category filter chips — shown only when we have multiple categories */}
      {!loading && sections.length > 1 && (
        <div className="flex gap-1.5 px-4 mb-2.5 overflow-x-auto scrollbar-hide pb-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}>
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95"
              style={{
                background: activeCategory === cat.key ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.92)',
                color:      activeCategory === cat.key ? '#fff' : '#374151',
                border:     activeCategory === cat.key ? 'none' : '1px solid #e5e7eb',
                boxShadow:  activeCategory === cat.key ? '0 2px 8px rgba(5,150,105,0.35)' : '0 1px 3px rgba(0,0,0,0.05)',
              }}>
              {cat.icon && <span className="mr-0.5">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <>
          <div className="md:hidden flex gap-2 px-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0" style={{ width: 'calc(30% - 4px)' }}><SkeletonCard /></div>
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-5 gap-3 px-4">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>

      /* Category-wise product display */
      ) : sections.length > 0 ? (
        <div className="space-y-3">
          {displaySections.map(section => (
            <div key={String(section.category._id)}>
              {/* Category row label (only in "All" view) */}
              {activeCategory === 'all' && (
                <div className="flex items-center justify-between px-4 mb-1">
                  <div className="flex items-center gap-1.5">
                    {section.category.icon && <span className="text-sm">{section.category.icon}</span>}
                    <p className="text-xs font-extrabold text-gray-600">{section.category.name}</p>
                  </div>
                  <Link
                    to={`/koyambedu/shop?category=${section.category.slug || section.category._id}`}
                    className="text-[10px] font-bold flex items-center gap-0.5"
                    style={{ color: '#059669' }}>
                    More <FiChevronRight size={10} />
                  </Link>
                </div>
              )}
              {/* Mobile: horizontal scroll */}
              <div className="md:hidden flex gap-2 px-4 overflow-x-auto scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                {section.products.map((p, i) => (
                  <div key={p._id} className="flex-shrink-0"
                    style={{ width: 'calc(30% - 4px)', scrollSnapAlign: 'start' }}>
                    <KbdProductCard product={p} index={i} visible={inView} />
                  </div>
                ))}
              </div>
              {/* Desktop: 5-col grid */}
              <div className="hidden md:grid md:grid-cols-5 gap-3 px-4">
                {section.products.slice(0, 5).map((p, i) => (
                  <KbdProductCard key={p._id} product={p} index={i} visible={inView} />
                ))}
              </div>
            </div>
          ))}
        </div>

      /* Fallback: flat product list (no categories yet) */
      ) : flatProducts.length > 0 ? (
        <>
          <div className="md:hidden flex gap-2 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
            {flatProducts.map((p, i) => (
              <div key={p._id} className="flex-shrink-0"
                style={{ width: 'calc(30% - 4px)', scrollSnapAlign: 'start' }}>
                <KbdProductCard product={p} index={i} visible={inView} />
              </div>
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-5 gap-3 px-4">
            {flatProducts.slice(0, 10).map((p, i) => (
              <KbdProductCard key={p._id} product={p} index={i} visible={inView} />
            ))}
          </div>
        </>

      /* Empty state */
      ) : (
        <div className="mx-4 rounded-2xl flex flex-col items-center justify-center py-8 gap-2"
          style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px dashed #86efac' }}>
          <span style={{ fontSize: 36 }}>🌿</span>
          <p className="font-black text-sm" style={{ color: '#166534' }}>Fresh arrivals coming soon!</p>
          <p className="text-xs text-center px-6" style={{ color: '#16a34a' }}>
            We're sourcing the best produce from Koyambedu market. Check back shortly.
          </p>
          <Link to="/koyambedu"
            className="mt-1 text-xs font-bold text-white px-4 py-1.5 rounded-xl active:scale-95 transition"
            style={{ background: '#059669' }}>
            Explore Koyambedu Daily
          </Link>
        </div>
      )}

      {/* "View All" CTA */}
      {!loading && (sections.length > 0 || flatProducts.length > 0) && (
        <div className="px-4 mt-3 mb-1">
          <Link to={viewAllLink}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border bg-white transition-all active:scale-[0.98] hover:bg-emerald-50"
            style={{ color: '#059669', borderColor: '#a7f3d0', boxShadow: '0 1px 4px rgba(5,150,105,0.10)' }}>
            View All Koyambedu Daily Products <FiArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Scrolling tape */}
      <SpotlightTape items={KBD_TAPE_DATA.items} bg={KBD_TAPE_DATA.bg} />
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// COMING SOON CARDS — Farmer Fresh & Proteins
// Replaces product listings for verticals not yet live
// ══════════════════════════════════════════════════════════════
const COMING_SOON_CONFIGS = {
  farmerFresh: {
    emoji: '🌾',
    title: 'Farmer Fresh',
    titleTamil: 'உழவர் சந்தை',
    subtitle: 'Coming Soon to Serve You',
    desc: 'Farm-fresh vegetables and fruits directly from Tamil Nadu farmers. Zero middlemen, maximum freshness.',
    cta: 'Explore Farmer Fresh',
    link: '/uzhavar',
    gradient: 'linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 60%,#99f6e4 100%)',
    accentGradient: 'linear-gradient(135deg,#0f766e,#0d9488)',
    accent: '#0d9488',
    border: '#5eead4',
    headColor: '#134e4a',
    tagBg: 'rgba(13,148,136,0.10)',
    tagColor: '#0f766e',
    stats: [
      { value: '500+', label: 'Farmers' },
      { value: 'Pan TN', label: 'Coverage' },
      { value: 'No', label: 'Middlemen' },
    ],
    tape: {
      bg: 'linear-gradient(90deg,#134e4a 0%,#0f766e 50%,#134e4a 100%)',
      items: [
        { emoji: '🌾', text: 'Farm-to-Door Direct' }, { emoji: '🚫', text: 'Zero Middlemen' },
        { emoji: '🌱', text: 'Tamil Nadu Farmers' }, { emoji: '✔️', text: 'Verified Growers' },
        { emoji: '🥦', text: 'Chemical-Free Options' }, { emoji: '💚', text: 'Support Local Farmers' },
      ],
    },
  },
  proteins: {
    emoji: '🥩',
    title: 'Proteins by EptoFresh',
    titleTamil: 'மீட் & சீஃபுட்',
    subtitle: 'Coming Soon to Serve You',
    desc: 'Fresh meat, seafood, eggs & protein products from verified local shops near you. GPS-based hyperlocal delivery.',
    cta: 'Explore Proteins',
    link: '/eptofresh',
    gradient: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)',
    accentGradient: 'linear-gradient(135deg,#c2410c,#ea580c)',
    accent: '#ea580c',
    border: '#fdba74',
    headColor: '#7c2d12',
    tagBg: 'rgba(234,88,12,0.10)',
    tagColor: '#c2410c',
    stats: [
      { value: 'GPS', label: 'Based' },
      { value: 'Same', label: 'Day' },
      { value: 'Fresh', label: 'Daily' },
    ],
    tape: {
      bg: 'linear-gradient(90deg,#431407 0%,#7c2d12 50%,#431407 100%)',
      items: [
        { emoji: '🥩', text: 'Freshly Cut Daily' }, { emoji: '📍', text: 'GPS-Based Hyperlocal' },
        { emoji: '🐓', text: 'Chicken · Mutton · Fish' }, { emoji: '⚡', text: 'Same-Day Delivery' },
        { emoji: '✅', text: 'Verified Local Shops' }, { emoji: '🌊', text: 'Fresh Seafood Too' },
      ],
    },
  },
};

function ComingSoonCard({ variant }) {
  const cfg = COMING_SOON_CONFIGS[variant];
  const [cardRef, cardInView] = useInView(0.10);

  return (
    <section ref={cardRef} className="pt-3 pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: cfg.accent }} />
          <h2 className="text-sm md:text-lg font-extrabold text-gray-900 tracking-tight">{cfg.title}</h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: cfg.tagBg, color: cfg.tagColor }}>
          Coming Soon
        </span>
      </div>

      {/* Main card — animated entrance */}
      <div className="mx-4 rounded-2xl overflow-hidden"
        style={{
          background: cfg.gradient,
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 4px 20px ${cfg.accent}18`,
          opacity:   cardInView ? 1 : 0,
          transform: cardInView ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
        }}>
        <div className="p-5">
          {/* Top row: emoji icon + text */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-[32px]"
              style={{
                background: `${cfg.accent}16`,
                border: `1.5px solid ${cfg.border}`,
                animation: 'csEmojiPulse 3.5s ease-in-out infinite',
              }}>
              {cfg.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-black text-base leading-tight" style={{ color: cfg.headColor }}>
                  {cfg.title}
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ background: cfg.accentGradient }}>SOON</span>
              </div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: cfg.accent }}>
                {cfg.titleTamil}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">{cfg.desc}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-4">
            {cfg.stats.map(s => (
              <div key={s.label} className="flex-1 text-center rounded-xl py-2"
                style={{ background: `${cfg.accent}0e`, border: `1px solid ${cfg.border}` }}>
                <p className="font-black text-sm" style={{ color: cfg.headColor }}>{s.value}</p>
                <p className="text-[9px] font-semibold" style={{ color: cfg.accent }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Headline */}
          <p className="text-center font-black text-sm mt-4 mb-3" style={{ color: cfg.headColor }}>
            🚀 {cfg.subtitle}
          </p>

          {/* CTA */}
          <Link to={cfg.link}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white active:scale-[0.98] transition-transform"
            style={{ background: cfg.accentGradient, boxShadow: `0 4px 12px ${cfg.accent}40` }}>
            {cfg.cta} <FiArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Scrolling tape */}
      <SpotlightTape items={cfg.tape.items} bg={cfg.tape.bg} />
    </section>
  );
}

// ── Section divider ────────────────────────────────────────────
const Divider = () => (
  <div className="px-4 my-0.5">
    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
  </div>
);

// ══════════════════════════════════════════════════════════════
// MAIN HOME
// Mobile flow:
//   Search → Hero → Trust Strip → Shop by Source → Promo Banner
//   → Category Strip → Continue Shopping → Featured → Flash → Recently Viewed → New Arrivals
// ══════════════════════════════════════════════════════════════
export default function Home() {

  return (
    <>
      <EptoSEO app="main" page="home" />

      <Navbar />

      {/* ── Global animation keyframes ── */}
      <style>{`
        @keyframes csEmojiPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.10); }
        }
        @keyframes kbdFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <main className="wow-ambient min-h-screen bg-[#f5f5f7] pb-24 md:pb-8 overflow-x-clip">

        {/* ══════════════════════════════════════════
            DESKTOP LAYOUT
        ══════════════════════════════════════════ */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 pt-4">
          <DesktopHero />
          <DesktopPromoGrid onScrollTo={(id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} />
          {/* Desktop trust strip */}
          <div className="flex items-center justify-between gap-2 bg-white rounded-2xl px-5 py-2.5 border border-gray-100 shadow-sm mb-4">
            {[
              { Icon: FiTruck,       color: '#f4941c', label: 'Fast Pan-India Delivery' },
              { Icon: FiCheckCircle, color: '#16a34a', label: 'Verified Sellers' },
              { Icon: FiRefreshCw,   color: '#3b82f6', label: '7-Day Easy Returns' },
              { Icon: FiTag,         color: '#9333ea', label: 'Direct Seller Prices' },
              { Icon: FiShield,      color: '#0d9488', label: 'Secure Razorpay Checkout' },
            ].map((b, i) => (
              <React.Fragment key={b.label}>
                {i > 0 && <span className="w-px h-5 bg-gray-100 flex-shrink-0" />}
                <div className="flex items-center gap-2 min-w-0">
                  <b.Icon size={15} style={{ color: b.color }} className="flex-shrink-0" />
                  <p className="text-xs font-bold text-gray-700 truncate">{b.label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Sub-app product sections */}
          <KoyambeduShowcase />
        </div>

        {/* ══════════════════════════════════════════
            MOBILE LAYOUT
        ══════════════════════════════════════════ */}
        <div className="md:hidden">

          {/* 1. Shop by Source — Koyambedu · Farmer Fresh · Proteins */}
          <div className="pt-3 px-0">
            <ShopBySource />
          </div>

          {/* Sub-app product sections — below ShopBySource tiles */}
          <KoyambeduShowcase />

          {/* 2. Trust indicators */}
          <div className="pt-2">
            <TrustStrip />
          </div>

          {/* 6. Continue Shopping */}
          <div className="pt-1">
            <ContinueShopping />
          </div>

        </div>

        {/* Recently Viewed — only shown when user has history */}
        <div className="md:max-w-7xl md:mx-auto pb-4">
          <RecentlyViewed />
        </div>

      </main>

      {/* Footer links */}
      <div style={{ background: '#f8f9fb' }} className="border-t border-gray-200 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Quick Links</h4>
              <ul className="space-y-2">
                {[['Home','/'],[' Shop','/shop'],['My Orders','/orders'],['My Profile','/profile'],['Wishlist','/wishlist']].map(([l,p]) => (
                  <li key={p}><Link to={p} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Categories</h4>
              <ul className="space-y-2">
                {[[' Vegetables','/shop?category=vegetables'],['Fruits','/shop?category=fruits'],['Fashion','/shop?category=fashion'],['Electronics','/shop?category=electronics'],['All Categories','/categories']].map(([l,p]) => (
                  <li key={p}><Link to={p} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Help & Support</h4>
              <ul className="space-y-2">
                {[['Contact Us','/contact'],['FAQ','/faq'],['Shipping Policy','/shipping-policy'],['Return Policy','/return-policy'],['Sell on Eptomart','/seller/profile']].map(([l,p]) => (
                  <li key={p}><Link to={p} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Policies</h4>
              <ul className="space-y-2">
                {[['Privacy Policy','/privacy-policy'],['Terms of Service','/terms'],['GST Invoices','/faq#gst'],['Farmer Fresh','/uzhavar'],['Koyambedu Daily','/koyambedu']].map(([l,p]) => (
                  <li key={p}><Link to={p} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">{l}</Link></li>
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
