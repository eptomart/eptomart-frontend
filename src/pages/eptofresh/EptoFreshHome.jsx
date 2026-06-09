// ============================================
// EPTOFRESH HOME — Nearby Sellers Discovery
// Requires GPS location permission
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiMapPin, FiStar, FiClock, FiAlertCircle, FiChevronRight, FiShoppingBag } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';

const CATEGORIES = [
  { key: 'chicken',       label: 'Chicken',     emoji: '🍗' },
  { key: 'mutton',        label: 'Mutton',      emoji: '🥩' },
  { key: 'fish',          label: 'Fish',        emoji: '🐟' },
  { key: 'seafood',       label: 'Seafood',     emoji: '🦐' },
  { key: 'beef',          label: 'Beef',        emoji: '🥩' },
  { key: 'pork',          label: 'Pork',        emoji: '🐖' },
  { key: 'ready_to_cook', label: 'Ready to Cook',emoji: '🍱' },
];

export default function EptoFreshHome() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation } = useEptoFreshCart();
  const [sellers, setSellers]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [locationStatus, setLocationStatus] = useState('requesting'); // requesting | granted | denied

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('granted');
        fetchSellers(loc, '');
      },
      () => {
        setLocationStatus('denied');
        setLocationDenied(true);
      }
    );
  }, []);

  const fetchSellers = async (loc, category) => {
    if (!loc) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ lat: loc.lat, lng: loc.lng, radius: 15 });
      if (category) params.set('category', category);
      const { data } = await api.get(`/eptofresh/sellers?${params}`);
      if (data.success) setSellers(data.sellers || []);
    } catch {
      toast.error('Failed to load nearby sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (cat) => {
    const newCat = cat === activeCategory ? '' : cat;
    setActiveCategory(newCat);
    fetchSellers(userLocation, newCat);
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('granted');
        setLocationDenied(false);
        fetchSellers(loc, activeCategory);
      },
      () => toast.error('Location permission denied. Please enable in browser settings.')
    );
  };

  if (locationStatus === 'requesting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0B1729 0%, #1a2a4a 100%)' }}>
        <div className="text-center text-white px-6">
          <div className="text-6xl mb-4">🥩</div>
          <h1 className="text-2xl font-bold mb-2">EptoFresh Proteins</h1>
          <p className="text-gray-400 mb-6">Fresh meat, delivered from nearby shops</p>
          <div className="flex items-center gap-2 text-orange-400 justify-center">
            <FiMapPin className="animate-pulse" />
            <span className="text-sm">Requesting your location...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: 'linear-gradient(180deg, #0B1729 0%, #111f35 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              🥩 EptoFresh Proteins
            </h1>
            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
              <FiMapPin size={11} className="text-orange-400" />
              {locationDenied ? 'Location not available' : 'Nearby sellers'}
            </p>
          </div>
          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="relative p-2 rounded-full"
            style={{ background: 'rgba(244,148,28,0.12)' }}
          >
            <FiShoppingBag className="text-orange-400" size={22} />
          </button>
        </div>

        {locationDenied && (
          <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <FiAlertCircle className="text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-red-300 text-sm">Location required to show nearby sellers</p>
            </div>
            <button onClick={requestLocation} className="text-orange-400 text-sm font-semibold shrink-0">
              Enable
            </button>
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => handleCategoryFilter(c.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background:   activeCategory === c.key ? '#f4941c' : 'rgba(255,255,255,0.07)',
                color:        activeCategory === c.key ? '#fff' : 'rgba(255,255,255,0.6)',
                border:       activeCategory === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {/* Loading */}
        {loading && (
          <div className="space-y-3 mt-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && sellers.length === 0 && !locationDenied && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-white font-semibold">No sellers found nearby</p>
            <p className="text-gray-500 text-sm mt-1">Try a different category or check back soon</p>
          </div>
        )}

        {/* Sellers list */}
        {!loading && sellers.length > 0 && (
          <div className="space-y-3 mt-4">
            {sellers.map(seller => (
              <SellerCard
                key={seller._id}
                seller={seller}
                onClick={() => navigate(`/eptofresh/shop/${seller._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SellerCard({ seller, onClick }) {
  const dist = seller.distanceKm;
  const isFar = dist > 10;
  const isVeryFar = dist > 15;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-700 flex items-center justify-center">
        {seller.shopImage ? (
          <img src={seller.shopImage} alt={seller.shopName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🥩</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-white font-semibold text-sm truncate">{seller.shopName}</span>
          {seller.badges?.verified && <span className="text-blue-400 text-xs">✓</span>}
          {seller.badges?.topRated && <span className="text-yellow-400 text-xs">⭐</span>}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <FiStar size={11} className="text-yellow-400" />
            {Number(seller.rating || 0).toFixed(1)} ({seller.ratingCount || 0})
          </span>
          <span className="flex items-center gap-1" style={{ color: isVeryFar ? '#ef4444' : isFar ? '#f59e0b' : '#34d399' }}>
            <FiMapPin size={11} />
            {dist.toFixed(1)} km
          </span>
          <span className="flex items-center gap-1">
            <FiClock size={11} />
            {dist < 5 ? '20-30 min' : dist < 10 ? '30-45 min' : '45-60 min'}
          </span>
        </div>

        <div className="flex gap-1 mt-1.5 flex-wrap">
          {(seller.categories || []).slice(0, 3).map(c => (
            <span key={c} className="px-1.5 py-0.5 rounded text-[10px] capitalize" style={{ background: 'rgba(244,148,28,0.12)', color: '#f4941c' }}>
              {c.replace('_', ' ')}
            </span>
          ))}
        </div>

        {isFar && !isVeryFar && (
          <p className="text-yellow-400 text-[10px] mt-1">⚠ Freshness may be affected</p>
        )}
        {isVeryFar && (
          <p className="text-red-400 text-[10px] mt-1">⛔ Very far — confirm before ordering</p>
        )}
      </div>

      <FiChevronRight className="text-gray-600 shrink-0" />
    </button>
  );
}
