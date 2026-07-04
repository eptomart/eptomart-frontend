// ============================================
// KOYAMBEDU CHECKOUT
// Step 0: Delivery address form (manual entry)
// Step 1: Google Maps pin to confirm location
// Step 2: Date selection (8 AM cut-off)
// Step 3: Payment
// Privacy: buyer full address NEVER shown to sellers
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiCheck, FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import SavedAddressPicker from '../../components/common/SavedAddressPicker';
import toast from 'react-hot-toast';

// ── DEV-ONLY: Test payment buttons ────────────────────────────────
// Set VITE_ENABLE_TEST_PAYMENT_BUTTONS=true in .env.local to enable.
// These buttons are NEVER visible in production builds.
const DEV_TEST_PAYMENTS = import.meta.env.VITE_ENABLE_TEST_PAYMENT_BUTTONS === 'true';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;
const DEFAULT_CENTER = { lat: 13.0389, lng: 80.1730 }; // Valasaravakkam, Chennai

const STEP_LABELS = ['Address', 'Map', 'Slot', 'Payment'];

// ── Haversine distance ─────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── IST time helpers ──────────────────────
const getISTDate = () => {
  // IST = UTC+5:30
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + (5 * 60 + 30) * 60000);
};

const getISTHour = () => getISTDate().getHours();

const fmtDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDisplayDate = (d) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ── All 4 delivery slots ───────────────────
const ALL_SLOTS = [
  { key: 'slot1', label: '7 AM – 9 AM',   display: 'Slot 1  ·  7 AM – 9 AM' },
  { key: 'slot2', label: '9 AM – 12 PM',  display: 'Slot 2  ·  9 AM – 12 PM' },
  { key: 'slot3', label: '12 PM – 2 PM',  display: 'Slot 3  ·  12 PM – 2 PM' },
  { key: 'slot4', label: '2 PM – 4 PM',   display: 'Slot 4  ·  2 PM – 4 PM' },
];

// Return slot keys available for TODAY based on current IST hour.
// Slot is available if there is still time to place the order before that slot ends.
// Rule:
//   00:00–03:59 → slots 2, 3, 4 available (slot 1 already started before market opens)
//   04:00–08:59 → slots 3, 4 available   (slot 1 & 2 cutoff passed)
//   09:00+      → no same-day slots       (Today tab disabled)
const getTodayAvailableSlots = (istHour) => {
  if (istHour < 4)  return ['slot2', 'slot3', 'slot4'];
  if (istHour < 9)  return ['slot3', 'slot4'];
  return [];
};

// ── Load Google Maps SDK (key from backend) ─
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    api.get('/eptofresh/maps/config')
      .then(({ data }) => {
        if (!data.key) { reject(new Error('No key')); return; }
        const cb = '__gmKbdCO_' + Date.now();
        window[cb] = () => { resolve(); delete window[cb]; };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places,geocoding&callback=${cb}`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      })
      .catch(reject);
  });
}

// ── Geocode an address string → lat/lng ────
function geocodeAddress(address) {
  return new Promise(resolve => {
    if (!window.google?.maps) { resolve(null); return; }
    new window.google.maps.Geocoder().geocode(
      { address, componentRestrictions: { country: 'IN' } },
      (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          resolve(null);
        }
      }
    );
  });
}

// ── Reverse geocode lat/lng → area name ────
function reverseGeocode(lat, lng) {
  return new Promise(resolve => {
    if (!window.google?.maps) { resolve('Unknown area'); return; }
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) { resolve('Unknown area'); return; }
      const c = results[0].address_components || [];
      const get = t => c.find(x => x.types.includes(t))?.long_name || '';
      const nb  = get('sublocality_level_2') || get('sublocality_level_1') || get('sublocality') || get('neighborhood');
      const loc = get('locality') || get('postal_town');
      resolve(nb ? `${nb}, ${loc}`.replace(/^, |, $/, '') : loc || results[0].formatted_address.split(',')[0]);
    });
  });
}

// ── Embedded Google Maps picker ─────────────
function EmbeddedMapPicker({ initialCenter, onLocationConfirmed }) {
  const mapDivRef  = useRef(null);
  const mapRef     = useRef(null);
  const geoTimer   = useRef(null);
  const acRef      = useRef(null);
  const tokenRef   = useRef(null);

  const [mapReady,   setMapReady]   = useState(false);
  const [loadError,  setLoadError]  = useState(false);
  const [center,     setCenter]     = useState(initialCenter || DEFAULT_CENTER);
  const [shortAddr,  setShortAddr]  = useState('');
  const [mapMoving,  setMapMoving]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);

  // ── Address search (Places autocomplete) ──
  useEffect(() => {
    if (!query || query.length < 2 || !acRef.current) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      acRef.current.getPlacePredictions(
        { input: query, sessionToken: tokenRef.current, componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] },
        (preds, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
            setSuggestions(preds); setShowSugg(true);
          } else setSuggestions([]);
        },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const pickSuggestion = useCallback((pred) => {
    setQuery(pred.structured_formatting?.main_text || pred.description);
    setSuggestions([]); setShowSugg(false);
    const svc = new window.google.maps.places.PlacesService(mapRef.current);
    svc.getDetails(
      { placeId: pred.place_id, fields: ['geometry'], sessionToken: tokenRef.current },
      (place, status) => {
        tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) {
          toast.error('Could not load that location'); return;
        }
        mapRef.current.panTo(place.geometry.location);
        mapRef.current.setZoom(16);
      },
    );
  }, []);

  const distKm = center
    ? Math.round(haversineKm(center.lat, center.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;

  useEffect(() => {
    let alive = true;
    const startCenter = initialCenter || DEFAULT_CENTER;

    loadGoogleMaps()
      .then(() => {
        if (!alive || !mapDivRef.current) return;
        const map = new window.google.maps.Map(mapDivRef.current, {
          center:           startCenter,
          zoom:             15,
          disableDefaultUI: true,
          gestureHandling:  'greedy',
          clickableIcons:   false,
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        });

        map.addListener('dragstart', () => setMapMoving(true));
        map.addListener('idle', () => {
          setMapMoving(false);
          const c = map.getCenter();
          const pos = { lat: c.lat(), lng: c.lng() };
          setCenter(pos);
          clearTimeout(geoTimer.current);
          geoTimer.current = setTimeout(() => {
            reverseGeocode(pos.lat, pos.lng).then(name => {
              if (alive) setShortAddr(name);
            });
          }, 400);
        });

        mapRef.current  = map;
        acRef.current   = new window.google.maps.places.AutocompleteService();
        tokenRef.current= new window.google.maps.places.AutocompleteSessionToken();
        reverseGeocode(startCenter.lat, startCenter.lng).then(name => {
          if (alive) setShortAddr(name);
        });
        setMapReady(true);
      })
      .catch(() => { if (alive) setLoadError(true); });

    return () => { alive = false; clearTimeout(geoTimer.current); };
  }, []);

  const handleConfirm = async () => {
    if (!center || mapMoving || confirming) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/koyambedu/check-delivery', { lat: center.lat, lng: center.lng });
      if (!data.available) {
        toast.error(data.message || 'Delivery not available in your area');
        setConfirming(false);
        return;
      }
      onLocationConfirmed({
        lat:          center.lat,
        lng:          center.lng,
        areaName:     shortAddr,
        deliveryCharge: data.deliveryCharge ?? 149,
        distanceKm:   data.distanceKm ?? distKm,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not check delivery availability');
      setConfirming(false);
    }
  };

  if (loadError) return (
    <div className="rounded-2xl p-6 text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
      <FiMapPin size={28} className="text-red-400 mx-auto mb-2" />
      <p className="font-bold text-red-700 text-sm">Map unavailable</p>
      <p className="text-red-400 text-xs mt-1">Google Maps API key not configured on the server.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* ── Address search ── */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
          onFocus={() => suggestions.length && setShowSugg(true)}
          placeholder="Search area, street or landmark…"
          disabled={!mapReady}
          className="w-full py-3 pl-10 pr-9 rounded-2xl text-gray-800 placeholder-gray-400 outline-none border border-green-200 focus:border-green-500 bg-white"
          style={{ fontSize: '16px' }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSugg(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2">
            <FiX size={16} className="text-gray-400" />
          </button>
        )}
        {showSugg && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-2xl overflow-hidden bg-white"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            {suggestions.map((pred, i) => (
              <button key={pred.place_id} type="button" onClick={() => pickSuggestion(pred)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-gray-50"
                style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <FiMapPin size={14} className="text-green-600 shrink-0 mt-1" />
                <div className="min-w-0">
                  <p className="text-gray-800 text-sm font-semibold truncate">
                    {pred.structured_formatting?.main_text || pred.description.split(',')[0]}
                  </p>
                  {pred.structured_formatting?.secondary_text && (
                    <p className="text-gray-400 text-xs truncate mt-0.5">{pred.structured_formatting.secondary_text}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 300, border: '2px solid #bbf7d0' }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: '#F5F4F2' }}>
            <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
            <p className="text-gray-400 text-xs">Loading map…</p>
          </div>
        )}

        {/* Fixed centre pin */}
        {mapReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 50 }}>
            <div className="flex flex-col items-center">
              <div className="transition-all duration-200"
                style={{ transform: mapMoving ? 'translateY(-10px) scale(1.1)' : 'translateY(0) scale(1)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: '#16a34a', border: '3px solid #fff',
                    boxShadow: mapMoving
                      ? '0 8px 24px rgba(22,163,74,0.6)'
                      : '0 4px 14px rgba(22,163,74,0.5)',
                  }}>
                  <FiMapPin className="text-white" size={18} />
                </div>
                <div className="w-0.5 h-3 mx-auto" style={{ background: 'linear-gradient(#16a34a, transparent)' }} />
              </div>
              <div className="rounded-full"
                style={{ width: mapMoving ? 4 : 12, height: mapMoving ? 2 : 4, background: 'rgba(0,0,0,0.18)', filter: 'blur(2px)', marginTop: -1 }} />
            </div>
          </div>
        )}

        {/* Distance badge */}
        {mapReady && distKm !== null && (
          <div className="absolute top-2 right-2 z-10 bg-white rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-1.5">
            <span className="text-xs font-black text-green-600">
              {distKm} km
            </span>
            <span className="text-gray-400 text-[10px]">from market</span>
          </div>
        )}

        {/* Hint */}
        {mapReady && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1 text-[10px] text-gray-500 whitespace-nowrap">
            Drag the map to fine-tune your location
          </div>
        )}
      </div>

      {/* Address preview */}
      {shortAddr && (
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#dcfce7' }}>
            <FiMapPin size={15} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {mapMoving ? 'Adjusting…' : 'Pinned location'}
            </p>
            <p className="font-bold text-gray-800 text-sm truncate">
              {mapMoving ? 'Keep dragging…' : shortAddr}
            </p>
            {distKm !== null && !mapMoving && (
              <p className="text-xs mt-0.5 font-medium text-green-600">
                {distKm} km from Koyambedu market
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!mapReady || mapMoving || confirming}
        className="w-full py-4 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
        style={{
          background: (mapReady && !mapMoving)
            ? 'linear-gradient(135deg, #16a34a, #059669)'
            : '#d1d5db',
          boxShadow: (mapReady && !mapMoving) ? '0 4px 16px rgba(22,163,74,0.4)' : 'none',
        }}>
        <FiCheck size={18} />
        {confirming ? 'Checking availability…' : mapMoving ? 'Keep dragging…' : 'Confirm This Location'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN CHECKOUT
// ═══════════════════════════════════════════
export default function KoyambeduCheckout() {
  const {
    cart, subtotal, clearCart,
    userLocation, setUserLocation,
    locationLabel, setLocationLabel,
  } = useKoyambeduCart();
  const { user, loadUser }  = useAuth();
  const navigate  = useNavigate();

  const [step,           setStep]    = useState(0);
  const [loading,        setLoading] = useState(false);
  const [placedOrder,    setPlaced]  = useState(null);
  const [saveAddrChecked, setSaveAddrChecked] = useState(true); // default: save new addresses

  // ── Address ────────────────────────────────
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState(null);

  // Pre-fill from localStorage cache (works for guests too)
  const cachedAddr = (() => {
    try { return JSON.parse(localStorage.getItem('kbd_last_addr') || 'null'); } catch { return null; }
  })();

  const [addr, setAddr] = useState({
    fullName:     user?.name          || cachedAddr?.fullName     || '',
    phone:        user?.phone         || cachedAddr?.phone        || '',
    addressLine1: cachedAddr?.addressLine1 || '',
    addressLine2: cachedAddr?.addressLine2 || '',
    city:         cachedAddr?.city         || 'Chennai',
    pincode:      cachedAddr?.pincode      || '',
    landmark:     '',
  });

  // Auto-select default saved address on first load (logged-in users)
  // If a valid saved address is found, skip the address form and jump to map (step 1).
  useEffect(() => {
    const saved = user?.addresses || [];
    if (!saved.length) return;
    const def = saved.find(a => a.isDefault) || saved[0];
    setSelectedSavedAddrId(String(def._id));
    setAddr({
      fullName:     def.fullName     || user?.name  || '',
      phone:        def.phone        || user?.phone || '',
      addressLine1: def.addressLine1 || '',
      addressLine2: def.addressLine2 || '',
      city:         def.city         || 'Chennai',
      pincode:      def.pincode      || '',
      landmark:     '',
    });
    // Skip address form — go straight to map if address is complete
    if (def.fullName && def.addressLine1 && def.pincode && def.phone) {
      if (userLocation) {
        // Location already pinned from a previous checkout — skip map step too.
        // Pre-populate locationData and jump straight to slot selection.
        setLocationData(prev => prev ?? { lat: userLocation.lat, lng: userLocation.lng, areaName: locationLabel || '', deliveryCharge: 149 });
        // Refresh delivery charge silently in the background.
        api.post('/koyambedu/check-delivery', { lat: userLocation.lat, lng: userLocation.lng })
          .then(({ data }) => {
            if (data.available) setLocationData(ld => ({ ...ld, deliveryCharge: data.deliveryCharge ?? 149, distanceKm: data.distanceKm }));
          })
          .catch(() => {});
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [user, userLocation, locationLabel]);

  // ── Fetch wallet balance when user reaches Step 3 ─────────────
  useEffect(() => {
    if (step === 3 && user) {
      api.get('/koyambedu/wallet')
        .then(({ data }) => setWalletData(data.wallet))
        .catch(() => {});
    }
  }, [step, user]);

  // ── Location (set after map step) ─────────
  const [locationData, setLocationData] = useState(
    userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, areaName: locationLabel || '', deliveryCharge: 149 }
      : null
  );

  // Center the map on the entered pincode when step 1 opens
  const [mapInitCenter, setMapInitCenter] = useState(userLocation || DEFAULT_CENTER);
  const geocodedRef = useRef(false);

  const goToMapStep = async () => {
    // Try to geocode the pincode for a better initial map center
    if (!geocodedRef.current && addr.pincode && window.google?.maps) {
      const coords = await geocodeAddress(`${addr.pincode}, ${addr.city}, India`);
      if (coords) setMapInitCenter(coords);
      geocodedRef.current = true;
    }
    setStep(1);
  };

  const handleLocationConfirmed = (data) => {
    setLocationData(data);
    setUserLocation({ lat: data.lat, lng: data.lng });
    setLocationLabel(data.areaName);
    toast.success(`Delivering to ${data.areaName}`);
    setStep(2);
  };

  // Pre-load Google Maps in background when checkout opens
  useEffect(() => { loadGoogleMaps().catch(() => {}); }, []);

  // ── Delivery slot state (IST-aware) ────────
  const istNow        = getISTDate();
  const istHour       = getISTHour();
  const todayDisabled = istHour >= 9; // 9 AM IST cutoff

  // Date values
  const todayIST    = new Date(istNow); todayIST.setHours(0,0,0,0);
  const tomorrowIST = new Date(todayIST); tomorrowIST.setDate(todayIST.getDate() + 1);
  const todayValue    = fmtDate(todayIST);
  const tomorrowValue = fmtDate(tomorrowIST);

  const [deliveryTab,  setDeliveryTab]  = useState(todayDisabled ? 'tomorrow' : 'today');
  const [selectedSlot, setSelectedSlot] = useState(null); // null = no selection yet

  // Derive the delivery date from the active tab
  const selectedDate = deliveryTab === 'today' ? todayValue : tomorrowValue;

  // Slots to show based on active tab
  const todaySlotKeys    = getTodayAvailableSlots(istHour);
  const visibleSlotKeys  = deliveryTab === 'tomorrow'
    ? ['slot1','slot2','slot3','slot4']
    : todaySlotKeys;
  const visibleSlots     = ALL_SLOTS.filter(s => visibleSlotKeys.includes(s.key));

  // Reset slot selection when tab changes (if current slot not available in new tab)
  const handleTabChange = (tab) => {
    setDeliveryTab(tab);
    setSelectedSlot(null);
  };

  // ── Payment ────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode,    setCouponCode]    = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // ── Wallet ─────────────────────────────────
  const [walletData, setWalletData] = useState(null);

  // ── DEV-ONLY test payment state ────────────────────────────────
  const [testPayFailed, setTestPayFailed] = useState(false);

  const deliveryCharge = locationData?.deliveryCharge ?? 249;
  const distanceKm     = locationData?.distanceKm ?? null;
  const platformFee    = 15;
  const couponDiscount = couponApplied?.discount || 0;
  const baseTotal      = parseFloat((subtotal + deliveryCharge + platformFee - couponDiscount).toFixed(2));

  // Mirror backend wallet logic: positive = discount, negative = extra charge
  const walletBalance    = walletData?.balance ?? 0;
  const walletAdjustment = walletBalance > 0
    ? Math.min(parseFloat(walletBalance.toFixed(2)), baseTotal)
    : parseFloat(walletBalance.toFixed(2));
  const total = parseFloat((baseTotal - walletAdjustment).toFixed(2));

  // ── Coupon ─────────────────────────────────
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupon/validate', {
        code: couponCode.trim(), orderAmount: subtotal, platform: 'koyambedu',
      });
      if (data.success) {
        setCouponApplied({ code: data.coupon.code, discount: data.discount });
        toast.success(`Coupon applied! ₹${data.discount.toFixed(2)} off`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setCouponApplied(null);
    } finally { setCouponLoading(false); }
  };

  // ── Place order ────────────────────────────
  const handlePlaceOrder = async () => {
    if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
      toast.error('Please fill all address fields'); return;
    }
    if (!locationData?.lat) { toast.error('Please confirm your delivery location on the map'); return; }
    setLoading(true);
    try {
      const slotObj = ALL_SLOTS.find(s => s.key === selectedSlot);
      const { data } = await api.post('/koyambedu/orders', {
        shippingAddress: addr,
        paymentMethod,
        deliverySlot:    slotObj?.label || '',
        deliverySlotKey: selectedSlot,
        deliveryDate:    selectedDate,
        buyerLocation: {
          lat:      locationData.lat,
          lng:      locationData.lng,
          areaName: locationData.areaName || '',
          city:     addr.city,
          pincode:  addr.pincode,
        },
        couponCode: couponApplied?.code || undefined,
      });

      // Razorpay
      const { data: rzp } = await api.post('/koyambedu/orders/create-razorpay', { orderId: data.order._id });
      const pendingOrderId = data.order._id;
      const launch = () => {
        const rzpModal = new window.Razorpay({
          key:      rzp.keyId,
          amount:   rzp.amount * 100,
          currency: 'INR',
          name:     'Koyambedu Daily',
          description: `Order #${data.order.orderId}`,
          order_id: rzp.rzpOrderId,
          handler: async (resp) => {
            try {
              await api.post('/koyambedu/orders/verify-payment', {
                orderId:           pendingOrderId,
                razorpayOrderId:   resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              await clearCart();
              setPlaced(data.order);
              toast.success('Payment confirmed!');
            } catch { toast.error('Payment verification failed'); }
          },
          modal: {
            ondismiss: async () => {
              // User closed Razorpay without paying — delete the pending order so it
              // doesn't show up in My Orders. Cart items remain intact.
              try { await api.delete(`/koyambedu/orders/${pendingOrderId}/pending`); } catch (_) {}
              toast('Payment cancelled — your cart is saved', { icon: '🛒' });
              setLoading(false);
            },
          },
          prefill: { name: addr.fullName, contact: addr.phone, email: user?.email || '' },
          theme:   { color: '#16a34a' },
        });
        rzpModal.open();
      };
      if (!window.Razorpay) {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = launch;
        document.body.appendChild(s);
      } else { launch(); }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────
  // DEV-ONLY: Test payment handlers
  // Removed before production. Controlled by VITE_ENABLE_TEST_PAYMENT_BUTTONS.
  // ─────────────────────────────────────────────────────────────────
  const handleTestPaySuccess = async () => {
    if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
      toast.error('Please fill all address fields'); return;
    }
    if (!locationData?.lat) { toast.error('Please confirm your delivery location on the map'); return; }
    setLoading(true);
    try {
      const slotObj = ALL_SLOTS.find(s => s.key === selectedSlot);
      const { data } = await api.post('/koyambedu/orders', {
        shippingAddress: addr,
        paymentMethod:   'razorpay',
        deliverySlot:    slotObj?.label || '',
        deliverySlotKey: selectedSlot,
        deliveryDate:    selectedDate,
        buyerLocation: {
          lat:      locationData.lat,
          lng:      locationData.lng,
          areaName: locationData.areaName || '',
          city:     addr.city,
          pincode:  addr.pincode,
        },
        couponCode: couponApplied?.code || undefined,
      });
      // Bypass Razorpay — call dev test endpoint (mirrors verifyPayment without signature)
      await api.post('/koyambedu/orders/test-payment', { orderId: data.order._id });
      await clearCart();
      setPlaced(data.order);
      toast.success('[TEST] Payment simulated as successful!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Test payment failed');
    } finally { setLoading(false); }
  };

  const handleTestPayFailure = () => {
    // Mirror the Razorpay dismiss flow: no order created, cart preserved, show failure state.
    setTestPayFailed(true);
    toast.error('[TEST] Payment simulated as rejected.', { duration: 4000 });
  };

  // ── Test-payment failure screen ─────────────
  if (testPayFailed) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#fef2f2' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl" style={{ background: '#fee2e2' }}>❌</div>
      <h2 className="font-black text-2xl text-red-700 mb-1">Payment Failed</h2>
      <p className="text-gray-600 text-sm mb-1 font-semibold">[DEV] Simulated payment rejection</p>
      <p className="text-gray-500 text-xs mb-6 max-w-xs">
        This is a test-mode failure. Your cart is intact. Try again or use the real payment flow.
      </p>
      <button
        onClick={() => setTestPayFailed(false)}
        className="w-full max-w-xs py-3 rounded-2xl font-extrabold text-white mb-3"
        style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}>
        Retry Payment
      </button>
      <button onClick={() => navigate('/koyambedu/cart')} className="text-gray-500 text-sm font-semibold">
        Back to Cart
      </button>
    </div>
  );

  // ── Success screen ─────────────────────────
  if (placedOrder) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#f0fdf4' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl"
        style={{ background: '#dcfce7' }}>✅</div>
      <h2 className="font-black text-2xl text-green-700 mb-1">Order Placed!</h2>
      <p className="text-gray-700 text-sm mb-1">Order ID: <strong className="text-gray-900">{placedOrder.orderId}</strong></p>
      <p className="text-gray-600 text-xs mb-4">
        {deliveryTab === 'today' ? 'Today' : 'Tomorrow'} · {fmtDisplayDate(deliveryTab === 'today' ? todayIST : tomorrowIST)}<br />
        {ALL_SLOTS.find(s => s.key === selectedSlot)?.display || ''}
      </p>
      <p className="text-gray-700 text-sm mb-6">WhatsApp updates at each stage.</p>
      <button onClick={() => navigate('/koyambedu/orders')}
        className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl w-full max-w-xs">
        Track My Order
      </button>
      <button onClick={() => navigate('/koyambedu')} className="mt-3 text-green-600 text-sm font-semibold">
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F4F2', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>

      {/* Header */}
      <div className="sticky top-0 z-20"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
          boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
          paddingTop: 'env(safe-area-inset-top)',
        }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">Checkout</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">Koyambedu Daily</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 px-4 pb-3 overflow-x-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition
                ${i < step ? 'bg-white text-green-700' : i === step ? 'bg-white text-green-700' : 'text-white'}
              `} style={{ background: i <= step ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                {i < step ? <FiCheck size={13} /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${i === step ? 'text-white' : 'text-emerald-200'}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <span className="text-emerald-300 mx-0.5 text-sm shrink-0">›</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ═════ STEP 0 — ADDRESS FORM ═════ */}
        {step === 0 && (
          <div className="space-y-4 pb-24">
            <SavedAddressPicker
              addresses={user?.addresses || []}
              selectedId={selectedSavedAddrId}
              onSelect={a => {
                setSelectedSavedAddrId(String(a._id));
                setAddr({
                  fullName:     a.fullName     || '',
                  phone:        a.phone        || '',
                  addressLine1: a.addressLine1 || '',
                  addressLine2: a.addressLine2 || '',
                  city:         a.city         || 'Chennai',
                  pincode:      a.pincode      || '',
                  landmark:     '',
                });
              }}
              onNewAddress={() => {
                setSelectedSavedAddrId(null);
                setAddr({ fullName: user?.name || '', phone: user?.phone || '', addressLine1: '', addressLine2: '', city: 'Chennai', pincode: '', landmark: '' });
              }}
            />

            <div className="bg-white rounded-2xl p-4 space-y-3"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">
                {selectedSavedAddrId ? 'Confirm Address' : 'Delivery Address'}
              </h2>

              <div>
                <label className="text-xs text-gray-700 font-semibold">Full Name *</label>
                <input
                  type="text" value={addr.fullName}
                  onChange={e => setAddr(a => ({ ...a, fullName: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold">Phone Number *</label>
                <input
                  type="tel" inputMode="numeric" value={addr.phone}
                  onChange={e => setAddr(a => ({ ...a, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
                  placeholder="10-digit mobile number"
                  className={`w-full mt-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    addr.phone && !/^[6-9]\d{9}$/.test(addr.phone)
                      ? 'border-red-300 focus:ring-red-300'
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {addr.phone && !/^[6-9]\d{9}$/.test(addr.phone) && (
                  <p className="text-xs text-red-500 mt-0.5">Valid 10-digit Indian number required</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold">Door No / Street *</label>
                <input
                  type="text" value={addr.addressLine1}
                  onChange={e => setAddr(a => ({ ...a, addressLine1: e.target.value }))}
                  placeholder="Door number, street name"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold">Address Line 2</label>
                <input
                  type="text" value={addr.addressLine2}
                  onChange={e => setAddr(a => ({ ...a, addressLine2: e.target.value }))}
                  placeholder="Apartment, colony, area"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 font-semibold">City</label>
                  <input
                    type="text" value={addr.city}
                    onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-700 font-semibold">Pincode *</label>
                  <input
                    type="number" inputMode="numeric" value={addr.pincode}
                    onChange={e => setAddr(a => ({ ...a, pincode: e.target.value.slice(0,6) }))}
                    placeholder="6-digit pincode"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold">Landmark (optional)</label>
                <input
                  type="text" value={addr.landmark}
                  onChange={e => setAddr(a => ({ ...a, landmark: e.target.value }))}
                  placeholder="Near bus stop, temple, etc."
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            <div className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
              🔒 Your exact address is <strong>never</strong> shared with sellers. Only your area name is visible to them.
            </div>

            {/* Save address checkbox — only shown when entering a new address */}
            {user && !selectedSavedAddrId && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAddrChecked}
                  onChange={e => setSaveAddrChecked(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-xs text-gray-600 font-medium">Save this address to my account</span>
              </label>
            )}

          </div>
        )}

        {/* ═════ STEP 1 — MAP ═════ */}
        {step === 1 && (
          <div className="space-y-4 pb-24">
            <div className="bg-white rounded-2xl p-4 space-y-1"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Pin Your Location</h2>
              <p className="text-xs text-gray-600">
                Drag the map so the green pin sits exactly on your building, then tap Confirm.
              </p>
            </div>

            <EmbeddedMapPicker
              initialCenter={mapInitCenter}
              onLocationConfirmed={handleLocationConfirmed}
            />

          </div>
        )}

        {/* ═════ STEP 2 — DELIVERY SLOT ═════ */}
        {step === 2 && (
          <div className="space-y-4 pb-24">

            {/* Delivery address summary */}
            <div className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1.5px solid #d1fae5' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: '#dcfce7' }}>
                    <FiMapPin size={15} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-0.5">Delivering to</p>
                    <p className="text-sm font-bold text-gray-800">
                      {addr.fullName}{addr.phone ? ` · ${addr.phone}` : ''}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      {[addr.addressLine1, addr.addressLine2, addr.city, addr.pincode].filter(Boolean).join(', ')}
                    </p>
                    {locationData?.areaName && (
                      <p className="text-[11px] text-green-600 font-semibold mt-1">
                        📌 {locationData.areaName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setStep(0)}
                  className="shrink-0 text-xs font-bold text-green-700 border border-green-200 px-3 py-1.5 rounded-xl bg-green-50 active:scale-95 transition">
                  Change
                </button>
              </div>
            </div>

            {/* Market hours notice */}
            <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <span className="text-amber-500 text-sm shrink-0">🕘</span>
              <p className="text-amber-700 text-[11px] leading-snug">
                Orders for the current day must be placed before <strong>9:00 AM</strong> — Koyambedu wholesale market closes early.
              </p>
            </div>

            {/* Header */}
            <div className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Choose Delivery Date & Slot</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {todayDisabled
                  ? 'Same-day booking closed (after 9 AM). Showing tomorrow\'s slots.'
                  : 'Select a delivery date and time slot.'}
              </p>
            </div>

            {/* ── Today / Tomorrow tabs ── */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <div className="flex">
                {/* Today tab */}
                <button
                  disabled={todayDisabled}
                  onClick={() => handleTabChange('today')}
                  className="flex-1 py-4 flex flex-col items-center gap-0.5 transition relative"
                  style={{
                    background: deliveryTab === 'today' ? '#f0fdf4' : '#fff',
                    borderBottom: `3px solid ${deliveryTab === 'today' ? '#16a34a' : 'transparent'}`,
                    opacity: todayDisabled ? 0.4 : 1,
                    cursor: todayDisabled ? 'not-allowed' : 'pointer',
                  }}>
                  <span className="text-xs font-black tracking-wide uppercase"
                    style={{ color: deliveryTab === 'today' ? '#166534' : '#6b7280' }}>
                    Today
                  </span>
                  <span className="text-[11px] font-semibold"
                    style={{ color: deliveryTab === 'today' ? '#16a34a' : '#9ca3af' }}>
                    {fmtDisplayDate(todayIST)}
                  </span>
                  {todayDisabled && (
                    <span className="text-[9px] font-bold text-red-400 mt-0.5">CLOSED</span>
                  )}
                </button>

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch" />

                {/* Tomorrow tab */}
                <button
                  onClick={() => handleTabChange('tomorrow')}
                  className="flex-1 py-4 flex flex-col items-center gap-0.5 transition"
                  style={{
                    background: deliveryTab === 'tomorrow' ? '#f0fdf4' : '#fff',
                    borderBottom: `3px solid ${deliveryTab === 'tomorrow' ? '#16a34a' : 'transparent'}`,
                  }}>
                  <span className="text-xs font-black tracking-wide uppercase"
                    style={{ color: deliveryTab === 'tomorrow' ? '#166534' : '#6b7280' }}>
                    Tomorrow
                  </span>
                  <span className="text-[11px] font-semibold"
                    style={{ color: deliveryTab === 'tomorrow' ? '#16a34a' : '#9ca3af' }}>
                    {fmtDisplayDate(tomorrowIST)}
                  </span>
                </button>
              </div>
            </div>

            {/* ── Slot list ── */}
            <div className="bg-white rounded-2xl p-4 space-y-2"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Available Delivery Slots — {deliveryTab === 'today' ? fmtDisplayDate(todayIST) : fmtDisplayDate(tomorrowIST)}
              </p>

              {visibleSlots.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl">⏰</span>
                  <p className="text-sm font-bold text-gray-700 mt-2">No same-day slots available</p>
                  <p className="text-xs text-gray-400 mt-1">Please select Tomorrow to book your delivery.</p>
                  <button onClick={() => handleTabChange('tomorrow')}
                    className="mt-3 text-green-600 text-sm font-bold underline">
                    Switch to Tomorrow →
                  </button>
                </div>
              ) : (
                visibleSlots.map(sl => (
                  <button key={sl.key} onClick={() => setSelectedSlot(sl.key)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: selectedSlot === sl.key ? '#f0fdf4' : '#f9fafb',
                      border: `2px solid ${selectedSlot === sl.key ? '#16a34a' : '#e5e7eb'}`,
                      color: selectedSlot === sl.key ? '#166534' : '#374151',
                    }}>
                    {/* Radio circle */}
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition"
                      style={{
                        borderColor: selectedSlot === sl.key ? '#16a34a' : '#d1d5db',
                        background: selectedSlot === sl.key ? '#16a34a' : 'white',
                      }}>
                      {selectedSlot === sl.key && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="flex-1 text-left">{sl.display}</span>
                    {selectedSlot === sl.key && <FiCheck size={16} className="text-green-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>

            {/* ── Tomorrow-only: Market Price Notice ── */}
            {deliveryTab === 'tomorrow' && (
              <div className="rounded-2xl px-4 py-3.5 space-y-2.5"
                style={{ background: '#fffbf0', border: '1.5px solid #fed7aa' }}>
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <p className="text-orange-900 font-black text-sm">Prices are today's estimates</p>
                </div>
                <p className="text-orange-700 text-xs leading-relaxed">
                  We source fresh from Koyambedu market tomorrow morning. The final price may be slightly different from what you see now.
                </p>
                {/* Two outcome pills */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(22,163,74,0.08)' }}>
                    <span className="text-base shrink-0">💚</span>
                    <p className="text-green-800 text-xs font-semibold leading-snug">
                      Price drops? — Savings go straight to your Wallet
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(217,119,6,0.08)' }}>
                    <span className="text-base shrink-0">⚡</span>
                    <p className="text-amber-800 text-xs font-semibold leading-snug">
                      Price rises? — Small difference adjusted in your next order
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation hint */}
            {!selectedSlot && visibleSlots.length > 0 && (
              <p className="text-xs text-center text-amber-600 font-semibold">
                Select a delivery slot to continue.
              </p>
            )}
          </div>
        )}

        {/* Floating bottom bar — Step 0 */}
        {step === 0 && (
          <div className="fixed bottom-0 left-0 right-0 above-bottom-nav bg-white border-t border-gray-100 px-4 pt-3 z-[9970]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
            <button
              onClick={async () => {
                if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
                  toast.error('Please fill all required fields'); return;
                }
                if (!/^[6-9]\d{9}$/.test(addr.phone)) {
                  toast.error('Enter a valid 10-digit Indian mobile number'); return;
                }
                try {
                  localStorage.setItem('kbd_last_addr', JSON.stringify({
                    fullName: addr.fullName, phone: addr.phone,
                    addressLine1: addr.addressLine1, addressLine2: addr.addressLine2,
                    city: addr.city, pincode: addr.pincode,
                  }));
                } catch { /* non-blocking */ }
                if (user && !selectedSavedAddrId && saveAddrChecked) {
                  try {
                    await api.post('/auth/add-address', {
                      fullName: addr.fullName, phone: addr.phone,
                      addressLine1: addr.addressLine1, addressLine2: addr.addressLine2,
                      city: addr.city, pincode: addr.pincode,
                    });
                    await loadUser();
                  } catch { /* non-blocking */ }
                }
                goToMapStep();
              }}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm transition active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
              Next: Pin Location on Map →
            </button>
          </div>
        )}

        {/* Floating bottom bar — Step 1 */}
        {step === 1 && (
          <div className="fixed bottom-0 left-0 right-0 above-bottom-nav bg-white border-t border-gray-100 px-4 pt-3 z-[9970]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
            <button onClick={() => setStep(0)}
              className="w-full py-3.5 rounded-2xl font-bold text-green-700 text-sm border-2 border-green-200 bg-white transition active:scale-[0.98]">
              ← Back to Address
            </button>
          </div>
        )}

        {/* Floating bottom bar — Step 2 */}
        {step === 2 && (
          <div className="fixed bottom-0 left-0 right-0 above-bottom-nav bg-white border-t border-gray-100 px-4 pt-3 z-[9970]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl text-sm bg-white">
                ← Back
              </button>
              <button
                onClick={() => {
                  if (!selectedSlot) { toast.error('Please select a delivery slot.'); return; }
                  setStep(3);
                }}
                disabled={!selectedSlot}
                className="flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition"
                style={{ background: selectedSlot ? 'linear-gradient(135deg, #16a34a, #059669)' : '#9ca3af' }}>
                {selectedSlot ? 'Continue to Payment →' : 'Select a Slot First'}
              </button>
            </div>
          </div>
        )}

        {/* ═════ STEP 3 — PAYMENT ═════ */}
        {step === 3 && (
          <div className="space-y-4 pb-24">
            {/* Summary pills */}
            <div className="bg-white rounded-2xl p-4 space-y-2.5"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm mb-1">Order Summary</h2>
              <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-600 flex items-center gap-1.5"><FiMapPin size={13} /> Area</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">{locationData?.areaName || '—'}</span>
                  <button onClick={() => setStep(1)} className="text-green-500 text-xs underline">Change</button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">📅 Delivery</span>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold text-gray-700 text-xs">
                      {deliveryTab === 'today' ? 'Today' : 'Tomorrow'} · {fmtDisplayDate(deliveryTab === 'today' ? todayIST : tomorrowIST)}
                    </p>
                    <p className="text-[11px] text-green-600 font-medium">
                      {ALL_SLOTS.find(s => s.key === selectedSlot)?.display || '—'}
                    </p>
                  </div>
                  <button onClick={() => setStep(2)} className="text-green-500 text-xs underline">Change</button>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-4 space-y-3"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Payment Method</h2>
              {[
                { val: 'razorpay', label: 'Online Payment',   sub: 'Card / UPI / NetBanking', icon: '💳' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setPaymentMethod(opt.val)}
                  className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 transition"
                  style={{
                    background: paymentMethod === opt.val ? '#f0fdf4' : '#f9fafb',
                    border: `2px solid ${paymentMethod === opt.val ? '#16a34a' : '#e5e7eb'}`,
                  }}>
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-600">{opt.sub}</p>
                  </div>
                  {paymentMethod === opt.val && <FiCheck size={18} className="text-green-600" />}
                </button>
              ))}
            </div>

            {/* ── Wallet balance card ── */}
            {walletData !== null && walletBalance !== 0 && (
              <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
                style={{
                  background: walletBalance > 0 ? '#f0fdf4' : '#fffbeb',
                  border: `1.5px solid ${walletBalance > 0 ? '#bbf7d0' : '#fde68a'}`,
                }}>
                <span className="text-xl shrink-0 mt-0.5">{walletBalance > 0 ? '💚' : '⚠️'}</span>
                <div className="flex-1">
                  {walletBalance > 0 ? (
                    <>
                      <p className="text-green-800 text-sm font-bold leading-snug">
                        You have ₹{walletBalance.toFixed(2)} in Wallet Credits
                      </p>
                      <p className="text-green-600 text-xs mt-0.5">
                        This will be automatically applied as a discount on your order.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-amber-800 text-sm font-bold leading-snug">
                        Wallet Adjustment: ₹{Math.abs(walletBalance).toFixed(2)} due
                      </p>
                      <p className="text-amber-600 text-xs mt-0.5">
                        A previous price difference will be recovered in this order.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <div className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm mb-3">Bill Details</h2>
              {cart.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-700 mb-1.5">
                  <span>{it.name} × {it.quantity} {it.unit}</span>
                  <span>₹{((it.unitPrice || 0) * it.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-700 font-medium"><span>Products Total</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-700 font-medium">
                  <span className="flex items-center gap-1">
                    Delivery Charges
                    {distanceKm !== null && (
                      <span className="text-[10px] bg-green-50 text-green-600 font-semibold px-1.5 py-0.5 rounded-full">
                        {distanceKm} km
                      </span>
                    )}
                  </span>
                  <span>₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-gray-700 font-medium"><span>Platform Fee</span><span>₹{platformFee}</span></div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Promo ({couponApplied?.code})</span><span>−₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {walletAdjustment > 0 && (
                  <div className="flex justify-between font-semibold text-green-600">
                    <span className="flex items-center gap-1">💚 Wallet Credit <span className="text-[10px] font-normal text-green-500">(auto-applied)</span></span>
                    <span>−₹{walletAdjustment.toFixed(2)}</span>
                  </div>
                )}
                {walletAdjustment < 0 && (
                  <div className="flex justify-between font-semibold text-amber-600">
                    <span className="flex items-center gap-1">⚠️ Wallet Recovery <span className="text-[10px] font-normal text-amber-500">(price adjustment)</span></span>
                    <span>+₹{Math.abs(walletAdjustment).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2">
                  <span>Grand Total</span><span className="text-green-700">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-3">
                {couponApplied ? (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <span className="text-green-600 text-xs font-bold">🎉 {couponApplied.code} — −₹{couponApplied.discount.toFixed(2)}</span>
                    <button onClick={() => { setCouponApplied(null); setCouponCode(''); }} className="text-xs text-red-400 font-semibold">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text" value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleValidateCoupon()}
                      placeholder="Promo code"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button onClick={handleValidateCoupon} disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-600 disabled:opacity-50">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── DEV-ONLY: Test Payment Controls ─────────────────────────
                 Visible only when VITE_ENABLE_TEST_PAYMENT_BUTTONS=true.
                 Remove this entire block before production deployment.
            ────────────────────────────────────────────────────────── */}
            {DEV_TEST_PAYMENTS && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ background: '#1e1b4b', border: '2px dashed #6366f1' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-300 text-sm">⚠️</span>
                  <p className="text-indigo-200 text-[11px] font-black uppercase tracking-wider">
                    Development Testing — Remove Before Production
                  </p>
                </div>
                <p className="text-indigo-300 text-[10px] leading-relaxed">
                  These buttons bypass the Razorpay gateway and simulate the exact success/failure
                  flows. Only visible when <code className="bg-indigo-900 px-1 rounded">VITE_ENABLE_TEST_PAYMENT_BUTTONS=true</code>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleTestPaySuccess}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-50"
                    style={{ background: '#16a34a', color: '#fff' }}>
                    {loading ? 'Processing…' : '✅ Complete Payment (Test)'}
                  </button>
                  <button
                    onClick={handleTestPayFailure}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-50"
                    style={{ background: '#dc2626', color: '#fff' }}>
                    ❌ Reject Payment (Test)
                  </button>
                </div>
              </div>
            )}

            {/* ⚠ Processing warning — shown while payment is in progress */}
            {loading && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                <p className="text-amber-800 text-xs font-semibold leading-snug">
                  Payment is processing — <strong>do not refresh, go back, or close this page</strong> until you see the confirmation screen.
                </p>
              </div>
            )}

          </div>
        )}

        {/* ── Floating Place Order bar (Step 3) ── */}
        {step === 3 && (
          <div className="fixed bottom-0 left-0 right-0 z-[9970] bg-white"
            style={{
              boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
              paddingTop: 12,
              paddingLeft: 16,
              paddingRight: 16,
            }}>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="border-2 border-green-200 text-green-700 font-bold py-3 px-5 rounded-xl text-sm bg-white active:scale-95 transition shrink-0">
                ← Back
              </button>
              {user ? (
                <button onClick={handlePlaceOrder} disabled={loading}
                  className="flex-1 text-white font-black py-3 rounded-xl disabled:opacity-60 transition text-sm active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
                  {loading ? 'Placing Order…' : `Place Order · ₹${total.toFixed(2)}`}
                </button>
              ) : (
                <button onClick={() => navigate('/login', { state: { from: '/koyambedu/checkout' } })}
                  className="flex-1 text-white font-black py-3 rounded-xl transition text-sm active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
                  Login to Place Order
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
