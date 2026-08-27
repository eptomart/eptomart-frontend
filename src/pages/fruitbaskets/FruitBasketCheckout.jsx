// ============================================
// FRUIT BASKETS & HAMPERS — Checkout
// Fully standalone checkout (per the feature spec — no shared cart/checkout
// with any other Eptomart vertical). Address capture uses the browser's
// own geolocation API rather than the Google Maps embed Koyambedu uses,
// to keep this vertical self-contained and avoid depending on that map
// config — distance-based delivery pricing only needs a lat/lng, which
// geolocation (or manual entry) provides just as well.
//
// The deliveryTab staleness bug fixed in KoyambeduCheckout.jsx (tab not
// re-deriving after the async same-day-settings fetch resolves) is avoided
// here from the start via the same corrective effect pattern.
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMapPin, FiCheck, FiGift, FiArrowLeft, FiCrosshair } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const CART_KEY = 'eptomart_fb_cart';
const loadCart = () => {
  try { return JSON.parse(sessionStorage.getItem(CART_KEY) || '{}'); } catch { return {}; }
};

const fmtDate = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmtDisplayDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function FruitBasketCheckout() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const [cart, setCart] = useState(loadCart);
  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const [status, setStatus] = useState(null); // /fruitbaskets/status response
  useEffect(() => {
    api.get('/fruitbaskets/status').then(r => setStatus(r.data)).catch(() => setStatus({ featureEnabled: false, deliverySlots: [], sameDayDelivery: {} }));
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      toast.error('Your basket order is empty');
      navigate('/fruitbaskets', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Address form ──
  const [addr, setAddr] = useState({ name: user?.name || '', phone: user?.phone || '', addressLine: '', city: '', pincode: '', label: 'Home' });
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [deliveryPreview, setDeliveryPreview] = useState(null); // { distanceKm, available, deliveryCharge }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Location not supported on this device'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); toast.success('Location captured'); },
      () => { toast.error('Could not get your location — you can still place the order, delivery charge will be confirmed by our team'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!coords) { setDeliveryPreview(null); return; }
    api.post('/fruitbaskets/check-delivery', coords)
      .then(r => setDeliveryPreview(r.data))
      .catch(() => setDeliveryPreview(null));
  }, [coords]);

  // ── Same-day cutoff + date tabs ──
  const sameDay = status?.sameDayDelivery || {};
  const todayDisabled = status ? (!sameDay.enabled || isPastCutoff(sameDay.cutoffTime)) : false;

  const todayDate    = new Date(); todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(todayDate.getDate() + 1);

  const [dateTab, setDateTab] = useState('today');
  // Corrective effect — see file header. sameDay.enabled/cutoffTime only
  // become accurate once /fruitbaskets/status resolves; if that reveals
  // today is closed while the tab is still 'today', flip it immediately
  // so the selected date and the slot list never disagree.
  useEffect(() => {
    if (todayDisabled && dateTab === 'today') setDateTab('tomorrow');
  }, [todayDisabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const deliveryDate = dateTab === 'today' ? todayDate : tomorrowDate;

  // ── Slot ──
  const slots = status?.deliverySlots || [];
  const [slotKey, setSlotKey] = useState('');
  useEffect(() => { if (slots.length && !slotKey) setSlotKey(slots[0].key); }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live quote ──
  const [quote, setQuote]   = useState(null);
  const [quoting, setQuoting] = useState(false);
  const quoteTimer = useRef(null);
  useEffect(() => {
    if (!coords || !slotKey || cartItems.length === 0) { setQuote(null); return; }
    clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      setQuoting(true);
      try {
        const { data } = await api.post('/fruitbaskets/quote', {
          items: cartItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
          deliveryAddress: { ...coords },
          deliveryDate: fmtDate(deliveryDate),
          slotKey,
        });
        setQuote(data.success ? data : { success: false, message: data.message });
      } catch (err) {
        setQuote({ success: false, message: err?.response?.data?.message || 'Could not price your order' });
      } finally {
        setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(quoteTimer.current);
  }, [coords, slotKey, dateTab, cartItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    if (!isLoggedIn) { toast.error('Please log in to continue'); navigate('/login'); return; }
    if (!addr.name || !addr.phone || !addr.addressLine) { toast.error('Please fill in your delivery address'); return; }
    if (!coords) { toast.error('Please share your location so we can calculate delivery'); return; }
    if (!quote?.success) { toast.error('Please wait for the price to be calculated'); return; }

    setPlacing(true);
    try {
      const { data } = await api.post('/fruitbaskets/orders/create-razorpay', {
        items: cartItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
        deliveryAddress: { ...addr, ...coords },
        deliveryDate: fmtDate(deliveryDate),
        slotKey,
      });
      if (!data.success) { toast.error(data.message || 'Failed to start checkout'); setPlacing(false); return; }

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: data.keyId, amount: Math.round(data.amount * 100), currency: data.currency,
        name: 'Eptomart Fruit Baskets & Hampers',
        description: 'Gift basket order',
        order_id: data.rzpOrderId,
        handler: async (resp) => {
          try {
            await api.post('/fruitbaskets/orders/verify-payment', {
              orderId: data.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            sessionStorage.removeItem(CART_KEY);
            toast.success('Order placed! 🎁');
            navigate('/fruitbaskets/my-orders');
          } catch {
            toast.error('Payment verification failed — contact support if money was deducted');
          }
        },
        modal: { ondismiss: () => toast('Payment cancelled', { icon: '🧺' }) },
        prefill: { name: addr.name, contact: addr.phone, email: user?.email || '' },
        theme: { color: '#0f5132' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (!status?.featureEnabled && status) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <FiGift size={40} className="mx-auto text-emerald-600 mb-4" />
          <p className="text-gray-500 text-sm">Fruit Baskets & Hampers is currently unavailable.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <button onClick={() => navigate('/fruitbaskets')} className="flex items-center gap-1.5 text-sm text-gray-500 font-semibold mb-3">
          <FiArrowLeft size={14} /> Back to baskets
        </button>
        <h1 className="text-lg font-black text-gray-800 mb-4">Checkout — Fruit Baskets & Hampers</h1>

        {/* Items summary */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Your Order</p>
          {cartItems.map(it => (
            <div key={it.productId} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700">{it.name} × {it.quantity}</span>
              <span className="font-bold text-gray-800">₹{it.price * it.quantity}</span>
            </div>
          ))}
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Delivery Address</p>
          <div className="space-y-2">
            <input value={addr.name} onChange={e => setAddr({ ...addr, name: e.target.value })} placeholder="Full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={addr.phone} onChange={e => setAddr({ ...addr, phone: e.target.value })} placeholder="Phone number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={addr.addressLine} onChange={e => setAddr({ ...addr, addressLine: e.target.value })} placeholder="House no, street, area"
              rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
            <div className="flex gap-2">
              <input value={addr.city} onChange={e => setAddr({ ...addr, city: e.target.value })} placeholder="City"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={addr.pincode} onChange={e => setAddr({ ...addr, pincode: e.target.value })} placeholder="Pincode"
                className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={useMyLocation} disabled={locating}
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-emerald-300 text-emerald-700 rounded-lg py-2.5 text-sm font-bold">
            <FiCrosshair size={14} /> {locating ? 'Locating…' : coords ? 'Location captured — tap to update' : 'Use my current location'}
          </button>
          {deliveryPreview && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <FiMapPin size={11} />
              {deliveryPreview.available
                ? `${deliveryPreview.distanceKm} km away — delivery ₹${deliveryPreview.deliveryCharge}${deliveryPreview.deliveryCharge === 0 ? ' (free!)' : ''}`
                : 'This address is outside our delivery zone'}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl overflow-hidden mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex divide-x divide-gray-100">
            {[['today', todayDate, todayDisabled], ['tomorrow', tomorrowDate, false]].map(([key, date, disabled]) => (
              <button key={key} disabled={disabled} onClick={() => setDateTab(key)}
                className={`flex-1 py-3 text-center ${disabled ? 'opacity-40' : ''} ${dateTab === key ? 'bg-emerald-50 border-b-[3px] border-emerald-600' : 'border-b-[3px] border-transparent'}`}>
                <p className={`text-xs font-black uppercase ${dateTab === key ? 'text-emerald-800' : 'text-gray-500'}`}>{key}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{fmtDisplayDate(date)}</p>
                {disabled && <span className="text-[9px] text-red-500 font-bold">CLOSED</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Delivery Slot</p>
          <div className="space-y-2">
            {slots.map(s => (
              <button key={s.key} onClick={() => setSlotKey(s.key)}
                className={`w-full rounded-xl px-4 py-3 flex items-center gap-2.5 border-2 text-left ${
                  slotKey === s.key ? 'bg-emerald-50 border-emerald-600' : 'bg-gray-50 border-gray-200'
                }`}>
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${slotKey === s.key ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`} />
                <span className={`text-sm font-semibold ${slotKey === s.key ? 'text-emerald-800' : 'text-gray-600'}`}>{s.label}</span>
                {slotKey === s.key && <FiCheck size={14} className="ml-auto text-emerald-600" />}
              </button>
            ))}
            {slots.length === 0 && <p className="text-xs text-gray-400">No delivery slots available right now.</p>}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Price Details</p>
          {quote?.success ? (
            <>
              <div className="flex justify-between text-sm py-1"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{quote.subtotal}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-gray-600">Delivery ({quote.distanceKm} km)</span><span className="font-semibold">{quote.deliveryCharge === 0 ? 'FREE' : `₹${quote.deliveryCharge}`}</span></div>
              <div className="flex justify-between text-base font-black pt-2 mt-1 border-t border-gray-100"><span>Total</span><span className="text-emerald-700">₹{quote.total}</span></div>
            </>
          ) : (
            <p className="text-xs text-gray-400">{quoting ? 'Calculating…' : quote?.message || 'Share your location to see the total'}</p>
          )}
        </div>
      </div>

      {/* Sticky pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-40">
        <button onClick={placeOrder} disabled={placing || !quote?.success}
          className="max-w-2xl mx-auto w-full bg-emerald-700 disabled:bg-gray-300 text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition-transform">
          {placing ? 'Placing order…' : quote?.success ? `Pay ₹${quote.total}` : 'Complete details above'}
        </button>
      </div>
    </div>
  );
}

// IST-aware cutoff check — same +5:30 offset trick used throughout Koyambedu,
// avoids pulling in a timezone library for a single comparison.
function isPastCutoff(cutoffTime) {
  if (!cutoffTime) return false;
  const ist = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  const nowDecimal = ist.getUTCHours() + ist.getUTCMinutes() / 60;
  const [h, m] = cutoffTime.split(':').map(Number);
  return nowDecimal >= (h + m / 60);
}
