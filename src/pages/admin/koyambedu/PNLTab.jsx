// ============================================
// KOYAMBEDU ADMIN — DAILY PROFIT & LOSS TAB
// ============================================
// Mirrors the business's existing manual Excel P&L: revenue per order comes
// straight from what the customer was billed; cost is the supplier purchase
// price (entered here, per product per day), a share of the day's loadman
// charge (entered here, once per day, split by quantity), and per-order
// platform/transport/packing/Razorpay costs (also entered here). Computed
// server-side in adminPnLDay/adminPnLSummary — this tab is read + edit UI.
// Standalone: its own endpoints (/koyambedu/admin/pnl/*), doesn't touch the
// existing Procurement or Orders tabs' own data flows.
import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Default range = current quarter (Jan-Mar / Apr-Jun / Jul-Sep / Oct-Dec)
function currentQuarterRange() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const to = new Date(now.getFullYear(), q * 3 + 3, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const money = (n) => `₹${(Number(n) || 0).toFixed(2)}`;
const ProfitBadge = ({ value, size = 'base' }) => {
  const loss = value < 0;
  const cls = loss ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50';
  const sizeCls = size === 'lg' ? 'text-2xl px-4 py-2' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-block font-bold rounded-xl ${cls} ${sizeCls}`}>
      {loss ? 'Loss ' : 'Profit '}{money(Math.abs(value))}
    </span>
  );
};

export default function PNLTab() {
  const [view, setView] = useState('day'); // 'day' | 'range'

  // ── Day view state ──────────────────────────
  const [cycle, setCycle] = useState(todayStr());
  const [dayReport, setDayReport] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [loadmanDraft, setLoadmanDraft] = useState('');
  const [savingLoadman, setSavingLoadman] = useState(false);
  const [costDrafts, setCostDrafts] = useState({}); // productKey -> purchaseCostPerUnit draft
  const [savingCost, setSavingCost] = useState({}); // productKey -> bool
  const [orderCostDrafts, setOrderCostDrafts] = useState({}); // orderId -> { platformFeeCost, transportCost, packingCost, razorpayDeduction }
  const [savingOrderCost, setSavingOrderCost] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);

  // ── Range view state ────────────────────────
  const initialRange = currentQuarterRange();
  const [rangeFrom, setRangeFrom] = useState(initialRange.from);
  const [rangeTo, setRangeTo] = useState(initialRange.to);
  const [rangeReport, setRangeReport] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/pnl/day?cycle=${cycle}`);
      setDayReport(data);
      setLoadmanDraft(String(data.loadmanCharge || ''));
    } catch {
      toast.error('Failed to load P&L for this date');
    } finally { setDayLoading(false); }
  }, [cycle]);

  useEffect(() => { if (view === 'day') loadDay(); }, [view, loadDay]);

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/pnl/summary?from=${rangeFrom}&to=${rangeTo}`);
      setRangeReport(data);
    } catch {
      toast.error('Failed to load P&L summary');
    } finally { setRangeLoading(false); }
  }, [rangeFrom, rangeTo]);

  useEffect(() => { if (view === 'range') loadRange(); }, [view, loadRange]);

  const saveLoadman = async () => {
    setSavingLoadman(true);
    try {
      await api.patch('/koyambedu/admin/pnl/daily-expense', { cycle, loadmanCharge: Number(loadmanDraft) || 0 });
      toast.success('Loadman charge saved');
      loadDay();
    } catch {
      toast.error('Failed to save loadman charge');
    } finally { setSavingLoadman(false); }
  };

  const saveCost = async (row) => {
    const draft = costDrafts[row.productKey];
    if (draft === undefined) return;
    setSavingCost(s => ({ ...s, [row.productKey]: true }));
    try {
      await api.patch('/koyambedu/admin/reports/procurement-confirmed/item', {
        cycle, productKey: row.productKey, productName: row.productName,
        gradeKey: row.gradeKey, gradeName: row.gradeName,
        purchaseCostPerUnit: draft === '' ? null : Number(draft),
        purchased: true, // records the current logged-in admin as "procured by"
      });
      toast.success(`${row.productName} cost saved`);
      loadDay();
    } catch {
      toast.error('Failed to save cost');
    } finally { setSavingCost(s => ({ ...s, [row.productKey]: false })); }
  };

  const saveOrderCosts = async (order) => {
    const draft = orderCostDrafts[order._id] || {};
    setSavingOrderCost(s => ({ ...s, [order._id]: true }));
    try {
      await api.patch(`/koyambedu/admin/orders/${order._id}/costs`, {
        transportCharge:   draft.transportCost   ?? order.transportCost,
        packingCharge:     draft.packingCost     ?? order.packingCost,
        platformFeeCost:   draft.platformFeeCost ?? order.platformFeeCost,
        razorpayDeduction: draft.razorpayDeduction ?? order.razorpayDeduction,
      });
      toast.success(`${order.orderId} costs saved`);
      loadDay();
    } catch {
      toast.error('Failed to save order costs');
    } finally { setSavingOrderCost(s => ({ ...s, [order._id]: false })); }
  };

  const exportRange = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/koyambedu/admin/pnl/export?from=${rangeFrom}&to=${rangeTo}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `koyambedu-pnl-${rangeFrom}-to-${rangeTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel downloaded!');
    } catch {
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-gray-800">💰 Profit &amp; Loss</h2>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => setView('day')}
              className={`px-4 py-1.5 text-sm font-bold ${view === 'day' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>
              Bill-wise (Day)
            </button>
            <button onClick={() => setView('range')}
              className={`px-4 py-1.5 text-sm font-bold ${view === 'range' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>
              Quarter / Range
            </button>
          </div>
        </div>
      </div>

      {view === 'day' ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Date</label>
                <input type="date" value={cycle} onChange={e => setCycle(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={loadDay} disabled={dayLoading}
                className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {dayLoading ? 'Loading…' : 'Search'}
              </button>

              <div className="ml-auto flex items-end gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Total loadman charge for the day (₹)</label>
                  <input type="number" value={loadmanDraft} onChange={e => setLoadmanDraft(e.target.value)}
                    placeholder="e.g. 1000"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <button onClick={saveLoadman} disabled={savingLoadman}
                  className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-900 disabled:opacity-50">
                  {savingLoadman ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            {dayReport && (
              <p className="text-[11px] text-gray-400 mt-2">
                {dayReport.orderCount} confirmed order{dayReport.orderCount === 1 ? '' : 's'} · {dayReport.totalQtyForDay.toFixed(2)} total units ·
                {' '}loadman rate ≈ ₹{dayReport.loadmanPerUnitRate.toFixed(2)}/unit
              </p>
            )}
          </div>

          {dayReport && (
            <>
              {/* Day summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Today's Revenue</p>
                  <p className="text-xl font-bold text-gray-700">{money(dayReport.dayRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Today's Cost</p>
                  <p className="text-xl font-bold text-gray-700">{money(dayReport.dayCost)}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xs text-gray-500 font-medium mb-1 text-right">Today's {dayReport.dayProfit < 0 ? 'Loss' : 'Profit'}</p>
                  <ProfitBadge value={dayReport.dayProfit} size="lg" />
                </div>
              </div>

              {/* Item-wise procurement cost entry — Table 2 style */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <div className="px-4 pt-3 pb-1">
                  <h3 className="font-bold text-gray-700 text-sm">Procurement Cost Entry (per product, per day)</h3>
                  <p className="text-[11px] text-gray-400">Enter what was actually paid to the supplier per unit. Saving records you as who procured it.</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Purchase Cost/Unit</th>
                      <th className="px-3 py-2 text-right">Total Purchase Cost</th>
                      <th className="px-3 py-2 text-right">Loadman Cost</th>
                      <th className="px-3 py-2 text-right">Total Procurement</th>
                      <th className="px-3 py-2">Procured By</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayReport.itemRollup.map(row => (
                      <tr key={row.productKey} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">{row.productName}{row.gradeName ? ` (${row.gradeName})` : ''}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{row.totalQty} {row.unit}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" placeholder="₹/unit"
                            value={costDrafts[row.productKey] ?? (row.purchaseCostPerUnit ?? '')}
                            onChange={e => setCostDrafts(d => ({ ...d, [row.productKey]: e.target.value }))}
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-red-400" />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{money(row.purchaseCost)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{money(row.loadmanCost)}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-700">{money(row.totalProcurement)}</td>
                        <td className="px-3 py-2 text-gray-600">{row.procuredBy || '—'}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => saveCost(row)} disabled={!!savingCost[row.productKey]}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg disabled:opacity-50">
                            {savingCost[row.productKey] ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {dayReport.itemRollup.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-gray-400 py-6">No confirmed orders for this date</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Who contributed how much */}
              {dayReport.procuredByRollup.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                  <div className="px-4 pt-3 pb-1">
                    <h3 className="font-bold text-gray-700 text-sm">Procured By — Contribution Summary</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 text-right">Qty Handled</th>
                        <th className="px-3 py-2 text-right">Purchase Cost</th>
                        <th className="px-3 py-2 text-right">Total Procurement</th>
                        <th className="px-3 py-2">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayReport.procuredByRollup.map(p => (
                        <tr key={p.name} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-bold text-gray-700">{p.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{p.totalQty.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(p.purchaseCost)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-700">{money(p.totalProcurement)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{p.products.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bill-wise (per-order) breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <div className="px-4 pt-3 pb-1">
                  <h3 className="font-bold text-gray-700 text-sm">Bill-wise Profit / Loss</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Procurement</th>
                      <th className="px-3 py-2 text-right">Platform</th>
                      <th className="px-3 py-2 text-right">Transport</th>
                      <th className="px-3 py-2 text-right">Packing</th>
                      <th className="px-3 py-2 text-right">Razorpay</th>
                      <th className="px-3 py-2 text-right">Total Cost</th>
                      <th className="px-3 py-2 text-right">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayReport.orders.map(o => {
                      const isExp = expandedOrder === o._id;
                      const draft = orderCostDrafts[o._id] || {};
                      return (
                        <Fragment key={o._id}>
                          <tr onClick={() => setExpandedOrder(isExp ? null : o._id)}
                            className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${isExp ? 'bg-red-50/40' : ''}`}>
                            <td className="px-3 py-2 font-bold text-gray-700">
                              <span className="inline-block mr-1 text-gray-400 transition-transform" style={{ transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                              {o.orderId}
                              <div className="text-xs font-normal text-gray-400">{o.customerName}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.revenue)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.totalProcurement)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.platformFeeCost)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.transportCost)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.packingCost)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.razorpayDeduction)}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">{money(o.totalCost)}</td>
                            <td className="px-3 py-2 text-right"><ProfitBadge value={o.profit} /></td>
                          </tr>
                          {isExp && (
                            <tr className="bg-gray-50/70">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Items</p>
                                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                      {o.items.map((it, i) => (
                                        <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                                          <div>
                                            <span className="text-gray-700 font-medium">{it.name}</span>
                                            <span className="text-gray-400 text-xs ml-1.5">{it.quantity} {it.unit} × ₹{it.orderPrice.toFixed(2)}</span>
                                          </div>
                                          <span className="font-bold text-gray-700 shrink-0">{money(it.revenue)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div onClick={e => e.stopPropagation()}>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Order Costs (editable)</p>
                                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                                      {[
                                        ['platformFeeCost', 'Platform Fee'],
                                        ['transportCost', 'Transportation'],
                                        ['packingCost', 'Packing Bag'],
                                        ['razorpayDeduction', 'Razorpay Deduction'],
                                      ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between gap-2">
                                          <label className="text-xs text-gray-500">{label}</label>
                                          <input type="number"
                                            value={draft[key] ?? o[key] ?? ''}
                                            onChange={e => setOrderCostDrafts(d => ({ ...d, [o._id]: { ...d[o._id], [key]: e.target.value } }))}
                                            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-red-400" />
                                        </div>
                                      ))}
                                      <button onClick={() => saveOrderCosts(o)} disabled={!!savingOrderCost[o._id]}
                                        className="w-full mt-1 text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                        {savingOrderCost[o._id] ? 'Saving…' : 'Save Costs'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {dayReport.orders.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-gray-400 py-8">No confirmed orders for this date</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={loadRange} disabled={rangeLoading}
                className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {rangeLoading ? 'Loading…' : 'Search'}
              </button>
              <p className="text-[11px] text-gray-400">Defaults to the current quarter</p>
              <div className="flex-1" />
              <button onClick={exportRange} disabled={exporting || !rangeReport?.days?.length}
                className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {exporting ? 'Exporting…' : '📊 Export Excel'}
              </button>
            </div>
          </div>

          {rangeReport && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Revenue</p>
                  <p className="text-xl font-bold text-gray-700">{money(rangeReport.grandTotal.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Cost</p>
                  <p className="text-xl font-bold text-gray-700">{money(rangeReport.grandTotal.cost)}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xs text-gray-500 font-medium mb-1 text-right">
                    {rangeReport.grandTotal.profit < 0 ? 'Loss' : 'Profit'} for {rangeFrom} → {rangeTo}
                  </p>
                  <ProfitBadge value={rangeReport.grandTotal.profit} size="lg" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Orders</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 text-right">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeReport.days.map(d => (
                      <tr key={d.cycle} className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                        onClick={() => { setCycle(d.cycle); setView('day'); }}>
                        <td className="px-3 py-2 font-medium text-gray-700">{d.cycle}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{d.orderCount}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{money(d.revenue)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{money(d.cost)}</td>
                        <td className="px-3 py-2 text-right"><ProfitBadge value={d.profit} /></td>
                      </tr>
                    ))}
                    {rangeReport.days.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-8">No confirmed orders in this range</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
