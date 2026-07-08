// ============================================
// KOYAMBEDU — Daily Price Update Page (v2)
// Seller Admin: uses shared KoyambeduDailyPricePanel for the "Today's Prices" tab
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import KoyambeduDailyPricePanel from '../../../components/koyambedu/KoyambeduDailyPricePanel';

// DailyPriceTab is now the shared panel component
// (helpers, GradeInputBlock, ProductRow, and DailyPriceTab have been extracted
//  into src/components/koyambedu/KoyambeduDailyPricePanel.jsx)

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
          {tab === 'daily'    && <KoyambeduDailyPricePanel apiBase='/koyambedu/seller-admin' />}
          {tab === 'forecast' && <ForecastTab />}
          {tab === 'history'  && <PriceHistoryTab />}
        </div>
      </div>
    </div>
  );
}
