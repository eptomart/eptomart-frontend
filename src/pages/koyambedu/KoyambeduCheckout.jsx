// ============================================
// KOYAMBEDU CHECKOUT
// Step 0: Map location picker + distance from Koyambedu
// Step 1: Delivery address form
// Step 2: Date selection (8 AM cut-off, max 1 day advance)
// Step 3: Payment
// Privacy: buyer full address NEVER shown to sellers
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;
const MAX_RADIUS_KM = 7;

const STEP_LABELS = ['Location', 'Address', 'Date', 'Payment'];

// ── Haversine distance (client-side preview) ──
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Delivery date options (8 AM cut-off) ──────
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

// ── Reverse geocode via OSM Nominatim (free) ──
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address || {};
    return (
      a.suburb || a.neighbourhood || a.residential || a.village ||
      a.town || a.county || a.city_district || a.city || 'Chennai'
    );
  } catch {
    return 'Chennai';
  }
}

// ── Leaflet Map Picker ─────────────────────────
function MapPicker({ defaultLat, defaultLng, onPick, distanceKm }) {
  const mapRef    = useRef(null);
  const leafRef   = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id  = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || leafRef.current) return;
      const L = window.L;
      const lat = defaultLat || KOYAMBEDU_LAT;
      const lng = defaultLng || KOYAMBEDU_LNG;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 14);
      leafRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Fixed Koyambedu market pin
      const kbdIcon = L.divIcon({
        html: '<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
        iconAnchor: [7, 7], className: '',
      });
      L.marker([KOYAMBEDU_LAT, KOYAMBEDU_LNG], { icon: kbdIcon })
        .addTo(map)
        .bindPopup('<b>🏪 Koyambedu Market</b>');

      // Draggable delivery pin
      const delivIcon = L.divIcon({
        html: '<div style="width:22px;height:22px;background:#dc2626;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 12px rgba(220,38,38,0.5)"></div>',
        iconAnchor: [11, 22], className: '',
      });
      const marker = L.marker([lat, lng], { icon: delivIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      const fireUpdate = async (latlng) => {
        const areaName = await reverseGeocode(latlng.lat, latlng.lng);
        onPick({ lat: latlng.lat, lng: latlng.lng, areaName });
      };

      marker.on('dragend', () => fireUpdate(marker.getLatLng()));
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        fireUpdate(e.latlng);
      });

      if (defaultLat && defaultLng) {
        fireUpdate({ lat: defaultLat, lng: defaultLng });
      }
    };

    if (window.L) {
      initMap();
    } else {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = initMap;
      document.body.appendChild(s);
    }

    return () => {
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
    };
  }, []);

  // Sync if GPS comes in after mount
  useEffect(() => {
    if (!markerRef.current || !defaultLat || !defaultLng) return;
    markerRef.current.setLatLng([defaultLat, defaultLng]);
    leafRef.current?.setView([defaultLat, defaultLng], 14);
  }, [defaultLat, defaultLng]);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 280, border: '2px solid #bbf7d0' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* Distance badge */}
      {distanceKm != null && (
        <div className="absolute top-2 right-2 z-[500] bg-white rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <span className={`text-xs font-black ${distanceKm > MAX_RADIUS_KM ? 'text-red-600' : 'text-green-600'}`}>
            📍 {distanceKm.toFixed(1)} km
          </span>
          <span className="text-gray-400 text-[10px]">from market</span>
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">
        Drag the pin or tap to set location
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN CHECKOUT
// ═══════════════════════════════════════════════
export default function KoyambeduCheckout() {
  const {
    cart, subtotal, clearCart,
    userLocation, setUserLocation,
    locationLabel, setLocationLabel,
  } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [step,        setStep]       = useState(0);
  const [loading,     setLoading]    = useState(false);
  const [placedOrder, setPlaced]     = useState(null);

  // ── Location ───────────────────────────────
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [locationData,setLocationData]= useState(null);
  const [pickedCoords,setPickedCoords]= useState(
    userLocation ? { lat: userLocation.lat, lng: userLocation.lng, areaName: locationLabel || '' } : null
  );

  const previewDist = pickedCoords
    ? haversineKm(pickedCoords.lat, pickedCoords.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG)
    : null;

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

  // ── Date ───────────────────────────────────
  const deliveryDates  = getDeliveryDates();
  const isBefore8      = new Date().getHours() < 8;
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

  // ── GPS detect ─────────────────────────────
  const detectGPS = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) { setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, areaName: '' });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Map pin moved ──────────────────────────
  const handleMapPick = (coords) => {
    setPickedCoords(coords);
    setLocationLabel(coords.areaName || '');
    setUserLocation({ lat: coords.lat, lng: coords.lng });
  };

  // ── Confirm location (server check) ───────
  const confirmLocation = async () => {
    if (!pickedCoords) { toast.error('Please set your delivery location on the map'); return; }
    setGpsLoading(true);
    try {
      const { data } = await api.post('/koyambedu/check-delivery', {
        lat: pickedCoords.lat, lng: pickedCoords.lng,
      });
      setLocationData({ ...data, lat: pickedCoords.lat, lng: pickedCoords.lng, areaName: pickedCoords.areaName || '' });
      if (!data.available) {
        toast.error(data.message || 'Delivery not available in your area');
      } else {
        setStep(1);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not check delivery availability');
    } finally {
      setGpsLoading(false);
    }
  };

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
    if (!locationData?.lat) { toast.error('Please confirm your delivery location'); return; }
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

  // ── Success ────────────────────────────────
  if (placedOrder) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-4xl">✅</div>
      <h2 className="font-black text-2xl text-green-700 mb-1">Order Placed!</h2>
      <p className="text-gray-500 text-sm mb-1">Order ID: <strong className="text-gray-800">{placedOrder.orderId}</strong></p>
      <p className="text-gray-400 text-xs mb-4">
        Delivery on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })} · 7 AM–11 AM
      </p>
      <p className="text-gray-500 text-sm mb-5">WhatsApp updates will be sent at each stage.</p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700 w-full max-w-xs">
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
    <div className="min-h-screen bg-green-50 pb-12">

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }}
        className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-black text-lg">Checkout</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 px-4 py-3 bg-white border-b border-green-100 overflow-x-auto">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${i <= step ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
            <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-green-700' : 'text-gray-400'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="text-gray-300 mx-1 text-sm">›</span>}
          </div>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-0">

        {/* ═════ STEP 0 — LOCATION ═════ */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Set Delivery Location</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Tap the map or drag the red pin to set your delivery address. We deliver within {MAX_RADIUS_KM} km of Koyambedu market.
              </p>
            </div>

            {/* GPS shortcut */}
            <button onClick={detectGPS} disabled={gpsLoading}
              className="w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 font-bold py-2.5 rounded-xl bg-green-50 hover:bg-green-100 disabled:opacity-60 transition text-sm">
              {gpsLoading
                ? <><div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/> Detecting...</>
                : <><span>📍</span> Use My Current Location</>
              }
            </button>

            {/* Map */}
            <MapPicker
              defaultLat={pickedCoords?.lat || userLocation?.lat}
              defaultLng={pickedCoords?.lng || userLocation?.lng}
              onPick={handleMapPick}
              distanceKm={previewDist}
            />

            {/* Picked area preview */}
            {pickedCoords?.areaName && (
              <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${previewDist != null && previewDist > MAX_RADIUS_KM ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <span className="text-lg">{previewDist != null && previewDist > MAX_RADIUS_KM ? '❌' : '✅'}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${previewDist != null && previewDist > MAX_RADIUS_KM ? 'text-red-700' : 'text-green-700'}`}>
                    {pickedCoords.areaName}
                  </p>
                  {previewDist != null && (
                    <p className={`text-xs ${previewDist > MAX_RADIUS_KM ? 'text-red-500' : 'text-green-600'}`}>
                      {previewDist.toFixed(1)} km from Koyambedu market
                      {previewDist > MAX_RADIUS_KM ? ' · Outside delivery zone' : ' · Within delivery zone'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* API result (after confirm attempt) */}
            {locationData && !locationData.available && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-bold">Outside delivery zone</p>
                <p className="text-red-500 text-xs mt-1">{locationData.message}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-[11px] text-blue-600 leading-relaxed">
              🔒 Your exact address is <strong>never</strong> shared with sellers. Only your area name (e.g. "Anna Nagar") is visible to them.
            </div>

            <button
              onClick={confirmLocation}
              disabled={!pickedCoords || gpsLoading || (previewDist != null && previewDist > MAX_RADIUS_KM)}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {gpsLoading ? 'Checking delivery...' : 'Confirm & Continue →'}
            </button>
          </div>
        )}

        {/* ═════ STEP 1 — ADDRESS ═════ */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h2 className="font-bold text-gray-800">Delivery Address</h2>
              {locationData?.areaName && (
                <p className="text-xs text-green-600 mt-0.5">
                  📍 <strong>{locationData.areaName}</strong> · {locationData.distanceKm} km from Koyambedu market
                </p>
              )}
            </div>

            {[
              ['fullName',     'Full Name *',            'text'],
              ['addressLine1', 'Door No / Street *',     'text'],
              ['addressLine2', 'Address Line 2',         'text'],
              ['landmark',     'Landmark (optional)',    'text'],
              ['pincode',      'Pincode *',              'number'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input
                  type={type}
                  value={addr[key]}
                  onChange={e => setAddr(a => ({ ...a, [key]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-500 font-medium">Phone Number *</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                value={addr.phone}
                onChange={e => setAddr(a => ({ ...a, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
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

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-[11px] text-amber-700">
              🔒 Your full address is private. Sellers only see your area name (<strong>{locationData?.areaName || 'your area'}</strong>) and the items you ordered.
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep(0)}
                className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl text-sm">← Back</button>
              <button onClick={() => {
                if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
                  toast.error('Please fill all required fields'); return;
                }
                if (!/^[6-9]\d{9}$/.test(addr.phone)) {
                  toast.error('Enter a valid 10-digit Indian mobile number'); return;
                }
                setStep(2);
              }}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 text-sm">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ═════ STEP 2 — DELIVERY DATE ═════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-gray-800">Delivery Date</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isBefore8
                  ? 'Book before 8 AM for today\'s delivery, or choose tomorrow.'
                  : 'Today\'s booking window (8 AM) has closed. Choose your delivery day.'}
              </p>
            </div>

            {/* 8 AM banner */}
            {!isBefore8 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex items-start gap-2.5">
                <span className="text-xl">⏰</span>
                <div>
                  <p className="text-amber-700 font-bold text-sm">Booking closed for today</p>
                  <p className="text-amber-600 text-xs">Orders must be placed before 8 AM for same-day delivery.</p>
                </div>
              </div>
            )}

            {/* Date options */}
            {deliveryDates.map((d) => (
              <button key={d.value} onClick={() => setSelectedDate(d.value)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition ${selectedDate === d.value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-2xl ${selectedDate === d.value ? 'bg-green-600' : 'bg-gray-100'}`}>
                  {d.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-base ${selectedDate === d.value ? 'text-green-800' : 'text-gray-800'}`}>{d.label}</p>
                  <p className={`text-xs mt-0.5 ${selectedDate === d.value ? 'text-green-600' : 'text-gray-400'}`}>{d.subLabel}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(d.value + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
                  </p>
                </div>
                {selectedDate === d.value && <span className="text-green-600 font-black text-xl">✓</span>}
              </button>
            ))}

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-600">
              🥦 Fresh produce from Koyambedu market is packed early morning. Delivery slot: <strong>7 AM – 11 AM</strong>.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl text-sm">← Back</button>
              <button onClick={() => setStep(3)} disabled={!selectedDate}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 text-sm disabled:opacity-60">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ═════ STEP 3 — PAYMENT ═════ */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Payment</h2>

            {/* Summary pills */}
            <div className="bg-white rounded-2xl border border-green-100 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">📍 Area</span>
                <span className="font-semibold text-gray-700">{locationData?.areaName || '—'}</span>
                <button onClick={() => setStep(0)} className="text-green-500 text-xs underline ml-2">Change</button>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-2">
                <span className="text-gray-500 flex items-center gap-1.5">📅 Date</span>
                <span className="font-semibold text-gray-700">{deliveryDates.find(d => d.value === selectedDate)?.label || 'Tomorrow'} · 7 AM–11 AM</span>
                <button onClick={() => setStep(2)} className="text-green-500 text-xs underline ml-2">Change</button>
              </div>
            </div>

            {/* Payment method */}
            {[
              { val: 'razorpay', label: 'Online Payment',   sub: 'Card / UPI / NetBanking', icon: '💳' },
              { val: 'cod',      label: 'Cash on Delivery', sub: 'Pay when order arrives',  icon: '💵' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setPaymentMethod(opt.val)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition ${paymentMethod === opt.val ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <span className="text-2xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.sub}</p>
                </div>
                {paymentMethod === opt.val && <span className="text-green-600 font-bold">✓</span>}
              </button>
            ))}

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-green-100 p-4 space-y-2">
              <p className="font-bold text-gray-800 text-sm mb-1">Order Summary</p>
              {cart.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-500">
                  <span>{it.name} × {it.quantity} {it.unitLabel || it.unit}</span>
                  <span>₹{((it.unitPrice || 0) * it.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Delivery</span><span>₹{deliveryCharge}</span></div>
                <div className="flex justify-between text-gray-500"><span>Service fee</span><span>₹{serviceFee}</span></div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Promo ({couponApplied?.code})</span><span>−₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2">
                  <span>Total</span><span className="text-green-700">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Coupon input */}
              <div className="pt-1">
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
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

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700">
              ⚠️ Koyambedu market prices fluctuate daily. You'll get a WhatsApp message if any price changes before dispatch.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl text-sm">← Back</button>
              <button onClick={handlePlaceOrder} disabled={loading}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60 transition text-sm">
                {loading ? 'Placing...' : `Place Order ₹${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
