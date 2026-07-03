// ============================================
// KOYAMBEDU — Daily Price Update Panel (v2)
// Seller Admin: variant-first pricing table
//   • Enter base price ONCE for the highest qty variant
//   • System auto-calculates all smaller variant prices
//   • Category filter
//   • Bulk "Update Prices" button
// ============================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiRefreshCw, FiSave, FiClock, FiChevronDown, FiChevronUp,
  FiCheck, FiFilter, FiAlertCircle,
} from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────
const fmt  = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Client-side variant price preview (mirrors variantPricingService on backend).
 * Returns an array ordered by fromQty ASC with { fromQty, toQty, basePrice, finalPrice }.
 */
function previewVariants(variants, highestBasePrice, variantDiffPercent, chargePercents) {
  if (!variants || !variants.length) return [];
  const totalCharge = (chargePercents.procurement || 15) + (chargePercents.platform || 10) + (chargePercents.logistics || 10);
  const diff = 1 - (Number(variantDiffPercent) || 0) / 100;

  const sorted = [...variants].sort((a, b) => Number(b.fromQty) - Number(a.fromQty));
  let running = Number(highestBasePrice) || 0;

  const result = sorted.map(v => {
    const basePrice  = Math.round(running * 100) / 100;
    const finalPrice = Math.round(running * (1 + totalCharge / 100) * 100) / 100;
    running = running * diff;
    return { ...v, basePrice, finalPrice };
  });

  return result.sort((a, b) => Number(a.fromQty) - Number(b.fromQty));
}

// Format qty for display: 0.25 → "250 g", 0.5 → "500 g", 1 → "1 kg", 5 → "5 kg"
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

// ── ProductRow ─────────────────────────────────────────────────────────
function ProductRow({ product, edit, onEdit, showPreview, onTogglePreview }) {
  const { _id, name, nameTamil, unit, variants, variantDiffPercent: savedDiff,
          procurementChargePercent: proc, platformChargePercent: plat, logisticsChargePercent: log,
          highestVariant, priceUpdatedAt, category } = product;

  const currentHighestBase = edit?.highestBasePrice ?? (highestVariant?.basePrice || 0);
  const currentDiff        = edit?.variantDiffPercent ?? (savedDiff || 2);
  const hasEdit            = !!edit;

  const preview = useMemo(
    () => previewVariants(variants, currentHighestBase, currentDiff, { procurement: proc, platform: plat, logistics: log }),
    [variants, currentHighestBase, currentDiff, proc, plat, log]
  );

  const highestQtyVariant = preview.length ? preview[preview.length - 1] : null;

  const validBase = Number(currentHighestBase) > 0;
  const validDiff = Number(currentDiff) >= 0 && Number(currentDiff) <= 50;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${hasEdit ? 'border-green-400 shadow-md' : 'border-gray-200'}`}>
      {/* ── Header row ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{name}</p>
            {nameTamil && <p className="text-[11px] text-gray-400 mt-0.5">{nameTamil}</p>}
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
              {category?.name && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{category.name}</span>}
              {priceUpdatedAt && (
                <span className="flex items-center gap-0.5">
                  <FiClock size={9} /> {fmtTime(priceUpdatedAt)}
                </span>
              )}
            </p>
          </div>
          {/* Highest variant chip */}
          {highestQtyVariant && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-400">Highest variant</p>
              <p className="text-xs font-bold text-green-700">{fmtRange(highestQtyVariant, unit)}</p>
            </div>
          )}
        </div>

        {/* ── Input row: Base Price + Variant Diff % ── */}
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
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">
              Variant Diff %
            </label>
            <input
              type="number" min="0" max="50" step="0.5"
              value={currentDiff}
              onChange={e => onEdit(_id, 'variantDiffPercent', e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                !validDiff ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-300'
              }`}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">% reduction per smaller variant</p>
          </div>
        </div>

        {/* ── Preview toggle ── */}
        {variants?.length > 0 && (
          <button
            onClick={() => onTogglePreview(_id)}
            className="mt-3 flex items-center gap-1.5 text-xs text-green-700 font-semibold"
          >
            {showPreview ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
            {showPreview ? 'Hide' : 'Preview'} all {preview.length} variant prices
          </button>
        )}
      </div>

      {/* ── Variant preview table ── */}
      {showPreview && preview.length > 0 && (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...preview].reverse().map((v, i) => {
                  const isHighest = i === 0;
                  return (
                    <tr key={i} className={isHighest ? 'bg-green-50' : ''}>
                      <td className="py-1.5 font-medium text-gray-700 flex items-center gap-1.5">
                        {fmtRange(v, unit)}
                        {isHighest && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                            ← entered
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right text-gray-500">{fmt(v.basePrice)}</td>
                      <td className="py-1.5 text-right text-green-700 font-bold">{fmt(v.finalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Charge %: {(product.procurementChargePercent || 15) + (product.platformChargePercent || 10) + (product.logisticsChargePercent || 10)}% total
            (Procurement {product.procurementChargePercent || 15}% + Platform {product.platformChargePercent || 10}% + Logistics {product.logisticsChargePercent || 10}%)
          </p>
        </div>
      )}
    </div>
  );
}

// ── DailyPriceTab ──────────────────────────────────────────────────────
function DailyPriceTab() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [catFilter, setCatFilter]   = useState('');
  const [edits, setEdits]           = useState({});       // { [productId]: { highestBasePrice, variantDiffPercent } }
  const [previews, setPreviews]     = useState({});       // { [productId]: boolean }
  const [bulkSaving, setBulkSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

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
      const { data } = await api.get(`/koyambedu/seller-admin/daily-price?${params}`);
      setProducts(data.products || []);
      setEdits({});
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [catFilter]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { load(); }, [load]);

  const onEdit = (id, field, val) => {
    const product = products.find(p => p._id === id) || {};
    setEdits(prev => ({
      ...prev,
      [id]: {
        highestBasePrice:   field === 'highestBasePrice'   ? Number(val) : (prev[id]?.highestBasePrice   ?? (product.highestVariant?.basePrice || 0)),
        variantDiffPercent: field === 'variantDiffPercent' ? Number(val) : (prev[id]?.variantDiffPercent ?? (product.variantDiffPercent || 2)),
      },
    }));
    // Auto-show preview when user types
    if (!previews[id]) setPreviews(prev => ({ ...prev, [id]: true }));
  };

  const onTogglePreview = (id) =>
    setPreviews(prev => ({ ...prev, [id]: !prev[id] }));

  const changedCount = Object.keys(edits).length;

  const saveAll = async () => {
    // Validate
    const invalid = Object.entries(edits).filter(([, e]) => !e.highestBasePrice || Number(e.highestBasePrice) <= 0);
    if (invalid.length) {
      toast.error(`${invalid.length} product(s) have invalid base price`);
      return;
    }
    if (!changedCount) { toast('No changes to save'); return; }

    setBulkSaving(true);
    try {
      const updates = Object.entries(edits).map(([productId, e]) => ({
        productId,
        highestBasePrice:   e.highestBasePrice,
        variantDiffPercent: e.variantDiffPercent,
      }));
      await api.post('/koyambedu/seller-admin/daily-price/bulk', { updates });
      toast.success(`✅ ${changedCount} product${changedCount > 1 ? 's' : ''} updated`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const editedIds = new Set(Object.keys(edits));

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
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
            : <><FiSave size={12} /> Update Prices {changedCount > 0 ? `(${changedCount})` : ''}</>
          }
        </button>
      </div>

      {lastUpdated && (
        <p className="text-xs text-green-700 font-medium flex items-center gap-1">
          <FiClock size={11} /> Loaded at {fmtTime(lastUpdated)}
        </p>
      )}

      {/* ── Info banner ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
        <strong>How it works:</strong> Enter the base (wholesale) price for the <strong>highest quantity variant</strong> of each product.
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
          {products.map(p => (
            <ProductRow
              key={p._id}
              product={p}
              edit={edits[p._id]}
              onEdit={onEdit}
              showPreview={!!previews[p._id]}
              onTogglePreview={onTogglePreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Price History ─────────────────────────────────────────────────
function PriceHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange]     = useState('7');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from && to) { params.set('from', from); params.set('to', to); }
      else params.set('days', range);
      const { data } = await api.get(`/koyambedu/seller-admin/price-history?${params}`);
      setHistory(data.history || []);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }, [range, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {['7', '30'].map(d => (
          <button key={d} onClick={() => { setRange(d); setFrom(''); setTo(''); }}
            className={`px-3 py-1.5 text-xs rounded-full border ${range === d && !from ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Last {d} Days
          </button>
        ))}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1" />
          <button onClick={load} className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs">Go</button>
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Prev ₹</th>
                <th className="px-3 py-2 text-right">New ₹</th>
                <th className="px-3 py-2 text-right">Diff %</th>
                <th className="px-3 py-2 text-left">By</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{h.productName || h.product?.name}</p>
                    <p className="text-xs text-gray-400">{h.productCode}</p>
                  </td>
                  <td className="px-3 py-2 text-right text-red-500">{fmt(h.previousPrice)}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-semibold">{fmt(h.updatedPrice)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 text-xs">
                    {h.variantDiffPct != null ? `${h.variantDiffPct}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{h.updatedByName || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      h.source === 'forecast_approved' ? 'bg-purple-100 text-purple-700' :
                      h.source === 'bulk_update'       ? 'bg-blue-100 text-blue-700'   : 'bg-gray-100 text-gray-600'
                    }`}>{(h.source || '').replace('_', ' ')}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {new Date(h.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {!history.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No history for selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Forecast Price ────────────────────────────────────────────────
function ForecastTab() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [forecasts, setForecasts] = useState({});
  const [saving, setSaving]       = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/seller-admin/forecast');
      setProducts(data.products || []);
    } catch { toast.error('Failed to load forecasts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setForecast = async (p) => {
    const fp = forecasts[p._id];
    if (!fp || Number(fp) <= 0) { toast.error('Enter a valid forecast price'); return; }
    setSaving(prev => ({ ...prev, [p._id]: 'set' }));
    try {
      await api.patch(`/koyambedu/seller-admin/forecast/${p._id}`, { forecastPrice: Number(fp) });
      toast.success(`Forecast set for ${p.name}`);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(prev => ({ ...prev, [p._id]: null })); }
  };

  const approve = async (p) => {
    setSaving(prev => ({ ...prev, [p._id]: 'approve' }));
    try {
      const { data } = await api.post(`/koyambedu/seller-admin/forecast/${p._id}/approve`);
      toast.success(data.message);
      load();
    } catch { toast.error('Failed to approve'); }
    finally { setSaving(prev => ({ ...prev, [p._id]: null })); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Set forecast prices for tomorrow. Once approved, forecast becomes today's selling price.</p>
      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.productCode || '—'} · {p.seller?.name}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-gray-400">Current: <strong className="text-gray-700">{fmt(p.currentPrice)}</strong></p>
                  {p.forecastPrice > 0 && (
                    <p className={`font-semibold ${p.forecastApproved ? 'text-green-600' : 'text-orange-500'}`}>
                      Forecast: {fmt(p.forecastPrice)} {p.forecastApproved ? '✅' : '⏳'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="Set forecast price"
                  value={forecasts[p._id] || ''}
                  onChange={e => setForecasts(prev => ({ ...prev, [p._id]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 focus:outline-none" />
                <button onClick={() => setForecast(p)} disabled={!!saving[p._id]}
                  className="px-3 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving[p._id] === 'set' ? '…' : 'Set'}
                </button>
                {p.forecastPrice > 0 && !p.forecastApproved && (
                  <button onClick={() => approve(p)} disabled={!!saving[p._id]}
                    className="flex items-center gap-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    <FiCheck size={12} /> {saving[p._id] === 'approve' ? '…' : 'Approve'}
                  </button>
                )}
                {p.forecastApproved && (
                  <span className="flex items-center gap-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg">
                    <FiCheck size={12} /> Applied
                  </span>
                )}
              </div>
            </div>
          ))}
          {!products.length && <p className="text-center text-gray-400 py-8">No products found.</p>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'daily',    label: "Today's Prices", icon: '🏷️' },
  { key: 'forecast', label: 'Forecast',        icon: '🔮' },
  { key: 'history',  label: 'Price History',   icon: '📈' },
];

export default function KoyambeduDailyPrice() {
  const [tab, setTab] = useState('daily');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            🏷️ Daily Price Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter the highest-variant base price — all variants are auto-calculated
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {tab === 'daily'    && <DailyPriceTab />}
          {tab === 'forecast' && <ForecastTab />}
          {tab === 'history'  && <PriceHistoryTab />}
        </div>
      </div>
    </div>
  );
}
