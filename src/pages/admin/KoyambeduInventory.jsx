import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const inr = n => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS = ['purchases', 'wastage', 'balance', 'profit'];
const TAB_LABEL = { purchases: '🛒 Purchases', wastage: '🗑️ Wastage', balance: '📦 Inventory Balance', profit: '📊 Profit Report' };

export default function KoyambeduInventory() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('purchases');
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    api.get('/koyambedu/inventory/products').then(({ data }) => setProducts(data.products || [])).catch(() => {});
    api.get('/koyambedu/inventory/sellers').then(({ data }) => setSellers(data.sellers || [])).catch(() => {});
  }, []);

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-bold text-gray-800">Super Admin access required</p>
          <button onClick={() => navigate('/admin/koyambedu')} className="mt-4 text-sm text-green-700 font-bold">← Back to Koyambedu Admin</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/admin/koyambedu')} className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-lg">Inventory &amp; Profit — Koyambedu Daily</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'purchases' && <PurchasesTab products={products} sellers={sellers} />}
        {tab === 'wastage'   && <WastageTab products={products} />}
        {tab === 'balance'   && <BalanceTab />}
        {tab === 'profit'    && <ProfitTab />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PURCHASES TAB
// ══════════════════════════════════════════════
function PurchasesTab({ products, sellers }) {
  const [form, setForm] = useState({ purchaseDate: todayISO(), product: '', category: 'vegetable', seller: '', sellerName: '', quantity: '', costPricePerUnit: '', transportCharge: '', loadingCharge: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ from: firstOfMonthISO(), to: todayISO() });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/inventory/purchases', { params: filters });
      setRows(data.purchases || []);
      setSummary(data.summary || null);
    } catch { toast.error('Failed to load purchases'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.product) return toast.error('Select a product');
    if (!(Number(form.quantity) > 0)) return toast.error('Enter quantity');
    if (!(Number(form.costPricePerUnit) >= 0)) return toast.error('Enter cost price');
    setSaving(true);
    try {
      await api.post('/koyambedu/inventory/purchases', form);
      toast.success('Purchase recorded');
      setForm(f => ({ ...f, quantity: '', costPricePerUnit: '', transportCharge: '', loadingCharge: '', notes: '' }));
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!window.confirm('Delete this purchase entry?')) return;
    try { await api.delete(`/koyambedu/inventory/purchases/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      {/* Entry form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="font-bold text-gray-800 text-sm mb-3">Log a Purchase</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-1" />
          <select value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 sm:col-span-1">
            <option value="">Select Product…</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>)}
          </select>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="vegetable">Vegetable</option>
            <option value="fruit">Fruit</option>
            <option value="other">Other</option>
          </select>
          <select value={form.seller} onChange={e => setForm(f => ({ ...f, seller: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">No registered seller…</option>
            {sellers.map(s => <option key={s._id} value={s._id}>{s.businessName}</option>)}
          </select>
        </div>
        {!form.seller && (
          <input placeholder="Vendor / mandi name (optional)" value={form.sellerName}
            onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2" />
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <input type="number" min="0" step="0.01" placeholder="Quantity" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <input type="number" min="0" step="0.01" placeholder="Cost price / unit (₹)" value={form.costPricePerUnit}
            onChange={e => setForm(f => ({ ...f, costPricePerUnit: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <input type="number" min="0" step="0.01" placeholder="Transport charge (₹)" value={form.transportCharge}
            onChange={e => setForm(f => ({ ...f, transportCharge: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <input type="number" min="0" step="0.01" placeholder="Loading charge (₹)" value={form.loadingCharge}
            onChange={e => setForm(f => ({ ...f, loadingCharge: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />
        <button onClick={submit} disabled={saving}
          className="bg-green-600 text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50">
          {saving ? 'Saving…' : '+ Add Purchase'}
        </button>
        {form.quantity && form.costPricePerUnit && (
          <p className="text-xs text-gray-400 mt-2">Total cost: {inr(Number(form.quantity) * Number(form.costPricePerUnit))}</p>
        )}
      </div>

      {/* Filters + list */}
      <DateRangeFilter filters={filters} setFilters={setFilters} />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Total Qty" value={summary.totalQty?.toFixed(2)} />
          <StatCard label="Total Cost" value={inr(summary.totalCost)} />
          <StatCard label="Transport" value={inr(summary.totalTransport)} />
          <StatCard label="Loading" value={inr(summary.totalLoading)} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <p className="text-center text-gray-400 text-xs py-8">Loading…</p> : rows.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-8">No purchase entries for this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Seller</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">₹/Unit</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">Transport+Load</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r._id}>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-3 py-2 font-semibold">{r.productName}</td>
                    <td className="px-3 py-2 text-gray-500">{r.seller?.businessName || r.sellerName || '—'}</td>
                    <td className="px-3 py-2 text-right">{r.quantity} {r.unit}</td>
                    <td className="px-3 py-2 text-right">₹{r.costPricePerUnit}</td>
                    <td className="px-3 py-2 text-right font-bold">{inr(r.totalCost)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{inr((r.transportCharge || 0) + (r.loadingCharge || 0))}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(r._id)} className="text-red-500 font-bold">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// WASTAGE TAB
// ══════════════════════════════════════════════
function WastageTab({ products }) {
  const [form, setForm] = useState({ wastageDate: todayISO(), product: '', category: 'vegetable', quantity: '', reason: 'spoilage', notes: '' });
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ from: firstOfMonthISO(), to: todayISO() });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/inventory/wastage', { params: filters });
      setRows(data.wastage || []);
      setSummary(data.summary || null);
    } catch { toast.error('Failed to load wastage log'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.product) return toast.error('Select a product');
    if (!(Number(form.quantity) > 0)) return toast.error('Enter quantity');
    setSaving(true);
    try {
      await api.post('/koyambedu/inventory/wastage', form);
      toast.success('Wastage recorded');
      setForm(f => ({ ...f, quantity: '', notes: '' }));
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!window.confirm('Delete this wastage entry?')) return;
    try { await api.delete(`/koyambedu/inventory/wastage/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="font-bold text-gray-800 text-sm mb-3">Log Wastage</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <input type="date" value={form.wastageDate} onChange={e => setForm(f => ({ ...f, wastageDate: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <select value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 sm:col-span-1">
            <option value="">Select Product…</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>)}
          </select>
          <input type="number" min="0" step="0.01" placeholder="Quantity" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="spoilage">Spoilage</option>
            <option value="damage">Damage</option>
            <option value="quality_reject">Quality Reject</option>
            <option value="expired">Expired</option>
            <option value="excess_unsold">Excess Unsold</option>
            <option value="other">Other</option>
          </select>
        </div>
        <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />
        <button onClick={submit} disabled={saving}
          className="bg-red-500 text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50">
          {saving ? 'Saving…' : '+ Add Wastage'}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">Cost impact is auto-calculated from the weighted-average purchase price recorded so far.</p>
      </div>

      <DateRangeFilter filters={filters} setFilters={setFilters} />

      {summary && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Qty Wasted" value={summary.totalQty?.toFixed(2)} />
          <StatCard label="Total Cost Impact" value={inr(summary.totalCost)} tone="red" />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <p className="text-center text-gray-400 text-xs py-8">Loading…</p> : rows.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-8">No wastage entries for this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Reason</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Cost Impact</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r._id}>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.wastageDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-3 py-2 font-semibold">{r.productName}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{r.reason.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-right">{r.quantity} {r.unit}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-500">{inr(r.totalCostImpact)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(r._id)} className="text-red-500 font-bold">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// INVENTORY BALANCE TAB
// ══════════════════════════════════════════════
function BalanceTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/inventory/balance', { params: category ? { category } : {} });
      setRows(data.rows || []);
    } catch { toast.error('Failed to load balance'); }
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
          <option value="">All Categories</option>
          <option value="vegetable">Vegetable</option>
          <option value="fruit">Fruit</option>
          <option value="other">Other</option>
        </select>
        <button onClick={load} className="text-xs font-bold text-green-700 border border-green-200 px-3 py-2 rounded-xl">Refresh</button>
      </div>
      <p className="text-[11px] text-gray-400">Balance = Total Purchased − Total Wasted − Total Sold (confirmed/delivered orders). Computed live — nothing here affects checkout stock checks.</p>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <p className="text-center text-gray-400 text-xs py-8">Loading…</p> : rows.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-8">No purchase/wastage/sales data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-right px-3 py-2">Purchased</th>
                  <th className="text-right px-3 py-2">Wasted</th>
                  <th className="text-right px-3 py-2">Sold</th>
                  <th className="text-right px-3 py-2">Balance</th>
                  <th className="text-right px-3 py-2">Avg Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.productId}>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2 text-right">{r.purchasedQty} {r.unit}</td>
                    <td className="px-3 py-2 text-right text-red-500">{r.wastedQty} {r.unit}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{r.soldQty} {r.unit}</td>
                    <td className={`px-3 py-2 text-right font-bold ${r.balanceQty < 0 ? 'text-red-600' : 'text-green-700'}`}>{r.balanceQty} {r.unit}</td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{r.avgCostPerUnit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PROFIT REPORT TAB
// ══════════════════════════════════════════════
function ProfitTab() {
  const [filters, setFilters] = useState({ from: firstOfMonthISO(), to: todayISO() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('item'); // 'item' | 'customer'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/inventory/profit-report', { params: filters });
      setData(data);
    } catch { toast.error('Failed to load profit report'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const quickRange = (days) => {
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - (days - 1));
    setFilters({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter filters={filters} setFilters={setFilters} />
        <div className="flex gap-1">
          <button onClick={() => quickRange(1)} className="text-xs font-bold text-gray-600 border border-gray-200 px-2 py-2 rounded-xl">Today</button>
          <button onClick={() => quickRange(7)} className="text-xs font-bold text-gray-600 border border-gray-200 px-2 py-2 rounded-xl">7 Days</button>
          <button onClick={() => quickRange(30)} className="text-xs font-bold text-gray-600 border border-gray-200 px-2 py-2 rounded-xl">30 Days</button>
        </div>
      </div>

      {loading ? <p className="text-center text-gray-400 text-xs py-8">Loading…</p> : !data ? null : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatCard label="Revenue" value={inr(data.summary.totalRevenue)} tone="blue" />
            <StatCard label="COGS (Purchase Cost)" value={inr(data.summary.totalCogs)} />
            <StatCard label="Wastage Cost" value={inr(data.summary.totalWastageCost)} tone="red" />
            <StatCard label="Transport + Packing" value={inr(data.summary.totalOverhead)} />
            <StatCard label="Gross Profit" value={inr(data.summary.grossProfit)} tone="blue" />
            <StatCard label={`Net Profit (${data.summary.orderCount} orders)`} value={inr(data.summary.netProfit)} tone={data.summary.netProfit >= 0 ? 'green' : 'red'} />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setView('item')} className={`text-xs font-bold px-3 py-1.5 rounded-xl ${view === 'item' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Item-wise</button>
            <button onClick={() => setView('customer')} className={`text-xs font-bold px-3 py-1.5 rounded-xl ${view === 'customer' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Customer-wise</button>
          </div>

          {view === 'item' ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {data.itemWise.length === 0 ? <p className="text-center text-gray-400 text-xs py-8">No sales in this range.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Item</th>
                        <th className="text-right px-3 py-2">Qty Sold</th>
                        <th className="text-right px-3 py-2">Revenue</th>
                        <th className="text-right px-3 py-2">COGS</th>
                        <th className="text-right px-3 py-2">Wastage</th>
                        <th className="text-right px-3 py-2">Net Profit</th>
                        <th className="text-right px-3 py-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.itemWise.map(it => (
                        <tr key={it.productId || it.name}>
                          <td className="px-3 py-2 font-semibold">{it.name}</td>
                          <td className="px-3 py-2 text-right">{it.qty} {it.unit || ''}</td>
                          <td className="px-3 py-2 text-right">{inr(it.revenue)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{inr(it.cogs)}</td>
                          <td className="px-3 py-2 text-right text-red-500">{it.wastageCost ? inr(it.wastageCost) : '—'}</td>
                          <td className={`px-3 py-2 text-right font-bold ${it.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{inr(it.netProfit)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{it.marginPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {data.customerWise.length === 0 ? <p className="text-center text-gray-400 text-xs py-8">No sales in this range.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Customer</th>
                        <th className="text-right px-3 py-2">Orders</th>
                        <th className="text-right px-3 py-2">Revenue</th>
                        <th className="text-right px-3 py-2">COGS</th>
                        <th className="text-right px-3 py-2">Transport+Pack</th>
                        <th className="text-right px-3 py-2">Net Profit</th>
                        <th className="text-right px-3 py-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.customerWise.map(c => (
                        <tr key={c.customerId}>
                          <td className="px-3 py-2 font-semibold">{c.name}<br /><span className="text-gray-400 font-normal">{c.phone}</span></td>
                          <td className="px-3 py-2 text-right">{c.orderCount}</td>
                          <td className="px-3 py-2 text-right">{inr(c.revenue)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{inr(c.cogs)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{inr(c.overhead)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${c.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{inr(c.netProfit)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{c.marginPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-gray-400">Wastage cost is product-level only (it isn&apos;t tied to a specific customer sale), so it&apos;s excluded from customer-wise figures but included in item-wise and the overall summary.</p>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Shared bits
// ══════════════════════════════════════════════
function DateRangeFilter({ filters, setFilters }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
      <span className="text-gray-400 text-xs">to</span>
      <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneCls = { blue: 'bg-blue-50 border-blue-200', red: 'bg-red-50 border-red-200', green: 'bg-green-50 border-green-200' }[tone] || 'bg-gray-50 border-gray-200';
  return (
    <div className={`rounded-2xl border p-3 ${toneCls}`}>
      <p className="text-base font-black text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
