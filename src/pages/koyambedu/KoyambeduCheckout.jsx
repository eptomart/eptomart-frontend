import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// steps: 0=location  1=address  2=slot  3=payment
const STEP_LABELS = ['Location', 'Address', 'Slot', 'Payment'];

export default function KoyambeduCheckout() {
  const { cart, subtotal, clearCart } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slots,      setSlots]     = useState([]);
  const [step,       setStep]      = useState(0);
  const [loading,    setLoading]   = useState(false);
  const [placedOrder,setPlaced]    = useState(null);

  // ── Location state ──────────────────────────
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [gpsError,     setGpsError]     = useState('');
  const [locationData, setLocationData] = useState(null);
  // { lat, lng, city, pincode, distanceKm, deliveryCharge, available, message }

  // ── Address ─────────────────────────────────
  const [addr, setAddr] = useState({
    fullName:     user?.name || '',
    phone:        user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city:         'Chennai',
    pincode:      '',
    landmark:     '',
  });

  const [selectedSlot,  setSelectedSlot]  = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  // Delivery charge comes from location check
  const deliveryCharge = locationData?.deliveryCharge ?? 149;
  const serviceFee     = 10;
  const total          = subtotal + deliveryCharge + serviceFee;

  useEffect(() => {
    api.get('/koyambedu/slots').then(r => {
      const avail = r.data.slots?.filter(s => s.available) || [];
      setSlots(avail);
      if (avail.length > 0) setSelectedSlot(avail[0].timeLabel);
    }).catch(() => {});
  }, []);

  // ── GPS helpers ──────────────────────────────
  const requestLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Your browser does not support location access. Please enter pincode manually.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const { data } = await api.post('/koyambedu/check-delivery', { lat, lng });
          setLocationData({ lat, lng, ...data });
          if (!data.available) {
            setGpsError(data.message || 'Delivery not available in your area');
          } else {
            setGpsError('');
          }
        } catch (err) {
          setGpsError(err?.response?.data?.message || 'Could not check delivery availability');
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Location permission denied. Please enable location in your browser settings and try again.');
        } else {
          setGpsError('Could not get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enterManualPincode = async (pincode) => {
    if (!pincode || pincode.length !== 6) return;
    try {
      // Use a rough Chennai centre for manual pincode (user inside 7km likely)
      const { data } = await api.post('/koyambedu/check-delivery', {
        lat: 13.0524, lng: 80.2090, // central Chennai
      });
      setLocationData({
        lat: null, lng: null,
        city: 'Chennai', pincode,
        distanceKm: data.distanceKm,
        deliveryCharge: data.deliveryCharge,
        available: data.available,
        message: data.message,
      });
    } catch { /* ignore */ }
  };

  // ── Place order ──────────────────────────────
  const handlePlaceOrder = async () => {
    if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
      toast.error('Please fill all address fields'); return;
    }
    if (!selectedSlot) { toast.error('Please select a delivery slot'); return; }
    if (!locationData?.lat && !locationData?.pincode) {
      toast.error('Please share your location first'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/koyambedu/orders', {
        shippingAddress: addr,
        paymentMethod,
        deliverySlot: selectedSlot,
        buyerLocation: {
          lat:     locationData.lat,
          lng:     locationData.lng,
          city:    locationData.city   || addr.city,
          pincode: locationData.pincode || addr.pincode,
        },
      });

      if (paymentMethod === 'cod') {
        await clearCart();
        setPlaced({ ...data.order, deliveryCharge: data.order.deliveryCharge });
        toast.success('Order placed successfully!');
        return;
      }

      // Razorpay
      const { data: rzpData } = await api.post('/koyambedu/orders/create-razorpay', { orderId: data.order._id });
      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      const options = {
        key:        rzpKey,
        amount:     rzpData.amount * 100,
        currency:   'INR',
        name:       'Koyambedu Daily',
        description:`Order #${data.order.orderId}`,
        order_id:   rzpData.rzpOrderId,
        handler: async (response) => {
          try {
            await api.post('/koyambedu/orders/verify-payment', {
              orderId:           data.order._id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await clearCart();
            setPlaced(data.order);
            toast.success('Payment successful! Order confirmed.');
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: addr.fullName, contact: addr.phone, email: user?.email || '' },
        theme:   { color: '#16a34a' },
      };
      const loadRzp = () => new window.Razorpay(options).open();
      if (!window.Razorpay) {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = loadRzp;
        document.body.appendChild(s);
      } else {
        loadRzp();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ───────────────────────────
  if (placedOrder) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">✅</span>
      </div>
      <h2 className="font-black text-2xl text-green-700 mb-2">Order Placed!</h2>
      <p className="text-gray-600 text-sm mb-1">Order ID: <strong>{placedOrder.orderId}</strong></p>
      <p className="text-gray-500 text-sm mb-6">We've notified the seller. WhatsApp updates will follow.</p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
        If market prices change, we'll send an approval request before dispatch.
      </div>
      <button onClick={() => navigate('/koyambedu/orders')}
        className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-700 transition w-full max-w-xs">
        Track My Order
      </button>
      <button onClick={() => navigate('/koyambedu')} className="mt-3 text-green-600 text-sm font-semibold">
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-36">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="text-white">
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
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${i <= step ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
            <span className={`text-xs font-medium ${i === step ? 'text-green-700' : 'text-gray-400'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="text-gray-300 mx-1">›</span>}
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">

        {/* ── STEP 0 — LOCATION ──────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Delivery Availability</h2>
              <p className="text-xs text-gray-500 mt-0.5">We deliver within 7 km of Koyambedu market. Please share your location to confirm.</p>
            </div>

            {/* GPS button */}
            {!locationData && (
              <button onClick={requestLocation} disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-3 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 disabled:opacity-60 transition">
                {gpsLoading
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Detecting location...</>
                  : <><span className="text-xl">📍</span> Share My Location</>
                }
              </button>
            )}

            {/* Error */}
            {gpsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-medium">⚠️ {gpsError}</p>
                {gpsError.includes('denied') && (
                  <p className="text-red-500 text-xs mt-1">Go to browser Settings → Site Permissions → Location → Allow for this site</p>
                )}
              </div>
            )}

            {/* Location result */}
            {locationData && (
              <div className={`rounded-2xl border p-4 ${locationData.available ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{locationData.available ? '✅' : '❌'}</span>
                  <p className={`font-bold text-sm ${locationData.available ? 'text-green-700' : 'text-red-700'}`}>
                    {locationData.available ? 'Delivery Available!' : 'Outside Delivery Zone'}
                  </p>
                </div>
                <p className={`text-xs ${locationData.available ? 'text-green-600' : 'text-red-600'}`}>
                  {locationData.message}
                </p>
                {locationData.available && (
                  <div className="mt-2 pt-2 border-t border-green-200 flex justify-between text-xs text-green-700">
                    <span>📦 Delivery charge</span>
                    <span className="font-bold">₹{locationData.deliveryCharge}</span>
                  </div>
                )}
              </div>
            )}

            {/* Re-detect */}
            {locationData && (
              <button onClick={() => { setLocationData(null); setGpsError(''); }}
                className="w-full text-sm text-green-600 font-semibold py-2 border border-green-300 rounded-xl hover:bg-green-50 transition">
                📍 Re-detect Location
              </button>
            )}

            {/* Continue */}
            <button
              onClick={() => {
                if (!locationData) { setGpsError('Please share your location to check Koyambedu Fresh delivery availability.'); return; }
                if (!locationData.available) {
                  toast.error(locationData.message || 'Delivery not available in your area');
                  return;
                }
                if (locationData.deliveryCharge === undefined) { toast.error('Unable to calculate delivery charge'); return; }
                setStep(1);
              }}
              disabled={!locationData || !locationData.available}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2">
              Continue to Address →
            </button>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-600 leading-relaxed">
              🔒 Your location is only used to check delivery availability. It is never shared with sellers.
            </div>
          </div>
        )}

        {/* ── STEP 1 — ADDRESS ────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-800">Delivery Address</h2>
            {[
              ['fullName',    'Full Name *',      'text'],
              ['phone',       'Phone Number *',   'tel'],
              ['addressLine1','Address Line 1 *', 'text'],
              ['addressLine2','Address Line 2',   'text'],
              ['city',        'City',             'text'],
              ['pincode',     'Pincode *',        'number'],
              ['landmark',    'Landmark',         'text'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input
                  type={type}
                  value={addr[key]}
                  onChange={e => setAddr(a => ({ ...a, [key]: e.target.value }))}
                  disabled={key === 'city'}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
            <button onClick={() => {
              if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
                toast.error('Please fill all required fields'); return;
              }
              setStep(2);
            }}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition mt-2">
              Continue to Slot Selection →
            </button>
          </div>
        )}

        {/* ── STEP 2 — DELIVERY SLOT ────────────── */}
        {step === 2 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-4">Select Delivery Slot</h2>
            <div className="space-y-2">
              {slots.map(slot => (
                <button key={slot._id}
                  onClick={() => setSelectedSlot(slot.timeLabel)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${selectedSlot === slot.timeLabel ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-2xl">{slot.type === 'today' ? '⚡' : '📅'}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{slot.timeLabel}</p>
                    {slot.note && <p className="text-xs text-gray-500">{slot.note}</p>}
                  </div>
                  {selectedSlot === slot.timeLabel && <span className="ml-auto text-green-600 font-bold">✓</span>}
                </button>
              ))}
              {slots.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No delivery slots available right now</p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={() => setStep(3)} disabled={!selectedSlot}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — PAYMENT ─────────────────── */}
        {step === 3 && (() => {
          // Check pincode match for all cart items that have servicePincodes set
          const buyerPincode = String(addr.pincode).trim();
          const blockedItems = cart.items?.filter(item => {
            const sp = item.product?.seller?.servicePincodes;
            return sp?.length > 0 && !sp.includes(buyerPincode);
          }) || [];
          return (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Payment Method</h2>

            {/* Pincode mismatch warning */}
            {blockedItems.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-2xl px-4 py-3 space-y-1">
                <p className="text-red-700 font-bold text-sm">🚫 Delivery not available for your pincode ({buyerPincode})</p>
                {blockedItems.map(item => (
                  <p key={item.product?._id} className="text-red-600 text-xs">
                    • <strong>{item.product?.name}</strong> — available only in: {item.product?.seller?.servicePincodes?.join(', ')}
                  </p>
                ))}
                <p className="text-red-500 text-xs mt-1">Please remove these items or use a different delivery address.</p>
              </div>
            )}

            {[
              { val: 'razorpay', label: 'Online Payment',   sub: 'Credit/Debit card, UPI, NetBanking', icon: '💳' },
              { val: 'cod',      label: 'Cash on Delivery', sub: 'Pay when order arrives',             icon: '💵' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setPaymentMethod(opt.val)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition ${paymentMethod === opt.val ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <span className="text-2xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.sub}</p>
                </div>
                {paymentMethod === opt.val && <span className="text-green-600 font-bold">✓</span>}
              </button>
            ))}

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-green-100 p-4 space-y-2 text-sm">
              <h3 className="font-bold text-gray-800 mb-2">Order Summary</h3>
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>₹{deliveryCharge}</span>
              </div>
              {locationData?.totalWeightKg && (
                <p className="text-xs text-gray-400">
                  {locationData.totalWeightKg < 20
                    ? `Order weight ~${locationData.totalWeightKg.toFixed(1)} kg (<20 kg)`
                    : `Order weight ~${locationData.totalWeightKg.toFixed(1)} kg (≥20 kg)`}
                </p>
              )}
              <div className="flex justify-between text-gray-600"><span>Service fee</span><span>₹{serviceFee}</span></div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-green-50">
                <span>Total</span>
                <span className="text-green-700">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Location summary pill */}
            {locationData && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs text-green-700">
                <span>📍</span>
                <span>Delivering to your location · {locationData.distanceKm} km from Koyambedu market</span>
                <button onClick={() => setStep(0)} className="ml-auto text-green-500 underline font-semibold">Change</button>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-amber-700 text-[11px]">⚠️ Prices subject to daily market fluctuations. You'll be notified if any change occurs before dispatch.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={handlePlaceOrder} disabled={loading || blockedItems.length > 0}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60 transition">
                {loading ? 'Placing...' : `Place Order ₹${total.toFixed(2)}`}
              </button>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
