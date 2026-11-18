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


// ── One people list for the whole P&L (Procured By + Paid By) ─────────────
// Add and delete here; every dropdown on this tab uses this single list.
// Past entries keep the name they were saved with. Delete asks inline (no
// browser popup — popups are blocked in some phone browsers / in-app views,
// which made the old ✕ look like it did nothing).
const CATS = ['Stationery', 'Packing material', 'Fuel', 'Food & tea', 'Repairs & maintenance', 'Phone & internet', 'Labour (other)', 'Other'];
function PeoplePanel({ people, setPeople }) {
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const { data } = await api.post('/koyambedu/admin/pnl/parties', { name: n });
      setPeople(data.names || []); setName('');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to add name'); }
    finally { setBusy(false); }
  };
  const remove = async (n) => {
    setBusy(true);
    try {
      const { data } = await api.delete('/koyambedu/admin/pnl/parties', { params: { name: n } });
      setPeople(data.names || []); setConfirming(null);
      toast.success(`${n} deleted`);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete name'); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <p className="text-[11px] text-gray-500">People list — used for “Procured By” and “Paid by” everywhere in P&amp;L.</p>
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New name"
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        <button onClick={add} disabled={busy} className="bg-gray-800 text-white text-sm font-bold px-4 rounded-xl disabled:opacity-50">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.length === 0 && <span className="text-xs text-gray-400">No names yet</span>}
        {people.map(n => (
          <span key={n} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-3 pr-1 py-1 text-xs text-gray-700">
            {n}
            {confirming === n ? (
              <>
                <span className="text-red-600 font-bold">Delete?</span>
                <button onClick={() => remove(n)} disabled={busy} className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">Yes</button>
                <button onClick={() => setConfirming(null)} className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-bold">No</button>
              </>
            ) : (
              <button onClick={() => setConfirming(n)} aria-label={`Delete ${n}`}
                className="w-6 h-6 rounded-full text-red-600 hover:bg-red-50 font-bold leading-none">✕</button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Loadman & Transport payments ─────────────────────────────────────────
// Separate ledger: each payment has an amount, who paid it and who received
// it. Payer names are a managed list (add + delete with ✕). Deleting a name
// never changes past payments. Loadman total feeds the existing loadman
// split; transport total is shared across the day's bills by revenue.
function DayPayments({ cycle, report, onChanged, names, setNames }) {
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [delId, setDelId] = useState(null);
  // Entry lines: first line is Loadman by default; "+ Add line" adds more
  // (Miscellaneous by default, changeable). Save all posts every filled line.
  const blankLine = (kind = 'misc') => ({ kind, category: 'Stationery', amount: '', paidBy: '', paidTo: '', note: '' });
  const hasLoadmanEntry = (report.expenseEntries || []).some(e => e.kind === 'loadman');
  // An old single-amount loadman charge becomes the pre-filled first line so it can be re-saved properly
  const firstLine = () => ({ ...blankLine('loadman'), amount: !hasLoadmanEntry && report.loadmanCharge > 0 ? String(report.loadmanCharge) : '' });
  const [lines, setLines] = useState(() => [firstLine()]);
  useEffect(() => { setLines([firstLine()]); /* eslint-disable-next-line */ }, [cycle]);
  const setLine = (i, patch) => setLines(ls => ls.map((l, k) => k === i ? { ...l, ...patch } : l));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const filled = lines.filter(l => Number(l.amount) > 0);
    if (!filled.length) { toast.error('Enter an amount on at least one line'); return; }
    setSaving(true);
    try {
      for (const l of filled) {
        await api.post('/koyambedu/admin/pnl/day-expenses', {
          cycle, kind: l.kind, amount: Number(l.amount), paidBy: l.paidBy, paidTo: l.paidTo, note: l.note,
          category: l.kind === 'misc' ? l.category : undefined,
        });
      }
      const newNames = filled.map(l => l.paidBy).filter(n => n && !names.includes(n));
      if (newNames.length) setNames(n => [...new Set([...n, ...newNames])].sort());
      toast.success(`${filled.length} expense${filled.length === 1 ? '' : 's'} saved`);
      setLines([{ ...blankLine('loadman') }]);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save expenses'); }
    finally { setSaving(false); }
  };
  const delEntry = async (id) => {
    try { await api.delete(`/koyambedu/admin/pnl/day-expenses/${id}`); setDelId(null); onChanged(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete'); }
  };
  const startEdit = (e) => { setEditId(e._id); setEdit({ amount: String(e.amount), paidBy: e.paidBy || '', paidTo: e.paidTo || '', note: e.note || '', category: e.category || 'Other' }); };
  const saveEdit = async (e) => {
    try {
      await api.patch(`/koyambedu/admin/pnl/day-expenses/${e._id}`, { ...edit, amount: Number(edit.amount), category: e.kind === 'misc' ? edit.category : undefined });
      setEditId(null); toast.success('Updated'); onChanged();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update'); }
  };

  const entries = report.expenseEntries || [];
  const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400';
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-700 text-sm">🧾 Day Expenses — Loadman &amp; Miscellaneous</h3>
          <p className="text-[11px] text-gray-400">Loadman and miscellaneous expenses with who paid. (Transport is entered per bill, below.) These are day-end overheads: they reduce the day's net profit once and are not spread over items or bills.</p>
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-xl p-2">
            <div>
              {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Type</label>}
              <select value={l.kind} onChange={e => setLine(i, { kind: e.target.value })} className={`${inp} bg-white`}>
                <option value="loadman">Loadman</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
            {l.kind === 'misc' && (
              <div>
                {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Category</label>}
                <select value={l.category} onChange={e => setLine(i, { category: e.target.value })} className={`${inp} bg-white w-40`}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Amount (₹)</label>}
              <input type="number" value={l.amount} onChange={e => setLine(i, { amount: e.target.value })} placeholder="₹" className={`${inp} w-28`} />
            </div>
            <div>
              {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Paid by</label>}
              <select value={l.paidBy} onChange={e => setLine(i, { paidBy: e.target.value })} className={`${inp} bg-white w-36`}>
                <option value="">— Select —</option>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Paid to</label>}
              <input value={l.paidTo} onChange={e => setLine(i, { paidTo: e.target.value })} placeholder="Shop / person" className={`${inp} w-32`} />
            </div>
            <div className="flex-1 min-w-[120px]">
              {i === 0 && <label className="text-xs text-gray-500 font-medium block mb-1">Comments</label>}
              <input value={l.note} onChange={e => setLine(i, { note: e.target.value })} placeholder="e.g. bill books, tape rolls" className={`${inp} w-full`} />
            </div>
            {i > 0 && (
              <button onClick={() => setLines(ls => ls.filter((_, k) => k !== i))} aria-label="Remove line"
                className="w-8 h-9 rounded-lg text-red-600 hover:bg-red-50 font-bold">✕</button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button onClick={() => setLines(ls => [...ls, blankLine('misc')])}
            className="text-xs font-bold text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg">+ Add line</button>
          <button onClick={save} disabled={saving}
            className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-xl hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Paid by</th><th className="px-3 py-2">Paid to</th>
                <th className="px-3 py-2">Comments</th><th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const label = e.kind === 'misc' ? `Misc · ${e.category || 'Other'}` : e.kind === 'transport' ? 'Transport (old entry)' : 'Loadman';
                if (editId === e._id) return (
                  <tr key={e._id} className="border-t border-gray-100 bg-amber-50/50">
                    <td className="px-3 py-2">
                      {e.kind === 'misc'
                        ? <select value={edit.category} onChange={ev => setEdit(d => ({ ...d, category: ev.target.value }))} className={`${inp} bg-white w-36`}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
                        : label}
                    </td>
                    <td className="px-3 py-2 text-right"><input type="number" value={edit.amount} onChange={ev => setEdit(d => ({ ...d, amount: ev.target.value }))} className={`${inp} w-24 text-right`} /></td>
                    <td className="px-3 py-2">
                      <select value={edit.paidBy} onChange={ev => setEdit(d => ({ ...d, paidBy: ev.target.value }))} className={`${inp} bg-white w-32`}>
                        <option value="">— Select —</option>
                        {edit.paidBy && !names.includes(edit.paidBy) && <option value={edit.paidBy}>{edit.paidBy}</option>}
                        {names.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={edit.paidTo} onChange={ev => setEdit(d => ({ ...d, paidTo: ev.target.value }))} className={`${inp} w-28`} /></td>
                    <td className="px-3 py-2"><input value={edit.note} onChange={ev => setEdit(d => ({ ...d, note: ev.target.value }))} className={`${inp} w-full`} /></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => saveEdit(e)} className="text-green-700 text-xs font-bold mr-2">Save</button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 text-xs font-bold">Cancel</button>
                    </td>
                  </tr>
                );
                return (
                  <tr key={e._id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-700">{money(e.amount)}</td>
                    <td className="px-3 py-2">{e.paidBy || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2">{e.paidTo || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-500">{e.note}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {delId === e._id ? (
                        <>
                          <span className="text-red-600 text-xs font-bold mr-1">Delete?</span>
                          <button onClick={() => delEntry(e._id)} className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold mr-1">Yes</button>
                          <button onClick={() => setDelId(null)} className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-bold">No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(e)} className="text-blue-600 text-xs font-bold mr-3 hover:underline">Edit</button>
                          <button onClick={() => setDelId(e._id)} className="text-red-600 text-xs font-bold hover:underline">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-500 mt-2">
            Day expenses total <b>{money(report.dayOverheads)}</b>
            {' '}(loadman {money(report.loadmanCharge)} · transport {money(report.dayTransportCharge)} · misc {money(report.miscTotal)})
            {report.miscByCategory?.length > 0 && <> — {report.miscByCategory.map(c => `${c.category} ${money(c.amount)}`).join(', ')}</>}
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No expenses saved for this date yet.</p>
      )}
    </div>
  );
}

export default function PNLTab() {
  const [view, setView] = useState('day'); // 'day' | 'range' | 'margin'

  // ── Day view state ──────────────────────────
  const [cycle, setCycle] = useState(todayStr());
  const [dayReport, setDayReport] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [costDrafts, setCostDrafts] = useState({}); // productKey -> purchaseCostPerUnit draft (day-level, all bills at once)
  const [procuredByDrafts, setProcuredByDrafts] = useState({}); // productKey -> selected "procured by" name
  const [savingAllCosts, setSavingAllCosts] = useState(false);
  const [itemCostDrafts, setItemCostDrafts] = useState({}); // itemId -> bill-specific purchaseCostPerUnit draft
  const [savingItemCost, setSavingItemCost] = useState({}); // itemId -> bool
  const [orderCostDrafts, setOrderCostDrafts] = useState({}); // orderId -> { transportCost, packingCost }
  const [savingOrderCost, setSavingOrderCost] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [procurers, setProcurers] = useState([]); // maintained dropdown list for "Procured By"
  const [expandedProcurers, setExpandedProcurers] = useState({}); // name -> bool, product list shown on demand

  // ── Range view state ────────────────────────
  const initialRange = currentQuarterRange();
  const [rangeFrom, setRangeFrom] = useState(initialRange.from);
  const [rangeTo, setRangeTo] = useState(initialRange.to);
  const [rangeReport, setRangeReport] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Margin Report view state ────────────────
  const [marginFrom, setMarginFrom] = useState(initialRange.from);
  const [marginTo, setMarginTo] = useState(initialRange.to);
  const [marginReport, setMarginReport] = useState(null);
  const [marginLoading, setMarginLoading] = useState(false);

  const loadDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/pnl/day?cycle=${cycle}`);
      setDayReport(data);
      // Row drafts are stale once a fresh report loads — clear them so the
      // inputs fall back to showing the just-saved server values instead of
      // leftover text from before the save.
      setCostDrafts({});
      setProcuredByDrafts({});
    } catch {
      toast.error('Failed to load P&L for this date');
    } finally { setDayLoading(false); }
  }, [cycle]);

  useEffect(() => { if (view === 'day') loadDay(); }, [view, loadDay]);

  // Maintained "Procured By" dropdown — loaded once, grows automatically
  // whenever a new name is used (see registerProcurerName on the backend).
  useEffect(() => {
    api.get('/koyambedu/admin/procurers').then(({ data }) => setProcurers(data.names || [])).catch(() => {});
  }, []);

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

  const loadMarginReport = useCallback(async () => {
    setMarginLoading(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/pnl/margin-report?from=${marginFrom}&to=${marginTo}`);
      setMarginReport(data);
    } catch {
      toast.error('Failed to load margin report');
    } finally { setMarginLoading(false); }
  }, [marginFrom, marginTo]);

  useEffect(() => { if (view === 'margin') loadMarginReport(); }, [view, loadMarginReport]);

  // "Procured By" is a strict dropdown, so a brand-new person has to be
  // added to the maintained list once before they show up as an option.
  const [peopleOpen, setPeopleOpen] = useState(false);

  // Single save action for the whole Procurement Cost Entry table — no
  // per-row Save button. Sends every row's current value (draft if the
  // admin touched it, otherwise whatever was already saved) in one request.
  const saveAllCosts = async () => {
    if (!dayReport) return;
    const items = dayReport.itemRollup.map(row => ({
      productKey: row.productKey, productName: row.productName,
      gradeKey: row.gradeKey, gradeName: row.gradeName,
      purchaseCostPerUnit: (() => {
        const v = costDrafts[row.productKey] ?? row.purchaseCostPerUnit ?? '';
        return v === '' ? null : Number(v);
      })(),
      purchasedByName: (procuredByDrafts[row.productKey] ?? row.procuredBy ?? '').trim(),
    }));
    if (!items.length) { toast('No products to save for this date', { icon: 'ℹ️' }); return; }
    setSavingAllCosts(true);
    try {
      await api.patch('/koyambedu/admin/reports/procurement-confirmed/bulk', { cycle, items });
      toast.success(`Saved ${items.length} row${items.length === 1 ? '' : 's'}`);
      loadDay();
    } catch {
      toast.error('Failed to save rows');
    } finally { setSavingAllCosts(false); }
  };

  // Bill-specific override — enter procurement cost for ONE item on ONE
  // order, instead of the day-level value above which applies to every
  // order for that product at once. Blank clears the override, falling
  // back to the day-level figure again.
  const saveItemCost = async (order, item) => {
    const draft = itemCostDrafts[item.itemId];
    if (draft === undefined) return;
    setSavingItemCost(s => ({ ...s, [item.itemId]: true }));
    try {
      await api.patch(`/koyambedu/admin/orders/${order._id}/items/${item.itemId}/procurement-cost`, {
        procurementCostPerUnit: draft === '' ? null : Number(draft),
      });
      toast.success(`${item.name} cost saved for ${order.orderId}`);
      loadDay();
    } catch {
      toast.error('Failed to save bill cost');
    } finally { setSavingItemCost(s => ({ ...s, [item.itemId]: false })); }
  };

  // Admin only ever enters two real out-of-pocket costs per bill now —
  // actual transportation and packing. Platform fee is already part of the
  // revenue figure (the customer paid it, Eptomart kept it) and Razorpay's
  // cut is computed automatically from the payment method, so neither is
  // a manual field anymore.
  const saveOrderCosts = async (order) => {
    const draft = orderCostDrafts[order._id] || {};
    setSavingOrderCost(s => ({ ...s, [order._id]: true }));
    try {
      await api.patch(`/koyambedu/admin/orders/${order._id}/costs`, {
        transportCharge: draft.transportCost ?? order.transportCost,
        packingCharge:   draft.packingCost   ?? order.packingCost,
        costPaidBy:      draft.paidBy        ?? order.costPaidBy ?? '',
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
            <button onClick={() => setView('margin')}
              className={`px-4 py-1.5 text-sm font-bold ${view === 'margin' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>
              ⚠️ Margin Alerts
            </button>
          </div>
        </div>
      </div>

      {view === 'day' && (
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
              <button onClick={() => setPeopleOpen(o => !o)}
                className="text-sm font-bold text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-xl">
                {peopleOpen ? 'Close' : '👤 People'}
              </button>

            </div>
            {peopleOpen && <div className="mt-3"><PeoplePanel people={procurers} setPeople={setProcurers} /></div>}
            {dayReport && (
              <p className="text-[11px] text-gray-400 mt-2">
                {dayReport.orderCount} confirmed order{dayReport.orderCount === 1 ? '' : 's'} · {dayReport.totalQtyForDay.toFixed(2)} total units ·
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
                  <p className="text-xs text-gray-500 font-medium mb-1">Bill costs (procurement, bill transport/packing, Razorpay)</p>
                  <p className="text-xl font-bold text-gray-700">{money(dayReport.orderCostTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Gross profit</p>
                  <p className="text-xl font-bold text-gray-700">{money(dayReport.grossProfit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Day expenses (loadman, transport, misc)</p>
                  <p className="text-xl font-bold text-gray-700">− {money(dayReport.dayOverheads)}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xs text-gray-500 font-medium mb-1 text-right">Net {dayReport.dayProfit < 0 ? 'Loss' : 'Profit'} for the day</p>
                  <ProfitBadge value={dayReport.dayProfit} size="lg" />
                </div>
              </div>

              <DayPayments cycle={cycle} report={dayReport} onChanged={loadDay} names={procurers} setNames={setProcurers} />

              {/* Margin & price alerts — products that made little or no money
                  today, with a suggested selling price for tomorrow's listing. */}
              {dayReport.marginAlerts?.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-x-auto">
                  <div className="px-4 pt-3 pb-1">
                    <h3 className="font-bold text-amber-800 text-sm">⚠️ Margin &amp; Price Alerts — {dayReport.marginAlerts.length} product{dayReport.marginAlerts.length === 1 ? '' : 's'} need attention</h3>
                    <p className="text-[11px] text-amber-700">Sold today for little or no profit above what it actually cost. Suggested price is what it'd need to sell at tomorrow (at today's cost) for a healthy margin.</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-100/60 text-left text-xs text-amber-700 uppercase">
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2 text-right">Qty Sold</th>
                        <th className="px-3 py-2 text-right">Selling Price/Unit</th>
                        <th className="px-3 py-2 text-right">Cost/Unit</th>
                        <th className="px-3 py-2 text-right">Margin</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Suggested Price (tomorrow)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayReport.marginAlerts.map(row => (
                        <tr key={row.productKey} className="border-t border-amber-200/60">
                          <td className="px-3 py-2 font-medium text-gray-700">{row.productName}{row.gradeName ? ` (${row.gradeName})` : ''}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{row.totalQty} {row.unit}</td>
                          <td className="px-3 py-2 text-right text-gray-600">₹{row.sellingPricePerUnit.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">₹{row.costPerUnit.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${row.alertLevel === 'loss' ? 'text-red-600' : 'text-amber-600'}`}>
                            {money(row.margin)} ({row.marginPercent.toFixed(1)}%)
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${row.alertLevel === 'loss' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {row.alertLevel === 'loss' ? 'NO PROFIT / LOSS' : 'LOW MARGIN'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-800">
                            {row.suggestedPricePerUnit != null ? `₹${row.suggestedPricePerUnit.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Item-wise procurement cost entry — Table 2 style */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm">Procurement Cost Entry (per product, per day)</h3>
                    <p className="text-[11px] text-gray-400">Enter what was actually paid to the supplier per unit, and pick who procured it.</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button onClick={saveAllCosts} disabled={savingAllCosts}
                      className="text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {savingAllCosts ? 'Saving…' : 'Save All'}
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Purchase Cost/Unit</th>
                      <th className="px-3 py-2 text-right">Total Purchase Cost</th>
                      <th className="px-3 py-2 text-right">Total Procurement</th>
                      <th className="px-3 py-2">Procured By</th>
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
                        <td className="px-3 py-2 text-right font-bold text-gray-700">{money(row.totalProcurement)}</td>
                        <td className="px-3 py-2">
                          {/* Strict dropdown — only names from the maintained list.
                              No per-row save; the one "Save All" button above persists
                              every row's selection at once. */}
                          <select
                            value={procuredByDrafts[row.productKey] ?? (row.procuredBy ?? '')}
                            onChange={e => setProcuredByDrafts(d => ({ ...d, [row.productKey]: e.target.value }))}
                            className="w-32 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-red-400 bg-white">
                            <option value="">— Select —</option>
                            {procurers.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {dayReport.itemRollup.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-6">No confirmed orders for this date</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Who contributed how much */}
              {dayReport.procuredByRollup.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                  <div className="px-4 pt-3 pb-1">
                    <h3 className="font-bold text-gray-700 text-sm">Procured By — Purchases</h3>
                    <p className="text-[11px] text-gray-400">What Eptomart owes each person for the supplier purchases they paid for. Other out-of-pocket payments are in Settlement below.</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 text-right">Qty Handled</th>
                        <th className="px-3 py-2 text-right">Purchase Cost</th>
                        <th className="px-3 py-2 text-right">Amount to Pay</th>
                        <th className="px-3 py-2">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayReport.procuredByRollup.map(p => {
                        const isOpen = !!expandedProcurers[p.name];
                        return (
                          <tr key={p.name} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-bold text-gray-700">{p.name}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{p.totalQty.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(p.purchaseCost)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">{money(p.amountPayable)}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">
                              <button
                                onClick={() => setExpandedProcurers(s => ({ ...s, [p.name]: !s[p.name] }))}
                                className="text-red-600 font-bold hover:underline">
                                {isOpen ? 'Hide' : `${p.products.length} product${p.products.length === 1 ? '' : 's'}`}
                              </button>
                              {isOpen && <div className="mt-1 text-gray-500">{p.products.join(', ')}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Settlement — who paid what out of pocket */}
              {dayReport.settlement?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                  <div className="px-4 pt-3 pb-1">
                    <h3 className="font-bold text-gray-700 text-sm">💳 Settlement — who paid, what Eptomart owes</h3>
                    <p className="text-[11px] text-gray-400">Everything each person paid out of pocket today: supplier purchases, loadman, transport, miscellaneous and per-bill costs.</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <th className="px-3 py-2">Paid by</th>
                        <th className="px-3 py-2 text-right">Purchases</th>
                        <th className="px-3 py-2 text-right">Loadman</th>
                        <th className="px-3 py-2 text-right">Transport</th>
                        <th className="px-3 py-2 text-right">Misc</th>
                        <th className="px-3 py-2 text-right">Bill costs</th>
                        <th className="px-3 py-2 text-right">Total to reimburse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayReport.settlement.map(r => (
                        <tr key={r.name} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-bold text-gray-700">{r.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(r.procurement)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(r.loadman)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(r.transport)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(r.misc)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(r.billCosts)}</td>
                          <td className="px-3 py-2 text-right font-bold text-green-700">{money(r.total)}</td>
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
                      <th className="px-3 py-2 text-right">Amount Paid by Customer</th>
                      <th className="px-3 py-2 text-right">Procurement</th>
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
                            <td className="px-3 py-2 text-right text-gray-600">
                              {money(o.revenue)}
                              {o.couponCode && <div className="text-[10px] font-normal text-emerald-600">code: {o.couponCode}</div>}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.totalProcurement)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.transportCost)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.packingCost)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(o.razorpayDeduction)}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">{money(o.totalCost)}</td>
                            <td className="px-3 py-2 text-right"><ProfitBadge value={o.profit} /></td>
                          </tr>
                          {isExp && (
                            <tr className="bg-gray-50/70">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="grid md:grid-cols-[1.6fr_1fr] gap-4">
                                  <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Items — cost breakdown</p>
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-gray-50 text-left text-[10px] text-gray-500 uppercase">
                                            <th className="px-2.5 py-1.5">Item</th>
                                            <th className="px-2.5 py-1.5 text-right">Qty</th>
                                            <th className="px-2.5 py-1.5 text-right">Order Price</th>
                                            <th className="px-2.5 py-1.5 text-right">Revenue</th>
                                            <th className="px-2.5 py-1.5 text-right">Purchase Cost/Unit (this bill)</th>
                                            <th className="px-2.5 py-1.5 text-right">Total Procurement</th>
                                            <th className="px-2.5 py-1.5">Procured By</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {o.items.map((it, i) => (
                                            <tr key={i} onClick={e => e.stopPropagation()}>
                                              <td className="px-2.5 py-1.5 font-medium text-gray-700 whitespace-nowrap">{it.name}</td>
                                              <td className="px-2.5 py-1.5 text-right text-gray-600 whitespace-nowrap">{it.quantity} {it.unit}</td>
                                              <td className="px-2.5 py-1.5 text-right text-gray-600">₹{it.orderPrice.toFixed(2)}</td>
                                              <td className="px-2.5 py-1.5 text-right font-bold text-gray-700">{money(it.revenue)}</td>
                                              <td className="px-2.5 py-1.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  <input type="number" placeholder="₹/unit"
                                                    value={itemCostDrafts[it.itemId] ?? (it.purchaseCostPerUnit ?? '')}
                                                    onChange={e => setItemCostDrafts(d => ({ ...d, [it.itemId]: e.target.value }))}
                                                    className="w-20 border border-gray-200 rounded-lg px-1.5 py-1 text-right text-xs focus:outline-none focus:border-red-400" />
                                                  <button onClick={() => saveItemCost(o, it)} disabled={!!savingItemCost[it.itemId]}
                                                    className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-1.5 py-1 rounded disabled:opacity-50">
                                                    {savingItemCost[it.itemId] ? '…' : 'Save'}
                                                  </button>
                                                </div>
                                                {it.isBillOverride
                                                  ? <p className="text-[9px] text-red-500 mt-0.5">Bill-specific override</p>
                                                  : it.purchaseCostPerUnit != null && <p className="text-[9px] text-gray-400 mt-0.5">From day-level entry</p>}
                                              </td>
                                              <td className="px-2.5 py-1.5 text-right font-bold text-gray-700">{money(it.totalProcurement)}</td>
                                              <td className="px-2.5 py-1.5 text-gray-500 whitespace-nowrap">{it.procuredBy || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      Loadman is a day-level expense (see Day Expenses) and is not charged to individual items.
                                      Purchase cost defaults to the day-level Procurement Cost Entry table above, unless overridden here for this specific bill.
                                    </p>
                                  </div>
                                  <div onClick={e => e.stopPropagation()}>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">What the customer paid</p>
                                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1 text-xs mb-3">
                                      <div className="flex justify-between"><span className="text-gray-500">Items</span><span className="text-gray-700">{money(o.itemsSubtotal)}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-500">Delivery fee</span><span className="text-gray-700">{money(o.pricingBreakdown?.deliveryCharge)}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-500">Platform fee</span><span className="text-gray-700">{money(o.pricingBreakdown?.platformFee)}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-500">Packing/logistics fee</span><span className="text-gray-700">{money(o.pricingBreakdown?.packingLogisticsFee)}</span></div>
                                      {o.pricingBreakdown?.discount > 0 && (
                                        <div className="flex justify-between"><span className="text-gray-500">Discount{o.couponCode ? ` (${o.couponCode})` : ''}</span><span className="text-red-500">-{money(o.pricingBreakdown.discount)}</span></div>
                                      )}
                                      <div className="flex justify-between border-t border-gray-100 pt-1 font-bold"><span className="text-gray-600">Total paid by customer</span><span className="text-gray-800">{money(o.revenue)}</span></div>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Order Costs (editable)</p>
                                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                                      {[
                                        ['transportCost', 'Transportation'],
                                        ['packingCost', 'Packing Bag'],
                                      ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between gap-2">
                                          <label className="text-xs text-gray-500">{label}</label>
                                          <input type="number"
                                            value={draft[key] ?? o[key] ?? ''}
                                            onChange={e => setOrderCostDrafts(d => ({ ...d, [o._id]: { ...d[o._id], [key]: e.target.value } }))}
                                            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-red-400" />
                                        </div>
                                      ))}
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs text-gray-500">Paid by</label>
                                        <select value={draft.paidBy ?? o.costPaidBy ?? ''}
                                          onChange={e => setOrderCostDrafts(d => ({ ...d, [o._id]: { ...d[o._id], paidBy: e.target.value } }))}
                                          className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-red-400">
                                          <option value="">— Select —</option>
                                          {procurers.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs text-gray-500">Razorpay Deduction (auto)</label>
                                        <span className="w-28 text-sm text-right text-gray-500">{money(o.razorpayDeduction)}</span>
                                      </div>
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
                      <tr><td colSpan={8} className="text-center text-gray-400 py-8">No confirmed orders for this date</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {view === 'range' && (
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

      {view === 'margin' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
                <input type="date" value={marginFrom} onChange={e => setMarginFrom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
                <input type="date" value={marginTo} onChange={e => setMarginTo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={loadMarginReport} disabled={marginLoading}
                className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {marginLoading ? 'Loading…' : 'Search'}
              </button>
              <p className="text-[11px] text-gray-400">Which products are actually making money over this range, worst first</p>
            </div>
          </div>

          {marginReport && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
              <div className="px-4 pt-3 pb-1">
                <h3 className="font-bold text-gray-700 text-sm">
                  Product Margins — {marginReport.alerts.length} of {marginReport.products.length} product{marginReport.products.length === 1 ? '' : 's'} need a price review
                </h3>
                <p className="text-[11px] text-gray-400">Sorted worst margin first. A product flagged here across several days — not just a one-off — is the one that genuinely needs repricing.</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Days Sold</th>
                    <th className="px-3 py-2 text-right">Qty Sold</th>
                    <th className="px-3 py-2 text-right">Avg Selling Price/Unit</th>
                    <th className="px-3 py-2 text-right">Avg Cost/Unit</th>
                    <th className="px-3 py-2 text-right">Margin</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Suggested Price</th>
                  </tr>
                </thead>
                <tbody>
                  {marginReport.products.map(row => (
                    <tr key={row.productKey} className={`border-t border-gray-100 ${row.alertLevel !== 'ok' ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-3 py-2 font-medium text-gray-700">{row.productName}{row.gradeName ? ` (${row.gradeName})` : ''}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{row.daysSeen}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{row.totalQty.toFixed(2)} {row.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-600">₹{row.sellingPricePerUnit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">₹{row.costPerUnit.toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${row.alertLevel === 'loss' ? 'text-red-600' : row.alertLevel === 'low' ? 'text-amber-600' : 'text-green-700'}`}>
                        {money(row.margin)} ({row.marginPercent.toFixed(1)}%)
                      </td>
                      <td className="px-3 py-2">
                        {row.alertLevel === 'ok' ? (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">HEALTHY</span>
                        ) : (
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${row.alertLevel === 'loss' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.alertLevel === 'loss' ? 'NO PROFIT / LOSS' : 'LOW MARGIN'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">
                        {row.suggestedPricePerUnit != null ? `₹${row.suggestedPricePerUnit.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {marginReport.products.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-8">No confirmed orders in this range</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
