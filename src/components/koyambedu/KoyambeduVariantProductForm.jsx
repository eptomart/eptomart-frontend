/**
 * KoyambeduVariantProductForm
 * Reusable product creation/edit form with:
 *  - Product-level fields (name, category, unit, charge percentages)
 *  - Up to 4 variant rows with auto-calculated final price
 * Used by KoyambeduAdmin and KoyambeduSellerAdminDashboard
 */
import { useEffect } from 'react';
import KoyambeduImageUploader from './KoyambeduImageUploader';

const UNITS   = ['kg','g','piece','bunch','dozen','litre','pack','leaf','box','bag','crate'];
const BADGES  = ['fresh_arrival','low_stock','best_seller','seasonal','organic','festival_special','bulk_deal'];

// Final price = basePrice × (1 + (proc + plat + log) / 100) — always whole number
const calcFinal = (base, proc, plat, log) => {
  if (!base || base <= 0) return '';
  const total = (Number(proc) || 0) + (Number(plat) || 0) + (Number(log) || 0);
  return String(Math.round(Number(base) * (1 + total / 100)));
};

const EMPTY_VARIANT = { basePrice: '', fromQty: '', toQty: '', finalPrice: '' };

export const EMPTY_VARIANT_PRODUCT = {
  categoryId: '',
  name: '',
  nameTamil: '',
  description: '',
  unit: 'kg',
  unitLabel: 'kg',
  procurementChargePercent: 15,
  platformChargePercent: 10,
  logisticsChargePercent: 10,
  variants: [
    { ...EMPTY_VARIANT },
    { ...EMPTY_VARIANT },
  ],
  isSameDay: true,
  isNextDay: true,
  isAvailable: true,
  badges: [],
  images: [],
};

export default function KoyambeduVariantProductForm({ form, onChange, categories }) {
  const { procurementChargePercent: proc, platformChargePercent: plat, logisticsChargePercent: log } = form;

  // Recompute all variant final prices whenever charge percentages change
  useEffect(() => {
    const updated = (form.variants || []).map(v => ({
      ...v,
      finalPrice: v.basePrice ? calcFinal(v.basePrice, proc, plat, log) : '',
    }));
    // Only update if something actually changed to avoid infinite loop
    const same = updated.every((v, i) => v.finalPrice === (form.variants[i]?.finalPrice ?? ''));
    if (!same) onChange({ ...form, variants: updated });
  }, [proc, plat, log]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k, v) => onChange({ ...form, [k]: v });

  const setVariant = (idx, key, val) => {
    const variants = [...(form.variants || [])];
    variants[idx] = { ...variants[idx], [key]: val };
    // Auto-compute final price when base price changes
    if (key === 'basePrice') {
      variants[idx].finalPrice = val ? calcFinal(val, proc, plat, log) : '';
    }
    onChange({ ...form, variants });
  };

  const addVariant = () => {
    if ((form.variants || []).length >= 4) return;
    onChange({ ...form, variants: [...(form.variants || []), { ...EMPTY_VARIANT }] });
  };

  const removeVariant = (idx) => {
    if ((form.variants || []).length <= 1) return;
    const variants = (form.variants || []).filter((_, i) => i !== idx);
    onChange({ ...form, variants });
  };

  const toggleBadge = (b) => {
    const badges = form.badges || [];
    setField('badges', badges.includes(b) ? badges.filter(x => x !== b) : [...badges, b]);
  };

  // Best rate variant = lowest finalPrice
  const bestVariant = (form.variants || []).reduce((best, v) => {
    if (!v.finalPrice) return best;
    if (!best || Number(v.finalPrice) < Number(best.finalPrice)) return v;
    return best;
  }, null);

  return (
    <div className="space-y-4">

      {/* ── Category ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
        <select value={form.categoryId} onChange={e => setField('categoryId', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          <option value="">Select category</option>
          {(categories || []).map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* ── Names ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
          <input value={form.name} onChange={e => setField('name', e.target.value)}
            placeholder="e.g. Onion"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Tamil Name</label>
          <input value={form.nameTamil} onChange={e => setField('nameTamil', e.target.value)}
            placeholder="தமிழ் பெயர்"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
      </div>

      {/* ── Unit ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
          <select value={form.unit} onChange={e => setField('unit', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
            {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Label</label>
          <input value={form.unitLabel} onChange={e => setField('unitLabel', e.target.value)}
            placeholder="e.g. kg, bunch"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
        </div>
      </div>

      {/* ── Charge percentages ── */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
        <p className="text-xs font-bold text-green-800 mb-2">💰 Charges (apply to all variants)</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Procurement %', 'procurementChargePercent'],
            ['Platform %',    'platformChargePercent'],
            ['Logistics %',   'logisticsChargePercent'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input type="number" min="0" max="100" step="0.5"
                  value={form[key]}
                  onChange={e => setField(key, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm pr-6 focus:outline-none focus:ring-2 focus:ring-green-400" />
                <span className="absolute right-2 top-2 text-gray-400 text-xs">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-green-700 mt-2">
          Total markup: <strong>{(Number(form.procurementChargePercent) || 0) + (Number(form.platformChargePercent) || 0) + (Number(form.logisticsChargePercent) || 0)}%</strong>
          {' · '}Formula: Base Price × (1 + Total%) = Final Price
        </p>
      </div>

      {/* ── Variants table ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-700">Pricing Variants (up to 4)</p>
          {(form.variants || []).length < 4 && (
            <button type="button" onClick={addVariant}
              className="text-xs font-bold text-green-700 border border-green-300 px-2.5 py-1 rounded-xl hover:bg-green-50">
              + Add Tier
            </button>
          )}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1 mb-1">
          <span>Base / {form.unit || 'unit'}</span>
          <span>From Qty</span>
          <span>To Qty</span>
          <span className="text-green-700">Final / {form.unit || 'unit'}</span>
          <span />
        </div>

        <div className="space-y-2">
          {(form.variants || []).map((v, idx) => (
            <div key={idx} className={`grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 items-center rounded-xl px-2 py-2 border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              {/* Base Price */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <input type="number" min="0" step="0.5"
                  value={v.basePrice}
                  onChange={e => setVariant(idx, 'basePrice', e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg pl-5 pr-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              </div>
              {/* From Qty */}
              <input type="number" min="0" step="1"
                value={v.fromQty}
                onChange={e => setVariant(idx, 'fromQty', e.target.value)}
                placeholder="Min"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              {/* To Qty */}
              <input type="number" min="0" step="1"
                value={v.toQty}
                onChange={e => setVariant(idx, 'toQty', e.target.value)}
                placeholder="Max"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              {/* Final Price — read only */}
              <div className="bg-white border border-green-300 rounded-lg px-2 py-1.5 text-sm font-bold text-green-700 text-center">
                {v.finalPrice ? `₹${v.finalPrice}` : '—'}
              </div>
              {/* Remove */}
              <button type="button" onClick={() => removeVariant(idx)}
                disabled={(form.variants || []).length <= 1}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition text-sm">
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Best rate preview */}
        {bestVariant && bestVariant.fromQty && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">BEST RATE</span>
            <div className="text-xs text-gray-700">
              Starting from <strong className="text-orange-600">₹{bestVariant.finalPrice}/{form.unit || 'unit'}</strong>
              {' · '}MOQ: <strong>{bestVariant.fromQty} {form.unit || 'unit'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Description ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
        <textarea value={form.description} rows={2}
          onChange={e => setField('description', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
      </div>

      {/* ── Badges ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Badges</label>
        <div className="flex flex-wrap gap-2">
          {BADGES.map(b => (
            <button key={b} type="button"
              onClick={() => toggleBadge(b)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${
                (form.badges || []).includes(b)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}>
              {b.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Delivery toggles ── */}
      <div className="grid grid-cols-3 gap-2">
        {[['isSameDay','Same Day'],['isNextDay','Next Day'],['isAvailable','In Stock']].map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2">
            <input type="checkbox" checked={!!form[k]}
              onChange={e => setField(k, e.target.checked)}
              className="w-4 h-4 accent-green-600" />
            <span className="text-xs text-gray-700 font-medium">{label}</span>
          </label>
        ))}
      </div>

      {/* ── Images ── */}
      <KoyambeduImageUploader
        images={form.images || []}
        onChange={(imgs) => setField('images', imgs)}
      />
    </div>
  );
}
