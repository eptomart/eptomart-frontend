/**
 * KoyambeduVariantProductForm
 * Reusable product creation/edit form with:
 *  - Product-level fields (name, category, unit, charge percentages)
 *  - Grade system: Premium / Mixed Grade / Economy Grade (optional toggle)
 *  - Up to 4 variant rows per grade with auto-calculated final price
 * Used by KoyambeduAdmin and KoyambeduSellerAdminDashboard
 */
import { useEffect, useState } from 'react';
import KoyambeduImageUploader from './KoyambeduImageUploader';

const UNITS   = ['kg','g','piece','bunch','dozen','litre','pack','leaf','box','bag','crate'];
const BADGES  = ['fresh_arrival','low_stock','best_seller','seasonal','organic','festival_special','bulk_deal'];

const GRADE_DEFS = [
  { gradeKey: 'premium', gradeName: 'Premium',     color: 'purple', icon: '⭐' },
  { gradeKey: 'mixed',   gradeName: 'Mixed Grade',  color: 'blue',   icon: '🔵' },
  { gradeKey: 'economy', gradeName: 'Economy Grade', color: 'gray',   icon: '⚪' },
];

// Final price = basePrice × (1 + (proc + plat + log) / 100) — always whole number
const calcFinal = (base, proc, plat, log) => {
  if (!base || base <= 0) return '';
  const total = (Number(proc) || 0) + (Number(plat) || 0) + (Number(log) || 0);
  return String(Math.round(Number(base) * (1 + total / 100)));
};

const EMPTY_VARIANT = { basePrice: '', fromQty: '', toQty: '', finalPrice: '' };

const makeDefaultGrade = (gradeKey, gradeName) => ({
  gradeKey,
  gradeName,
  isActive: true,
  variants: [{ ...EMPTY_VARIANT }, { ...EMPTY_VARIANT }],
  variantDiffPercent: 2,
});

/** Returns error message string if overlap found, null if clean */
export const getVariantOverlapError = (variants = []) => {
  for (let i = 1; i < variants.length; i++) {
    const prevTo = (variants[i - 1].toQty !== '' && variants[i - 1].toQty != null)
      ? Number(variants[i - 1].toQty) : null;
    if (prevTo !== null && Number(variants[i].fromQty) <= prevTo) {
      return `Variant ${i + 1} qty range overlaps with the previous tier — it must start at ${prevTo + 1} or higher`;
    }
  }
  return null;
};

export const EMPTY_VARIANT_PRODUCT = {
  categoryId: '',
  name: '',
  nameTamil: '',
  description: '',
  unit: 'kg',
  procurementChargePercent: 0,
  platformChargePercent: 10,
  logisticsChargePercent: 10,
  variants: [
    { ...EMPTY_VARIANT },
    { ...EMPTY_VARIANT },
  ],
  gradesEnabled: false,
  grades: GRADE_DEFS.map(g => makeDefaultGrade(g.gradeKey, g.gradeName)),
  // sharedTiers: qty structure shared across all grades (create mode only)
  sharedTiers: [
    { fromQty: '', toQty: '' },
    { fromQty: '', toQty: '' },
  ],
  isSameDay: true,
  isNextDay: true,
  isAvailable: true,
  badges: [],
  images: [],
};

// ── Single-grade variant editor ──────────────────────────────────────────────
function VariantTable({ variants, onChange, proc, plat, log, unit }) {
  const setVariant = (idx, key, val) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [key]: val };
    if (key === 'basePrice') {
      updated[idx].finalPrice = val ? calcFinal(val, proc, plat, log) : '';
    }
    onChange(updated);
  };

  const addVariant = () => {
    if (variants.length >= 4) return;
    const last = variants[variants.length - 1];
    if (last && !last.toQty) return;
    onChange([...variants, { ...EMPTY_VARIANT }]);
  };

  const removeVariant = (idx) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((_, i) => i !== idx));
  };

  const overlapErrors = variants.map((v, i) => {
    if (i === 0) return null;
    const prev   = variants[i - 1];
    const prevTo = prev.toQty !== '' && prev.toQty != null ? Number(prev.toQty) : null;
    if (prevTo !== null && Number(v.fromQty) <= prevTo) {
      return `Must start at ${prevTo + 1} or higher`;
    }
    return null;
  });
  const hasOverlap = overlapErrors.some(Boolean);

  const bestVariant = variants.reduce((best, v) => {
    if (!v.finalPrice) return best;
    if (!best || Number(v.finalPrice) < Number(best.finalPrice)) return v;
    return best;
  }, null);

  const lastVariant = variants[variants.length - 1];
  const addBlocked  = !!(lastVariant && !lastVariant.toQty);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-600">Pricing Variants (up to 4)</p>
        {variants.length < 4 && (
          <div className="relative group">
            <button type="button" onClick={addVariant} disabled={addBlocked}
              className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition ${
                addBlocked
                  ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                  : 'text-green-700 border-green-300 hover:bg-green-50'
              }`}>
              + Add Tier
            </button>
            {addBlocked && (
              <span className="absolute right-0 top-full mt-1.5 text-[10px] bg-gray-800 text-white px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                Fill "To Qty" in last tier first
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1 mb-1">
        <span>Base/{unit || 'unit'}</span>
        <span>From Qty</span>
        <span>To Qty</span>
        <span className="text-green-700">Final/{unit || 'unit'}</span>
        <span />
      </div>

      {hasOverlap && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 font-semibold">
          ⚠️ Ranges must not overlap
        </div>
      )}

      <div className="space-y-1.5">
        {variants.map((v, idx) => (
          <div key={idx}>
            <div className={`grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 items-center rounded-xl px-2 py-1.5 border ${
              overlapErrors[idx] ? 'bg-red-50 border-red-400' : idx === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <input type="number" min="0" step="0.5" value={v.basePrice}
                  onChange={e => setVariant(idx, 'basePrice', e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg pl-5 pr-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              </div>
              <input type="number" min="0" step="1" value={v.fromQty}
                onChange={e => setVariant(idx, 'fromQty', e.target.value)}
                placeholder="Min"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              <input type="number" min="0" step="1" value={v.toQty}
                onChange={e => setVariant(idx, 'toQty', e.target.value)}
                placeholder="Max"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
              <div className="bg-white border border-green-300 rounded-lg px-2 py-1.5 text-sm font-bold text-green-700 text-center">
                {v.finalPrice ? `₹${v.finalPrice}` : '—'}
              </div>
              <button type="button" onClick={() => removeVariant(idx)}
                disabled={variants.length <= 1}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition text-sm">
                ✕
              </button>
            </div>
            {overlapErrors[idx] && (
              <p className="text-[10px] text-red-600 font-semibold mt-0.5 px-1">⚠️ {overlapErrors[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {bestVariant && bestVariant.fromQty && (
        <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">BEST RATE</span>
          <p className="text-xs text-gray-700">From <strong className="text-orange-600">₹{bestVariant.finalPrice}/{unit || 'unit'}</strong></p>
        </div>
      )}
    </div>
  );
}

// ── Shared tier table (create mode) ─────────────────────────────────────────
function SharedTierTable({ tiers, onChange, unit }) {
  const setTier = (idx, key, val) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };

  const addTier = () => {
    if (tiers.length >= 4) return;
    const last = tiers[tiers.length - 1];
    if (last && !last.toQty) return; // last tier must have toQty before adding another
    onChange([...tiers, { fromQty: '', toQty: '' }]);
  };

  const removeTier = (idx) => {
    if (tiers.length <= 1) return;
    onChange(tiers.filter((_, i) => i !== idx));
  };

  const addBlocked = !!(tiers[tiers.length - 1] && !tiers[tiers.length - 1].toQty);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-gray-700">Quantity Tiers</p>
          <p className="text-[10px] text-gray-500">Shared across all grades — define qty ranges once</p>
        </div>
        {tiers.length < 4 && (
          <div className="relative group">
            <button type="button" onClick={addTier} disabled={addBlocked}
              className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition ${
                addBlocked
                  ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                  : 'text-green-700 border-green-300 hover:bg-green-50'
              }`}>
              + Add Tier
            </button>
            {addBlocked && (
              <span className="absolute right-0 top-full mt-1.5 text-[10px] bg-gray-800 text-white px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                Fill "To Qty" in last tier first
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1 mb-1">
        <span>From ({unit || 'unit'})</span>
        <span>To ({unit || 'unit'})</span>
        <span />
      </div>

      <div className="space-y-1.5">
        {tiers.map((tier, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
            <input type="number" min="0" step="1" value={tier.fromQty}
              onChange={e => setTier(idx, 'fromQty', e.target.value)}
              placeholder="Min qty"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            <input type="number" min="0" step="1" value={tier.toQty}
              onChange={e => setTier(idx, 'toQty', e.target.value)}
              placeholder={idx === tiers.length - 1 ? 'Max (or open)' : 'Max qty'}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            <button type="button" onClick={() => removeTier(idx)}
              disabled={tiers.length <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition text-sm">
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">💡 Leave the last tier's "To" empty for open-ended (50 kg+)</p>
    </div>
  );
}

// ── Per-grade pricing card (create mode) ─────────────────────────────────────
function GradePricingCard({ grade, gradeDef, tiers, proc, plat, log, onChange }) {
  const colorMap = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600', text: 'text-purple-800' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-600',   text: 'text-blue-800'   },
    gray:   { bg: 'bg-gray-100',  border: 'border-gray-200',   badge: 'bg-gray-500',   text: 'text-gray-700'   },
  };
  const c = colorMap[gradeDef.color] || colorMap.gray;

  const setPrice = (tierIdx, val) => {
    // Rebuild variants array aligned with current tiers
    const variants = (tiers || []).map((tier, idx) => {
      const existing = grade.variants?.[idx] || {};
      const bp = idx === tierIdx ? val : (existing.basePrice ?? '');
      return {
        fromQty:    tier.fromQty,
        toQty:      tier.toQty,
        basePrice:  bp,
        finalPrice: bp ? calcFinal(bp, proc, plat, log) : '',
      };
    });
    onChange({ ...grade, variants });
  };

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-3`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span>{gradeDef.icon}</span>
        <span className={`text-sm font-black ${c.text}`}>{grade.gradeName || gradeDef.gradeName}</span>
        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${c.badge}`}>
          {grade.gradeKey.toUpperCase()}
        </span>
      </div>

      {/* Tier price rows */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1 mb-1">
        <span className="w-16">Tier</span>
        <span>Base Price</span>
        <span className="text-green-700">Final Price</span>
      </div>

      {(tiers || []).length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">Add quantity tiers above first</p>
      ) : (
        <div className="space-y-1.5">
          {(tiers || []).map((tier, idx) => {
            const v = grade.variants?.[idx] || {};
            const tierLabel = tier.fromQty
              ? `${tier.fromQty}${tier.toQty ? `–${tier.toQty}` : '+'}`
              : `Tier ${idx + 1}`;
            return (
              <div key={idx} className="grid grid-cols-[auto_1fr_1fr] gap-1 items-center rounded-xl px-2 py-1.5 bg-white border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 w-16">{tierLabel}</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                  <input type="number" min="0" step="0.5" value={v.basePrice ?? ''}
                    onChange={e => setPrice(idx, e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg pl-5 pr-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                </div>
                <div className={`rounded-lg px-2 py-1.5 text-sm font-bold text-center border ${
                  v.finalPrice ? 'text-green-700 border-green-200 bg-green-50' : 'text-gray-300 border-gray-100'
                }`}>
                  {v.finalPrice ? `₹${v.finalPrice}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Variant diff % */}
      <div className="flex items-center gap-2 mt-2">
        <label className="text-[10px] font-semibold text-gray-600">Variant Step %</label>
        <div className="relative w-20">
          <input type="number" min="0" max="20" step="0.5"
            value={grade.variantDiffPercent ?? 2}
            onChange={e => onChange({ ...grade, variantDiffPercent: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-2 py-1 text-sm pr-6 focus:outline-none focus:ring-1 focus:ring-green-400" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
        </div>
        <p className="text-[10px] text-gray-400">per tier step</p>
      </div>
    </div>
  );
}

// ── Grade section ─────────────────────────────────────────────────────────────
function GradeSection({ grade, gradeDef, proc, plat, log, unit, onChange, onToggle }) {
  const recomputeVariants = (variants) =>
    variants.map(v => ({
      ...v,
      finalPrice: v.basePrice ? calcFinal(v.basePrice, proc, plat, log) : '',
    }));

  const handleVariantsChange = (newVariants) => {
    onChange({ ...grade, variants: newVariants });
  };

  const colorMap = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600', text: 'text-purple-800' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-600',   text: 'text-blue-800'   },
    gray:   { bg: 'bg-gray-100',  border: 'border-gray-200',   badge: 'bg-gray-500',   text: 'text-gray-700'   },
  };
  const c = colorMap[gradeDef.color] || colorMap.gray;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-3 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{gradeDef.icon}</span>
          <span className={`text-sm font-black ${c.text}`}>{grade.gradeName || gradeDef.gradeName}</span>
          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${c.badge}`}>{grade.gradeKey.toUpperCase()}</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-xs text-gray-500">Active</span>
          <div className={`relative w-9 h-5 rounded-full transition ${grade.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            onClick={onToggle}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${grade.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {grade.isActive && (
        <>
          {/* Grade name override */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 mb-1">Grade Label (shown to customers)</label>
            <input value={grade.gradeName} onChange={e => onChange({ ...grade, gradeName: e.target.value })}
              placeholder={gradeDef.gradeName}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>

          {/* Variant diff % */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-semibold text-gray-600">Variant Step %</label>
            <div className="relative w-24">
              <input type="number" min="0" max="20" step="0.5"
                value={grade.variantDiffPercent ?? 2}
                onChange={e => onChange({ ...grade, variantDiffPercent: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm pr-6 focus:outline-none focus:ring-1 focus:ring-green-400" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
            <p className="text-[10px] text-gray-400">per tier step</p>
          </div>

          {/* Variants */}
          <VariantTable
            variants={grade.variants || []}
            onChange={handleVariantsChange}
            proc={proc} plat={plat} log={log} unit={unit}
          />
        </>
      )}
    </div>
  );
}

export default function KoyambeduVariantProductForm({ form, onChange, categories, isCreateMode = false }) {
  const { procurementChargePercent: proc, platformChargePercent: plat, logisticsChargePercent: log } = form;

  // Recompute all variant final prices whenever charge percentages change
  useEffect(() => {
    if (!form.gradesEnabled) {
      const updated = (form.variants || []).map(v => ({
        ...v,
        finalPrice: v.basePrice ? calcFinal(v.basePrice, proc, plat, log) : '',
      }));
      const same = updated.every((v, i) => v.finalPrice === (form.variants[i]?.finalPrice ?? ''));
      if (!same) onChange({ ...form, variants: updated });
    } else {
      const updatedGrades = (form.grades || []).map(g => ({
        ...g,
        variants: (g.variants || []).map(v => ({
          ...v,
          finalPrice: v.basePrice ? calcFinal(v.basePrice, proc, plat, log) : '',
        })),
      }));
      const same = JSON.stringify(updatedGrades.map(g => g.variants.map(v => v.finalPrice))) ===
                   JSON.stringify((form.grades || []).map(g => (g.variants || []).map(v => v.finalPrice)));
      if (!same) onChange({ ...form, grades: updatedGrades });
    }
  }, [proc, plat, log]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k, v) => onChange({ ...form, [k]: v });

  // ── Standard (non-graded) variant helpers ──
  const setVariant = (idx, key, val) => {
    const variants = [...(form.variants || [])];
    variants[idx] = { ...variants[idx], [key]: val };
    if (key === 'basePrice') {
      variants[idx].finalPrice = val ? calcFinal(val, proc, plat, log) : '';
    }
    onChange({ ...form, variants });
  };

  const addVariant = () => {
    const variants = form.variants || [];
    if (variants.length >= 4) return;
    const last = variants[variants.length - 1];
    if (last && !last.toQty) return;
    onChange({ ...form, variants: [...variants, { ...EMPTY_VARIANT }] });
  };

  const removeVariant = (idx) => {
    if ((form.variants || []).length <= 1) return;
    onChange({ ...form, variants: (form.variants || []).filter((_, i) => i !== idx) });
  };

  const toggleBadge = (b) => {
    const badges = form.badges || [];
    setField('badges', badges.includes(b) ? badges.filter(x => x !== b) : [...badges, b]);
  };

  // Ensure grades array always has all 3 grades
  const ensureGrades = () => {
    const existing = form.grades || [];
    return GRADE_DEFS.map(def => {
      const found = existing.find(g => g.gradeKey === def.gradeKey);
      return found || makeDefaultGrade(def.gradeKey, def.gradeName);
    });
  };

  const handleGradesToggle = (enabled) => {
    if (enabled) {
      onChange({ ...form, gradesEnabled: true, grades: ensureGrades() });
    } else {
      onChange({ ...form, gradesEnabled: false });
    }
  };

  const updateGrade = (gradeKey, updatedGrade) => {
    const grades = (form.grades || []).map(g => g.gradeKey === gradeKey ? updatedGrade : g);
    onChange({ ...form, grades });
  };

  const toggleGradeActive = (gradeKey) => {
    const grades = (form.grades || []).map(g =>
      g.gradeKey === gradeKey ? { ...g, isActive: !g.isActive } : g
    );
    onChange({ ...form, grades });
  };

  // ── Create-mode: shared tier handlers ───────────────────────────────────────
  // When a shared tier changes, sync fromQty/toQty into ALL grades' variants
  const handleSharedTiersChange = (newTiers) => {
    const updatedGrades = (form.grades || []).map(g => {
      const variants = newTiers.map((tier, idx) => {
        const existing = g.variants?.[idx] || {};
        const basePrice = existing.basePrice ?? '';
        return {
          fromQty:    tier.fromQty,
          toQty:      tier.toQty,
          basePrice,
          finalPrice: basePrice ? calcFinal(basePrice, proc, plat, log) : '',
        };
      });
      return { ...g, variants };
    });
    onChange({ ...form, sharedTiers: newTiers, grades: updatedGrades });
  };

  // Standard variant overlap errors
  const overlapErrors = (form.variants || []).map((v, i) => {
    if (i === 0) return null;
    const prev  = form.variants[i - 1];
    const prevTo = prev.toQty !== '' && prev.toQty != null ? Number(prev.toQty) : null;
    if (prevTo !== null && Number(v.fromQty) <= prevTo) {
      return `Must start at ${prevTo + 1} or higher (previous tier ends at ${prevTo})`;
    }
    return null;
  });
  const hasOverlap = overlapErrors.some(Boolean);

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

      {/* ── Grade toggle ── */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-black text-amber-900">Enable Quality Grades</p>
          <p className="text-[11px] text-amber-700">Add Premium / Mixed / Economy with separate pricing</p>
        </div>
        <div
          className={`relative w-11 h-6 rounded-full cursor-pointer transition ${form.gradesEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
          onClick={() => handleGradesToggle(!form.gradesEnabled)}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.gradesEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
      </div>

      {/* ── Grade pricing sections (shown when gradesEnabled) ── */}
      {form.gradesEnabled ? (
        isCreateMode ? (
          /* ── CREATE MODE: grade checkboxes + shared tiers + per-grade pricing ── */
          <div className="space-y-3">
            {/* Grade selection */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-amber-900 mb-2">Select Grades to Offer</p>
              <div className="flex flex-wrap gap-4">
                {GRADE_DEFS.map(def => {
                  const grade = (form.grades || []).find(g => g.gradeKey === def.gradeKey);
                  const isActive = grade?.isActive !== false;
                  return (
                    <label key={def.gradeKey} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={isActive}
                        onChange={() => toggleGradeActive(def.gradeKey)}
                        className="w-4 h-4 accent-amber-600 rounded" />
                      <span className="text-sm font-semibold text-amber-900">{def.icon} {def.gradeName}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-amber-700 mt-2">
                A hidden "Base Grade" is auto-created as a pricing reference — it never appears to customers or sellers.
              </p>
            </div>

            {/* Shared quantity tiers */}
            <SharedTierTable
              tiers={form.sharedTiers || [{ fromQty: '', toQty: '' }]}
              onChange={handleSharedTiersChange}
              unit={form.unit}
            />

            {/* Per-grade pricing cards (only active grades) */}
            {GRADE_DEFS
              .filter(def => (form.grades || []).find(g => g.gradeKey === def.gradeKey)?.isActive !== false)
              .map(def => {
                const grade = (form.grades || []).find(g => g.gradeKey === def.gradeKey) || makeDefaultGrade(def.gradeKey, def.gradeName);
                return (
                  <GradePricingCard
                    key={def.gradeKey}
                    grade={grade}
                    gradeDef={def}
                    tiers={form.sharedTiers || []}
                    proc={proc} plat={plat} log={log}
                    onChange={(updated) => updateGrade(def.gradeKey, updated)}
                  />
                );
              })
            }
          </div>
        ) : (
          /* ── EDIT MODE: independent grade sections (unchanged) ── */
          <div className="space-y-3">
            {GRADE_DEFS.map(def => {
              const grade = (form.grades || []).find(g => g.gradeKey === def.gradeKey) || makeDefaultGrade(def.gradeKey, def.gradeName);
              return (
                <GradeSection
                  key={def.gradeKey}
                  grade={grade}
                  gradeDef={def}
                  proc={proc} plat={plat} log={log}
                  unit={form.unit}
                  onChange={(updated) => updateGrade(def.gradeKey, updated)}
                  onToggle={() => toggleGradeActive(def.gradeKey)}
                />
              );
            })}
          </div>
        )
      ) : (
        /* ── Standard variant table (no grades) ── */
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Pricing Variants (up to 4)</p>
            {(form.variants || []).length < 4 && (() => {
              const last = (form.variants || [])[(form.variants || []).length - 1];
              const blocked = !!(last && !last.toQty);
              return (
                <div className="relative group">
                  <button type="button" onClick={addVariant} disabled={blocked}
                    className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition ${
                      blocked
                        ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        : 'text-green-700 border-green-300 hover:bg-green-50'
                    }`}>
                    + Add Tier
                  </button>
                  {blocked && (
                    <span className="absolute right-0 top-full mt-1.5 text-[10px] bg-gray-800 text-white px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                      Fill "To Qty" in last tier first
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1 mb-1">
            <span>Base / {form.unit || 'unit'}</span>
            <span>From Qty</span>
            <span>To Qty</span>
            <span className="text-green-700">Final / {form.unit || 'unit'}</span>
            <span />
          </div>

          {hasOverlap && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 font-semibold">
              ⚠️ Variant ranges must not overlap — each tier's "From Qty" must be higher than the previous tier's "To Qty" + 1
            </div>
          )}

          <div className="space-y-2">
            {(form.variants || []).map((v, idx) => (
              <div key={idx}>
                <div className={`grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 items-center rounded-xl px-2 py-2 border ${
                  overlapErrors[idx] ? 'bg-red-50 border-red-400' : idx === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input type="number" min="0" step="0.5"
                      value={v.basePrice}
                      onChange={e => setVariant(idx, 'basePrice', e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg pl-5 pr-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                  </div>
                  <input type="number" min="0" step="1"
                    value={v.fromQty}
                    onChange={e => setVariant(idx, 'fromQty', e.target.value)}
                    placeholder="Min"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                  <input type="number" min="0" step="1"
                    value={v.toQty}
                    onChange={e => setVariant(idx, 'toQty', e.target.value)}
                    placeholder="Max"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                  <div className="bg-white border border-green-300 rounded-lg px-2 py-1.5 text-sm font-bold text-green-700 text-center">
                    {v.finalPrice ? `₹${v.finalPrice}` : '—'}
                  </div>
                  <button type="button" onClick={() => removeVariant(idx)}
                    disabled={(form.variants || []).length <= 1}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition text-sm">
                    ✕
                  </button>
                </div>
                {overlapErrors[idx] && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5 px-1">⚠️ {overlapErrors[idx]}</p>
                )}
              </div>
            ))}
          </div>

          {bestVariant && bestVariant.fromQty && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">BEST RATE</span>
              <div className="text-xs text-gray-700">
                Starting from <strong className="text-orange-600">₹{bestVariant.finalPrice}/{form.unit || 'unit'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

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
