// ============================================
// EPTOFRESH HOME — White Premium Theme
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiMapPin, FiStar, FiClock, FiChevronRight, FiSearch,
  FiShoppingBag, FiEdit2, FiGrid, FiAlertTriangle, FiX, FiChevronDown,
} from 'react-icons/fi';
import { FaDrumstickBite, FaFish, FaBone, FaBacon, FaFireAlt } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';

const CATEGORIES = [
  { key: '',              label: 'All',           Icon: FiGrid,          color: '#f4941c', bg: '#fff4e6' },
  { key: 'chicken',       label: 'Chicken',       Icon: FaDrumstickBite, color: '#f97316', bg: '#fff4ee' },
  { key: 'mutton',        label: 'Mutton',        Icon: FaBone,          color: '#ef4444', bg: '#fef2f2' },
  { key: 'fish',          label: 'Fish',          Icon: FaFish,          color: '#3b82f6', bg: '#eff6ff' },
  { key: 'seafood',       label: 'Seafood',       Icon: FaFish,          color: '#0d9488', bg: '#f0fdfa' },
  { key: 'beef',          label: 'Beef',          Icon: FaDrumstickBite, color: '#b91c1c', bg: '#fef2f2' },
  { key: 'pork',          label: 'Pork',          Icon: FaBacon,         color: '#9333ea', bg: '#faf5ff' },
  { key: 'ready_to_cook', label: 'Ready to Cook', Icon: FaFireAlt,       color: '#d97706', bg: '#fffbeb' },
];
const CAT_COLORS = { chicken:'#f97316',mutton:'#ef4444',fish:'#3b82f6',seafood:'#0d9488',beef:'#b91c1c',pork:'#9333ea',ready_to_cook:'#d97706' };
const CAT_BG     = { chicken:'#fff4ee',mutton:'#fef2f2',fish:'#eff6ff',seafood:'#f0fdfa',beef:'#fef2f2',pork:'#faf5ff',ready_to_cook:'#fffbeb' };

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

  const [sellers, setSellers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showSearch, setShowSearch]         = useState(false);
  const [sellerAccount, setSellerAccount]   = useState(null);
  const [locationLabel, setLocationLabel]   = useState(
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
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <Navbar />

      {/* ── BRANDED HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #ea6c0a 0%, #f4941c 50%, #f9b048 100%)',
        boxShadow: '0 4px 24px rgba(244,148,28,0.3)',
      }}>
        <div className="px-4 pt-4 pb-5">

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                <FaDrumstickBite size={15} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-white text-base font-extrabold tracking-tight leading-none">EptoFresh</h1>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>PROTEINS</span>
                </div>
                <p className="text-orange-100 text-[10px] mt-0.5 opacity-80">Hyperlocal · GPS-verified · Fresh daily</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowSearch(v => !v); setTimeout(() => searchRef.current?.focus(), 100); }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSearch size={15} className="text-white" />
              </button>
              <button
                onClick={() => navigate('/eptofresh/cart')}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiShoppingBag size={15} className="text-white" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="flex items-center gap-2 mb-3 rounded-2xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              <FiSearch size={14} style={{ color: '#f4941c' }} className="shrink-0" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shops…"
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400"
                style={{ fontSize: 16 }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <FiX size={13} className="text-gray-400" />
                </button>
              )}
            </div>
          )}

          {/* Location pill */}
          <button
            onClick={() => navigate('/eptofresh/location')}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 w-full transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              <FiMapPin size={11} className="text-white" />
            </div>
            <span className="text-white text-xs font-semibold flex-1 text-left truncate opacity-95">
              {locationLabel || (userLocation ? 'Current Location' : 'Set your delivery location')}
            </span>
            <FiChevronDown size={13} className="text-white opacity-70 shrink-0" />
          </button>

          {/* Seller portal banner */}
          {sellerAccount && (
            <button
              onClick={() => navigate('/eptofresh/seller')}
              className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 mt-3 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.25)' }}>
                <FiGrid size={14} className="text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{sellerAccount.shopName}</p>
                <p className="text-orange-100 text-[10px] opacity-80">
                  {sellerAccount.status === 'approved' ? '● Live · Open for orders' : '⏳ Under Review'}
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-orange-600 shrink-0"
                style={{ background: 'rgba(255,255,255,0.9)' }}>
                Dashboard →
              </span>
            </button>
          )}
        </div>

        {/* Category pills — on white strip */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', paddingTop: 14, paddingBottom: 2 }}>
          <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-hide">
            {CATEGORIES.map(c => {
              const active = activeCategory === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => handleCategoryFilter(c.key)}
                  className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all active:scale-95"
                  style={{
                    background: active ? c.color : c.bg,
                    boxShadow: active ? `0 4px 14px ${c.color}40` : '0 1px 4px rgba(0,0,0,0.06)',
                    border: active ? 'none' : `1px solid ${c.color}22`,
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: active ? 'rgba(255,255,255,0.25)' : '#fff' }}>
                    <c.Icon size={12} style={{ color: active ? '#fff' : c.color }} />
                  </div>
                  <span className="text-[11px] font-bold"
                    style={{ color: active ? '#fff' : c.color }}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-4" style={{ background: '#F5F4F2' }}>

        {/* No location nudge */}
        {!userLocation && !locationLabel && !loading && (
          <button
            onClick={() => navigate('/eptofresh/location')}
            className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: '#fff', boxShadow: '0 4px 20px rgba(244,148,28,0.18)', border: '1.5px solid #f4941c22' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#f97316,#f4941c)', boxShadow: '0 4px 14px rgba(244,148,28,0.35)' }}>
              <FiMapPin className="text-white" size={19} />
            </div>
            <div className="text-left flex-1">
              <p className="text-gray-900 font-bold text-sm">Set your delivery location</p>
              <p className="text-gray-400 text-xs mt-0.5">See nearest shops & estimated delivery time</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#fff4e6' }}>
              <FiChevronRight size={14} style={{ color: '#f4941c' }} />
            </div>
          </button>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-3.5 flex gap-3 animate-pulse bg-white"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div className="w-[68px] h-[68px] rounded-xl shrink-0 bg-gray-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 rounded-full w-2/3 bg-gray-100" />
                  <div className="h-2.5 rounded-full w-1/2 bg-gray-100" />
                  <div className="flex gap-1">
                    <div className="h-4 w-14 rounded-md bg-gray-100" />
                    <div className="h-4 w-12 rounded-md bg-gray-100" />
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
              style={{ background: '#fff4e6', border: '1px solid #f4941c22' }}>
              <FaDrumstickBite size={32} style={{ color: '#f4941c' }} />
            </div>
            <p className="text-gray-900 font-bold text-base mb-1">No shops found</p>
            <p className="text-gray-400 text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : 'Try a different category or check back soon'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ background: '#f4941c' }}>
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Seller list */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-xs font-semibold">
                <span className="text-emerald-600 font-bold">{openSellers.length} open</span>
                {closedSellers.length > 0 && <span className="text-gray-400"> · {closedSellers.length} closed</span>}
                {activeCategory && <span style={{ color: '#f4941c' }}> · {CATEGORIES.find(c => c.key === activeCategory)?.label}</span>}
              </p>
              {activeCategory && (
                <button
                  onClick={() => handleCategoryFilter('')}
                  className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 bg-white text-gray-500"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <FiX size={10} /> Clear
                </button>
              )}
            </div>

            {openSellers.length > 0 && (
              <div className="space-y-3 mb-5">
                {openSellers.map((s, i) => (
                  <SellerCard key={s._id} seller={s} index={i} onClick={() => navigate(`/eptofresh/shop/${s._id}`)} />
                ))}
              </div>
            )}

            {closedSellers.length > 0 && (
              <>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 mt-1">Currently Closed</p>
                <div className="space-y-2 opacity-50">
                  {closedSellers.map((s, i) => (
                    <SellerCard key={s._id} seller={s} index={i} onClick={() => navigate(`/eptofresh/shop/${s._id}`)} />
                  ))}
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
  const dist     = seller.distanceKm;
  const hasDist  = dist !== null && dist !== undefined;
  const isOpen   = seller.isOpen !== false;
  const distColor = !hasDist ? '#9ca3af' : dist <= 5 ? '#16a34a' : dist <= 10 ? '#d97706' : '#ef4444';
  const estTime  = estimatedTime(dist);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] group bg-white"
      style={{
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        border: '1px solid rgba(0,0,0,0.04)',
        animation: `cardFadeUp 0.35s ease ${index * 60}ms both`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(244,148,28,0.18)'; e.currentTarget.style.borderColor = 'rgba(244,148,28,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)'; }}
    >
      <div className="p-3.5 flex items-center gap-3">
        {/* Shop image */}
        <div className="relative w-[70px] h-[70px] rounded-xl overflow-hidden shrink-0"
          style={{ background: '#FFF4E6' }}>
          {seller.shopImage
            ? <img src={seller.shopImage} alt={seller.shopName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-0.5"
                style={{ background: 'linear-gradient(135deg,#fff4e6,#ffe8c8)' }}>
                <FaDrumstickBite size={24} style={{ color: '#f4941c' }} />
              </div>
            )}
          {/* Open/closed dot */}
          <div
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{
              background: isOpen ? '#22c55e' : '#d1d5db',
              boxShadow: isOpen ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-gray-900 font-bold text-sm leading-tight truncate">{seller.shopName}</span>
            {seller.badges?.topRated && (
              <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                ⭐ TOP
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] mb-1.5 flex-wrap">
            <span className="flex items-center gap-0.5 font-bold text-amber-500">
              <FiStar size={10} style={{ fill: '#f59e0b', stroke: '#f59e0b' }} />
              {Number(seller.rating || 0).toFixed(1)}
            </span>
            {hasDist && (
              <>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-0.5 font-semibold" style={{ color: distColor }}>
                  <FiMapPin size={10} /> {dist.toFixed(1)} km
                </span>
                {estTime && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="flex items-center gap-0.5 text-gray-400">
                      <FiClock size={10} /> {estTime}
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex gap-1 flex-wrap">
            {(seller.categories || []).slice(0, 4).map(c => (
              <span
                key={c}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ background: CAT_BG[c] || '#fff4e6', color: CAT_COLORS[c] || '#f4941c' }}>
                {c.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <FiChevronRight size={15} className="text-gray-300 shrink-0 group-hover:text-orange-400 transition-colors" />
      </div>

      {hasDist && dist > 12 && (
        <div className="px-3.5 pb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl bg-red-50 text-red-500"
            style={{ border: '1px solid #fee2e2' }}>
            <FiAlertTriangle size={10} /> Long distance · Additional delivery charges apply
          </div>
        </div>
      )}
    </button>
  );
}
