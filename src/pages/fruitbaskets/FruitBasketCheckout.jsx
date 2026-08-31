// ============================================
// FRUIT BASKETS & HAMPERS — Checkout
// Item list now comes from FruitBasketCartContext (shared with the common
// /cart page + FruitBasketShop.jsx) instead of sessionStorage. Everything
// below that — address capture, same-day cutoff, slot selection, quote,
// Razorpay create/verify — is completely unchanged.
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
import SavedAddressPicker from '../../components/common/SavedAddressPicker';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useFruitBasketCart } from '../../context/FruitBasketCartContext';
import { FB_THEME } from '../../utils/fruitBasketTheme';

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

  const { cart, fetchCart, clearCart } = useFruitBasketCart();
  // Normalize to { productId, name, price, quantity } regardless of whether
  // the underlying item came from the guest (localStorage) or server cart.
  const cartItems = useMemo(() => (cart.items || []).map(it => ({
    productId: String(it.product?._id || it.product),
    name:      it.name,
    price:     it.price,
    quantity:  it.quantity,
  })), [cart.items]);

  const [status, setStatus] = useState(null); // /fruitbaskets/status response
  useEffect(() => {
    api.get('/fruitbaskets/status').then(r => setStatus(r.data)).catch(() => setStatus({ featureEnabled: false, deliverySlots: [], sameDayDelivery: {} }));
    fetchCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [cartChecked, setCartChecked] = useState(false);
  useEffect(() => {
    // Give fetchCart a tick to resolve before deciding the basket is empty,
    // so a hard refresh on this page doesn't bounce the user out while the
    // server cart is still loading.
    const t = setTimeout(() => setCartChecked(true), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (cartChecked && cartItems.length === 0) {
      toast.error('Your basket order is empty');
      navigate('/fruitbaskets', { replace: true });
    }
  }, [cartChecked, cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Address form ──
  // Saved addresses reuse the same shared User.addresses book as Koyambedu/
  // Eptomart checkout (fullName/addressLine1/addressLine2), while Fruit
  // Basket's own order payload uses simpler name/addressLine fields — this
  // helper translates one saved address into Fruit Basket's shape.
  const fromSavedAddress = (a) => ({
    name: a.fullName || '', phone: a.phone || '',
    addressLine: [a.addressLine1, a.addressLine2].filter(Boolean).join(', '),
    city: a.city || '', pincode: a.pincode || '', label: a.label || 'Home',
  });

  const [addr, setAddr] = useState({ name: user?.name || '', phone: user?.phone || '', addressLine: '', city: '', pincode: '', label: 'Home' });
  const [selectedAddressId, setSelectedAddressId] = useState(undefined); // undefined = not yet initialized, null = "new address"
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [deliveryPreview, setDeliveryPreview] = useState(null); // { distanceKm, available, deliveryCharge }

  // Existing customer → auto-pick their default (or most recent) saved
  // address on load instead of making them retype it every time. They can
  // still switch to another saved address or "+ New Address" above the form.
  useEffect(() => {
    if (selectedAddressId !== undefined) return; // already initialized (or user has since changed selection)
    const saved = user?.addresses || [];
    if (saved.length === 0) { setSelectedAddressId(null); return; }
    const def = saved.find(a => a.isDefault) || saved[saved.length - 1];
    setSelectedAddressId(String(def._id));
    setAddr(fromSavedAddress(def));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = (silent = false) => {
    if (!navigator.geolocation) { if (!silent) toast.error('Location not supported on this device'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); if (!silent) toast.success('Location captured'); },
      () => { setLocating(false); if (!silent) toast.error('Could not get your location — you can still place the order, delivery charge will be confirmed by our team'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // If the browser already has geolocation permission granted from a past
  // visit, fetch it silently on load — a returning customer with a saved
  // address shouldn't have to tap "Use my location" again either.
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions.query({ name: 'geolocation' })
      .then(status => { if (status.state === 'granted') useMyLocation(true); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Precise coordinates give the most accurate delivery charge, but
  // geolocation can fail/be denied — a pincode is enough to still price
  // and place the order (delivery charge is then confirmed by our team
  // instead of blocking checkout entirely; see priceOrderRequest on the backend).
  const hasLocationInfo = !!coords || !!addr.pincode?.trim();
  useEffect(() => {
    if (!hasLocationInfo || !slotKey || cartItems.length === 0) { setQuote(null); return; }
    clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      setQuoting(true);
      try {
        const { data } = await api.post('/fruitbaskets/quote', {
          items: cartItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
          deliveryAddress: coords ? { ...coords } : { pincode: addr.pincode },
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
  }, [coords, addr.pincode, slotKey, dateTab, cartItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    if (!isLoggedIn) { toast.error('Please log in to continue'); navigate('/login'); return; }
    if (!addr.name || !addr.phone || !addr.addressLine) { toast.error('Please fill in your delivery address'); return; }
    if (!coords && !addr.pincode?.trim()) { toast.error('Please share your location or enter your pincode so we can arrange delivery'); return; }
    if (!quote?.success) { toast.error('Please wait for the price to be calculated'); return; }

    setPlacing(true);

    // New (unsaved) address + user opted in → persist to the shared address
    // book so it shows up as a saved-address card next time, same as
    // Koyambedu/Eptomart checkout. Best-effort: never blocks order placement.
    if (selectedAddressId === null && saveNewAddress) {
      api.post('/auth/add-address', {
        label: addr.label || 'Home', fullName: addr.name, phone: addr.phone,
        addressLine1: addr.addressLine, city: addr.city, pincode: addr.pincode,
      }).catch(() => {});
    }

    try {
      const { data } = await api.post('/fruitbaskets/orders/create-razorpay', {
        items: cartItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
        deliveryAddress: { ...addr, ...coords },
        deliveryDate: fmtDate(deliveryDate),
        slotKey,
      });
      if (!data.success) { toast.error(data.message || 'Failed to start checkout'); setPlacing(false); return; }

      // Demo/review account — backend already marked this order paid on a
      // fake gateway id (see fruitBasketController.createRazorpayOrder).
      // Skip the real widget and confirm it the same way the handler below does.
      if (data.demoMode) {
        try {
          await api.post('/fruitbaskets/orders/verify-payment', {
            orderId: data.orderId, razorpayOrderId: data.rzpOrderId,
            razorpayPaymentId: `demo_pay_${Date.now()}`, razorpaySignature: 'demo',
          });
          clearCart();
          toast.success('Order placed! 🎁');
          navigate('/fruitbaskets/my-orders');
        } catch {
          toast.error('Demo payment confirmation failed');
        }
        setPlacing(false);
        return;
      }

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
            clearCart();
            toast.success('Order placed! 🎁');
            navigate('/fruitbaskets/my-orders');
          } catch {
            toast.error('Payment verification failed — contact support if money was deducted');
          }
        },
        modal: { ondismiss: () => toast('Payment cancelled', { icon: '🧺' }) },
        prefill: { name: addr.name, contact: addr.phone, email: user?.email || '' },
        theme: { color: FB_THEME.purple700 },
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
      <div className="min-h-screen" style={{ background: FB_THEME.purple50 }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <FiGift size={40} className="mx-auto mb-4" style={{ color: FB_THEME.purple600 }} />
          <p className="text-gray-500 text-sm">Fruit Baskets & Hampers is currently unavailable.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: FB_THEME.purple50 }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <button onClick={() => navigate('/fruitbaskets')} className="flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: FB_THEME.purple700 }}>
          <FiArrowLeft size={14} /> Back to baskets
        </button>
        <h1 className="text-lg font-black mb-4" style={{ color: FB_THEME.purple900 }}>Checkout — Fruit Baskets & Hampers</h1>

        {/* Items summary */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: FB_THEME.purple500 }}>Your Order</p>
          {cartItems.map(it => (
            <div key={it.productId} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700">{it.name} × {it.quantity}</span>
              <span className="font-bold text-gray-800">₹{it.price * it.quantity}</span>
            </div>
          ))}
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <p className="text-xs font-black uppercase tracking-wide mb-3" style={{ color: FB_THEME.purple500 }}>Delivery Address</p>

          <SavedAddressPicker
            addresses={user?.addresses || []}
            selectedId={selectedAddressId}
            onSelect={(a) => { setSelectedAddressId(String(a._id)); setAddr(fromSavedAddress(a)); }}
            onNewAddress={() => {
              setSelectedAddressId(null);
              setAddr({ name: user?.name || '', phone: user?.phone || '', addressLine: '', city: '', pincode: '', label: 'Home' });
            }}
          />

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
              <input value={addr.pincode} onChange={e => setAddr({ ...addr, pincode: e.target.value })} placeholder="Pincode *"
                title="Required if you don't share your location below"
                className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            {selectedAddressId === null && (
              <label className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                <input type="checkbox" checked={saveNewAddress} onChange={e => setSaveNewAddress(e.target.checked)} />
                Save this address for next time
              </label>
            )}
          </div>
          <button onClick={() => useMyLocation(false)} disabled={locating}
            className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-2.5 text-sm font-bold"
            style={{ borderColor: FB_THEME.purple500, color: FB_THEME.purple700 }}>
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
        <div className="bg-white rounded-2xl overflow-hidden mb-3" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <div className="flex divide-x" style={{ borderColor: FB_THEME.purple100 }}>
            {[['today', todayDate, todayDisabled], ['tomorrow', tomorrowDate, false]].map(([key, date, disabled]) => (
              <button key={key} disabled={disabled} onClick={() => setDateTab(key)}
                className={`flex-1 py-3 text-center ${disabled ? 'opacity-40' : ''}`}
                style={{ borderBottom: dateTab === key ? `3px solid ${FB_THEME.gold}` : '3px solid transparent', background: dateTab === key ? FB_THEME.purple50 : 'transparent' }}>
                <p className="text-xs font-black uppercase" style={{ color: dateTab === key ? FB_THEME.purple800 : '#9ca3af' }}>{key}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{fmtDisplayDate(date)}</p>
                {disabled && <span className="text-[9px] text-red-500 font-bold">CLOSED</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl p-4 mb-3" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: FB_THEME.purple500 }}>Delivery Slot</p>
          <div className="space-y-2">
            {slots.map(s => (
              <button key={s.key} onClick={() => setSlotKey(s.key)}
                className="w-full rounded-xl px-4 py-3 flex items-center gap-2.5 border-2 text-left"
                style={slotKey === s.key
                  ? { background: FB_THEME.purple50, borderColor: FB_THEME.purple600 }
                  : { background: '#f9fafb', borderColor: '#e5e7eb' }}>
                <span className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={slotKey === s.key ? { background: FB_THEME.purple600, borderColor: FB_THEME.purple600 } : { borderColor: '#d1d5db' }} />
                <span className="text-sm font-semibold" style={{ color: slotKey === s.key ? FB_THEME.purple800 : '#4b5563' }}>{s.label}</span>
                {slotKey === s.key && <FiCheck size={14} className="ml-auto" style={{ color: FB_THEME.gold }} />}
              </button>
            ))}
            {slots.length === 0 && <p className="text-xs text-gray-400">No delivery slots available right now.</p>}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: FB_THEME.purple500 }}>Price Details</p>
          {quote?.success ? (
            <>
              <div className="flex justify-between text-sm py-1"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{quote.subtotal}</span></div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Delivery{quote.distanceKm != null ? ` (${quote.distanceKm} km)` : ''}</span>
                <span className="font-semibold">
                  {quote.deliveryChargePending ? 'To be confirmed' : (quote.deliveryCharge === 0 ? 'FREE' : `₹${quote.deliveryCharge}`)}
                </span>
              </div>
              {quote.deliveryChargePending && (
                <p className="text-[11px] mt-1" style={{ color: FB_THEME.purple600 }}>
                  We couldn&apos;t get your exact location — our team will confirm the delivery charge for your pincode shortly.
                </p>
              )}
              <div className="flex justify-between text-base font-black pt-2 mt-1 border-t" style={{ borderColor: FB_THEME.purple100 }}>
                <span>Total{quote.deliveryChargePending ? ' (excl. delivery)' : ''}</span><span style={{ color: FB_THEME.purple700 }}>₹{quote.total}</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">{quoting ? 'Calculating…' : quote?.message || 'Share your location or enter your pincode to see the total'}</p>
          )}
        </div>
      </div>

      {/* Sticky pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-40" style={{ borderColor: FB_THEME.purple100 }}>
        <button onClick={placeOrder} disabled={placing || !quote?.success}
          className="max-w-2xl mx-auto w-full disabled:bg-gray-300 text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={!placing && quote?.success ? { background: FB_THEME.gradientHeader, border: FB_THEME.borderGold } : {}}>
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
