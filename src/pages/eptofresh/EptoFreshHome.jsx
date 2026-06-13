// ============================================
// EPTOFRESH HOME — Premium Redesign
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiMapPin, FiStar, FiClock, FiChevronRight, FiSearch,
  FiShoppingBag, FiEdit2, FiGrid, FiAlertTriangle, FiX,
} from 'react-icons/fi';
import { FaDrumstickBite, FaFish, FaBone, FaBacon, FaFireAlt } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';

const CATEGORIES = [
  { key: '',              label: 'All',           Icon: FiGrid,          color: '#f4941c' },
  { key: 'chicken',       label: 'Chicken',       Icon: FaDrumstickBite, color: '#f97316' },
  { key: 'mutton',        label: 'Mutton',        Icon: FaBone,          color: '#ef4444' },
  { key: 'fish',          label: 'Fish',          Icon: FaFish,          color: '#3b82f6' },
  { key: 'seafood',       label: 'Seafood',       Icon: FaFish,          color: '#0d9488' },
  { key: 'beef',          label: 'Beef',          Icon: FaDrumstickBite, color: '#b91c1c' },
  { key: 'pork',          label: 'Pork',          Icon: FaBacon,         color: '#9333ea' },
  { key: 'ready_to_cook', label: 'Ready to Cook', Icon: FaFireAlt,       color: '#f59e0b' },
];
const CAT_COLORS = { chicken:'#f97316',mutton:'#ef4444',fish:'#3b82f6',seafood:'#0d9488',beef:'#b91c1c',pork:'#9333ea',ready_to_cook:'#f59e0b' };

function estimatedTime(dist) {
  if (!dist) return null;
  if (dist <= 3)  return '15–25 min';
  if (dist <= 6)  return '25–35 min';
  if (dist <= 10) return '35–50 min';
  return '50+ min';
}

export default function EptoFreshHome() {
  const navigate = useNavigate();
  const { userLocation } = useEptoFreshCart();
  const { user } = useAuth();
  const searchRef = useRef(null);

  const [sellers, setSellers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [showSearch, setShowSearch]       = useState(false);
  const [sellerAccount, setSellerAccount] = useState(null);
  const [locationLabel, setLocationLabel] = useState(
    () => localStorage.getItem('eptofresh_area') || null
  );

  useEffect(() => {
    const onFocus = () => {
      const saved = localStorage.getItem('eptofresh_area');
      if (saved) setLocationLabel(saved);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('eptofresh_area');
    if (saved) setLocationLabel(saved);
    fetchSellers(userLocation, activeCategory);
  }, [userLocation]);

  useEffect(() => {
    fetchSellers(userLocation, '');
    if (user) {
      api.get('/eptofresh/seller/profile')
        .then(r => { if (r.data.success) setSellerAccount(r.data.seller); })
        .catch(() => setSellerAccount(false));
    }
  }, [user]);

  const fetchSellers = useCallback(async (loc, category) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (loc) { params.set('lat', loc.lat); params.set('lng', loc.lng); }
      if (category) params.set('category', category);
      const { data } = await api.get(`/eptofresh/sellers?${params}`);
      if (data.success) setSellers(data.sellers || []);
    } catch { toast.error('Failed to load sellers'); }
    finally { setLoading(false); }
  }, []);

  const handleCategoryFilter = (cat) => {
    setActiveCategory(cat);
    fetchSellers(userLocation, cat);
  };

  const filtered      = sellers.filter(s => !searchQuery || s.shopName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const openSellers   = filtered.filter(s => s.isOpen !== false);
  const closedSellers = filtered.filter(s => s.isOpen === false);

  return (
    <div className="min-h-screen pb-28" style={{ background: '#080f1c' }}>
      <Navbar />

      {/* ── HERO HEADER ── */}
      <div style={{ background: 'linear-gradient(160deg,#0f1f35 0%,#1a0e06 55%,#0f1208 100%)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(244,148,28,0.13) 0%,transparent 70%)', transform:'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(239,68,68,0.08) 0%,transparent 70%)', transform:'translate(-20%,30%)' }} />

          <div className="relative px-4 pt-4 pb-4">
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background:'linear-gradient(135deg,#f97316,#f4941c)', boxShadow:'0 3px 10px rgba(244,148,28,0.4)' }}>
                    <FaDrumstickBite size={13} className="text-white" />
                  </div>
                  <h1 className="text-white text-lg font-extrabold tracking-tight">EptoFresh</h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background:'rgba(244,148,28,0.18)',color:'#f4941c' }}>PROTEINS</span>
                </div>
                <p className="text-gray-500 text-[11px] ml-0.5">Hyperlocal · GPS-verified · Fresh daily cuts</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowSearch(v => !v); setTimeout(() => searchRef.current?.focus(), 100); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.07)' }}>
                  <FiSearch size={15} className="text-gray-300" />
                </button>
                <button onClick={() => navigate('/eptofresh/cart')}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(244,148,28,0.15)', border:'1px solid rgba(244,148,28,0.25)' }}>
                  <FiShoppingBag size={15} style={{ color:'#f4941c' }} />
                </button>
              </div>
            </div>

            {/* Collapsible search */}
            {showSearch && (
              <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2.5"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <FiSearch size={13} className="text-gray-400 shrink-0" />
                <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search shops…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                  style={{ fontSize:16 }} />
                {searchQuery && <button onClick={() => setSearchQuery('')}><FiX size={13} className="text-gray-500" /></button>}
              </div>
            )}

            {/* Location pill */}
            <button onClick={() => navigate('/eptofresh/location')}
              className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 w-full"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: userLocation ? 'rgba(52,211,153,0.2)' : 'rgba(244,148,28,0.2)' }}>
                <FiMapPin size={11} style={{ color: userLocation ? '#34d399' : '#f4941c' }} />
              </div>
              <span className="text-xs font-semibold flex-1 text-left truncate"
                style={{ color: userLocation ? '#34d399' : '#f4941c' }}>
                {locationLabel || (userLocation ? 'Current Location' : 'Set your location for delivery')}
              </span>
              <FiEdit2 size={11} className="text-gray-600 shrink-0" />
            </button>

            {/* Seller portal banner */}
            {sellerAccount && (
              <button onClick={() => navigate('/eptofresh/seller')}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 transition-all active:scale-[0.98]"
                style={{ background:'linear-gradient(135deg,rgba(244,148,28,0.15),rgba(244,148,28,0.05))', border:'1px solid rgba(244,148,28,0.3)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background:'rgba(244,148,28,0.2)' }}>
                  <FiGrid size={15} style={{ color:'#f4941c' }} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{sellerAccount.shopName}</p>
                  <p className="text-[10px] font-semibold flex items-center gap-1"
                    style={{ color: sellerAccount.status === 'approved' ? '#34d399' : '#fbbf24' }}>
                    {sellerAccount.status === 'approved'
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Open for orders</>
                      : <><FiClock size={10} /> Under Review</>}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shrink-0"
                  style={{ background:'linear-gradient(135deg,#f97316,#f4941c)', boxShadow:'0 3px 10px rgba(244,148,28,0.3)' }}>
                  Dashboard →
                </span>
              </button>
            )}

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {CATEGORIES.map(c => {
                const active = activeCategory === c.key;
                return (
                  <button key={c.key} onClick={() => handleCategoryFilter(c.key)}
                    className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full whitespace-nowrap shrink-0 transition-all active:scale-95"
                    style={{
                      background: active ? `linear-gradient(135deg,${c.color}dd,${c.color})` : 'rgba(255,255,255,0.06)',
                      border: active ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: active ? `0 4px 14px ${c.color}45` : 'none',
                    }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: active ? 'rgba(255,255,255,0.2)' : `${c.color}28` }}>
                      <c.Icon size={12} style={{ color: active ? '#fff' : c.color }} />
                    </div>
                    <span className="text-[11px] font-semibold"
                      style={{ color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-4">
        {/* No location nudge */}
        {!userLocation && !loading && (
          <button onClick={() => navigate('/eptofresh/location')}
            className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background:'linear-gradient(135deg,rgba(244,148,28,0.12),rgba(244,148,28,0.05))', border:'1px solid rgba(244,148,28,0.2)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:'linear-gradient(135deg,#f97316,#f4941c)', boxShadow:'0 4px 14px rgba(244,148,28,0.35)' }}>
              <FiMapPin className="text-white" size={19} />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold text-sm">Set your delivery location</p>
              <p className="text-gray-500 text-xs mt-0.5">See nearest shops & estimated delivery time</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background:'rgba(244,148,28,0.18)' }}>
              <FiChevronRight size={14} style={{ color:'#f4941c' }} />
            </div>
          </button>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl p-3.5 flex gap-3 animate-pulse"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-[68px] h-[68px] rounded-xl shrink-0" style={{ background:'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 rounded-full w-2/3" style={{ background:'rgba(255,255,255,0.07)' }} />
                  <div className="h-2.5 rounded-full w-1/2" style={{ background:'rgba(255,255,255,0.05)' }} />
                  <div className="flex gap-1">
                    <div className="h-4 w-14 rounded-md" style={{ background:'rgba(255,255,255,0.05)' }} />
                    <div className="h-4 w-12 rounded-md" style={{ background:'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <FaDrumstickBite size={32} style={{ color:'rgba(244,148,28,0.3)' }} />
            </div>
            <p className="text-white font-bold text-base mb-1">No shops found</p>
            <p className="text-gray-500 text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : 'Try a different category or check back soon'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ background:'#f4941c' }}>Clear Search</button>
            )}
          </div>
        )}

        {/* Seller list */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-xs font-semibold">
                <span style={{ color:'#34d399' }}>{openSellers.length} open</span>
                {closedSellers.length > 0 && <span className="text-gray-600"> · {closedSellers.length} closed</span>}
                {activeCategory && <span style={{ color:'#f4941c' }}> · {CATEGORIES.find(c=>c.key===activeCategory)?.label}</span>}
              </p>
              {activeCategory && (
                <button onClick={() => handleCategoryFilter('')}
                  className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.45)' }}>
                  <FiX size={10} /> Clear
                </button>
              )}
            </div>

            {openSellers.length > 0 && (
              <div className="space-y-3 mb-5">
                {openSellers.map((s,i) => <SellerCard key={s._id} seller={s} index={i} onClick={() => navigate(`/eptofresh/shop/${s._id}`)} />)}
              </div>
            )}

            {closedSellers.length > 0 && (
              <>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-2 mt-1">Currently Closed</p>
                <div className="space-y-2 opacity-50">
                  {closedSellers.map((s,i) => <SellerCard key={s._id} seller={s} index={i} onClick={() => navigate(`/eptofresh/shop/${s._id}`)} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SellerCard({ seller, onClick, index = 0 }) {
  const dist    = seller.distanceKm;
  const hasDist = dist !== null && dist !== undefined;
  const isOpen  = seller.isOpen !== false;
  const distColor = !hasDist ? '#94a3b8' : dist <= 5 ? '#34d399' : dist <= 10 ? '#fbbf24' : '#f87171';
  const estTime = estimatedTime(dist);

  return (
    <button onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] group"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        animation: `cardFadeUp 0.35s ease ${index * 60}ms both`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(244,148,28,0.28)'; }}
      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
    >
      <div className="p-3.5 flex items-center gap-3">
        {/* Shop image */}
        <div className="relative w-[68px] h-[68px] rounded-xl overflow-hidden shrink-0"
          style={{ background:'rgba(255,255,255,0.06)' }}>
          {seller.shopImage
            ? <img src={seller.shopImage} alt={seller.shopName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#1a0e06,#2a1a0a)' }}>
                <FaDrumstickBite size={26} style={{ color:'rgba(244,148,28,0.45)' }} />
              </div>
            )}
          {/* Open/closed dot */}
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-[#080f1c]"
            style={{
              background: isOpen ? '#34d399' : '#4b5563',
              boxShadow: isOpen ? '0 0 0 3px rgba(52,211,153,0.25)' : 'none',
            }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-white font-bold text-sm leading-tight truncate">{seller.shopName}</span>
            {seller.badges?.topRated && (
              <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background:'rgba(251,191,36,0.15)',color:'#fbbf24' }}>TOP</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] mb-1.5 flex-wrap">
            <span className="flex items-center gap-0.5 font-semibold" style={{ color:'#fbbf24' }}>
              <FiStar size={10} style={{ fill:'#fbbf24',stroke:'#fbbf24' }} />
              {Number(seller.rating || 0).toFixed(1)}
            </span>
            {hasDist && <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-0.5 font-semibold" style={{ color:distColor }}>
                <FiMapPin size={10} /> {dist.toFixed(1)} km
              </span>
              {estTime && <>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-0.5 text-gray-400">
                  <FiClock size={10} /> {estTime}
                </span>
              </>}
            </>}
          </div>

          <div className="flex gap-1 flex-wrap">
            {(seller.categories || []).slice(0,4).map(c => (
              <span key={c} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize"
                style={{ background:`${CAT_COLORS[c]||'#f4941c'}18`, color:CAT_COLORS[c]||'#f4941c' }}>
                {c.replace('_',' ')}
              </span>
            ))}
          </div>
        </div>

        <FiChevronRight size={15} className="text-gray-700 shrink-0 group-hover:text-orange-500 transition-colors" />
      </div>

      {hasDist && dist > 12 && (
        <div className="px-3.5 pb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ background:'rgba(248,113,113,0.08)', color:'#f87171', border:'1px solid rgba(248,113,113,0.15)' }}>
            <FiAlertTriangle size={10} /> Long distance · Additional delivery charges apply
          </div>
        </div>
      )}
    </button>
  );
}
