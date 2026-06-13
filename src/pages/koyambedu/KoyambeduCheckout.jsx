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
import { FiMapPin, FiCheck, FiArrowLeft } from 'react-icons/fi';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;
const DEFAULT_CENTER = { lat: 13.0836, lng: 80.2785 }; // Chennai Central

const STEP_LABELS = ['Address', 'Map', 'Date', 'Payment'];

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

// ── Delivery date options (8 AM cut-off) ──
const getDeliveryDates = () => {
  const now  = new Date();
  const hour = now.getHours();
  const pad  = (n) => String(n).padStart(2, '0');
  const fmt  = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const label = (d) => {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const t = new Date(d); t.setHours(0,0,0,0);
    if (t.getTime() === today.getTime()) return 'Today';
    if (t.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
  };
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate()+2);
  if (hour < 8) {
    return [
      { value: fmt(today),    label: label(today),    subLabel: 'Book now (before 8 AM cut-off)', icon: '⚡' },
      { value: fmt(tomorrow), label: label(tomorrow), subLabel: 'Morning delivery',               icon: '📅' },
    ];
  } else {
    return [
      { value: fmt(tomorrow), label: label(tomorrow), subLabel: 'Next day delivery',              icon: '📅' },
      { value: fmt(dayAfter), label: label(dayAfter), subLabel: 'Day after tomorrow',             icon: '📅' },
    ];
  }
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

  const [mapReady,   setMapReady]   = useState(false);
  const [loadError,  setLoadError]  = useState(false);
  const [center,     setCenter]     = useState(initialCenter || DEFAULT_CENTER);
  const [shortAddr,  setShortAddr]  = useState('');
  const [mapMoving,  setMapMoving]  = useState(false);
  const [confirming, setConfirming] = useState(false);

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

        mapRef.current = map;
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
            <span className={`text-xs font-black ${distKm > 30 ? 'text-orange-500' : 'text-green-600'}`}>
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
              <p className={`text-xs mt-0.5 font-medium ${distKm > 30 ? 'text-orange-500' : 'text-green-600'}`}>
                {distKm} km from Koyambedu market
                {distKm > 30 ? ' · Long-distance charges may apply' : ' · Within delivery range'}
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
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [step,        setStep]    = useState(0);
  const [loading,     setLoading] = useState(false);
  const [placedOrder, setPlaced]  = useState(null);

  // ── Address ────────────────────────────────
  const [addr, setAddr] = useState({
    fullName:     user?.name || '',
    phone:        user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city:         'Chennai',
    pincode:      '',
    landmark:     '',
  });

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

  // ── Date ───────────────────────────────────
  const deliveryDates = getDeliveryDates();
  const isBefore8     = new Date().getHours() < 8;
  const [selectedDate, setSelectedDate] = useState(deliveryDates[0].value);

  // ── Payment ────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode,    setCouponCode]    = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const deliveryCharge = locationData?.deliveryCharge ?? 149;
  const serviceFee     = 10;
  const couponDiscount = couponApplied?.discount || 0;
  const total          = parseFloat((subtotal + deliveryCharge + serviceFee - couponDiscount).toFixed(2));

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
      const { data } = await api.post('/koyambedu/orders', {
        shippingAddress: addr,
        paymentMethod,
        deliverySlot:  '7 AM – 11 AM',
        deliveryDate:  selectedDate,
        buyerLocation: {
          lat:      locationData.lat,
          lng:      locationData.lng,
          areaName: locationData.areaName || '',
          city:     addr.city,
          pincode:  addr.pincode,
        },
        couponCode: couponApplied?.code || undefined,
      });

      if (paymentMethod === 'cod') {
        await clearCart();
        setPlaced(data.order);
        toast.success('Order placed!');
        return;
      }

      // Razorpay
      const { data: rzp } = await api.post('/koyambedu/orders/create-razorpay', { orderId: data.order._id });
      const launch = () => {
        new window.Razorpay({
          key:      import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount:   rzp.amount * 100,
          currency: 'INR',
          name:     'Koyambedu Daily',
          description: `Order #${data.order.orderId}`,
          order_id: rzp.rzpOrderId,
          handler: async (resp) => {
            try {
              await api.post('/koyambedu/orders/verify-payment', {
                orderId:           data.order._id,
                razorpayOrderId:   resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              await clearCart();
              setPlaced(data.order);
              toast.success('Payment confirmed!');
            } catch { toast.error('Payment verification failed'); }
          },
          prefill: { name: addr.fullName, contact: addr.phone, email: user?.email || '' },
          theme:   { color: '#16a34a' },
        }).open();
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

  // ── Success screen ─────────────────────────
  if (placedOrder) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#f0fdf4' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl"
        style={{ background: '#dcfce7' }}>✅</div>
      <h2 className="font-black text-2xl text-green-700 mb-1">Order Placed!</h2>
      <p className="text-gray-500 text-sm mb-1">Order ID: <strong className="text-gray-800">{placedOrder.orderId}</strong></p>
      <p className="text-gray-400 text-xs mb-4">
        Delivery on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })} · 7 AM–11 AM
      </p>
      <p className="text-gray-500 text-sm mb-5">WhatsApp updates at each stage.</p>
      <div className="rounded-xl px-4 py-3 mb-6 text-sm w-full max-w-xs"
        style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
        If market prices change, you'll receive an approval request before dispatch.
      </div>
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
    <div className="min-h-screen pb-12" style={{ background: '#F5F4F2' }}>

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
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 space-y-3"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Delivery Address</h2>

              <div>
                <label className="text-xs text-gray-500 font-semibold">Full Name *</label>
                <input
                  type="text" value={addr.fullName}
                  onChange={e => setAddr(a => ({ ...a, fullName: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold">Phone Number *</label>
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
                <label className="text-xs text-gray-500 font-semibold">Door No / Street *</label>
                <input
                  type="text" value={addr.addressLine1}
                  onChange={e => setAddr(a => ({ ...a, addressLine1: e.target.value }))}
                  placeholder="Door number, street name"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold">Address Line 2</label>
                <input
                  type="text" value={addr.addressLine2}
                  onChange={e => setAddr(a => ({ ...a, addressLine2: e.target.value }))}
                  placeholder="Apartment, colony, area"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold">City</label>
                  <input
                    type="text" value={addr.city}
                    onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Pincode *</label>
                  <input
                    type="number" inputMode="numeric" value={addr.pincode}
                    onChange={e => setAddr(a => ({ ...a, pincode: e.target.value.slice(0,6) }))}
                    placeholder="6-digit pincode"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold">Landmark (optional)</label>
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

            <button
              onClick={() => {
                if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
                  toast.error('Please fill all required fields'); return;
                }
                if (!/^[6-9]\d{9}$/.test(addr.phone)) {
                  toast.error('Enter a valid 10-digit Indian mobile number'); return;
                }
                goToMapStep();
              }}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-sm transition active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
              Next: Pin Location on Map →
            </button>
          </div>
        )}

        {/* ═════ STEP 1 — MAP ═════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 space-y-1"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Pin Your Location</h2>
              <p className="text-xs text-gray-400">
                Drag the map so the green pin sits exactly on your building, then tap Confirm.
              </p>
            </div>

            <EmbeddedMapPicker
              initialCenter={mapInitCenter}
              onLocationConfirmed={handleLocationConfirmed}
            />

            <button onClick={() => setStep(0)}
              className="w-full py-3 rounded-2xl font-bold text-green-700 text-sm border-2 border-green-200 bg-white transition active:scale-[0.98]">
              ← Back to Address
            </button>
          </div>
        )}

        {/* ═════ STEP 2 — DELIVERY DATE ═════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm">Delivery Date</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isBefore8
                  ? 'Book before 8 AM for today\'s delivery.'
                  : 'Today\'s booking window (8 AM) has closed. Choose your delivery day.'}
              </p>
            </div>

            {!isBefore8 && (
              <div className="rounded-xl px-3 py-3 flex items-start gap-2.5"
                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <span className="text-xl">⏰</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#92400e' }}>Booking closed for today</p>
                  <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>Orders must be placed before 8 AM for same-day delivery.</p>
                </div>
              </div>
            )}

            {deliveryDates.map((d) => (
              <button key={d.value} onClick={() => setSelectedDate(d.value)}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-4 transition"
                style={{
                  background: selectedDate === d.value ? '#f0fdf4' : '#fff',
                  border: `2px solid ${selectedDate === d.value ? '#16a34a' : '#e5e7eb'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                  style={{ background: selectedDate === d.value ? '#16a34a' : '#f3f4f6' }}>
                  {d.icon}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base" style={{ color: selectedDate === d.value ? '#166534' : '#1f2937' }}>{d.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: selectedDate === d.value ? '#16a34a' : '#9ca3af' }}>{d.subLabel}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(d.value + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
                  </p>
                </div>
                {selectedDate === d.value && <FiCheck size={20} className="text-green-600 shrink-0" />}
              </button>
            ))}

            <div className="rounded-xl px-3 py-2.5 text-xs"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
              🥦 Fresh produce is packed early morning. Delivery slot: <strong>7 AM – 11 AM</strong>.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl text-sm bg-white">
                ← Back
              </button>
              <button onClick={() => setStep(3)} disabled={!selectedDate}
                className="flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ═════ STEP 3 — PAYMENT ═════ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary pills */}
            <div className="bg-white rounded-2xl p-4 space-y-2.5"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm mb-1">Order Summary</h2>
              <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-400 flex items-center gap-1.5"><FiMapPin size={13} /> Area</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">{locationData?.areaName || '—'}</span>
                  <button onClick={() => setStep(1)} className="text-green-500 text-xs underline">Change</button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">📅 Date</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">
                    {deliveryDates.find(d => d.value === selectedDate)?.label || 'Tomorrow'} · 7–11 AM
                  </span>
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
                { val: 'cod',      label: 'Cash on Delivery', sub: 'Pay when order arrives',  icon: '💵' },
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
                    <p className="text-xs text-gray-400">{opt.sub}</p>
                  </div>
                  {paymentMethod === opt.val && <FiCheck size={18} className="text-green-600" />}
                </button>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 className="font-bold text-gray-800 text-sm mb-3">Bill Details</h2>
              {cart.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{it.name} × {it.quantity} {it.unitLabel || it.unit}</span>
                  <span>₹{((it.unitPrice || 0) * it.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Delivery</span><span>₹{deliveryCharge}</span></div>
                <div className="flex justify-between text-gray-500"><span>Service fee</span><span>₹{serviceFee}</span></div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Promo ({couponApplied?.code})</span><span>−₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2">
                  <span>Total</span><span className="text-green-700">₹{total.toFixed(2)}</span>
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

            <div className="rounded-xl px-3 py-2.5 text-[11px]"
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
              ⚠️ Koyambedu market prices fluctuate daily. You'll get a WhatsApp message if any price changes before dispatch.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl text-sm bg-white">
                ← Back
              </button>
              {user ? (
                <button onClick={handlePlaceOrder} disabled={loading}
                  className="flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-60 transition text-sm"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}>
                  {loading ? 'Placing…' : `Place Order ₹${total.toFixed(2)}`}
                </button>
              ) : (
                <button onClick={() => navigate('/login', { state: { from: '/koyambedu/checkout' } })}
                  className="flex-1 text-white font-bold py-3 rounded-xl transition text-sm"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}>
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
