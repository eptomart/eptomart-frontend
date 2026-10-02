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
import { FiZap, FiAlertTriangle, FiCheck, FiClock, FiPhoneCall, FiPauseCircle, FiChevronRight, FiEdit2 } from 'react-icons/fi';
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
    s.onerror = () => reject(new Error('razorpay-script-failed'));
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

// Delivery windows (9am, 12pm, etc.) are defined in IST — the store's own
// timezone — but a customer's device clock/timezone can be set to anything
// (wrong system time, a phone set to a different region, etc.). Reading
// `new Date().getHours()` directly would then filter "today's" windows
// against the WRONG current hour and could silently leave zero slots
// available, with no obvious error to the customer. Computing the current
// IST wall-clock time explicitly, regardless of device settings, avoids that.
function getISTParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hourFraction: Number(parts.hour) + Number(parts.minute) / 60,
  };
}

function buildSlots(store) {
  const windows = (store?.deliverySlots?.windows?.length ? store.deliverySlots.windows : DEFAULT_WINDOWS)
    .filter(w => w.enabled !== false);
  // Defaults to true (not false) when a store has no deliverySlots saved yet
  // at all — matches the schema's own default and ensures an
  // admin-unconfigured store never dead-ends with zero delivery options.
  const nextDayEnabled = store?.deliverySlots?.nextDayEnabled ?? true;

  const { year, month, day, hourFraction } = getISTParts();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${year}-${pad(month)}-${pad(day)}`;
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Only windows still ahead of "now" (IST) are offered for today.
  const todaySlots = windows
    .filter(w => w.endHour > hourFraction)
    .map(w => ({ date: todayStr, label: w.label, isNextDay: false, key: `today-${w.label}` }));

  // Tomorrow offers every enabled window regardless of current time.
  const tomorrowSlots = nextDayEnabled
    ? windows.map(w => ({ date: tomorrowStr, label: w.label, isNextDay: true, key: `tomorrow-${w.label}` }))
    : [];

  return { todaySlots, tomorrowSlots, todayStr, nextDayEnabled };
}

export default function ExpressCheckout() {
  const navigate = useNavigate();
  const { selectedStore, setSelectedStore, cart, fetchCart } = useExpressCart();
  const { user } = useAuth();

  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [address, setAddress] = useState({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
  const [showManualForm, setShowManualForm] = useState(true);

  const { todaySlots, tomorrowSlots, todayStr, nextDayEnabled } = useMemo(() => buildSlots(selectedStore), [selectedStore]);
  const [slot, setSlot] = useState(null);

  // Device location, captured once on mount as a fallback source of
  // coordinates for customers who type a manual address (which has no
  // lat/lng fields at all) and have no saved address with coordinates
  // either — without this, the delivery-address lat/lng silently fell back
  // all the way to the STORE's own location (see getQuote/placeOrder
  // below), which always computes as ~0 km from the store regardless of
  // where the customer actually is, and also means the ETA-fallback effect
  // below never has real coordinates to call /eta with, so "Quick
  // Delivery" never appears for these customers. Uses the same
  // watchdog-timeout pattern as ExpressShop's own ETA refresh, since
  // getCurrentPosition's callback can simply never fire in the installed
  // app's WKWebView when permission was never requested via a direct tap.
  const [deviceCoords, setDeviceCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    const watchdog = setTimeout(() => {}, 4000); // no fallback needed here — just avoid a hanging callback
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(watchdog); if (!cancelled) setDeviceCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => clearTimeout(watchdog),
      { maximumAge: 5 * 60 * 1000, timeout: 5000 },
    );
    return () => { cancelled = true; clearTimeout(watchdog); };
  }, []);

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

  // If the store's ETA was never populated (e.g. the customer reached
  // checkout without ExpressShop's own ETA refresh ever resolving — common
  // in the installed app's WKWebView, where navigator.geolocation's
  // callback can simply never fire if permission was never requested via a
  // direct user tap), fall back to the actual delivery address coordinates
  // the moment they're known here. This is more reliable than device
  // geolocation anyway, since it's the real delivery point.
  useEffect(() => {
    if (!selectedStore?._id || selectedStore.estimatedDeliveryMinutes != null) return;
    const lat = address.lat ?? deviceCoords?.lat;
    const lng = address.lng ?? deviceCoords?.lng;
    if (lat == null || lng == null) return;
    api.get(`/express/stores/${selectedStore._id}/eta`, { params: { lat, lng } })
      .then(({ data }) => setSelectedStore({ ...selectedStore, distanceKm: data.distanceKm, estimatedDeliveryMinutes: data.estimatedDeliveryMinutes }))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore?._id, selectedStore?.estimatedDeliveryMinutes, address.lat, address.lng, deviceCoords]);

  // Coupon — same universal /coupon/validate flow every other vertical's
  // checkout uses (Koyambedu/FruitBasket/EptoFresh), scoped to
  // platform: 'express'. The quote endpoint re-validates it server-side too,
  // so a stale/expired code typed here never over/under-charges the actual
  // amount paid.
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null); // { code, discount }
  const [couponLoading, setCouponLoading] = useState(false);

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  // Special-case errors from /express/quote and /express/orders/create-razorpay:
  // outOfRange -> show a "call us for a custom order" CTA instead of a generic toast;
  // storePaused -> show a busy banner instead of a generic toast.
  const [checkoutBlock, setCheckoutBlock] = useState(null); // { type: 'outOfRange'|'storePaused', message, distanceKm, maxDeliveryDistanceKm, customOrderPhone }

  // `cart` defaults to itemCount: 0 until fetchCart() resolves — without
  // cartChecked gating the redirect below, a fresh mount of this page (page
  // reload, deep link, webview reload) would read that default as "cart is
  // empty" and bounce straight to /express/shop before the fetch could prove
  // otherwise, even when the customer genuinely has items in their cart.
  const [cartChecked, setCartChecked] = useState(false);
  useEffect(() => { fetchCart().finally(() => setCartChecked(true)); }, []);

  // Load the Razorpay widget script as soon as this page opens rather than
  // waiting for the Pay tap — on a slow mobile connection that first script
  // fetch could otherwise add a visible delay (or, worse, briefly make a tap
  // on Pay look like it did nothing) between the tap and the payment sheet
  // actually appearing. By the time the customer reaches Pay, window.Razorpay
  // is normally already available and loadRazorpayScript() below resolves
  // instantly.
  useEffect(() => { loadRazorpayScript().catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedStore?._id) { navigate('/express/location'); return; }
    if (cartChecked && !cart.itemCount) navigate('/express/shop');
  }, [selectedStore, cart.itemCount, cartChecked]);

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
      lat: addr.lat ?? deviceCoords?.lat ?? selectedStore?.location?.lat, lng: addr.lng ?? deviceCoords?.lng ?? selectedStore?.location?.lng,
    });
    setQuote(null);
  };

  const handleNewAddress = () => {
    setSelectedAddrId(null);
    setShowManualForm(true);
    setAddress({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
    setQuote(null);
  };

  // Price is fetched automatically (see the debounced effect below) the
  // moment the address is filled in and a slot is picked — there's nothing
  // left for the customer to decide by pressing a separate "Get Price"
  // button, so that extra step was removed. silent=true (the auto-trigger
  // path) skips the "please fill this in" toasts, since those fields are
  // simply not ready yet rather than something the customer did wrong.
  const getQuote = async ({ silent = false } = {}) => {
    if (!address.addressLine || !address.phone || !address.name) {
      if (!silent) toast.error('Please fill in name, phone and address');
      return;
    }
    if (!slot) {
      if (!silent) toast.error('Please pick a delivery slot');
      return;
    }
    setQuoting(true);
    setCheckoutBlock(null);
    try {
      const { data } = await api.post('/express/quote', {
        deliveryAddress: { ...address, lat: address.lat ?? deviceCoords?.lat ?? selectedStore?.location?.lat, lng: address.lng ?? deviceCoords?.lng ?? selectedStore?.location?.lng },
        couponCode: couponApplied?.code || undefined,
      });
      setQuote(data);
      // Server is the source of truth — if the coupon didn't actually apply
      // (expired/limit reached since it was validated), drop it from the UI
      // too instead of showing a discount that isn't real.
      if (couponApplied && !data.couponCode) setCouponApplied(null);
    } catch (err) {
      const d = err?.response?.data;
      if (d?.outOfRange) {
        setCheckoutBlock({ type: 'outOfRange', message: d.message, distanceKm: d.distanceKm, maxDeliveryDistanceKm: d.maxDeliveryDistanceKm, customOrderPhone: d.customOrderPhone });
      } else if (d?.storePaused) {
        setCheckoutBlock({ type: 'storePaused', message: d.message });
      } else if (!err.response) {
        // No response at all (network drop, timeout, flaky mobile-data
        // handoff) — far more common inside the app than in a desktop
        // Chrome tab. Previously this fell through silently on the
        // auto-trigger path (silent=true), leaving the customer staring at
        // a blank screen with no feedback after "Calculating price…"
        // disappeared. Always surface this one, even when silent.
        toast.error('Could not reach the server — check your internet connection and try again.');
      } else if (!silent) {
        toast.error(d?.message || 'Failed to price your order');
      }
    } finally {
      setQuoting(false);
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupon/validate', {
        code, orderAmount: quote?.subtotal || 0, platform: 'express',
      });
      if (data.success) {
        setCouponApplied({ code: data.coupon.code, discount: data.discount });
        setCouponCode(data.coupon.code);
        toast.success(`Coupon applied! ₹${data.discount.toFixed(2)} off`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid coupon');
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCouponApplied(null); setCouponCode(''); };

  // Auto-price as soon as name + phone + address + a delivery slot are all
  // in place — debounced so it doesn't fire on every keystroke while the
  // customer is still typing their address.
  useEffect(() => {
    if (!address.name || !address.phone || !address.addressLine || !slot) return;
    const t = setTimeout(() => { getQuote({ silent: true }); }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.name, address.phone, address.addressLine, address.city, address.pincode, slot, couponApplied]);

  const placeOrder = async () => {
    if (!quote) return toast.error('Please get a quote first');
    if (!slot) return toast.error('Please pick a delivery slot');
    setPlacing(true);
    try {
      const { data } = await api.post('/express/orders/create-razorpay', {
        deliveryAddress: { ...address, lat: address.lat ?? deviceCoords?.lat ?? selectedStore?.location?.lat, lng: address.lng ?? deviceCoords?.lng ?? selectedStore?.location?.lng },
        deliverySlot: { date: slot.date, label: slot.label, isNextDay: slot.isNextDay },
        couponCode: couponApplied?.code || undefined,
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

      try {
        await loadRazorpayScript();
      } catch {
        // Most likely cause on a phone: no/flaky internet right at this
        // moment, or the script request got blocked (ad/tracker blocker,
        // restrictive network). Surface this distinctly from a generic
        // failure so it's clear retrying (once online) is the fix.
        toast.error('Could not load the payment screen — check your internet connection and try again.');
        setPlacing(false);
        return;
      }
      if (!window.Razorpay) {
        // Script reported success but the global still isn't there — treat
        // the same as a load failure rather than letting the tap silently
        // do nothing.
        toast.error('Payment screen failed to load. Please try again.');
        setPlacing(false);
        return;
      }

      let settled = false;
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        order_id: data.rzpOrderId,
        name: 'Eptomart Express',
        description: 'Same-day delivery order',
        handler: async (resp) => {
          settled = true;
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
          } finally {
            setPlacing(false);
          }
        },
        modal: {
          // Without this, `placing` stayed true forever if the customer
          // closed the payment sheet without paying (button stuck showing
          // "Placing order…" until they refreshed the page).
          ondismiss: () => { if (!settled) setPlacing(false); },
        },
        prefill: { name: address.name, contact: address.phone },
        theme: { color: '#4f46e5' },
      });
      // Keep the button disabled (via `placing`, still true here) while the
      // payment sheet is open, instead of flipping back to normal the
      // instant open() returns — matches every other vertical's checkout
      // and avoids a tap landing on "Pay" again mid-flow.
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
        console.error('[ExpressCheckout.placeOrder]', err);
        toast.error(d?.message || 'Failed to start checkout');
      }
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

      {/* ── Step 1: pick a delivery slot first — nothing else in checkout
          (address, pricing, payment) shows until this is chosen. ── */}
      {!slot ? (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <h2 className="font-bold text-gray-700 text-sm mb-1 flex items-center gap-1.5"><FiClock size={14} /> Delivery Slot</h2>
          <p className="text-xs text-gray-400 mb-3">Select a delivery slot to continue to checkout.</p>

          {quickSlot && (
            <button onClick={() => { setSlot(quickSlot); setQuote(null); }}
              className="w-full mb-3 flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition border-emerald-100 bg-emerald-50/40 hover:border-emerald-300">
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

          {!quickSlot && todaySlots.length === 0 && tomorrowSlots.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">No delivery slots are available right now — please check back later.</p>
          )}
        </div>
      ) : (
        <>
          {/* Chosen slot, shown as a compact confirmation bar once checkout
              has moved on — tap to come back and change it. */}
          <button onClick={() => { setSlot(null); setQuote(null); }}
            className="w-full mb-4 flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-left">
            <span className="flex items-center gap-2 min-w-0">
              <FiClock size={15} className="text-indigo-600 shrink-0" />
              <span className="text-sm font-bold text-indigo-900 truncate">
                {slot.isQuick ? `Quick Delivery (~${quickEtaMinutes} min)` : `${slot.isNextDay ? 'Tomorrow' : 'Today'}, ${slot.label}`}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 shrink-0">
              <FiEdit2 size={12} /> Change
            </span>
          </button>

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
        </>
      )}

      {slot && quoting && (
        <div className="w-full mb-4 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
          Calculating price…
        </div>
      )}
      {!quoting && !quote && !checkoutBlock && slot && (!address.name || !address.phone || !address.addressLine) && (
        <p className="text-xs text-gray-400 mb-4 text-center">Add your delivery address above to see the price.</p>
      )}

      {slot && checkoutBlock?.type === 'storePaused' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <FiPauseCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-amber-800 text-sm">High demand — we'll open orders again shortly!</p>
            <p className="text-xs text-amber-700 mt-0.5">{checkoutBlock.message}</p>
            <p className="text-xs text-amber-600 mt-1.5">We've noted you're waiting — we'll call you once we're back online.</p>
          </div>
        </div>
      )}

      {slot && checkoutBlock?.type === 'outOfRange' && (
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
              Orders below ₹{quote.minOrderForFreeDelivery} carry a ₹{quote.deliveryFeeBelowMinimum} delivery fee — order ₹{quote.minOrderForFreeDelivery}+ for free delivery.
            </p>
          )}
          {quote.couponDiscount > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Coupon ({quote.couponCode})</span>
              <span className="font-semibold text-emerald-600">− ₹{quote.couponDiscount}</span>
            </div>
          )}

          <div className="pt-2 border-t mt-2">
            {couponApplied ? (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <FiCheck size={13} /> {couponApplied.code} applied
                </span>
                <button onClick={removeCoupon} className="text-xs font-bold text-gray-400 hover:text-gray-600">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text" value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 border rounded-lg px-3 py-2 text-xs uppercase"
                />
                <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold disabled:opacity-50">
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}
          </div>

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
          className="above-bottom-nav fixed left-4 right-4 max-w-lg mx-auto py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 disabled:opacity-50 z-[9970] shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', marginBottom: '1rem' }}>
          {placing
            ? <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <FiCheck size={20} />}
          {placing ? 'Placing order…' : `Pay ₹${quote.total}`}
        </button>
      )}
    </div>
  );
}
