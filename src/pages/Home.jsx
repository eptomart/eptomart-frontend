// ============================================
// HOME PAGE — Eptomart Premium
// ============================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowRight, FiSearch, FiZap, FiChevronRight, FiMic, FiX,
  FiStar, FiClock, FiTruck, FiShield, FiCheckCircle, FiRefreshCw,
  FiTag, FiPhone, FiPackage, FiMapPin, FiShoppingBag, FiGrid,
} from 'react-icons/fi';
import {
  FaShoppingBasket, FaPepperHot, FaCookieBite, FaSeedling, FaWineBottle,
  FaLemon, FaBreadSlice, FaLeaf, FaCarrot, FaTractor, FaDrumstickBite,
} from 'react-icons/fa';
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
function SectionHeader({ Icon, iconColor = '#f4941c', title, link, linkLabel = 'See all', dotColor = 'bg-orange-500' }) {
  return (
    <div className="flex items-center justify-between mb-3 px-4">
      <div className="flex items-center gap-2">
        <span className={`w-1 h-5 rounded-full flex-shrink-0 ${dotColor}`} />
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}16` }}>
            <Icon size={13} style={{ color: iconColor }} />
          </span>
        )}
        <h2 className="text-sm md:text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-xs font-bold text-orange-500 flex items-center gap-0.5 hover:gap-1.5 transition-all">
          {linkLabel} <FiChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Product Card — Blinkit style ───────────────────────────────
/* ── Product card entrance animation ── */
const CARD_ANIM_STYLE = `
@keyframes cardFadeUp {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes imgZoomIn {
  from { transform: scale(1.08); }
  to   { transform: scale(1);    }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('card-anim-css')) {
  const s = document.createElement('style');
  s.id = 'card-anim-css';
  s.textContent = CARD_ANIM_STYLE;
  document.head.appendChild(s);
}

function ProductGridCard({ product: p, accent = '#f4941c', index = 0 }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const orig = p.price || 0;
  const disc = p.discountPrice && p.discountPrice < orig ? p.discountPrice : null;
  const pct  = disc ? Math.round(((orig - disc) / orig) * 100) : 0;
  const img  = p.images?.find(i => i.isDefault)?.url || p.images?.[0]?.url || '';
  const unit = p.unit || p.weight || p.size || '';
  const href = `/product/${p.slug || p._id}`;

  // Intersection Observer — trigger once card enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col group"
      style={{
        boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
        opacity: visible ? 1 : 0,
        animation: visible ? `cardFadeUp 0.38s cubic-bezier(0.22,1,0.36,1) ${index * 55}ms both` : 'none',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.10), 0 0 0 1.5px ${accent}33`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 5px rgba(0,0,0,0.06)'; }}
    >
      {/* Image area */}
      <Link to={href} className="relative bg-gray-50 block overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {img
          ? <img
              src={img} alt={p.name} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
              style={{ animation: visible ? 'imgZoomIn 0.5s ease both' : 'none' }}
            />
          : <div className="w-full h-full flex items-center justify-center"><FiPackage size={30} className="text-gray-200" /></div>}

        {/* Stacked % OFF badge — top left */}
        {pct >= 5 && (
          <div
            className="absolute top-1.5 left-1.5 text-white text-center leading-none font-black rounded-md px-1 py-0.5"
            style={{
              background: accent, fontSize: 8, minWidth: 28,
              boxShadow: `0 2px 6px ${accent}70`,
              animation: visible ? `cardFadeUp 0.3s ease ${index * 55 + 150}ms both` : 'none',
            }}
          >
            <div style={{ fontSize: 10 }}>{pct}%</div>
            <div>OFF</div>
          </div>
        )}

        {/* Subtle gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.06), transparent)' }} />
      </Link>

      {/* Info + add button */}
      <div className="p-2 flex flex-col gap-0.5 flex-1">
        <Link to={href}>
          <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
          {unit && <p className="text-[9.5px] text-gray-400 mt-0.5">{unit}</p>}
        </Link>

        {/* Price row + add button */}
        <div className="flex items-end justify-between mt-auto pt-1">
          <div>
            <span className="text-[12px] font-extrabold text-gray-900">
              ₹{(disc || orig).toLocaleString('en-IN')}
            </span>
            {disc && (
              <span className="text-[9.5px] text-gray-400 line-through ml-1">
                ₹{orig.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Round + button */}
          <button
            onClick={() => navigate(href)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 active:scale-90"
            style={{
              background: accent,
              boxShadow: `0 3px 8px ${accent}55`,
              fontSize: 20, lineHeight: 1,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = `0 5px 14px ${accent}80`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 3px 8px ${accent}55`; }}
            aria-label="Add to cart"
          >
            +
          </button>
        </div>
      </div>
    </div>
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
      <div className="grid grid-cols-5 gap-3 px-4">
        {visible.map((p, i) => <ProductGridCard key={`${p._id}-${i}`} product={p} accent={accent} index={i} />)}
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

// ── Mobile: touch-swipe horizontal scroll ──────────────────────
function MobileProductSlider({ products, accent }) {
  return (
    <div
      className="flex gap-3 px-4 pb-1"
      style={{
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: 'grab',
      }}
      onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; }}
      onMouseUp={e => { e.currentTarget.style.cursor = 'grab'; }}
      onMouseLeave={e => { e.currentTarget.style.cursor = 'grab'; }}
    >
      {products.map((p, i) => (
        <div
          key={`${p._id}-${i}`}
          className="flex-shrink-0"
          style={{ width: 'calc(42% - 4px)', scrollSnapAlign: 'start' }}
        >
          <ProductGridCard product={p} accent={accent} index={i} />
        </div>
      ))}
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

// ── Sub-app banners — compact image icon cards ─────────────────
const SUB_APPS = [
  {
    to: '/koyambedu',
    img: '/categories/koyambedu.jpg',
    accent: '#34d399',
    BadgeIcon: FiClock, badge: 'BY 10 AM',
    title: 'Koyambedu', sub: 'Veggies & Fruits',
  },
  {
    to: '/uzhavar',
    img: '/categories/uzhavar.jpg',
    accent: '#a3e635',
    BadgeIcon: FiCheckCircle, badge: 'FARM DIRECT',
    title: 'Farmer Fresh', sub: 'From Farmers',
  },
  {
    to: '/eptofresh',
    img: '/categories/proteins.jpg',
    accent: '#fb923c',
    BadgeIcon: FiMapPin, badge: 'NEARBY',
    title: 'Proteins', sub: 'Meat & Seafood',
  },
];

function SubAppBanners() {
  return (
    <div className="px-4">
      <div className="grid grid-cols-3 gap-2.5">
        {SUB_APPS.map(app => (
          <Link
            key={app.to}
            to={app.to}
            className="relative rounded-2xl overflow-hidden active:scale-[0.96] transition-transform"
            style={{ height: 148, boxShadow: '0 4px 16px rgba(11,25,40,0.16)' }}
          >
            {/* Image */}
            <img
              src={app.img}
              alt={app.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {/* Light scrim — only at the bottom for text readability */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(7,16,26,0.78) 0%, rgba(7,16,26,0.28) 45%, transparent 75%)' }} />
            {/* Accent line at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: app.accent }} />

            {/* Content */}
            <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
              {/* Badge — frosted glass, consistent style */}
              <span
                className="inline-flex items-center gap-1 font-extrabold px-2 py-[3px] rounded-full w-fit leading-none text-white"
                style={{ fontSize: 8.5, letterSpacing: 0.4, background: 'rgba(7,16,26,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <app.BadgeIcon size={9} style={{ color: app.accent }} /> {app.badge}
              </span>
              {/* Title bottom */}
              <div>
                <p className="text-white font-extrabold leading-tight" style={{ fontSize: 14, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                  {app.title}
                </p>
                <p className="font-semibold mt-0.5 leading-tight flex items-center gap-1" style={{ fontSize: 10, color: app.accent }}>
                  {app.sub} <span style={{ color: 'rgba(255,255,255,0.7)' }}>→</span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Trust badges ───────────────────────────────────────────────
function TrustStrip() {
  const badges = [
    { Icon: FiZap,         color: '#f59e0b', label: 'Fast Delivery' },
    { Icon: FiCheckCircle, color: '#16a34a', label: 'Verified Sellers' },
    { Icon: FiRefreshCw,   color: '#3b82f6', label: 'Easy Returns' },
    { Icon: FiTag,         color: '#9333ea', label: 'Best Prices' },
    { Icon: FiShield,      color: '#0d9488', label: 'Secure Pay' },
  ];
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {badges.map(b => (
          <div key={b.label}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <b.Icon size={14} style={{ color: b.color }} />
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Promo banner auto-carousel — vibrant premium gradients ───────
const PROMOS = [
  {
    bg:    'linear-gradient(130deg, #f97316 0%, #ef4444 60%, #dc2626 100%)',
    glow:  'rgba(251,146,60,0.55)',
    accent:'#fff',
    tagBg: 'rgba(255,255,255,0.22)',
    Icon: FiTag, tag: 'Flash Offer', title: 'Up to 70% OFF', sub: 'Hot deals across the store',
    to: '/shop?sort=-discount', cta: 'Grab Deals',
  },
  {
    bg:    'linear-gradient(130deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)',
    glow:  'rgba(129,140,248,0.55)',
    accent:'#fff',
    tagBg: 'rgba(255,255,255,0.20)',
    Icon: FiClock, tag: 'Just Dropped', title: 'New Arrivals', sub: 'Fresh products added daily',
    to: '/shop?sort=-createdAt', cta: 'Shop New',
  },
  {
    bg:    'linear-gradient(130deg, #059669 0%, #16a34a 60%, #4ade80 100%)',
    glow:  'rgba(74,222,128,0.45)',
    accent:'#fff',
    tagBg: 'rgba(255,255,255,0.20)',
    Icon: FiStar, tag: 'Handpicked', title: 'Top Picks', sub: 'Curated for quality & value',
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
        {/* Shine overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} />
        {/* Ghost icon — right edge decoration only */}
        <p.Icon className="absolute pointer-events-none" size={72}
          style={{ right: -10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.08)' }} />

        {/* Icon badge */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
          style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(6px)' }}>
          <p.Icon size={16} className="text-white" />
        </div>

        {/* Text */}
        <div key={active} className="flex-1 min-w-0 relative z-10 animate-fade-in-up">
          <p className="text-white font-black text-[15px] leading-tight truncate tracking-tight">{p.title}</p>
          <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.68)' }}>{p.sub}</p>
        </div>

        {/* CTA + dots */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 relative z-10">
          <span
            className="bg-white text-[11px] font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shadow"
            style={{ color: '#111827' }}
          >
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

// ── Category data (desktop strip + mobile circles) ─────────────
const EPTOMART_CATS = [
  { name: 'Grocery & Staples',   short: 'Grocery',    slug: 'grocery-staples',    Icon: FaShoppingBasket, color: '#3b82f6', from: '₹49',
    img: '/categories/grocery.jpg' },
  { name: 'Masalas & Spices',    short: 'Masalas',    slug: 'masalas-spices',     Icon: FaPepperHot,      color: '#ef4444', from: '₹29',
    img: '/categories/masalas.jpg' },
  { name: 'Snacks & Namkeen',    short: 'Snacks',     slug: 'snacks-namkeen',     Icon: FaCookieBite,     color: '#ec4899', from: '₹39',
    img: '/categories/snacks.jpg' },
  { name: 'Dry Fruits & Nuts',   short: 'Dry Fruits', slug: 'dry-fruits-nuts',    Icon: FaSeedling,       color: '#92400e', from: '₹99',
    img: '/categories/dryfruits.jpg' },
  { name: 'Oils & Ghee',         short: 'Oils & Ghee',slug: 'oils-ghee',          Icon: FaWineBottle,     color: '#d97706', from: '₹89',
    img: '/categories/oils.jpg' },
  { name: 'Pickles & Condiments',short: 'Pickles',    slug: 'pickles-condiments', Icon: FaLemon,          color: '#16a34a', from: '₹59',
    img: '/categories/pickles.jpg' },
  { name: 'Bakery & Dairy',      short: 'Bakery',     slug: 'bakery-dairy',       Icon: FaBreadSlice,     color: '#f59e0b', from: '₹29',
    img: '/categories/bakery.jpg' },
  { name: 'Health & Organic',    short: 'Organic',    slug: 'health-organic',     Icon: FaLeaf,           color: '#059669', from: '₹79',
    img: '/categories/organic.jpg' },
];

// ── Mobile category strip — Blinkit-style image thumbnails ────────
function MobileCategoryStrip() {
  const { pathname } = useLocation();

  const cats = [
    // "Top Picks" — special icon-based entry
    { key: 'top',       label: 'Top\nPicks',       img: null,      Icon: FiStar,         color: '#f4941c', to: '/shop' },
    // Main categories with real food photos
    ...EPTOMART_CATS.map(c => ({
      key: c.slug, label: c.short, img: c.img, Icon: c.Icon, color: c.color, to: `/shop/${c.slug}`,
    })),
    // Sub-apps
    { key: 'koyambedu', label: 'Koyambedu\nMarket',
      img: '/categories/koyambedu.jpg',
      Icon: FaCarrot, color: '#16a34a', to: '/koyambedu' },
    { key: 'uzhavar',   label: 'Uzhavar\nFresh',
      img: '/categories/uzhavar.jpg',
      Icon: FaTractor, color: '#0d9488', to: '/uzhavar' },
    { key: 'eptofresh', label: 'Proteins\n& Meat',
      img: '/categories/proteins.jpg',
      Icon: FaDrumstickBite, color: '#c2410c', to: '/eptofresh' },
  ];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex overflow-x-auto scrollbar-hide px-3 py-3 gap-1">
        {cats.map(c => {
          const isActive = pathname === c.to || pathname.startsWith(c.to + '/');
          return (
            <Link key={c.key} to={c.to}
              className="flex-shrink-0 flex flex-col items-center w-[68px] active:scale-90 transition-transform duration-150 relative pb-1.5">
              {/* Circle image / icon */}
              <div className="w-[56px] h-[56px] rounded-full overflow-hidden mb-1.5 relative"
                style={{
                  border: isActive ? `2.5px solid ${c.color}` : '2px solid #f3f4f6',
                  boxShadow: isActive ? `0 0 0 3px ${c.color}22` : 'none',
                }}>
                {c.img ? (
                  <img src={c.img} alt={c.label.replace('\n', ' ')} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  // Gradient circle for "Top Picks"
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(145deg, ${c.color}cc, ${c.color})` }}>
                    <c.Icon size={22} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }} />
                  </div>
                )}
              </div>
              {/* Label — supports two lines */}
              <span className="text-[10px] font-semibold text-center leading-tight w-full px-0.5"
                style={{ color: isActive ? c.color : '#374151', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.label}
              </span>
              {/* Active underline indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full"
                  style={{ background: c.color }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Desktop Hero (JioMart-style, hidden on mobile) ─────────────
const HERO_SLIDES = [
  {
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 55%, #dc2626 100%)',
    tag: 'Hot Deals This Week',
    title: 'Shop Fresh,\nSave Big!',
    sub: 'Groceries · Masalas · Organic Foods',
    cta: 'Shop Now', to: '/shop',
    cats: ['Grocery & Staples', 'Masalas & Spices', 'Snacks & Namkeen', 'Oils & Ghee'],
  },
  {
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 55%, #4ade80 100%)',
    tag: 'Order by 10 AM, Get Today',
    title: 'Koyambedu\nDaily Fresh',
    sub: 'Vegetables · Fruits · Flowers · Temple',
    cta: 'Order Now', to: '/koyambedu',
    cats: ['Fruits', 'Vegetables', 'Flowers & Greens', 'Pooja & Coconut'],
  },
  {
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #2dd4bf 100%)',
    tag: 'Farm-to-Door in Tamil Nadu',
    title: 'Farmer Fresh\nஉழவர் சந்தை',
    sub: 'Farm direct · No middlemen · Pure & Natural',
    cta: 'Explore', to: '/uzhavar',
    cats: ['Farm Fresh', 'Homemade & Organic', 'Farm Produce'],
  },
  {
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 40%, #c2410c 75%, #f97316 100%)',
    tag: 'Hyperlocal · GPS-Based · Fresh Daily',
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

  return (
    <div className="relative overflow-hidden rounded-3xl mb-4" style={{ background: s.gradient, minHeight: 250 }}>
      {/* BG decoration */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-black/10" />
      <div className="absolute right-64 -bottom-10 w-36 h-36 rounded-full bg-white/8" />

      <div className="relative z-10 flex items-stretch min-h-[250px]">
        {/* Left: text + CTA */}
        <div key={active} className="flex flex-col justify-center pl-9 pr-6 py-6 w-[42%] animate-fade-in-up">
          <span className="inline-block bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-3 border border-white/30">
            {s.tag}
          </span>
          <h1 className="text-[34px] font-black text-white leading-tight whitespace-pre-line drop-shadow-sm">
            {s.title}
          </h1>
          <p className="text-white/75 text-sm mt-2 font-medium">{s.sub}</p>
          <button
            onClick={() => navigate(s.to)}
            className="mt-4 inline-flex items-center gap-2 bg-white font-black text-sm px-6 py-2.5 rounded-2xl w-fit hover:shadow-xl hover:scale-105 transition-all active:scale-95"
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
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                style={{ background: `${cat.color}16` }}>
                <cat.Icon size={24} style={{ color: cat.color }} />
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
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
              style={{ background: `linear-gradient(145deg, ${cat.color}22 0%, ${cat.color}10 100%)` }} />
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0 shadow-sm"
              style={{ background: `${cat.color}1c` }}>
              <cat.Icon size={24} style={{ color: cat.color }} />
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
      tag: 'ORDER BY 10 AM', Icon: FaCarrot,
      title: 'Koyambedu Daily',
      sub: 'Fresh Veggies · Fruits · Flowers',
      cta: 'Order Now', action: () => navigate('/koyambedu'),
    },
    {
      gradient: 'linear-gradient(135deg,#134e4a,#0f766e,#2dd4bf)',
      tag: 'FARM DIRECT', Icon: FaTractor,
      title: 'Farmer Fresh',
      sub: 'உழவர் சந்தை · No middlemen',
      cta: 'Explore', action: () => navigate('/uzhavar'),
    },
    {
      gradient: 'linear-gradient(135deg,#1a0a00,#7c2d12,#f97316)',
      tag: 'GPS · HYPERLOCAL', Icon: FaDrumstickBite,
      title: 'EptoFresh Proteins',
      sub: 'Chicken · Mutton · Fish · Seafood',
      cta: 'Order Now', action: () => navigate('/eptofresh'),
    },
    {
      gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626,#fb923c)',
      tag: 'ENDS SOON', Icon: FiZap,
      title: 'Flash Deals',
      sub: 'Up to 60% off · Today only',
      cta: 'Grab Now', action: () => onScrollTo('section-flash'),
    },
    {
      gradient: 'linear-gradient(135deg,#312e81,#4f46e5,#818cf8)',
      tag: 'HANDPICKED', Icon: FiStar,
      title: 'Featured Products',
      sub: 'Curated · Premium Quality',
      cta: 'Shop Now', action: () => onScrollTo('section-featured'),
    },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {banners.map(b => (
        <button key={b.title} onClick={b.action}
          className="relative flex flex-col justify-between rounded-2xl p-4 overflow-hidden text-left active:scale-95 transition-all hover:shadow-card-hover hover:-translate-y-0.5 group"
          style={{ background: b.gradient, minHeight: 116 }}>
          <b.Icon className="absolute -bottom-3 -right-3 select-none pointer-events-none transition-transform group-hover:scale-110"
            size={64} style={{ color: 'rgba(255,255,255,0.13)' }} />
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
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage size={18} className="text-gray-400" /></div>}
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
                    <button onClick={() => submit(query)} className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5"><FiSearch size={12} /> Notify Team & Search</button>
                  </div>
                : null
          }
        </div>
      )}
    </div>
  );
}

// ── Mobile hero banner ─────────────────────────────────────────
function MobileHero() {
  const { user } = useAuth();
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const first = user?.name?.split(' ')[0];
  return (
    <div className="px-4 pt-3 pb-0">
      <Link to="/shop"
        className="relative rounded-2xl overflow-hidden block active:scale-[0.99] transition-transform"
        style={{
          background: 'radial-gradient(ellipse 120% 140% at 100% 0%, #1b4a7a 0%, #123660 38%, #0B1729 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand ambient glows — same language as the splash screen */}
        <div className="absolute pointer-events-none" style={{ width: 180, height: 180, borderRadius: '50%', top: -80, right: -50, background: 'radial-gradient(circle, rgba(244,148,28,0.22) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none" style={{ width: 140, height: 140, borderRadius: '50%', bottom: -70, left: -40, background: 'radial-gradient(circle, rgba(109,182,81,0.16) 0%, transparent 65%)' }} />
        {/* Text — compact: greeting + headline + CTA in one slim band */}
        <div className="relative z-10 px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
              {greeting}{first ? `, ${first}` : ''}
            </p>
            <p className="text-white font-extrabold leading-tight tracking-tight" style={{ fontSize: 19 }}>
              Fresh groceries, <span style={{ color: '#f4941c' }}>delivered fast</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 10.5 }} className="mt-1 font-medium flex items-center gap-1.5 truncate">
              <FiTruck size={11} style={{ color: '#6DB651' }} className="flex-shrink-0" />
              Free delivery above ₹999 · Verified sellers
            </p>
          </div>
          <span className="flex-shrink-0 text-white text-[11px] font-bold pl-3.5 pr-3 py-2 rounded-xl whitespace-nowrap inline-flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#ff9d30,#f4941c)', boxShadow: '0 4px 14px rgba(244,148,28,0.35)' }}>
            Shop now <FiArrowRight size={12} />
          </span>
        </div>
      </Link>
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

          {/* 4. Trust strip — single slim line */}
          <div className="flex items-center justify-between gap-2 bg-white rounded-2xl px-5 py-2.5 border border-gray-100 shadow-card mb-4">
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
        </div>

        {/* ══════════════════════════════════════════
            MOBILE LAYOUT (below md)
        ══════════════════════════════════════════ */}
        <div className="md:hidden">
          <MobileHero />
          <MobileCategoryStrip />
          <div className="pb-2.5 pt-2.5"><SubAppBanners /></div>
          <div className="pb-3"><PromoBanner /></div>
        </div>

        {/* ── FEATURED PRODUCTS — shown on both ── */}
        <div className="md:max-w-7xl md:mx-auto">
          <Divider />
          <section id="section-featured" className="pt-3 pb-4">
            <div className="flex items-center justify-between mb-3 px-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,148,28,0.10)' }}>
                  <FiStar size={13} style={{ color: '#f4941c' }} />
                </span>
                <h2 className="text-sm md:text-lg font-extrabold text-gray-900 tracking-tight">Featured Products</h2>
              </div>
              <Link to="/shop" className="text-xs font-bold text-orange-500 flex items-center gap-0.5 hover:gap-1.5 transition-all">
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
                <FiStar size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm font-medium">Featured products coming soon</p>
                <Link to="/shop" className="mt-3 inline-block text-xs text-orange-500 font-bold">Browse all products →</Link>
              </div>
            )}
          </section>

          <Divider />

          {/* ── FLASH DEALS ── */}
          <section className="pt-3 pb-4">
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
          <section id="section-new" className="pt-3 pb-5">
            <SectionHeader Icon={FiClock} iconColor="#3b82f6" dotColor="bg-blue-500" title="New Arrivals" link="/shop?sort=-createdAt" />
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
                <FiPackage size={36} className="mx-auto mb-2 text-gray-300" />
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
                { Icon: FiShield, color: '#0d9488', title: 'Verified Sellers',   desc: 'KYC verified with GST & FSSAI compliance' },
                { Icon: FiTruck,  color: '#f4941c', title: 'Pan-India Delivery', desc: 'Powered by Shiprocket — to every pincode' },
                { Icon: FiTag,    color: '#9333ea', title: 'Best Prices',        desc: 'Direct from sellers — no middlemen' },
                { Icon: FiPhone,  color: '#3b82f6', title: 'Real Support',       desc: 'Human support via WhatsApp, 7 days a week' },
              ].map(item => (
                <div key={item.title} className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${item.color}12` }}>
                    <item.Icon size={24} style={{ color: item.color }} />
                  </div>
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
                  { label: 'Home',        path: '/'          },
                  { label: 'Shop',        path: '/shop'      },
                  { label: 'My Orders',   path: '/orders'    },
                  { label: 'My Profile',  path: '/profile'   },
                  { label: 'Wishlist',    path: '/wishlist'  },
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
                  { label: 'Vegetables',     path: '/shop?category=vegetables'  },
                  { label: 'Fruits',         path: '/shop?category=fruits'      },
                  { label: 'Fashion',        path: '/shop?category=fashion'     },
                  { label: 'Electronics',    path: '/shop?category=electronics' },
                  { label: 'All Categories', path: '/categories'                },
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
                  { label: 'Contact Us',       path: '/contact'         },
                  { label: 'FAQ',              path: '/faq'             },
                  { label: 'Shipping Policy',  path: '/shipping-policy' },
                  { label: 'Return Policy',    path: '/return-policy'   },
                  { label: 'Sell on Eptomart', path: '/seller/profile'  },
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
                  { label: 'Privacy Policy',   path: '/privacy-policy'  },
                  { label: 'Terms of Service', path: '/terms'           },
                  { label: 'GST Invoices',     path: '/faq#gst'         },
                  { label: 'Farmer Fresh',    path: '/uzhavar'         },
                  { label: 'Koyambedu Daily',  path: '/koyambedu'       },
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
