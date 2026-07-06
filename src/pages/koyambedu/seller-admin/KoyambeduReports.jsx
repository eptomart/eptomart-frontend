// ============================================
// KOYAMBEDU — Reports (F7 + F8 + F9)
// Procurement Summary | Slot-wise | Destination
// ============================================
import React, { useState, useCallback } from 'react';
import { FiDownload, FiPrinter, FiRefreshCw } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().slice(0, 10);
const fmt   = (n) => `₹${Number(n || 0).toFixed(2)}`;

// ── Export helpers ─────────────────────────────
const printSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Koyambedu Report</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f0fdf4;font-weight:bold}h2{color:#166534}h3{color:#15803d;margin-top:20px}
    </style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
};

const downloadCSV = (rows, filename) => {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

// ══════════════════════════════════════════════
// FEATURE 7 — Procurement Summary
// ══════════════════════════════════════════════
const GRADE_OPTIONS = [
  { value: 'all',      label: 'All Grades' },
  { value: 'premium',  label: 'Premium' },
  { value: 'mixed',    label: 'Mixed Grade' },
  { value: 'economy',  label: 'Economy Grade' },
];

function ProcurementTab() {
  const [date, setDate]           = useState(today());
  const [gradeFilter, setGrade]   = useState('all');
  const [data, setData]           = useState(null);
  const [loading, setLoad]        = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const params = [`date=${date}`];
      if (gradeFilter !== 'all') params.push(`gradeKey=${gradeFilter}`);
      const { data: d } = await api.get(`/koyambedu/seller-admin/reports/procurement?${params.join('&')}`);
      setData(d);
    } catch { toast.error('Failed to load report'); }
    finally { setLoad(false); }
  }, [date, gradeFilter]);

  const hasGrades = (data?.summary || []).some(s => s.gradeKey);

  const exportCSV = () => {
    if (!data) return;
    const header = hasGrades
      ? ['Product', 'Grade', 'Total Qty', 'Unit', 'Total Value', 'Order Count']
      : ['Product', 'Total Qty', 'Unit', 'Total Value', 'Order Count'];
    const rows = [
      ['Procurement Summary — ' + date],
      header,
      ...(data.summary || []).map(s => hasGrades
        ? [s.productName, s.gradeName || s.gradeKey || '—', s.totalQty, s.unit, Number(s.totalValue || 0).toFixed(2), s.orderCount]
        : [s.productName, s.totalQty, s.unit, Number(s.totalValue || 0).toFixed(2), s.orderCount]
      ),
      [],
      ['Total Orders', data.totalOrders],
    ];
    if (data.gradeWiseSummary?.length) {
      rows.push([], ['Grade-wise Summary'], ['Grade', 'Total Qty', 'Total Value', 'Order Count']);
      data.gradeWiseSummary.forEach(g =>
        rows.push([g.gradeName || g.gradeKey, g.totalQty, Number(g.totalValue || 0).toFixed(2), g.orderCount])
      );
    }
    downloadCSV(rows, `procurement_${date}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={gradeFilter} onChange={e => setGrade(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
          <FiRefreshCw size={14} /> {loading ? 'Loading…' : 'Generate'}
        </button>
        {data && <>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiDownload size={14} /> CSV
          </button>
          <button onClick={() => printSection('proc-report')} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiPrinter size={14} /> Print
          </button>
        </>}
      </div>

      {data && (
        <div id="proc-report">
          <h2 className="text-lg font-bold text-green-800 mb-1">Procurement Summary — {date}</h2>
          <p className="text-sm text-gray-500 mb-3">Total Orders: <strong>{data.totalOrders}</strong></p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-green-50">
                <th className="border border-gray-200 px-3 py-2 text-left">Product</th>
                {hasGrades && <th className="border border-gray-200 px-3 py-2 text-left">Grade</th>}
                <th className="border border-gray-200 px-3 py-2 text-right">Total Qty</th>
                <th className="border border-gray-200 px-3 py-2 text-left">Unit</th>
                <th className="border border-gray-200 px-3 py-2 text-right">Order Count</th>
              </tr>
            </thead>
            <tbody>
              {(data.summary || []).map((s, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="border border-gray-200 px-3 py-2 font-medium">{s.productName}</td>
                  {hasGrades && (
                    <td className="border border-gray-200 px-3 py-2">
                      {s.gradeKey
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{s.gradeName || s.gradeKey}</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                  )}
                  <td className="border border-gray-200 px-3 py-2 text-right font-bold text-green-700">{s.totalQty}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{s.unit}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-gray-500">{s.orderCount}</td>
                </tr>
              ))}
              {!data.summary?.length && (
                <tr><td colSpan={hasGrades ? 5 : 4} className="text-center py-6 text-gray-400">No orders for this date.</td></tr>
              )}
            </tbody>
          </table>

          {/* Grade-wise summary */}
          {data.gradeWiseSummary?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-bold text-green-700 mb-2">Grade-wise Summary</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Grade</th>
                    <th className="border border-gray-200 px-3 py-2 text-right">Qty Sold</th>
                    <th className="border border-gray-200 px-3 py-2 text-right">Sales Value</th>
                    <th className="border border-gray-200 px-3 py-2 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gradeWiseSummary.map((g, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="border border-gray-200 px-3 py-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{g.gradeName || g.gradeKey}</span>
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right font-bold text-green-700">{g.totalQty}</td>
                      <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-green-700">{fmt(g.totalValue)}</td>
                      <td className="border border-gray-200 px-3 py-2 text-right text-gray-500">{g.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!data && !loading && (
        <div className="text-center py-12 text-gray-400">Select a date and click Generate to view report.</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// FEATURE 8 — Slot-wise Order Report
// ══════════════════════════════════════════════
const SLOT_LABELS = {
  slot1: 'Slot 1: 9 AM – 12 PM 🌅',
  slot2: 'Slot 2: 12 PM – 3 PM ☀️',
  slot3: 'Slot 3: 3 PM – 6 PM 🌇',
};

function SlotWiseTab() {
  const [date, setDate]    = useState(today());
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data: d } = await api.get(`/koyambedu/seller-admin/reports/slot-wise?date=${date}`);
      setData(d);
    } catch { toast.error('Failed to load report'); }
    finally { setLoad(false); }
  }, [date]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Slot-wise Report — ' + date], []];
    for (const [slotKey, slotLabel] of Object.entries(SLOT_LABELS)) {
      const orders = data.grouped?.[slotKey] || [];
      rows.push([slotLabel]);
      rows.push(['Order ID', 'Buyer', 'Items (with grade)', 'Amount']);
      orders.forEach(o => rows.push([o.orderId, o.buyerName, o.items, fmt(o.amount)]));
      rows.push([]);
    }
    downloadCSV(rows, `slot_wise_${date}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
          <FiRefreshCw size={14} /> {loading ? 'Loading…' : 'Generate'}
        </button>
        {data && <>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiDownload size={14} /> CSV
          </button>
          <button onClick={() => printSection('slot-report')} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiPrinter size={14} /> Print
          </button>
        </>}
      </div>

      {data && (
        <div id="slot-report" className="space-y-6">
          <h2 className="text-lg font-bold text-green-800">Slot-wise Order Report — {date}</h2>
          {Object.entries(SLOT_LABELS).map(([slotKey, slotLabel]) => {
            const orders = data.grouped?.[slotKey] || [];
            return (
              <div key={slotKey}>
                <h3 className="font-bold text-green-700 mb-2">{slotLabel} ({orders.length} orders)</h3>
                {orders.length ? (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="border border-gray-200 px-3 py-2 text-left">Order ID</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Buyer</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Items</th>
                        <th className="border border-gray-200 px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{o.orderId}</td>
                          <td className="border border-gray-200 px-3 py-2">{o.buyerName}</td>
                          <td className="border border-gray-200 px-3 py-2 text-xs text-gray-600">{o.items}</td>
                          <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-green-700">{fmt(o.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400 italic">No orders in this slot.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!data && !loading && (
        <div className="text-center py-12 text-gray-400">Select a date and click Generate.</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// FEATURE 9 — Destination-wise Report
// ══════════════════════════════════════════════
function DestinationTab() {
  const [date, setDate]    = useState(today());
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data: d } = await api.get(`/koyambedu/seller-admin/reports/destination?date=${date}`);
      setData(d);
    } catch { toast.error('Failed to load report'); }
    finally { setLoad(false); }
  }, [date]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Destination-wise Report — ' + date], []];
    (data.grouped || []).forEach(g => {
      rows.push([`${g.area} — ${g.pincode}`]);
      rows.push(['Order ID', 'Buyer', 'Phone', 'Address', 'Slot', 'Items', 'Amount']);
      g.orders.forEach(o => rows.push([o.orderId, o.buyerName, o.phone, o.address, o.deliverySlot, o.items, fmt(o.amount)]));
      rows.push([]);
    });
    downloadCSV(rows, `destination_${date}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
          <FiRefreshCw size={14} /> {loading ? 'Loading…' : 'Generate'}
        </button>
        {data && <>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiDownload size={14} /> CSV
          </button>
          <button onClick={() => printSection('dest-report')} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiPrinter size={14} /> Print
          </button>
        </>}
      </div>

      {data && (
        <div id="dest-report" className="space-y-6">
          <h2 className="text-lg font-bold text-green-800">Destination-wise Report — {date}</h2>
          {(data.grouped || []).map((g, gi) => (
            <div key={gi}>
              <h3 className="font-bold text-green-700 mb-2">📍 {g.area} — {g.pincode} ({g.orders.length} orders)</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="border border-gray-200 px-2 py-1.5 text-left text-xs">Order ID</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left text-xs">Buyer</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left text-xs">Phone</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left text-xs">Address</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left text-xs">Slot</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-right text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {g.orders.map((o, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="border border-gray-200 px-2 py-1.5 font-mono text-xs">{o.orderId}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-sm">{o.buyerName}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-500">{o.phone}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-600">{o.address}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-xs">{o.deliverySlot}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-green-700">{fmt(o.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {!data.grouped?.length && <p className="text-center text-gray-400 py-6">No orders for this date.</p>}
        </div>
      )}
      {!data && !loading && (
        <div className="text-center py-12 text-gray-400">Select a date and click Generate.</div>
      )}
    </div>
  );
}

// ── Main Reports Page ──────────────────────────
const TABS = [
  { key: 'procurement', label: 'Procurement',   icon: '📦' },
  { key: 'slot',        label: 'Slot-wise',      icon: '🕐' },
  { key: 'destination', label: 'Destination',    icon: '📍' },
];

export default function KoyambeduReports() {
  const [tab, setTab] = useState('procurement');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📊 Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Procurement, slot-wise, and destination reports</p>
        </div>

        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {tab === 'procurement' && <ProcurementTab />}
          {tab === 'slot'        && <SlotWiseTab />}
          {tab === 'destination' && <DestinationTab />}
        </div>
      </div>
    </div>
  );
}
