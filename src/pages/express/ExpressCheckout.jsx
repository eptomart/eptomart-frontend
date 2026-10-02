// ============================================
// EPTOMART EXPRESS — Checkout
// Address + delivery-slot selection + Razorpay payment. Mirrors the
// create→verify Razorpay pattern used by every other vertical's checkout
// (FruitBasketCheckout.jsx / KoyambeduCheckout.jsx are the reference
// implementations this was modeled on — neither is touched here).
//
// Address step now reuses the shared global SavedAddressPicker (the same
// component KoyambeduCheckout/FruitBasketCheckout/EptoFreshCheckout use)
// so a customer's already-saved addresses are one tap away, with a
// fallback manual-entry form for a new address.
//
// Delivery-slot step is Express-specific: unlike other verticals (which
// use a single admin-defined slot per day), Express offers several
// same-day windows (only ones still in the future) plus a next-day
// option, per the same-day-delivery business model.
// ============================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiAlertTriangle, FiCheck, FiClock, FiPhoneCall, FiPauseCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';
import { useAuth } from '../../context/AuthContext';
import SavedAddressPicker from '../../components/common/SavedAddressPicker';

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

// Delivery windows + next-day availability are configured per store by the
// admin (ExpressStore.deliverySlots) so each store can offer only the
// windows it can actually staff, and opt in to next-day delivery
// independently of every other store. This fallback list is only used if a
// store hasn't got deliverySlots yet (e.g. a stale cached selection from
// before this feature existed) — it mirrors the schema's own defaults.
const DEFAULT_WINDOWS = [
  { startHour: 9,  endHour: 12, label: '9:00 AM - 12:00 PM', enabled: true },
  { startHour: 12, endHour: 15, label: '12:00 PM - 3:00 PM', enabled: true },
  { startHour: 15, endHour: 18, label: '3:00 PM - 6:00 PM', enabled: true },
  { startHour: 18, endHour: 21, label: '6:00 PM - 9:00 PM', enabled: true },
];

function buildSlots(store) {
  const windows = (store?.deliverySlots?.windows?.length ? store.deliverySlots.windows : DEFAULT_WINDOWS)
    .filter(w => w.enabled !== false);
  const nextDayEnabled = !!store?.deliverySlots?.nextDayEnabled;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  // Only windows still ahead of "now" are offered for today.
  const todaySlots = windows
    .filter(w => w.endHour > now.getHours() + now.getMinutes() / 60)
    .map(w => ({ date: todayStr, label: w.label, isNextDay: false, key: `today-${w.label}` }));

  // Tomorrow offers every enabled window regardless of current time.
  const tomorrowSlots = nextDayEnabled
    ? windows.map(w => ({ date: tomorrowStr, label: w.label, isNextDay: true, key: `tomorrow-${w.label}` }))
    : [];

  return { todaySlots, tomorrowSlots, todayStr, nextDayEnabled };
}

export default function ExpressCheckout() {
  const navigate = useNavigate();
  const { selectedStore, cart, fetchCart } = useExpressCart();
  const { user } = useAuth();

  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [address, setAddress] = useState({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
  const [showManualForm, setShowManualForm] = useState(true);

  const { todaySlots, tomorrowSlots, todayStr, nextDayEnabled } = useMemo(() => buildSlots(selectedStore), [selectedStore]);
  const [slot, setSlot] = useState(null);

  // Admin's distance-based quick-delivery estimate for this store (e.g.
  // "~30 min") — shown as the fast, recommended path, with the specific
  // time-window slots below it as the alternative for anyone who wants to
  // schedule for later today instead. Pre-selected by default so a
  // customer in a hurry can go straight from address to payment.
  const quickEtaMinutes = selectedStore?.estimatedDeliveryMinutes ?? null;
  const quickSlot = quickEtaMinutes != null
    ? { key: 'quick', label: `Quick Delivery (~${quickEtaMinutes} min)`, date: todayStr, isNextDay: false, isQuick: true }
    : null;
  useEffect(() => {
    if (quickSlot && !slot) setSlot(quickSlot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickEtaMinutes]);

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  // Special-case errors from /express/quote and /express/orders/create-razorpay:
  // outOfRange -> show a "call us for a custom order" CTA instead of a generic toast;
  // storePaused -> show a busy banner instead of a generic toast.
  const [checkoutBlock, setCheckoutBlock] = useState(null); // { type: 'outOfRange'|'storePaused', message, distanceKm, maxDeliveryDistanceKm, customOrderPhone }

  useEffect(() => { fetchCart(); }, []);

  useEffect(() => {
    if (!selectedStore?._id) navigate('/express/location');
    else if (!cart.itemCount) navigate('/express/shop');
  }, [selectedStore, cart.itemCount]);

  // Default to the customer's saved default address, if any, so most
  // customers never have to type an address at all.
  useEffect(() => {
    const addrs = user?.addresses || [];
    if (!addrs.length) { setShowManualForm(true); return; }
    const def = addrs.find(a => a.isDefault) || addrs[0];
    setShowManualForm(false);
    handleSelectSaved(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectSaved = (addr) => {
    setSelectedAddrId(String(addr._id));
    setShowManualForm(false);
    setAddress({
      name: addr.fullName || '', phone: addr.phone || '',
      addressLine: [addr.addressLine1, addr.addressLine2].filter(Boolean).join(', '),
      city: addr.city || '', pincode: addr.pincode || '',
      lat: addr.lat ?? selectedStore?.location?.lat, lng: addr.lng ?? selectedStore?.location?.lng,
    });
    setQuote(null);
  };

  const handleNewAddress = () => {
    setSelectedAddrId(null);
    setShowManualForm(true);
    setAddress({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
    setQuote(null);
  };

  const getQuote = async () => {
    if (!address.addressLine || !address.phone || !address.name) return toast.error('Please fill in name, phone and address');
    if (!slot) return toast.error('Please pick a delivery slot');
    setQuoting(true);
    setCheckoutBlock(null);
    try {
      const { data } = await api.post('/express/quote', {
        deliveryAddress: { ...address, lat: address.lat ?? selectedStore?.location?.lat, lng: address.lng ?? selectedStore?.location?.lng },
      });
      setQuote(data);
    } catch (err) {
      const d = err?.response?.data;
      if (d?.outOfRange) {
        setCheckoutBlock({ type: 'outOfRange', message: d.message, distanceKm: d.distanceKm, maxDeliveryDistanceKm: d.maxDeliveryDistanceKm, customOrderPhone: d.customOrderPhone });
      } else if (d?.storePaused) {
        setCheckoutBlock({ type: 'storePaused', message: d.message });
      } else {
        toast.error(d?.message || 'Failed to price your order');
      }
    } finally {
      setQuoting(false);
    }
  };

  const placeOrder = async () => {
    if (!quote) return toast.error('Please get a quote first');
    if (!slot) return toast.error('Please pick a delivery slot');
    setPlacing(true);
    try {
      const { data } = await api.post('/express/orders/create-razorpay', {
        deliveryAddress: { ...address, lat: address.lat ?? selectedStore?.location?.lat, lng: address.lng ?? selectedStore?.location?.lng },
        deliverySlot: { date: slot.date, label: slot.label, isNextDay: slot.isNextDay },
      });

      if (data.demoMode) {
        await api.post('/express/orders/verify-payment', {
          orderId: data.orderId, razorpayOrderId: data.rzpOrderId,
          razorpayPaymentId: `demo_pay_${Date.now()}`, razorpaySignature: 'demo',
        });
        toast.success('Order placed!');
        navigate('/express/my-orders');
        return;
      }

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        order_id: data.rzpOrderId,
        name: 'Eptomart Express',
        description: 'Same-day delivery order',
        handler: async (resp) => {
          try {
            await api.post('/express/orders/verify-payment', {
              orderId: data.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            toast.success('Order placed!');
            navigate('/express/my-orders');
          } catch {
            toast.error('Payment verification failed');
          }
        },
        prefill: { name: address.name, contact: address.phone },
        theme: { color: '#4f46e5' },
      });
      rzp.open();
    } catch (err) {
      const d = err?.response?.data;
      if (d?.outOfRange) {
        setCheckoutBlock({ type: 'outOfRange', message: d.message, distanceKm: d.distanceKm, maxDeliveryDistanceKm: d.maxDeliveryDistanceKm, customOrderPhone: d.customOrderPhone });
        setQuote(null);
      } else if (d?.storePaused) {
        setCheckoutBlock({ type: 'storePaused', message: d.message });
        setQuote(null);
      } else {
        toast.error(d?.message || 'Failed to start checkout');
      }
    } finally {
      setPlacing(false);
    }
  };

  const SlotButton = ({ s }) => (
    <button
      onClick={() => { setSlot(s); setQuote(null); }}
      className={`px-3 py-2 rounded-xl border-2 text-xs font-bold text-left transition ${
        slot?.key === s.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200'
      }`}
    >
      {s.label}
    </button>
  );

  return (
    <div className="max-w-lg mx-auto p-4 pb-28">
      <div className="flex items-center gap-2 mb-4">
        <FiZap className="text-amber-500" size={20} />
        <h1 className="text-xl font-black text-indigo-900">Checkout</h1>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <h2 className="font-bold text-gray-700 text-sm mb-2">Delivery Address</h2>
        <SavedAddressPicker
          addresses={user?.addresses || []}
          selectedId={selectedAddrId}
          onSelect={handleSelectSaved}
          onNewAddress={handleNewAddress}
        />

        {showManualForm && (
          <div className="grid gap-3">
            <input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address" value={address.addressLine} onChange={e => setAddress(a => ({ ...a, addressLine: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Pincode" value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <h2 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-1.5"><FiClock size={14} /> Delivery Slot</h2>

        {quickSlot && (
          <button onClick={() => { setSlot(quickSlot); setQuote(null); }}
            className={`w-full mb-3 flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition ${
              slot?.key === 'quick' ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-100 bg-emerald-50/40 hover:border-emerald-300'
            }`}>
            <span className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <FiZap size={16} className="text-white" />
            </span>
            <span>
              <span className="block font-black text-sm text-emerald-800">Quick Delivery</span>
              <span className="block text-xs text-emerald-600">Ready in ~{quickEtaMinutes} min — recommended</span>
            </span>
          </button>
        )}

        {todaySlots.length > 0 ? (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-1.5">
              {quickSlot ? 'Or pick a time today' : 'Today'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {todaySlots.map(s => <SlotButton key={s.key} s={s} />)}
            </div>
          </div>
        ) : !quickSlot && (
          <p className="text-xs text-gray-400 mt-2">
            {nextDayEnabled ? 'No more same-day delivery windows left for today.' : 'No more same-day delivery windows left for today — please check back tomorrow.'}
          </p>
        )}

        {tomorrowSlots.length > 0 && (
          <div className={todaySlots.length > 0 || quickSlot ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-1.5">Tomorrow</p>
            <div className="grid grid-cols-2 gap-2">
              {tomorrowSlots.map(s => <SlotButton key={s.key} s={s} />)}
            </div>
          </div>
        )}
      </div>

      <button onClick={getQuote} disabled={quoting} className="w-full mb-4 px-4 py-2.5 rounded-lg border text-sm font-semibold disabled:opacity-50 bg-white">
        {quoting ? 'Calculating…' : 'Get Price'}
      </button>

      {checkoutBlock?.type === 'storePaused' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <FiPauseCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-amber-800 text-sm">High demand — we'll open orders again shortly!</p>
            <p className="text-xs text-amber-700 mt-0.5">{checkoutBlock.message}</p>
            <p className="text-xs text-amber-600 mt-1.5">We've noted you're waiting — we'll call you once we're back online.</p>
          </div>
        </div>
      )}

      {checkoutBlock?.type === 'outOfRange' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
          <p className="font-bold text-indigo-900 text-sm">You're a bit far for regular delivery</p>
          <p className="text-xs text-indigo-700 mt-0.5">{checkoutBlock.message}</p>
          {checkoutBlock.customOrderPhone && (
            <a href={`tel:${checkoutBlock.customOrderPhone.replace(/\s+/g, '')}`}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold">
              <FiPhoneCall size={14} /> Call for a custom order: {checkoutBlock.customOrderPhone}
            </a>
          )}
        </div>
      )}

      {quote && (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-700 text-sm">Order Summary</h2>
            {quote.estimatedDeliveryMinutes != null && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                Delivery in ~{quote.estimatedDeliveryMinutes} min
              </span>
            )}
          </div>
          {quote.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{it.name} × {it.quantity}</span>
              <span>₹{it.lineTotal}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm text-gray-600 pt-2 border-t mt-2">
            <span>Subtotal</span>
            <span>₹{quote.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Delivery Fee{quote.distanceKm != null ? ` (${quote.distanceKm} km)` : ''}</span>
            <span>{quote.deliveryFee > 0 ? `₹${quote.deliveryFee}` : 'FREE'}</span>
          </div>
          {quote.deliveryFee > 0 && quote.minOrderForFreeDelivery != null && (
            <p className="text-[11px] text-gray-400 mb-1">
              Order ₹{quote.minOrderForFreeDelivery}+ or stay within {quote.freeDeliveryRadiusKm} km for free delivery.
            </p>
          )}
          <div className="flex justify-between font-bold text-gray-800 pt-2 border-t mt-2">
            <span>Total ({quote.totalWeightKg} kg)</span>
            <span>₹{quote.total}</span>
          </div>
          {slot && (
            <p className="text-xs text-indigo-600 font-semibold mt-2">
              Delivering {slot.isNextDay ? 'tomorrow' : 'today'}, {slot.label}
            </p>
          )}
          {quote.largeOrderWarning && (
            <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={14} />
              <p className="text-xs text-amber-800">This is a large order. Consider Koyambedu Daily for better availability.</p>
            </div>
          )}
        </div>
      )}

      {quote && (
        <button onClick={placeOrder} disabled={placing}
          className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
          <FiCheck size={20} /> {placing ? 'Placing order…' : `Pay ₹${quote.total}`}
        </button>
      )}
    </div>
  );
}
