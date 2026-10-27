// ============================================
// "CHANGE DELIVERY ADDRESS" — Koyambedu Daily only.
// After an order is paid (and until it is dispatched / the same-day cutoff),
// the customer can move the delivery to a new address. The distance from the
// nearest hub is re-measured and the delivery/platform/packing charge
// re-priced: a higher charge is collected by a separate Razorpay payment, a
// lower one is credited to the Koyambedu wallet. See changeAddress endpoints
// in koyambeduController.js. Nothing else on the order is touched.
// ============================================
import { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiChevronUp, FiMapPin, FiNavigation } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/currency';

const inp = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm';

export default function KoyambeduChangeAddress({ order, onChanged }) {
  const { user } = useAuth();
  const [elig, setElig] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: 'Chennai', pincode: '', landmark: '' });
  const [loc, setLoc] = useState(null); // { lat, lng, areaName, city }
  const [query, setQuery] = useState('');
  const [preds, setPreds] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    api.get(`/koyambedu/orders/${order.id}/address/eligibility`)
      .then(({ data }) => setElig(data))
      .catch(() => setElig({ allowed: false }));
  }, [order.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const searchPlaces = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (q.trim().length < 3) { setPreds([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/eptofresh/places/autocomplete?q=${encodeURIComponent(q.trim())}`);
        setPreds(data.predictions || []);
      } catch { setPreds([]); }
    }, 300);
  };

  const pickPlace = async (p) => {
    setPreds([]); setQuery(p.description);
    try {
      const { data } = await api.get(`/eptofresh/places/details?place_id=${p.place_id}`);
      const g = data.result?.geometry?.location;
      if (!g) return toast.error('Could not read that place');
      setLoc({ lat: g.lat, lng: g.lng, areaName: p.structured_formatting?.main_text || p.description.split(',')[0], city: form.city });
    } catch { toast.error('Could not read that place'); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Location is not available on this device');
    navigator.geolocation.getCurrentPosition(
      pos => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, areaName: 'Current location', city: form.city }); setQuery('Current location'); },
      () => toast.error('Could not get your location. Search the area instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const fillSaved = (a) => {
    setForm({ fullName: a.fullName || '', phone: a.phone || '', addressLine1: a.addressLine1 || '', addressLine2: a.addressLine2 || '', city: a.city || 'Chennai', pincode: a.pincode || '', landmark: a.landmark || '' });
    if (a.lat && a.lng) { setLoc({ lat: a.lat, lng: a.lng, areaName: a.addressLine2 || a.city || '', city: a.city }); setQuery(a.addressLine1 || ''); }
  };

  const ready = loc && form.fullName && form.addressLine1 && /^\d{6}$/.test(form.pincode);
  const body = () => ({ shippingAddress: form, buyerLocation: { ...loc, pincode: form.pincode, city: form.city } });

  // Live quote once address + pin are complete
  useEffect(() => {
    setQuote(null);
    if (!ready) return;
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const { data } = await api.post(`/koyambedu/orders/${order.id}/address/quote`, body());
        setQuote(data);
      } catch (e) { setQuote({ success: false, message: e?.response?.data?.message || 'Could not price this address' }); }
      finally { setQuoting(false); }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, form.fullName, form.addressLine1, form.pincode, form.city]);

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/koyambedu/orders/${order.id}/address/confirm`, { ...body(), expectedDelta: quote.delta });
      if (data.applied) {
        toast.success(data.delta < 0 ? `Address updated. ${formatINR(Math.abs(data.delta))} credited to your wallet.` : 'Address updated');
        setOpen(false); onChanged?.(); setBusy(false); return;
      }
      const launch = () => {
        const rz = new window.Razorpay({
          key: data.keyId, amount: Math.round(data.amount * 100), currency: 'INR',
          name: 'Koyambedu Daily', description: `Delivery charge difference · order #${order.orderId}`,
          order_id: data.rzpOrderId,
          handler: async (resp) => {
            try {
              await api.post(`/koyambedu/orders/${order.id}/address/verify`, {
                razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature,
              });
              toast.success('Address updated');
              setOpen(false); onChanged?.();
            } catch { toast.error('Payment verification failed. Contact support if the amount was deducted.'); }
            finally { setBusy(false); }
          },
          modal: { ondismiss: () => { toast('Payment cancelled — address not changed', { icon: '💳' }); setBusy(false); } },
          theme: { color: '#16a34a' },
        });
        rz.open();
      };
      if (!window.Razorpay) {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = launch; document.body.appendChild(s);
      } else launch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not change the address');
      setBusy(false);
    }
  };

  if (elig === null || !elig.allowed) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="font-bold text-sm text-gray-800 flex items-center gap-1.5"><FiMapPin size={14} /> Change Delivery Address</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {elig.cutoffTime ? `Possible until ${elig.cutoffTime} today` : 'Delivery charge is re-calculated for the new location'}
          </p>
        </div>
        {open ? <FiChevronUp className="text-gray-400 shrink-0" /> : <FiChevronDown className="text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {(user?.addresses || []).length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {user.addresses.map(a => (
                <button key={a._id} type="button" onClick={() => fillSaved(a)}
                  className="shrink-0 text-left text-[11px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 max-w-[200px]">
                  <b className="block text-gray-700">{a.label || 'Saved'}</b>
                  <span className="text-gray-500 line-clamp-2">{[a.addressLine1, a.city, a.pincode].filter(Boolean).join(', ')}</span>
                </button>
              ))}
            </div>
          )}
          <input className={inp} placeholder="Full name *" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          <input className={inp} placeholder="Mobile (for delivery)" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
          <input className={inp} placeholder="House / flat / street *" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
          <input className={inp} placeholder="Area / locality" value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
            <input className={inp} placeholder="Pincode *" inputMode="numeric" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
          </div>
          <input className={inp} placeholder="Landmark (optional)" value={form.landmark} onChange={e => set('landmark', e.target.value)} />

          <div className="relative">
            <input className={inp} placeholder="Search the exact location to pin *" value={query} onChange={e => searchPlaces(e.target.value)} />
            {preds.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 z-20 max-h-60 overflow-y-auto shadow-lg">
                {preds.map(p => (
                  <button key={p.place_id} type="button" onClick={() => pickPlace(p)}
                    className="w-full text-left px-3 py-2.5 text-xs border-b border-gray-100 last:border-0 hover:bg-gray-50">{p.description}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={useMyLocation} className="text-xs font-bold text-green-700 flex items-center gap-1">
            <FiNavigation size={12} /> Use my current location
          </button>
          {loc && <p className="text-[11px] text-green-700">📍 Pinned: {loc.areaName || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</p>}

          {quoting && <p className="text-xs text-gray-400">Calculating delivery charge…</p>}
          {quote && !quote.success && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{quote.message}</p>
          )}
          {quote?.success && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Distance</span><span>{quote.oldDistanceKm} km → <b>{quote.newDistanceKm} km</b>{quote.hubName ? ` (from ${quote.hubName})` : ''}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery &amp; handling charges</span><span>{formatINR(quote.oldCharges)} → <b>{formatINR(quote.newCharges)}</b></span></div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 text-sm font-bold">
                <span>{quote.delta > 0 ? 'Extra to pay' : quote.delta < 0 ? 'Credited to wallet' : 'Difference'}</span>
                <span className={quote.delta > 0 ? 'text-red-600' : 'text-green-700'}>{formatINR(Math.abs(quote.delta))}</span>
              </div>
            </div>
          )}

          <button onClick={confirm} disabled={busy || !quote?.success}
            className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40">
            {busy ? 'Please wait…' : quote?.success && quote.delta > 0 ? `Pay ${formatINR(quote.delta)} & change address` : 'Change address'}
          </button>
        </div>
      )}
    </div>
  );
}
