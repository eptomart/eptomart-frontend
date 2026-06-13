// ============================================
// EPTOFRESH HOME — Nearby Sellers Discovery
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiMapPin, FiStar, FiClock, FiChevronRight,
  FiShoppingBag, FiEdit2, FiGrid, FiSearch, FiAlertTriangle,
} from 'react-icons/fi';
import { FaDrumstickBite, FaFish } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';

const CATEGORIES = [
  { key: 'chicken',       label: 'Chicken',       Icon: FaDrumstickBite, color: '#f97316' },
  { key: 'mutton',        label: 'Mutton',         Icon: FaDrumstickBite, color: '#ef4444' },
  { key: 'fish',          label: 'Fish',           Icon: FaFish,          color: '#3b82f6' },
  { key: 'seafood',       label: 'Seafood',        Icon: FaFish,          color: '#0d9488' },
  { key: 'beef',          label: 'Beef',           Icon: FaDrumstickBite, color: '#dc2626' },
  { key: 'pork',          label: 'Pork',           Icon: FaDrumstickBite, color: '#9333ea' },
  { key: 'ready_to_cook', label: 'Ready to Cook',  Icon: FiGrid,          color: '#f59e0b' },
];

export default function EptoFreshHome() {
  const navigate = useNavigate();
  const { userLocation } = useEptoFreshCart();
  const { user } = useAuth();

  const [sellers, setSellers]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [sellerAccount, setSellerAccount]   = useState(null); // null=unchecked, false=not-seller, object=seller

  // Read area name saved by the map picker
  const [locationLabel, setLocationLabel] = useState(
    () => localStorage.getItem('eptofresh_area') || null
  );

  // Sync label whenever user comes back from the picker
  useEffect(() => {
    const onFocus = () => {
      const saved = localStorage.getItem('eptofresh_area');
      if (saved) setLocationLabel(saved);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Also recheck when userLocation changes (after picker confirm)
  useEffect(() => {
    const saved = localStorage.getItem('eptofresh_area');
    if (saved) setLocationLabel(saved);
    fetchSellers(userLocation, activeCategory);
  }, [userLocation]);

  // On mount — fetch sellers and check if user is an EptoFresh seller
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
      const params = new URLSearchParams({ radius: 30 });
      if (loc) { params.set('lat', loc.lat); params.set('lng', loc.lng); }
      if (category) params.set('category', category);
      const { data } = await api.get(`/eptofresh/sellers?${params}`);
      if (data.success) setSellers(data.sellers || []);
    } catch {
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryFilter = (cat) => {
    const newCat = cat === activeCategory ? '' : cat;
    setActiveCategory(newCat);
    fetchSellers(userLocation, newCat);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      <Navbar />

      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ background: 'linear-gradient(180deg, #0B1729 0%, #111f35 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="animate-fade-in-up">
            <h1 className="text-white text-xl font-extrabold tracking-tight flex items-center gap-2"><FaDrumstickBite size={18} className="text-orange-400" /> EptoFresh Proteins</h1>
            <p className="text-gray-500 text-[10px] font-medium mt-0.5">Hyperlocal · GPS-based · Fresh daily</p>

            {/* Location bar — tap to open map picker */}
            <button
              onClick={() => navigate('/eptofresh/location')}
              className="flex items-center gap-1 mt-0.5 max-w-[220px]"
            >
              <FiMapPin size={12} className="text-orange-400 shrink-0" />
              <span className="text-orange-400 text-xs font-semibold truncate">
                {locationLabel || (userLocation ? 'Current Location' : '📍 Set your location')}
              </span>
              <FiEdit2 size={10} className="text-gray-500 ml-0.5 shrink-0" />
            </button>
          </div>

          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="relative p-2 rounded-full"
            style={{ background: 'rgba(244,148,28,0.12)' }}
          >
            <FiShoppingBag className="text-orange-400" size={22} />
          </button>
        </div>

        {/* Seller portal banner — shown when logged-in user has an EptoFresh seller account */}
        {sellerAccount && (
          <button
            onClick={() => navigate('/eptofresh/seller')}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-3"
            style={{ background: 'rgba(244,148,28,0.12)', border: '1px solid rgba(244,148,28,0.25)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,148,28,0.20)' }}>
                <FiGrid size={15} style={{ color: '#f4941c' }} />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-bold leading-tight">{sellerAccount.shopName}</p>
                <p className="text-xs font-medium flex items-center gap-1" style={{ color: sellerAccount.status === 'approved' ? '#34d399' : '#fbbf24' }}>
                  {sellerAccount.status === 'approved' ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Active Seller</> : sellerAccount.status === 'pending_review' ? <><FiClock size={11} /> Under Review</> : sellerAccount.status}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: '#f4941c' }}>
              Seller Dashboard →
            </span>
          </button>
        )}

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => handleCategoryFilter(c.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
              style={{
                background: activeCategory === c.key ? 'linear-gradient(135deg,#ff9d30,#f4941c)' : 'rgba(255,255,255,0.07)',
                color:      activeCategory === c.key ? '#fff' : 'rgba(255,255,255,0.6)',
                border:     activeCategory === c.key ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow:  activeCategory === c.key ? '0 2px 12px rgba(244,148,28,0.35)' : 'none',
              }}
            >
              <c.Icon size={11} style={{ color: activeCategory === c.key ? '#fff' : c.color }} /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {/* Set location nudge */}
        {!userLocation && (
          <button
            onClick={() => navigate('/eptofresh/location')}
            className="w-full mt-4 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.2)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f4941c' }}>
              <FiMapPin className="text-white" size={18} />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Set your delivery location</p>
              <p className="text-gray-400 text-xs">See nearest sellers & delivery charges</p>
            </div>
            <FiChevronRight className="text-orange-400 ml-auto shrink-0" size={18} />
          </button>
        )}

        {loading && (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        )}

        {!loading && sellers.length === 0 && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3"><FiSearch size={48} className="text-gray-600" /></div>
            <p className="text-white font-semibold">No sellers found</p>
            <p className="text-gray-500 text-sm mt-1">Try setting your location or check back soon</p>
            <button
              onClick={() => navigate('/eptofresh/location')}
              className="mt-4 px-5 py-2.5 rounded-2xl text-white font-semibold text-sm"
              style={{ background: '#f4941c' }}
            >
              Set Location
            </button>
          </div>
        )}

        {!loading && sellers.length > 0 && (
          <>
            {/* Category results header */}
            {activeCategory && (
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {sellers.length} store{sellers.length !== 1 ? 's' : ''} selling{' '}
                    <span style={{ color: '#f4941c' }}>
                      {CATEGORIES.find(c => c.key === activeCategory)?.label || activeCategory}
                    </span>
                    {userLocation ? ' near you' : ''}
                  </p>
                  <p className="text-gray-500 text-xs">Tap a store to browse & order</p>
                </div>
                <button
                  onClick={() => { setActiveCategory(''); fetchSellers(userLocation, ''); }}
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="space-y-3 mt-3">
              {sellers.map(seller => (
                <SellerCard
                  key={seller._id}
                  seller={seller}
                  onClick={() => navigate(`/eptofresh/shop/${seller._id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function estimatedTime(dist) {
  if (!dist) return null;
  if (dist <= 3)  return '15–25 min';
  if (dist <= 6)  return '25–35 min';
  if (dist <= 10) return '35–50 min';
  if (dist <= 15) return '50–70 min';
  return '70+ min';
}

function SellerCard({ seller, onClick }) {
  const dist    = seller.distanceKm;
  const hasDist = dist !== null && dist !== undefined;
  const isLong  = hasDist && dist > 10;
  const distColor = !hasDist ? '#94a3b8' : dist <= 6 ? '#34d399' : dist <= 10 ? '#fbbf24' : '#f87171';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 group animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${isLong ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(244,148,28,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = isLong ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'; }}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-700 flex items-center justify-center">
          {seller.shopImage
            ? <img src={seller.shopImage} alt={seller.shopName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            : <FaDrumstickBite size={28} className="text-gray-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-white font-semibold text-sm truncate">{seller.shopName}</span>
            {seller.badges?.verified && <FiGrid size={10} className="text-blue-400" />}
            {seller.badges?.topRated && <FiStar size={10} className="text-yellow-400" style={{ fill: 'currentColor' }} />}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <FiStar size={11} className="text-yellow-400" />
              {Number(seller.rating || 0).toFixed(1)}
            </span>
            {hasDist ? (
              <>
                <span className="flex items-center gap-1 font-semibold" style={{ color: distColor }}>
                  <FiMapPin size={11} /> {dist.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <FiClock size={11} /> {estimatedTime(dist)}
                </span>
              </>
            ) : (
              <span className="text-gray-600 text-[10px]">Set location for distance</span>
            )}
          </div>

          <div className="flex gap-1 mt-1.5 flex-wrap">
            {(seller.categories || []).slice(0, 3).map(c => (
              <span
                key={c}
                className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                style={{ background: 'rgba(244,148,28,0.12)', color: '#f4941c' }}
              >
                {c.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <FiChevronRight className="text-gray-600 shrink-0" />
      </div>

      {isLong && (
        <div className="px-4 pb-3">
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
            style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <FiMapPin size={10} /> Long Distance — Additional charges apply
          </span>
        </div>
      )}
    </button>
  );
}
