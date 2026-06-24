// ============================================
// KOYAMBEDU DAILY — Buyer Landing Page
// Compact native-mobile layout matching EptoFresh
// No Navbar — sticky green gradient header
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EptoSEO from '../../components/common/EptoSEO';
import {
  FiSearch, FiChevronRight, FiMapPin, FiShoppingBag, FiSun,
  FiTruck, FiPackage, FiArrowLeft, FiChevronDown,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import BottomNav from '../../components/common/BottomNav';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';

const KOYAMBEDU_LAT = 13.0748, KOYAMBEDU_LNG = 80.2136;
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const CAT_ICONS = {
  vegetables:'🥦', fruits:'🍊', flowers:'🌸', greens:'🌿',
  coconut:'🥥', banana_leaves:'🍃', pooja_items:'🪔', seasonal:'🌾', bulk:'📦',
};

// IST = UTC+5:30 → check if current hour >= 9
const getISTHour = () => {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).getUTCHours();
};

export default function KoyambeduHome() {
  const { fetchCart, itemCount, subtotal, userLocation, locationLabel } = useKoyambeduCart();
  const navigate = useNavigate();
  const isMarketClosed = getISTHour() >= 9;

  const distToMarket = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCart();
    api.get('/koyambedu/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <EptoSEO app="koyambedu" page="home" />

      {/* ── Compact sticky green header ── */}
      <div className="sticky top-0 z-30 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.35)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Category background image — faded right accent */}
        <img
          src="/categories/koyambedu.jpg"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[45%] object-cover pointer-events-none select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            opacity: 0.28,
          }}
        />
        <div className="px-4 pt-3 pb-5">

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiArrowLeft size={15} className="text-white" />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-white text-base font-extrabold tracking-tight leading-none">Koyambedu Daily</h1>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>MARKET</span>
                </div>
                <p className="text-emerald-100 text-[10px] mt-0.5 opacity-80">கோயம்பேடு · Wholesale · Direct Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/koyambedu/shop')}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSearch size={15} className="text-white" />
              </button>
              <Link to="/koyambedu/cart"
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiShoppingBag size={15} className="text-white" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Location pill */}
          <button
            onClick={() => navigate('/koyambedu/location')}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 w-full transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              <FiMapPin size={11} className="text-white" />
            </div>
            <span className="text-white text-xs font-semibold flex-1 text-left truncate opacity-95">
              {locationLabel
                ? `${locationLabel}${distToMarket ? ` · ${distToMarket} km from market` : ''}`
                : 'Set your delivery area'}
            </span>
            <FiChevronDown size={13} className="text-white opacity-70 shrink-0" />
          </button>

          {/* Delivery info pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiTruck size={10} /> ₹125 per 4 km
            </span>
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiPackage size={10} /> + ₹15 platform fee
            </span>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={isMarketClosed
                ? { background: 'rgba(239,68,68,0.85)', color: '#fff' }
                : { background: 'rgba(250,204,21,0.85)', color: '#065f46' }}>
              <FiSun size={10} /> {isMarketClosed ? 'Market Closed' : 'Market Open'}
            </span>
          </div>
        </div>

        {/* Category pills — on white rounded strip */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', paddingTop: 14, paddingBottom: 2 }}>
          <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-hide">
            <Link to="/koyambedu/shop"
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: '#065f46', color: '#fff', boxShadow: '0 4px 14px rgba(6,95,70,0.35)' }}>
              All Products
            </Link>
            {categories.slice(0, 10).map(cat => (
              <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap active:scale-95 transition"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {cat.icon || CAT_ICONS[cat.slug] || '🌿'} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4" style={{ background: '#F5F4F2' }}>

        {/* ── Market Closed Banner ── */}
        {isMarketClosed && (
          <div className="mb-4 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 60%,#ef4444 100%)', boxShadow: '0 4px 20px rgba(185,28,28,0.35)' }}>
            <div className="p-4 relative overflow-hidden flex items-start gap-3">
              <div className="absolute right-0 top-0 text-[80px] opacity-10 select-none pointer-events-none leading-none">🏪</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSun size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight">Wholesale Koyambedu market closed for today</p>
                <p className="text-red-200 text-xs mt-1 leading-relaxed">
                  Today's procurement window has ended (9:00 AM IST cutoff). Orders placed now will be scheduled for <strong className="text-white">tomorrow's delivery</strong>.
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/25">
                    🕘 Next pickup: Tomorrow 5 AM
                  </span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/25">
                    📦 Still accepting orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No location nudge */}
        {!locationLabel && (
          <button onClick={() => navigate('/koyambedu/location')}
            className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: '#fff', boxShadow: '0 4px 20px rgba(6,95,70,0.14)', border: '1.5px solid rgba(6,95,70,0.12)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
              <FiMapPin className="text-white" size={19} />
            </div>
            <div className="text-left flex-1">
              <p className="text-gray-900 font-bold text-sm">Set your delivery area</p>
              <p className="text-gray-600 text-xs mt-0.5">See if we deliver to you + estimate delivery</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-green-50">
              <FiChevronRight size={14} className="text-green-700" />
            </div>
          </button>
        )}

        {/* ── Category Grid ── */}
        {categories.length > 0 && (
          <div className="mb-5">
            <p className="text-gray-800 font-black text-sm mb-3">Shop by Category</p>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/koyambedu/shop"
                className="flex flex-col items-center gap-1 bg-white rounded-2xl py-3 px-1 active:scale-95 transition"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <span className="text-2xl">🛒</span>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">All</span>
              </Link>
              {categories.slice(0, 11).map(cat => (
                <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                  className="flex flex-col items-center gap-1 bg-white rounded-2xl py-2 px-1 active:scale-95 transition overflow-hidden"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-12 object-cover rounded-xl" />
                    : <span className="text-2xl py-1">{cat.icon || CAT_ICONS[cat.slug] || '🌿'}</span>
                  }
                  <span className="text-[10px] font-bold text-gray-700 text-center leading-tight line-clamp-1 px-1">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Shop All Products CTA ── */}
        <Link to="/koyambedu/shop"
          className="w-full mb-6 flex items-center justify-between rounded-2xl p-4 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 60%,#059669 100%)', boxShadow: '0 4px 20px rgba(6,95,70,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FaLeaf size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Browse All Products</p>
              <p className="text-emerald-200 text-xs mt-0.5">Fresh produce from Koyambedu market</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiChevronRight size={16} className="text-white" />
          </div>
        </Link>

      </div>

      <BottomNav />

      {itemCount > 0 && (
        <div className="fixed left-4 right-4 max-w-lg mx-auto z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}>
          <div className="bg-green-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs opacity-80">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
              <p className="font-black text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
            </div>
            <Link to="/koyambedu/cart" className="bg-white text-emerald-700 font-black text-sm px-5 py-2 rounded-xl">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
