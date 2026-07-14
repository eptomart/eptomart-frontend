/**
 * KoyambeduDailyPricePanel
 * Shared "Today's Prices" panel used by both:
 *   - Seller Admin  → apiBase='/koyambedu/seller-admin'  (no saAdmins)
 *   - Super Admin   → apiBase='/koyambedu/admin'         (saAdmins=[...])
 *
 * When saAdmins is provided, a Seller Admin filter dropdown and Export CSV
 * button are shown (admin-only features).
 *
 * All grade-aware pricing logic is included (Premium / Mixed / Economy).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiRefreshCw, FiSave, FiClock, FiChevronDown, FiChevronUp,
  FiFilter, FiAlertCircle, FiDownload, FiSearch, FiTrendingUp, FiX,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Pure helpers ──────────────────────────────────────────────────────────────
const fmt     = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Client-side variant price preview — mirrors variantPricingService on backend.
 * Returns array sorted by fromQty ASC with { fromQty, toQty, basePrice, finalPrice }.
 */
function previewVariants(variants, highestBasePrice, variantDiffPercent, chargePercents) {
  if (!variants || !variants.length) return [];
  const totalCharge = (chargePercents.procurement ?? 0) + (chargePercents.platform ?? 10) + (chargePercents.logistics ?? 10);
  const diff        = 1 + (Number(variantDiffPercent) || 0) / 100;

  const sorted  = [...variants].sort((a, b) => Number(b.fromQty) - Number(a.fromQty));
  let running   = Number(highestBasePrice) || 0;

  const result  = sorted.map(v => {
    const basePrice  = Math.round(running * 100) / 100;
    const finalPrice = Math.round(running * (1 + totalCharge / 100) * 100) / 100;
    running          = running * diff;
    return { ...v, basePrice, finalPrice };
  });

  return result.sort((a, b) => Number(a.fromQty) - Number(b.fromQty));
}

/** Format a quantity value for display: 0.25 kg → "250 g", 1 kg → "1 kg" */
function fmtQty(qty, unit) {
  const n = Number(qty);
  if (unit === 'kg' && n < 1) return `${Math.round(n * 1000)} g`;
  if (unit === 'g'  && n >= 1000) return `${n / 1000} kg`;
  return `${n} ${unit}`;
}

function fmtRange(v, unit) {
  const from = fmtQty(v.fromQty, unit);
  if (!v.toQty) return `${from}+`;
  return from;
}

const GRADE_STYLE = {
  premium: { label: '⭐ Premium', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
  mixed:   { label: '🔵 Mixed',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700'   },
  economy: { label: '⚪ Economy', bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   badge: 'bg-gray-100 text-gray-600'   },
};

// ── Per-grade input block ─────────────────────────────────────────────────────
function GradeInputBlock({ grade, gradeEdit, onEdit, chargePercents }) {
  const { gradeKey, gradeName, variants, variantDiffPercent: savedDiff, highestVariant } = grade;
  const gs           = GRADE_STYLE[gradeKey] || GRADE_STYLE.economy;
  const currentBase  = gradeEdit?.highestBasePrice  ?? (highestVariant?.basePrice || 0);
  const currentDiff  = gradeEdit?.variantDiffPercent ?? (savedDiff || 2);
  const preview      = useMemo(
    () => previewVariants(variants, currentBase, currentDiff, chargePercents),
    [variants, currentBase, currentDiff, chargePercents]
  );
  const highestV = preview.length ? preview[preview.length - 1] : null;
  const validBase = Number(currentBase) > 0;

  return (
    <div className={`rounded-xl p-3 border ${gs.border} ${gs.bg} space-y-2`}>
      <p className={`text-xs font-black ${gs.text}`}>{gradeName || gs.label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            Base ₹{highestV ? ` (${fmtRange(highestV, grade.unit || 'kg')})` : ''}
          </label>
          <input
            type="number" min="0.01" step="0.01"
            value={currentBase === 0 ? '' : currentBase}
            placeholder="e.g. 25"
            onChange={e => onEdit(gradeKey, 'highestBasePrice', e.target.value)}
            className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:outline-none ${
              !validBase && gradeEdit ? 'border-red-300' : 'border-gray-200 focus:ring-green-300'
            }`}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Diff %</label>
          <input
            type="number" min="0" max="50" step="0.5"
            value={currentDiff}
            onChange={e => onEdit(gradeKey, 'variantDiffPercent', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-300 focus:outline-none"
          />
        </div>
      </div>
      {preview.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[...preview].reverse().map((v, i) => (
            <div key={i} className={`text-[10px] rounded px-1.5 py-0.5 ${
              i === 0 ? gs.badge + ' font-bold' : 'bg-white text-gray-500 border border-gray-100'
            }`}>
              {fmtRange(v, grade.unit || 'kg')} → ₹{v.finalPrice}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProductRow ────────────────────────────────────────────────────────────────
function ProductRow({ product, edit, onEdit, showPreview, onTogglePreview, onShowHistory }) {
  const {
    _id, name, nameTamil, unit, variants, variantDiffPercent: savedDiff,
    procurementChargePercent: proc, platformChargePercent: plat, logisticsChargePercent: log,
    highestVariant, priceUpdatedAt, category, gradesEnabled, gradeRows,
    seller,
  } = product;

  const chargePercents = { procurement: proc, platform: plat, logistics: log };
  const hasGrades      = !!(gradesEnabled && gradeRows?.length > 0);
  const hasEdit        = !!edit;

  const currentHighestBase = edit?.highestBasePrice  ?? (highestVariant?.basePrice || 0);
  const currentDiff        = edit?.variantDiffPercent ?? (savedDiff || 2);
  const preview = useMemo(
    () => hasGrades ? [] : previewVariants(variants, currentHighestBase, currentDiff, chargePercents),
    [hasGrades, variants, currentHighestBase, currentDiff, chargePercents] // eslint-disable-line
  );
  const highestQtyVariant = preview.length ? preview[preview.length - 1] : null;
  const validBase  = Number(currentHighestBase) > 0;
  const validDiff  = Number(currentDiff) >= 0 && Number(currentDiff) <= 50;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${hasEdit ? 'border-green-400 shadow-md' : 'border-gray-200'}`}>
      <div className="p-4">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-800 text-sm truncate">{name}</p>
              {hasGrades && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">GRADED</span>
              )}
            </div>
            {nameTamil && <p className="text-[11px] text-gray-400 mt-0.5">{nameTamil}</p>}
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
              {seller?.businessName && (
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{seller.businessName}</span>
              )}
              {category?.name && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{category.name}</span>
              )}
              {priceUpdatedAt && (
                <span className="flex items-center gap-0.5">
                  <FiClock size={9} /> {fmtTime(priceUpdatedAt)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!hasGrades && highestQtyVariant && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Highest variant</p>
                <p className="text-xs font-bold text-green-700">{fmtRange(highestQtyVariant, unit)}</p>
              </div>
            )}
            <button
              onClick={() => onShowHistory(product)}
              title="Price History"
              className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition shrink-0"
            >
              <FiTrendingUp size={14} />
            </button>
          </div>
        </div>

        {hasGrades ? (
          <div className="space-y-3">
            {gradeRows.map(grade => (
              <GradeInputBlock
                key={grade.gradeKey}
                grade={{ ...grade, unit }}
                gradeEdit={edit?.grades?.[grade.gradeKey]}
                onEdit={(gk, field, val) => onEdit(_id, field, val, gk)}
                chargePercents={chargePercents}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-medium">
                  Base Price ₹ <span className="text-gray-400">({highestQtyVariant ? fmtRange(highestQtyVariant, unit) : unit})</span>
                </label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={currentHighestBase === 0 ? '' : currentHighestBase}
                  placeholder="e.g. 20"
                  onChange={e => onEdit(_id, 'highestBasePrice', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                    !validBase && hasEdit ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-300'
                  }`}
                />
                {!validBase && hasEdit && (
                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                    <FiAlertCircle size={9} /> Base price must be greater than 0
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-medium">Variant Diff %</label>
                <input
                  type="number" min="0" max="50" step="0.5"
                  value={currentDiff}
                  onChange={e => onEdit(_id, 'variantDiffPercent', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                    !validDiff ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-300'
                  }`}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">% increase per smaller variant</p>
              </div>
            </div>

            {variants?.length > 0 && (
              <button
                onClick={() => onTogglePreview(_id)}
                className="mt-3 flex items-center gap-1.5 text-xs text-green-700 font-semibold"
              >
                {showPreview ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                {showPreview ? 'Hide' : 'Preview'} all {preview.length} variant prices
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Variant preview table (non-graded only) ── */}
      {!hasGrades && showPreview && preview.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">
            Calculated Variant Prices (preview — not saved yet)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 text-[10px]">
                  <th className="text-left pb-1.5 font-medium">Variant</th>
                  <th className="text-right pb-1.5 font-medium">Base ₹/unit</th>
                  <th className="text-right pb-1.5 font-medium">Sell ₹/unit</th>
                  <th className="text-right pb-1.5 font-medium">Pkg Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...preview].reverse().map((v, i) => {
                  const isHighest = i === 0;
                  const pkg = Math.round(Number(v.fromQty) * Number(v.finalPrice) * 100) / 100;
                  return (
                    <tr key={i} className={isHighest ? 'bg-green-50' : ''}>
                      <td className="py-1.5 font-medium text-gray-700 flex items-center gap-1.5">
                        {fmtRange(v, unit)}
                        {isHighest && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">← entered</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right text-gray-500">{fmt(v.basePrice)}</td>
                      <td className="py-1.5 text-right text-green-700 font-bold">{fmt(v.finalPrice)}</td>
                      <td className="py-1.5 text-right text-gray-600">₹{pkg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Charge %: {(product.procurementChargePercent ?? 0) + (product.platformChargePercent ?? 10) + (product.logisticsChargePercent ?? 10)}% total
            (Procurement {product.procurementChargePercent ?? 0}% + Platform {product.platformChargePercent ?? 10}% + Logistics {product.logisticsChargePercent ?? 10}%)
          </p>
        </div>
      )}
    </div>
  );
}

// ── Per-product Price History Drawer ─────────────────────────────────────────
function ProductHistoryDrawer({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/koyambedu/products/${product._id}/price-history?days=30`)
      .then(({ data }) => setHistory(data.history || data || []))
      .catch(() => toast.error('Could not load history'))
      .finally(() => setLoading(false));
  }, [product._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="font-black text-base flex items-center gap-2">
              📈 Price History
            </p>
            <p className="text-green-200 text-xs mt-0.5 font-semibold">{product.name} — last 30 days</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold leading-none">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <p className="text-3xl mb-2">📊</p>
              No price changes recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => {
                const prev   = Number(h.previousPrice || 0);
                const next   = Number(h.updatedPrice  || h.newPrice || 0);
                const diff   = prev > 0 ? ((next - prev) / prev * 100).toFixed(1) : null;
                const isUp   = next > prev;
                const isDown = next < prev;
                return (
                  <div key={h._id || i} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      isUp ? 'bg-red-100 text-red-600' : isDown ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isUp ? '↑' : isDown ? '↓' : '='}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        {prev > 0 && <span className="text-gray-400 line-through">{fmt(prev)}</span>}
                        <span className="font-black text-gray-800">{fmt(next)}</span>
                        {diff !== null && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            isUp ? 'bg-red-100 text-red-600' : isDown ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isUp ? '+' : ''}{diff}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.gradeKey && h.gradeKey !== 'base' && (
                          <span className="mr-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded capitalize">{h.gradeKey}</span>
                        )}
                        {h.updatedByName || '—'} ·{' '}
                        {new Date(h.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {h.source && (
                          <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                            {h.source.replace(/_/g, ' ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main exported panel ───────────────────────────────────────────────────────
/**
 * @param {string}  apiBase   e.g. '/koyambedu/seller-admin' or '/koyambedu/admin'
 * @param {Array}   saAdmins  optional: [{_id, businessName, name}] for admin SA filter
 */
export default function KoyambeduDailyPricePanel({ apiBase, saAdmins }) {
  const isAdmin = !!saAdmins;

  const [products,       setProducts]       = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [catFilter,      setCatFilter]      = useState('');
  const [saFilter,       setSaFilter]       = useState('');
  const [search,         setSearch]         = useState('');
  const [edits,          setEdits]          = useState({});
  const [previews,       setPreviews]       = useState({});
  const [bulkSaving,     setBulkSaving]     = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null); // product for history drawer

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/koyambedu/categories');
      setCategories(data.categories || []);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set('category', catFilter);
      if (isAdmin && saFilter) params.set('sellerAdmin', saFilter);
      const { data } = await api.get(`${apiBase}/daily-price?${params}`);
      setProducts(data.products || []);
      setEdits({});
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [apiBase, catFilter, saFilter, isAdmin]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { load(); }, [load]);

  /**
   * onEdit(id, field, val, gradeKey?)
   * For graded:     edits[id] = { grades: { premium: { highestBasePrice, variantDiffPercent }, ... } }
   * For non-graded: edits[id] = { highestBasePrice, variantDiffPercent }
   */
  const onEdit = (id, field, val, gradeKey = null) => {
    const product = products.find(p => p._id === id) || {};
    setEdits(prev => {
      if (gradeKey) {
        const gradeRow   = product.gradeRows?.find(g => g.gradeKey === gradeKey) || {};
        const prevGrades = prev[id]?.grades || {};
        const prevG      = prevGrades[gradeKey] || {};
        return {
          ...prev,
          [id]: {
            ...prev[id],
            grades: {
              ...prevGrades,
              [gradeKey]: {
                highestBasePrice:   field === 'highestBasePrice'   ? Number(val) : (prevG.highestBasePrice   ?? (gradeRow.highestVariant?.basePrice || 0)),
                variantDiffPercent: field === 'variantDiffPercent' ? Number(val) : (prevG.variantDiffPercent ?? (gradeRow.variantDiffPercent || 2)),
              },
            },
          },
        };
      }
      return {
        ...prev,
        [id]: {
          highestBasePrice:   field === 'highestBasePrice'   ? Number(val) : (prev[id]?.highestBasePrice   ?? (product.highestVariant?.basePrice || 0)),
          variantDiffPercent: field === 'variantDiffPercent' ? Number(val) : (prev[id]?.variantDiffPercent ?? (product.variantDiffPercent || 2)),
        },
      };
    });
    if (!previews[id]) setPreviews(prev => ({ ...prev, [id]: true }));
  };

  const onTogglePreview = (id) =>
    setPreviews(prev => ({ ...prev, [id]: !prev[id] }));

  const changedCount   = Object.keys(edits).length;
  const filteredProducts = products.filter(p =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.nameTamil || '').toLowerCase().includes(search.toLowerCase())
  );

  const saveAll = async () => {
    if (!changedCount) { toast('No changes to save'); return; }

    const updates    = [];
    let invalidCount = 0;

    for (const [productId, e] of Object.entries(edits)) {
      if (e.grades) {
        for (const [gradeKey, ge] of Object.entries(e.grades)) {
          if (!ge.highestBasePrice || Number(ge.highestBasePrice) <= 0) { invalidCount++; continue; }
          updates.push({ productId, gradeKey, highestBasePrice: ge.highestBasePrice, variantDiffPercent: ge.variantDiffPercent });
        }
      } else {
        if (!e.highestBasePrice || Number(e.highestBasePrice) <= 0) { invalidCount++; continue; }
        updates.push({ productId, highestBasePrice: e.highestBasePrice, variantDiffPercent: e.variantDiffPercent });
      }
    }

    if (invalidCount > 0) {
      toast.error(`${invalidCount} entry(s) have invalid base price`);
      if (!updates.length) return;
    }
    if (!updates.length) { toast('No valid changes to save'); return; }

    setBulkSaving(true);
    try {
      await api.post(`${apiBase}/daily-price/bulk`, { updates });
      toast.success(`✅ ${updates.length} price${updates.length > 1 ? 's' : ''} updated`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [['Name', 'Seller Admin', 'Category', 'Highest Variant Base ₹', 'Variant Diff %', 'Last Updated']];
    products.forEach(p => {
      const e      = edits[p._id] || {};
      const base   = e.highestBasePrice  ?? (p.highestVariant?.basePrice || 0);
      const diff   = e.variantDiffPercent ?? (p.variantDiffPercent || 2);
      const saName = p.seller?.businessName || p.seller?.name || '—';
      const catN   = p.category?.name || '—';
      const upd    = p.priceUpdatedAt ? new Date(p.priceUpdatedAt).toLocaleDateString('en-IN') : '—';
      rows.push([p.name, saName, catN, base, diff, upd]);
    });
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `koyambedu-prices-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* ── History Drawer ── */}
      {historyProduct && (
        <ProductHistoryDrawer
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {/* ── Search Bar ── */}
      <div className="relative">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vegetable by name…"
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <FiX size={14} />
          </button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* SA filter (admin only) */}
        {isAdmin && (
          <select
            value={saFilter}
            onChange={e => setSaFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none"
          >
            <option value="">All Seller Admins</option>
            {(saAdmins || []).map(sa => (
              <option key={sa._id} value={sa._id}>{sa.businessName || sa.name}</option>
            ))}
          </select>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <FiFilter size={13} className="text-gray-400 shrink-0" />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 shrink-0">
          <FiRefreshCw size={12} /> Refresh
        </button>

        <button
          onClick={saveAll}
          disabled={bulkSaving || !changedCount}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition disabled:opacity-40 shrink-0"
        >
          {bulkSaving
            ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            : <><FiSave size={12} /> Update Prices {changedCount > 0 ? `(${changedCount})` : ''}</>}
        </button>

        {isAdmin && (
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-green-600 text-green-700 rounded-xl hover:bg-green-50 shrink-0">
            <FiDownload size={12} /> Export CSV
          </button>
        )}
      </div>

      {lastUpdated && (
        <p className="text-xs text-green-700 font-medium flex items-center gap-1">
          <FiClock size={11} /> Loaded at {fmtTime(lastUpdated)}
        </p>
      )}

      {/* ── Info banner ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
        <strong>How it works:</strong> Enter the base (wholesale) price for the{' '}
        <strong>highest quantity variant</strong> of each product.
        The system automatically calculates prices for all smaller variants using the Variant Diff %.
        Commission is not editable here — change it in Product Edit.
      </div>

      {/* ── Product list ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-7 h-7 border-4 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
          Loading products…
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-semibold text-gray-500 mb-1">No active products found</p>
          <p className="text-xs">Try selecting a different category or check product status</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.length === 0 && search.trim() ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No products match "<span className="font-medium text-gray-600">{search}</span>"
            </div>
          ) : filteredProducts.map(p => (
            <ProductRow
              key={p._id}
              product={p}
              edit={edits[p._id]}
              onEdit={onEdit}
              showPreview={!!previews[p._id]}
              onTogglePreview={onTogglePreview}
              onShowHistory={setHistoryProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
