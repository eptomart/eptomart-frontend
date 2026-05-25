// ============================================
// UZHAVAR FRESH — Farmer Detail + Booking
// Fixes: availability display, harvest date picker, conflict validation
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiStar, FiArrowLeft, FiShoppingCart, FiPlus, FiMinus, FiMapPin, FiAlertCircle } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Helpers ─────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const toYMD   = (d) => new Date(d).toISOString().split('T')[0];

// Haversine distance in km
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function FarmerDetail() {
  const { farmerId } = useParams();
  const navigate     = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [farmer, setFarmer]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('shop'); // shop | profile
  const [cart, setCart]         = useState({}); // productId → qty
  const [bookingType, setBookingType] = useState('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledSlot, setScheduledSlot] = useState('morning');
  const [placing, setPlacing]       = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [deliveryAddr, setDeliveryAddr] = useState({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
  const [addrErrors, setAddrErrors] = useState({});

  // ── Razorpay SDK loader ──────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/uzhavar/farmers/${farmerId}/profile`);
        setFarmer(res.data.farmer || { _id: farmerId, name: 'Farmer', address: {}, ratings: {} });
        setProducts(res.data.products || []);
      } catch {
        toast.error('Failed to load farmer');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [farmerId]);

  // Auto-switch to scheduled if farmer is not available for instant delivery
  useEffect(() => {
    if (farmer && !farmer.availableNow) {
      setBookingType('scheduled');
    }
  }, [farmer]);

  // Pre-fill delivery address from logged-in user
  useEffect(() => {
    if (user) {
      setDeliveryAddr(prev => ({
        ...prev,
        name:  prev.name  || user.name  || '',
        phone: prev.phone || (user.phone || '').replace(/^\+?91/, '') || '',
      }));
    }
  }, [user]);

  const updateCart = (productId, delta) => {
    setCart(prev => {
      const cur = prev[productId] || 0;
      const next = Math.max(0, cur + delta);
      return next === 0
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== productId))
        : { ...prev, [productId]: next };
    });
  };

  const cartItems = useMemo(() =>
    Object.entries(cart).map(([id, qty]) => {
      const prod = products.find(p => p._id === id);
      return prod ? { ...prod, qty } : null;
    }).filter(Boolean),
    [cart, products]
  );

  // ── Totals ───────────────────────────────────────────────────
  const subtotal        = cartItems.reduce((s, i) => s + i.pricePerUnit * i.qty, 0);
  const bookingFeeTotal = parseFloat((21 * 1.18).toFixed(2));
  const grandTotal      = parseFloat((subtotal + bookingFeeTotal).toFixed(2));
  const cartCount       = Object.values(cart).reduce((s, v) => s + v, 0);

  const UZHAVAR_MIN_KG = 5;
  const totalKgInCart  = cartItems.filter(i => i.unit === 'kg').reduce((s, i) => s + i.qty, 0);
  const hasKgItems     = cartItems.some(i => i.unit === 'kg');
  const belowMinimum   = hasKgItems && totalKgInCart < UZHAVAR_MIN_KG;
  const kgNeeded       = Math.max(0, UZHAVAR_MIN_KG - totalKgInCart);

  // ── FIX 3: Compute allowed date range from cart items' harvest windows ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const harvestBounds = useMemo(() => {
    const itemsWithDates = cartItems.filter(i => i.harvestFrom && i.harvestTo);
    if (itemsWithDates.length === 0) {
      // No items or no harvest dates — default window: today to +10 days
      const max = new Date(today); max.setDate(max.getDate() + 10);
      return { min: toYMD(today), max: toYMD(max), hasConflict: false };
    }
    // Intersection: latest harvestFrom among all items, earliest harvestTo
    const latestFrom = new Date(Math.max(...itemsWithDates.map(i => new Date(i.harvestFrom))));
    const earliestTo = new Date(Math.min(...itemsWithDates.map(i => new Date(i.harvestTo))));
    // min is max(today, latestFrom); max is earliestTo
    const minDate = latestFrom > today ? latestFrom : today;
    const hasConflict = minDate > earliestTo;
    return {
      min: toYMD(minDate),
      max: toYMD(earliestTo),
      hasConflict, // no date satisfies all products
    };
  }, [cartItems]);

  // ── FIX 4: Which cart products are NOT available on selected date? ──
  const unavailableItems = useMemo(() => {
    if (bookingType !== 'scheduled' || !scheduledDate) return [];
    const selDate = new Date(scheduledDate); selDate.setHours(12, 0, 0, 0);
    return cartItems.filter(i => {
      if (!i.harvestFrom || !i.harvestTo) return false;
      const from = new Date(i.harvestFrom); from.setHours(0, 0, 0, 0);
      const to   = new Date(i.harvestTo);   to.setHours(23, 59, 59, 999);
      return selDate < from || selDate > to;
    });
  }, [cartItems, scheduledDate, bookingType]);

  const unavailableIds = useMemo(() => new Set(unavailableItems.map(i => i._id)), [unavailableItems]);

  // ── Address validation ───────────────────────────────────────
  const validateAddress = () => {
    const e = {};
    if (!deliveryAddr.name.trim())        e.name        = 'Name required';
    if (!/^[6-9]\d{9}$/.test(deliveryAddr.phone)) e.phone = 'Valid 10-digit mobile required';
    if (!deliveryAddr.addressLine.trim()) e.addressLine = 'Address required';
    if (!deliveryAddr.city.trim())        e.city        = 'City/Town required';
    if (!/^\d{6}$/.test(deliveryAddr.pincode)) e.pincode = 'Valid 6-digit pincode required';
    setAddrErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Booking: validate + open package upsell modal ───────────
  const handleBook = async () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: `/uzhavar/farmer/${farmerId}` } }); return; }
    if (cartItems.length === 0) { toast.error('Add items to cart first'); return; }

    // Availability check: instant not allowed if farmer unavailable
    if (bookingType === 'instant' && !farmer?.availableNow) {
      toast.error('Farmer is not available now. Please choose a scheduled delivery date.');
      return;
    }

    if (bookingType === 'scheduled' && !scheduledDate) { toast.error('Pick a delivery date'); return; }
    if (belowMinimum) {
      toast.error(`Minimum order is ${UZHAVAR_MIN_KG} kg. Add ${kgNeeded.toFixed(1)} kg more.`);
      return;
    }
    if (bookingType === 'scheduled' && unavailableItems.length > 0) {
      toast.error(`${unavailableItems.map(i => i.name).join(', ')} not available on ${fmtDate(scheduledDate)}.`, { duration: 5000 });
      return;
    }
    if (bookingType === 'scheduled' && harvestBounds.hasConflict) {
      toast.error('Products in your cart have non-overlapping harvest dates. Book separately.');
      return;
    }
    if (!validateAddress()) {
      toast.error('Please fill in your delivery address below');
      return;
    }

    // Distance check for fresh produce items
    const hasFreshItems = cartItems.some(i => !i.productType || i.productType === 'fresh');
    if (hasFreshItems && farmer?.gpsLocation?.coordinates) {
      const [flng, flat] = farmer.gpsLocation.coordinates;
      if (flat !== 0 || flng !== 0) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60000 })
          );
          const dist = haversineKm(flat, flng, pos.coords.latitude, pos.coords.longitude);
          if (dist > 10) {
            toast.error('Farmer is not closer to you. This fresh item cannot be shipped.', { duration: 7000 });
            return;
          }
        } catch {
          // GPS denied — fall back to pincode prefix check
          const fp = farmer.address?.pincode?.slice(0, 3);
          const bp = deliveryAddr.pincode?.slice(0, 3);
          if (fp && bp && fp !== bp) {
            toast.error('Farmer is not closer to you. This fresh item cannot be shipped.', { duration: 7000 });
            return;
          }
        }
      }
    }

    setShowPackageModal(true);
  };

  // ── Actual order creation + Razorpay (called from package modal) ──
  const proceedWithBooking = async () => {
    setShowPackageModal(false);
    setPlacing(true);
    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        toast.error('Payment gateway failed to load. Check your internet and try again.');
        setPlacing(false);
        return;
      }

      // Try to get buyer GPS for server-side distance validation
      let buyerLat, buyerLng;
      try {
        const gpos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000, maximumAge: 60000 })
        );
        buyerLat = gpos.coords.latitude;
        buyerLng = gpos.coords.longitude;
      } catch { /* GPS unavailable — backend will skip distance check */ }

      const orderRes = await api.post('/uzhavar/orders', {
        farmerId,
        items: cartItems.map(i => ({ productId: i._id, quantity: i.qty, productType: i.productType })),
        bookingType,
        scheduledDate: bookingType === 'scheduled' ? scheduledDate : null,
        scheduledSlot: bookingType === 'scheduled' ? scheduledSlot : null,
        deliveryAddress: {
          name:        deliveryAddr.name,
          phone:       deliveryAddr.phone,
          addressLine: deliveryAddr.addressLine,
          city:        deliveryAddr.city,
          pincode:     deliveryAddr.pincode,
        },
        paymentMethod: 'razorpay',
        buyerLat,
        buyerLng,
      });
      const order = orderRes.data.order;

      const payRes = await api.post('/uzhavar/orders/payment', { uzhavarOrderId: order._id });
      const { rzpOrderId, amount, currency } = payRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount, currency,
        name: 'Farmer Fresh',
        description: `Booking fee · ${cartCount} item${cartCount > 1 ? 's' : ''}`,
        order_id: rzpOrderId,
        prefill: { name: deliveryAddr.name, contact: `+91${deliveryAddr.phone}` },
        handler: async (response) => {
          try {
            await api.post('/uzhavar/orders/verify-payment', {
              uzhavarOrderId:    order._id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(
              `✅ Booking confirmed! Paid ₹${bookingFeeTotal.toFixed(2)}. Pay ₹${subtotal.toFixed(2)} to farmer at delivery.`,
              { duration: 7000 }
            );
            navigate('/uzhavar/my-orders');
          } catch {
            toast.error('Payment received but verification failed. Contact support with order ID.');
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
        theme: { color: '#16a34a' },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Booking failed. Please try again.');
      setPlacing(false);
    }
  };

  if (loading) return <><Navbar /><Loader /></>;

  const maxDateStr = harvestBounds.max;
  const minDateStr = harvestBounds.min;

  return (
    <>
      <Helmet><title>{farmer?.name} — Farmer Fresh</title></Helmet>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-40 min-h-screen">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 mb-4 transition-colors">
          <FiArrowLeft size={14} /> Back to farmers
        </button>

        {/* Farmer header */}
        <div className="bg-gradient-to-br from-green-700 to-lime-500 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl">🧑‍🌾</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl">{farmer?.name}</h1>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">✅ Verified</span>
              </div>
              <p className="text-green-100 text-sm">
                {[farmer?.address?.village, farmer?.address?.taluk, farmer?.address?.district].filter(Boolean).join(', ')}
              </p>
              {farmer?.ratings?.average > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <FiStar size={12} className="fill-yellow-300 text-yellow-300" />
                  <span className="text-sm font-semibold">{farmer.ratings.average.toFixed(1)}</span>
                  <span className="text-green-200 text-xs">({farmer.ratings.count} ratings)</span>
                </div>
              )}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${farmer?.availableNow ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
              {farmer?.availableNow ? '● Live' : '○ Scheduled'}
            </span>
          </div>
          <div className="flex gap-3 mt-3 text-xs text-green-100 flex-wrap">
            <span>📍 {farmer?.deliveryRadius}km delivery</span>
            {farmer?.address?.taluk && <span>🌱 {farmer.address.taluk}</span>}
            <span>🛒 {products.length} products</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'shop',    label: `🥬 Shop (${products.length})` },
            { key: 'profile', label: '👤 Profile' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SHOP TAB ── */}
        {tab === 'shop' && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl">
                <div className="text-3xl mb-2">🌱</div>
                <p>No products listed yet</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {products.map(prod => {
                  const isUnavail = unavailableIds.has(prod._id);
                  // FIX 2: Build availability string
                  const availKg = prod.availableQuantity;
                  const fromStr = prod.harvestFrom ? fmtDate(prod.harvestFrom) : null;
                  const toStr   = prod.harvestTo   ? fmtDate(prod.harvestTo)   : null;
                  const availLabel = fromStr && toStr
                    ? `${availKg} ${prod.unit} · ${fromStr} – ${toStr}`
                    : `${availKg} ${prod.unit} available`;

                  return (
                    <div key={prod._id}
                      className={`bg-white rounded-2xl border p-4 flex items-center gap-3 shadow-sm transition-all ${
                        isUnavail ? 'border-red-300 bg-red-50' : 'border-gray-100'
                      }`}>
                      {prod.image
                        ? <img src={prod.image} alt={prod.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                        : <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">🥬</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{prod.name}</p>
                        {prod.nameTa && <p className="text-xs text-gray-400">{prod.nameTa}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-gray-400 capitalize">{prod.category} · {prod.deliveryType}</p>
                          {prod.productType === 'dry' ? (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🌾 Dry{prod.canShip ? ' · Ships' : ''}</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">🥬 Fresh · Local</span>
                          )}
                        </div>

                        {/* FIX 2: Availability display */}
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          📦 Available: {availLabel}
                        </p>

                        <p className="font-bold text-green-600 text-sm mt-0.5">
                          ₹{prod.pricePerUnit}/{prod.unit}
                        </p>

                        {/* FIX 4: Unavailability warning per product */}
                        {isUnavail && (
                          <div className="flex items-start gap-1 mt-1.5">
                            <FiAlertCircle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-600 font-medium leading-tight">
                              Not available on {fmtDate(scheduledDate)}
                              {prod.harvestFrom && prod.harvestTo && (
                                <> · Harvest: {fmtDate(prod.harvestFrom)} – {fmtDate(prod.harvestTo)}</>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Qty control */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {cart[prod._id] ? (
                          <>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCart(prod._id, prod.unit === 'kg' ? -0.5 : -1)}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-green-400">
                                <FiMinus size={12} />
                              </button>
                              <span className="w-10 text-center text-sm font-bold">{cart[prod._id]} {prod.unit}</span>
                              <button onClick={() => updateCart(prod._id, prod.unit === 'kg' ? 0.5 : 1)}
                                className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700">
                                <FiPlus size={12} />
                              </button>
                            </div>
                            {/* Package quick-select for kg items */}
                            {prod.unit === 'kg' && (
                              <div className="flex gap-1">
                                {[5, 10, 20].map(pkg => (
                                  <button key={pkg}
                                    onClick={() => setCart(prev => ({ ...prev, [prod._id]: pkg }))}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${cart[prod._id] === pkg ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'}`}>
                                    {pkg}kg
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <button onClick={() => updateCart(prod._id, prod.unit === 'kg' ? 0.5 : 1)}
                              className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                              <FiPlus size={12} /> Add
                            </button>
                            {/* One-tap package shortcuts */}
                            {prod.unit === 'kg' && (
                              <div className="flex gap-1">
                                {[5, 10, 20].map(pkg => (
                                  <button key={pkg}
                                    onClick={() => setCart(prev => ({ ...prev, [prod._id]: pkg }))}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                                    {pkg}kg
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Delivery address ── */}
            {cartCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">📍 Delivery Address</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        value={deliveryAddr.name}
                        onChange={e => { setDeliveryAddr(p => ({ ...p, name: e.target.value })); setAddrErrors(p => ({ ...p, name: '' })); }}
                        placeholder="Full name *"
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${addrErrors.name ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {addrErrors.name && <p className="text-red-500 text-[10px] mt-0.5">{addrErrors.name}</p>}
                    </div>
                    <div>
                      <input
                        value={deliveryAddr.phone}
                        onChange={e => { setDeliveryAddr(p => ({ ...p, phone: e.target.value.replace(/\D/g,'').slice(0,10) })); setAddrErrors(p => ({ ...p, phone: '' })); }}
                        placeholder="Mobile number *"
                        maxLength={10}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${addrErrors.phone ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {addrErrors.phone && <p className="text-red-500 text-[10px] mt-0.5">{addrErrors.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <input
                      value={deliveryAddr.addressLine}
                      onChange={e => { setDeliveryAddr(p => ({ ...p, addressLine: e.target.value })); setAddrErrors(p => ({ ...p, addressLine: '' })); }}
                      placeholder="House / Flat, Street, Area *"
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${addrErrors.addressLine ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {addrErrors.addressLine && <p className="text-red-500 text-[10px] mt-0.5">{addrErrors.addressLine}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        value={deliveryAddr.city}
                        onChange={e => { setDeliveryAddr(p => ({ ...p, city: e.target.value })); setAddrErrors(p => ({ ...p, city: '' })); }}
                        placeholder="City / Town *"
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${addrErrors.city ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {addrErrors.city && <p className="text-red-500 text-[10px] mt-0.5">{addrErrors.city}</p>}
                    </div>
                    <div>
                      <input
                        value={deliveryAddr.pincode}
                        onChange={e => { setDeliveryAddr(p => ({ ...p, pincode: e.target.value.replace(/\D/g,'').slice(0,6) })); setAddrErrors(p => ({ ...p, pincode: '' })); }}
                        placeholder="Pincode *"
                        maxLength={6}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${addrErrors.pincode ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {addrErrors.pincode && <p className="text-red-500 text-[10px] mt-0.5">{addrErrors.pincode}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Booking type */}
            {cartCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Delivery Type</h3>
                {!farmer?.availableNow && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                    <FiAlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">Farmer is not available for instant delivery. Choose a scheduled date below.</p>
                  </div>
                )}
                <div className="flex gap-2 mb-3">
                  {['instant', 'scheduled'].map(t => {
                    const isInstantDisabled = t === 'instant' && !farmer?.availableNow;
                    return (
                    <button key={t}
                      onClick={() => !isInstantDisabled && setBookingType(t)}
                      disabled={isInstantDisabled}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${bookingType === t ? 'bg-green-600 text-white' : isInstantDisabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600'}`}>
                      {t === 'instant' ? '⚡ Instant' : '📅 Scheduled'}
                    </button>
                  );})}
                </div>

                {bookingType === 'scheduled' && (
                  <div className="space-y-2">

                    {/* FIX 3 / FIX 4: conflict warning when no valid date exists */}
                    {harvestBounds.hasConflict && cartItems.length > 1 && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <FiAlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-700">Harvest date conflict</p>
                          <p className="text-xs text-red-600">
                            Products in your cart have non-overlapping harvest windows.
                            Remove items or book each product separately.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Delivery date
                        {cartItems.some(i => i.harvestFrom) && !harvestBounds.hasConflict && (
                          <span className="ml-1 text-green-600">
                            (harvest: {fmtDate(harvestBounds.min)} – {fmtDate(harvestBounds.max)})
                          </span>
                        )}
                      </label>
                      {/* FIX 3: min/max from harvest bounds */}
                      <input
                        type="date"
                        min={minDateStr}
                        max={maxDateStr}
                        value={scheduledDate}
                        disabled={harvestBounds.hasConflict}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 disabled:opacity-50 disabled:bg-gray-100"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Only dates within the product harvest window are selectable.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Time slot</label>
                      <select value={scheduledSlot} onChange={e => setScheduledSlot(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                        <option value="morning">Morning (6am – 10am)</option>
                        <option value="afternoon">Afternoon (12pm – 3pm)</option>
                        <option value="evening">Evening (5pm – 8pm)</option>
                      </select>
                    </div>

                    {/* FIX 4: Unavailable items summary */}
                    {unavailableItems.length > 0 && scheduledDate && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <FiAlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">
                            This harvest is not available for the selected day.
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {unavailableItems.map(i => i.name).join(', ')} cannot be delivered on {fmtDate(scheduledDate)}.
                            Please choose another date or remove the unavailable item.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">🧑‍🌾 About this Farmer</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <FiMapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {[farmer?.address?.village, farmer?.address?.taluk, farmer?.address?.district, farmer?.address?.state]
                        .filter(Boolean).join(', ')}
                    </p>
                    {farmer?.address?.pincode && (
                      <p className="text-xs text-gray-400">Pincode: {farmer.address.pincode}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm">📦</span>
                  <div>
                    <p className="text-xs text-gray-500">Delivery radius</p>
                    <p className="text-sm font-semibold text-gray-800">{farmer?.deliveryRadius} km from farm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm">✅</span>
                  <div>
                    <p className="text-xs text-gray-500">Verified status</p>
                    <p className="text-sm font-semibold text-green-700">Government-ID Verified</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Products', value: products.length },
                { label: 'Orders',   value: farmer?.totalOrders || 0 },
                { label: 'Acceptance', value: `${farmer?.acceptanceRate || 100}%` },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className="font-black text-green-600 text-xl">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {farmer?.ratings?.count > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-3">
                  ⭐ Ratings
                  <span className="ml-2 text-xs font-normal text-gray-400">({farmer.ratings.count} reviews)</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {['freshness', 'quality', 'delivery', 'behaviour'].map(k => {
                    const r = farmer.ratings[k];
                    const avg = r?.count > 0 ? (r.total / r.count) : 0;
                    return (
                      <div key={k} className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="capitalize text-xs text-gray-500">{k}</span>
                          <span className="font-bold text-xs text-gray-800">{avg > 0 ? avg.toFixed(1) : '—'}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(avg / 5) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-black text-green-600 text-2xl">{farmer.ratings.average.toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <FiStar key={i} size={14} className={i <= Math.round(farmer.ratings.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">Overall score</p>
                  </div>
                </div>
              </div>
            )}

            {farmer?.deliverySlots?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-3">🕐 Delivery Slots</h3>
                <div className="flex flex-wrap gap-2">
                  {farmer.deliverySlots.map((slot, i) => (
                    <span key={i} className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {slot.day} {slot.start}–{slot.end}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky cart footer */}
      {/* Package upsell modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-in slide-in-from-bottom">
            <div className="text-center mb-5">
              <div className="text-3xl mb-1">🌿</div>
              <h3 className="font-black text-gray-800 text-lg">Save with Monthly Packages!</h3>
              <p className="text-sm text-gray-500 mt-0.5">No booking fee per order. Unlimited orders.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Monthly */}
              <div className="border border-green-200 rounded-2xl p-3 text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly</p>
                <p className="font-black text-green-600 text-2xl">₹352</p>
                <p className="text-[10px] text-gray-400 mb-2">incl. GST · 1 month</p>
                <ul className="text-xs text-gray-500 space-y-0.5 text-left">
                  <li>✓ Unlimited orders</li>
                  <li>✓ No ₹24.78 booking fee</li>
                  <li>✓ Priority farmer</li>
                </ul>
              </div>
              {/* Quarterly */}
              <div className="border-2 border-green-500 rounded-2xl p-3 text-center relative">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">⭐ Best Value</span>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quarterly</p>
                <p className="font-black text-green-600 text-2xl">₹589</p>
                <p className="text-[10px] text-gray-400 mb-2">incl. GST · 3 months</p>
                <ul className="text-xs text-gray-500 space-y-0.5 text-left">
                  <li>✓ All monthly perks</li>
                  <li>✓ Save ₹358 vs monthly</li>
                  <li>✓ Exclusive deals</li>
                </ul>
              </div>
            </div>
            <button onClick={() => { setShowPackageModal(false); navigate('/uzhavar/subscribe'); }}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm mb-2.5 hover:bg-green-700 transition-colors">
              🌱 View Packages
            </button>
            <button onClick={proceedWithBooking}
              className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors">
              Continue One-Time Booking (Pay ₹{bookingFeeTotal.toFixed(2)} now)
            </button>
          </div>
        </div>
      )}

      {cartCount > 0 && tab === 'shop' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl px-4 py-4 z-30">
          <div className="max-w-2xl mx-auto">
            {/* Minimum order warning */}
            {belowMinimum && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">Minimum order quantity for Farmer Fresh is 5 kg.</p>
                  <p className="text-xs text-amber-600">Add {kgNeeded.toFixed(1)} kg more to place the order.</p>
                </div>
              </div>
            )}

            {/* FIX 4: Conflict warning in footer */}
            {unavailableItems.length > 0 && scheduledDate && bookingType === 'scheduled' && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <FiAlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700">
                  Remove unavailable items or change date to proceed.
                </p>
              </div>
            )}

            {/* Payment split info */}
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">{cartCount} item{cartCount > 1 ? 's' : ''} · product value</span>
                <span className="font-semibold text-gray-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Booking fee (₹21 + 18% GST)</span>
                <span className="font-semibold text-gray-800">₹{bookingFeeTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-green-200 pt-1 mt-1 space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span className="text-green-800">💳 Pay now (Razorpay)</span>
                  <span className="text-green-700">₹{bookingFeeTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>🤝 Pay farmer at delivery</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Disable conditions: below minimum, or unavailable items, or conflict */}
            {(() => {
              const blocked = belowMinimum
                || (bookingType === 'instant' && !farmer?.availableNow)
                || (bookingType === 'scheduled' && unavailableItems.length > 0)
                || (bookingType === 'scheduled' && harvestBounds.hasConflict);
              const label = belowMinimum
                ? `Add ${kgNeeded.toFixed(1)} kg more`
                : unavailableItems.length > 0
                  ? 'Remove unavailable items'
                  : harvestBounds.hasConflict
                    ? 'Harvest conflict — see above'
                    : placing ? 'Processing...' : `Confirm Booking · Pay ₹${bookingFeeTotal.toFixed(2)} Now`;
              return (
                <button onClick={handleBook} disabled={placing || blocked}
                  className={`w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${blocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                  <FiShoppingCart size={16} />
                  {label}
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
