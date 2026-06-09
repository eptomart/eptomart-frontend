// ============================================
// EPTOFRESH HOME — Nearby Sellers Discovery
// GPS + Manual pincode location picker
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiMapPin, FiStar, FiClock, FiChevronRight, FiShoppingBag, FiNavigation, FiEdit2, FiSearch } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';

const CATEGORIES = [
  { key: 'chicken',       label: 'Chicken',      emoji: '🍗' },
  { key: 'mutton',        label: 'Mutton',       emoji: '🥩' },
  { key: 'fish',          label: 'Fish',         emoji: '🐟' },
  { key: 'seafood',       label: 'Seafood',      emoji: '🦐' },
  { key: 'beef',          label: 'Beef',         emoji: '🥩' },
  { key: 'pork',          label: 'Pork',         emoji: '🐖' },
  { key: 'ready_to_cook', label: 'Ready to Cook', emoji: '🍱' },
];

// Geocode pincode → lat/lng + area name via OpenStreetMap (free, no key)
async function geocodePincode(pincode) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data && data[0]) {
      const addr  = data[0].address || {};
      const area  = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || '';
      const city  = addr.city || addr.county || addr.state_district || '';
      const label = [area, city].filter(Boolean).join(', ') || data[0].display_name.split(',').slice(0, 2).join(', ');
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label };
    }
  } catch {}
  return null;
}

// Reverse geocode lat/lng → area name
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const addr = data.address || {};
    const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || '';
    const city = addr.city || addr.county || addr.state_district || '';
    return [area, city].filter(Boolean).join(', ') || 'Your Location';
  } catch {}
  return 'Your Location';
}

export default function EptoFreshHome() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation } = useEptoFreshCart();

  const [sellers, setSellers]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  // Persist area name in localStorage so it survives refresh
  const [locationLabel, setLocationLabel] = useState(
    () => localStorage.getItem('eptofresh_area') || null
  );

  // Location picker modal state
  const [showPicker, setShowPicker]         = useState(false);
  const [pincode, setPincode]               = useState('');
  const [gpsLoading, setGpsLoading]         = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const gpsActiveRef = useRef(false); // prevent double-calls

  // On mount — fetch all sellers; show picker if no location saved
  useEffect(() => {
    fetchSellers(userLocation, '');
    if (!userLocation) setShowPicker(true);
  }, []);

  const saveLabel = (label) => {
    setLocationLabel(label);
    localStorage.setItem('eptofresh_area', label);
  };

  const fetchSellers = async (loc, category) => {
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
  };

  const handleCategoryFilter = (cat) => {
    const newCat = cat === activeCategory ? '' : cat;
    setActiveCategory(newCat);
    fetchSellers(userLocation, newCat);
  };

  // GPS — triggered ONLY by user tap (iOS requires this)
  const useGPS = () => {
    if (gpsActiveRef.current) return; // block double-tap
    if (!navigator.geolocation) {
      toast.error('GPS not supported on this device');
      return;
    }
    gpsActiveRef.current = true;
    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {                        // ← must NOT be async (breaks iOS Safari)
        gpsActiveRef.current = false;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        saveLabel('Detecting area…');   // placeholder while reverse-geocoding
        setShowPicker(false);
        setGpsLoading(false);
        fetchSellers(loc, activeCategory);
        // Reverse geocode in background — .then() not await (keeps callback sync)
        reverseGeocode(loc.lat, loc.lng).then(area => saveLabel(area));
      },
      (err) => {
        gpsActiveRef.current = false;
        setGpsLoading(false);
        if (err.code === 1) {
          toast.error('Location denied. Enter your pincode instead.');
        } else {
          toast.error('Could not get GPS location. Try pincode.');
        }
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  };

  // Manual pincode entry
  const usePincode = async () => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    setPincodeLoading(true);
    const result = await geocodePincode(pincode);
    setPincodeLoading(false);
    if (!result) {
      toast.error('Pincode not found. Try another.');
      return;
    }
    const loc = { lat: result.lat, lng: result.lng };
    setUserLocation(loc);
    saveLabel(result.label);   // real area name from geocoder
    setShowPicker(false);
    fetchSellers(loc, activeCategory);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>

      {/* ── Location Picker Modal ── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onTouchStart={e => e.stopPropagation()}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
            style={{
              background: '#0f2035',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '80vh',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="sticky top-0 pt-4 pb-2 flex justify-center" style={{ background: '#0f2035' }}>
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            <div className="px-6 pb-4">
              <h2 className="text-white font-bold text-lg mb-1">Set Your Location</h2>
              <p className="text-gray-400 text-sm mb-5">We'll show nearest sellers and delivery charges</p>

              {/* GPS button */}
              <button
                onClick={useGPS}
                disabled={gpsLoading}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl mb-3 disabled:opacity-60"
                style={{ background: 'rgba(244,148,28,0.12)', border: '1px solid rgba(244,148,28,0.3)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f4941c' }}>
                  {gpsLoading
                    ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <FiNavigation className="text-white" size={18} />}
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-sm">
                    {gpsLoading ? 'Getting your location…' : 'Use Current Location'}
                  </p>
                  <p className="text-gray-400 text-xs">Tap to allow GPS access</p>
                </div>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-gray-500 text-xs font-medium">OR</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <p className="text-gray-400 text-xs mb-2">Enter your area pincode</p>

              {/* Pincode input — type="tel" works best on iOS */}
              <div className="flex gap-2 mb-4">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && usePincode()}
                  placeholder="e.g. 600001"
                  className="flex-1 px-4 py-3.5 rounded-2xl text-white outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '16px',   /* prevents iOS zoom */
                    letterSpacing: '2px',
                  }}
                />
                <button
                  onClick={usePincode}
                  disabled={pincodeLoading || pincode.length !== 6}
                  className="px-5 py-3.5 rounded-2xl font-bold text-white disabled:opacity-40 flex items-center gap-1.5"
                  style={{ background: '#f4941c', minWidth: 80 }}
                >
                  {pincodeLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <><FiSearch size={15} /> <span className="text-sm">Find</span></>}
                </button>
              </div>

              {/* Skip */}
              <button
                onClick={() => setShowPicker(false)}
                className="w-full py-3 text-gray-500 text-sm rounded-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Skip — Browse all sellers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-12 pb-3" style={{ background: 'linear-gradient(180deg, #0B1729 0%, #111f35 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-bold">🥩 EptoFresh Proteins</h1>
            {/* Location bar — tap to change */}
            <button
              onClick={() => setShowPicker(true)}
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

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => handleCategoryFilter(c.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: activeCategory === c.key ? '#f4941c' : 'rgba(255,255,255,0.07)',
                color:      activeCategory === c.key ? '#fff' : 'rgba(255,255,255,0.6)',
                border:     activeCategory === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {loading && (
          <div className="space-y-3 mt-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        )}

        {!loading && sellers.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-white font-semibold">No sellers found</p>
            <p className="text-gray-500 text-sm mt-1">Try setting your location or check back soon</p>
            <button onClick={() => setShowPicker(true)} className="mt-4 px-5 py-2.5 rounded-2xl text-white font-semibold text-sm" style={{ background: '#f4941c' }}>
              Set Location
            </button>
          </div>
        )}

        {!loading && sellers.length > 0 && (
          <div className="space-y-3 mt-4">
            {!userLocation && (
              <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.15)' }}>
                <FiMapPin className="text-orange-400 shrink-0" size={14} />
                <p className="text-orange-300 text-xs flex-1">Set your location to see delivery charges & nearest sellers first</p>
                <button onClick={() => setShowPicker(true)} className="text-orange-400 text-xs font-bold shrink-0">Set</button>
              </div>
            )}
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

function estimatedTime(dist) {
  if (!dist) return null;
  if (dist <= 3)  return '15-25 min';
  if (dist <= 6)  return '25-35 min';
  if (dist <= 10) return '35-50 min';
  if (dist <= 15) return '50-70 min';
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
      className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isLong ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}` }}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-700 flex items-center justify-center">
          {seller.shopImage
            ? <img src={seller.shopImage} alt={seller.shopName} className="w-full h-full object-cover" />
            : <span className="text-2xl">🥩</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-white font-semibold text-sm truncate">{seller.shopName}</span>
            {seller.badges?.verified   && <span className="text-blue-400 text-[10px] font-bold">✓</span>}
            {seller.badges?.topRated   && <span className="text-yellow-400 text-[10px]">⭐</span>}
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
              <span key={c} className="px-1.5 py-0.5 rounded text-[10px] capitalize" style={{ background: 'rgba(244,148,28,0.12)', color: '#f4941c' }}>
                {c.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <FiChevronRight className="text-gray-600 shrink-0" />
      </div>

      {isLong && (
        <div className="px-4 pb-3">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            📍 Long Distance Delivery — Additional charges apply
          </span>
        </div>
      )}
    </button>
  );
}
