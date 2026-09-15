// ============================================
// KOYAMBEDU ADMIN — ORDER FULFILLMENT TAB
// ============================================
// New, standalone tab. Fetches from its own backend endpoints
// (GET /koyambedu/admin/orders/fulfillment, PATCH .../fulfilled-by,
// GET .../fulfillment/export) — completely separate from the existing
// Orders tab's data/endpoint, so nothing there is affected.
import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const STATUS_BADGE = {
  payment_pending: 'bg-red-100 text-red-700',
  placed: 'bg-blue-100 text-blue-700',
  pending_confirmation: 'bg-amber-100 text-amber-700',
  sa_review_submitted: 'bg-amber-100 text-amber-700',
  price_revision_pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  packing: 'bg-purple-100 text-purple-700',
  dispatched: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  reported: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-200 text-gray-600',
  closed: 'bg-gray-200 text-gray-600',
  refund_initiated: 'bg-pink-100 text-pink-700',
};

// Same values as the KoyambeduOrder.orderStatus enum — kept in one place so
// the checkbox list and badge colours above stay in sync.
const STATUS_OPTIONS = [
  { value: 'payment_pending',        label: 'Payment Pending' },
  { value: 'placed',                 label: 'Placed' },
  { value: 'pending_confirmation',   label: 'Pending Confirmation' },
  { value: 'sa_review_submitted',    label: 'SA Review Submitted' },
  { value: 'price_revision_pending', label: 'Price Revision Pending' },
  { value: 'confirmed',              label: 'Confirmed' },
  { value: 'packing',                label: 'Packing' },
  { value: 'dispatched',             label: 'Dispatched' },
  { value: 'delivered',              label: 'Delivered' },
  { value: 'reported',               label: 'Reported' },
  { value: 'cancelled',              label: 'Cancelled' },
  { value: 'closed',                 label: 'Closed' },
  { value: 'refund_initiated',       label: 'Refund Initiated' },
];

export default function FulfillmentTab() {
  const [from, setFrom] = useState(daysAgoStr(7));
  const [to, setTo]     = useState(todayStr());
  const [statuses, setStatuses] = useState([]); // empty = all statuses
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf' | null
  const [drafts, setDrafts] = useState({}); // orderId -> in-progress text
  const [saving, setSaving] = useState({}); // orderId -> bool

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (statuses.length) params.set('statuses', statuses.join(','));
      const { data } = await api.get(`/koyambedu/admin/orders/fulfillment?${params}`);
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, [from, to, statuses]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = (value) => {
    setStatuses(s => s.includes(value) ? s.filter(v => v !== value) : [...s, value]);
  };

  const saveFulfilledBy = async (order) => {
    const value = drafts[order._id] ?? order.fulfilledBy ?? '';
    if (value === (order.fulfilledBy || '')) return; // no change
    setSaving(s => ({ ...s, [order._id]: true }));
    try {
      await api.patch(`/koyambedu/admin/orders/${order._id}/fulfilled-by`, { fulfilledBy: value });
      setOrders(list => list.map(o => o._id === order._id ? { ...o, fulfilledBy: value } : o));
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(s => ({ ...s, [order._id]: false }));
    }
  };

  const exportFile = async (format) => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ from, to, format });
      if (statuses.length) params.set('statuses', statuses.join(','));
      const res = await api.get(`/koyambedu/admin/orders/fulfillment/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `koyambedu-fulfillment-${from}-to-${to}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} downloaded!`);
    } catch {
      toast.error('Export failed');
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-800 mb-3">📋 Order Fulfillment</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <button onClick={load} disabled={loading}
            className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Loading…' : 'Search'}
          </button>
          <div className="flex-1" />
          <button onClick={() => exportFile('excel')} disabled={!!exporting || orders.length === 0}
            className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            {exporting === 'excel' ? 'Exporting…' : '📊 Export Excel'}
          </button>
          <button onClick={() => exportFile('pdf')} disabled={!!exporting || orders.length === 0}
            className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50">
            {exporting === 'pdf' ? 'Exporting…' : '📄 Export PDF'}
          </button>
        </div>

        <div className="mt-3">
          <label className="text-xs text-gray-500 font-medium block mb-1.5">Filter by status (leave all unchecked to show every status)</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => {
              const checked = statuses.includes(opt.value);
              return (
                <label key={opt.value}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition ${checked ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleStatus(opt.value)} className="accent-green-700" />
                  {opt.label}
                </label>
              );
            })}
            {statuses.length > 0 && (
              <button onClick={() => setStatuses([])} className="text-xs font-bold text-gray-500 underline px-1">Clear</button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-2">{orders.length} order{orders.length === 1 ? '' : 's'} found for this date range (based on order date).</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-3 py-2">Order ID</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Order Date</th>
              <th className="px-3 py-2">Delivery</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-center">Items</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 min-w-[200px]">Fulfilled By</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-bold text-gray-700 whitespace-nowrap">{o.orderId}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-700">{o.customerName}</div>
                  <div className="text-xs text-gray-400">{o.customerPhone}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN') : '—'}
                  {o.deliverySlot && <div className="text-[10px] text-gray-400">{o.deliverySlot}</div>}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap ${STATUS_BADGE[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {o.orderStatus}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{o.itemCount}</td>
                <td className="px-3 py-2 text-right font-bold text-gray-700">₹{o.total.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={drafts[o._id] ?? o.fulfilledBy ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [o._id]: e.target.value }))}
                    onBlur={() => saveFulfilledBy(o)}
                    placeholder="Who fulfilled this order?"
                    disabled={!!saving[o._id]}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500 disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">No orders found for this date range</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
