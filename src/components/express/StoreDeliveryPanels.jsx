// ============================================
// EPTOMART EXPRESS — per-store delivery panels (slots + fees)
// Shared by the store OWNER dashboard and the super-admin Stores tab. Pass
// `client` + `basePath` to point at a different API; defaults = admin API.
// ============================================
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import api from '../../utils/api';

// Per-store delivery slot configuration — which same-day windows this store
// offers (independently of every other store), their hours/labels, and
// whether this store also offers next-day delivery. Falls back to a
// sensible default set of windows if the store hasn't got any configured
// yet (mirrors ExpressStore's own schema defaults).
const DEFAULT_SLOT_WINDOWS = [
  { startHour: 9,  endHour: 12, label: '9:00 AM - 12:00 PM', enabled: true },
  { startHour: 12, endHour: 15, label: '12:00 PM - 3:00 PM', enabled: true },
  { startHour: 15, endHour: 18, label: '3:00 PM - 6:00 PM', enabled: true },
  { startHour: 18, endHour: 21, label: '6:00 PM - 9:00 PM', enabled: true },
];

export function DeliverySlotsPanel({ store, onChanged, client = api, basePath = '' }) {
  const initial = store.deliverySlots?.windows?.length ? store.deliverySlots.windows : DEFAULT_SLOT_WINDOWS;
  const [windows, setWindows] = useState(initial.map(w => ({ ...w })));
  // Defaults to true when unset, matching ExpressStore's schema default —
  // so the toggle here reflects what the customer actually sees rather than
  // falsely showing OFF for a store that's never been saved.
  const [nextDayEnabled, setNextDayEnabled] = useState(store.deliverySlots?.nextDayEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const toggleWindow = (idx) => {
    setWindows(ws => ws.map((w, i) => i === idx ? { ...w, enabled: !w.enabled } : w));
  };
  const updateWindow = (idx, field, value) => {
    setWindows(ws => ws.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };
  const addWindow = () => {
    setWindows(ws => [...ws, { startHour: 9, endHour: 12, label: 'New window', enabled: true }]);
  };
  const removeWindow = (idx) => {
    setWindows(ws => ws.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const clean = windows.filter(w => w.label?.trim() && Number(w.endHour) > Number(w.startHour));
    if (!clean.length) return toast.error('At least one valid delivery window is required');
    setSaving(true);
    try {
      await client.patch(`${basePath || `/express/admin/stores/${store._id}`}/delivery-slots`, {
        windows: clean.map(w => ({ startHour: Number(w.startHour), endHour: Number(w.endHour), label: w.label.trim(), enabled: !!w.enabled })),
        nextDayEnabled,
      });
      toast.success('Delivery slots updated');
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update delivery slots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t grid gap-2.5">
      <p className="text-xs text-gray-500">Turn individual time windows on/off for this store, and allow next-day scheduling if this store can take advance orders.</p>
      <div className="grid gap-1.5">
        {windows.map((w, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
            <button onClick={() => toggleWindow(idx)}
              className={`shrink-0 ${w.enabled ? 'text-green-600' : 'text-gray-300'}`}>
              {w.enabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
            </button>
            <input type="number" min={0} max={23} value={w.startHour}
              onChange={e => updateWindow(idx, 'startHour', e.target.value)}
              className="w-14 border rounded-lg px-2 py-1 text-xs" title="Start hour (24h)" />
            <span className="text-xs text-gray-400">to</span>
            <input type="number" min={1} max={24} value={w.endHour}
              onChange={e => updateWindow(idx, 'endHour', e.target.value)}
              className="w-14 border rounded-lg px-2 py-1 text-xs" title="End hour (24h)" />
            <input type="text" value={w.label}
              onChange={e => updateWindow(idx, 'label', e.target.value)}
              className="flex-1 min-w-0 border rounded-lg px-2 py-1 text-xs" placeholder="Label shown to customer" />
            <button onClick={() => removeWindow(idx)} className="shrink-0 text-gray-300 hover:text-red-500">
              <FiTrash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addWindow} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 w-fit">
        <FiPlus size={12} /> Add window
      </button>

      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-1">
        <button onClick={() => setNextDayEnabled(v => !v)} className={nextDayEnabled ? 'text-green-600' : 'text-gray-300'}>
          {nextDayEnabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
        </button>
        Offer next-day delivery at this store
      </label>

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
        {saving ? 'Saving…' : 'Save Delivery Slots'}
      </button>
    </div>
  );
}

// Per-store minimum-order delivery fee. Applies irrespective of distance —
// a customer right next to the store ordering below the minimum pays this
// exact fee just like a customer further away (see computeDeliveryFee in
// expressPricingService.js on the backend). Defaults mirror the schema's
// own defaults (₹199 / ₹29) for a store that hasn't been configured yet.
export function DeliveryFeePanel({ store, onChanged, client = api, basePath = '' }) {
  const [minOrder, setMinOrder] = useState(store.deliveryFeeConfig?.minOrderForFreeDelivery ?? 199);
  const [fee, setFee] = useState(store.deliveryFeeConfig?.deliveryFeeBelowMinimum ?? 29);
  // Hard delivery-range cutoff for THIS store — blank means "use the
  // platform default from Settings", not zero.
  const [maxKm, setMaxKm] = useState(store.deliveryFeeConfig?.maxDeliveryDistanceKm ?? '');
  // Distance surcharge tiering — e.g. first 5 km free, then +₹18 every 2 km
  // beyond that. chargePerStep left at 0 disables the surcharge entirely.
  const [freeKm, setFreeKm] = useState(store.deliveryFeeConfig?.freeDeliveryDistanceKm ?? 5);
  const [stepKm, setStepKm] = useState(store.deliveryFeeConfig?.distanceStepKm ?? 2);
  const [chargePerStep, setChargePerStep] = useState(store.deliveryFeeConfig?.distanceChargePerStep ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const minOrderNum = Number(minOrder), feeNum = Number(fee);
    const maxKmNum = maxKm === '' ? null : Number(maxKm);
    const freeKmNum = Number(freeKm), stepKmNum = Number(stepKm), chargeNum = Number(chargePerStep);
    if (!Number.isFinite(minOrderNum) || minOrderNum < 0 || !Number.isFinite(feeNum) || feeNum < 0) {
      return toast.error('Enter valid non-negative numbers');
    }
    if (maxKmNum != null && (!Number.isFinite(maxKmNum) || maxKmNum < 0)) {
      return toast.error('Max delivery distance must be a non-negative number (or blank to use the platform default)');
    }
    if (!Number.isFinite(freeKmNum) || freeKmNum < 0 || !Number.isFinite(stepKmNum) || stepKmNum <= 0 || !Number.isFinite(chargeNum) || chargeNum < 0) {
      return toast.error('Enter valid numbers for the distance surcharge fields');
    }
    setSaving(true);
    try {
      await client.patch(`${basePath || `/express/admin/stores/${store._id}`}/delivery-fee`, {
        minOrderForFreeDelivery: minOrderNum, deliveryFeeBelowMinimum: feeNum,
        maxDeliveryDistanceKm: maxKmNum,
        freeDeliveryDistanceKm: freeKmNum, distanceStepKm: stepKmNum, distanceChargePerStep: chargeNum,
      });
      toast.success('Delivery fee rule updated');
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update delivery fee rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t grid gap-2.5">
      <p className="text-xs text-gray-500">
        Applies to every order at this store regardless of the customer&rsquo;s distance — orders below
        the minimum are charged the fee, orders at or above it get free delivery.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-500">Minimum Order for Free Delivery (₹)
          <input type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Delivery Fee Below Minimum (₹)
          <input type="number" min={0} value={fee} onChange={e => setFee(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
      </div>

      <p className="text-xs text-gray-500 pt-2 border-t">
        Maximum delivery distance for this store — leave blank to use the platform-wide default set in Settings.
      </p>
      <label className="text-xs font-semibold text-gray-500">Max Delivery Distance (km)
        <input type="number" min={0} placeholder="Platform default" value={maxKm} onChange={e => setMaxKm(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full mt-1 sm:w-48" />
      </label>

      <p className="text-xs text-gray-500 pt-2 border-t">
        Distance surcharge, added on top of the fee above — e.g. first 5 km free, then +₹18 for every
        additional 2 km. Leave &ldquo;Charge per Step&rdquo; at 0 to disable this surcharge.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-gray-500">Free Distance (km)
          <input type="number" min={0} step="0.5" value={freeKm} onChange={e => setFreeKm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Step Size (km)
          <input type="number" min={0.1} step="0.5" value={stepKm} onChange={e => setStepKm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Charge per Step (₹)
          <input type="number" min={0} value={chargePerStep} onChange={e => setChargePerStep(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
      </div>

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
        {saving ? 'Saving…' : 'Save Delivery Fee'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORES TAB
