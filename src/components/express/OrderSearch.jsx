// ============================================
// EPTOMART EXPRESS — shared order search UI
// Used by the store owner/manager Orders tab (scoped to one store by the
// backend) and the super-admin Orders tab (all stores). One hook + one filter
// bar + one summary strip so both screens behave identically.
// ============================================
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiSearch } from 'react-icons/fi';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const STATUS_OPTIONS = [['', 'All statuses'], ['placed', 'Placed'], ['confirmed', 'Confirmed'], ['preparing', 'Preparing'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.filter(([k]) => k));

// Calendar day in IST as YYYY-MM-DD, `offset` days from today
export function istDay(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
const PRESETS = [['Today', () => [istDay(0), istDay(0)]], ['Yesterday', () => [istDay(-1), istDay(-1)]], ['7 days', () => [istDay(-6), istDay(0)]], ['30 days', () => [istDay(-29), istDay(0)]], ['All time', () => ['', '']]];

export const blankFilters = { search: '', item: '', location: '', status: '', payment: '', storeId: '', from: '', to: '' };

/**
 * @param client    axios instance
 * @param listPath  e.g. '/orders' or '/express/admin/orders'
 * @param filters   current filter object (see blankFilters)
 */
export function useOrderSearch(client, listPath, filters, { pageSize = 30 } = {}) {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  const params = useCallback((p) => {
    const o = { limit: pageSize, page: p };
    for (const [k, v] of Object.entries(filters)) if (v) o[k] = v;
    return o;
  }, [filters, pageSize]);

  const fetchPage = useCallback((p, append) => {
    const id = ++reqId.current;
    if (!append) setLoading(true);
    return client.get(listPath, { params: params(p) })
      .then(({ data }) => {
        if (id !== reqId.current) return; // a newer search superseded this one
        setOrders(prev => append ? [...prev, ...(data.orders || [])] : (data.orders || []));
        setSummary(data.summary || null); setTotal(data.total || 0); setHasMore(!!data.hasMore); setPage(p); setError('');
      })
      .catch((e) => { if (id === reqId.current) { const m = e?.response?.data?.message || e?.message || 'Network problem'; setError(m); toast.error(`Failed to load orders — ${m}`); } })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [client, listPath, params]);

  // Text boxes are debounced; dropdowns / dates apply right away.
  const key = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => { fetchPage(1, false); }, 300);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    orders, summary, total, hasMore, loading, error,
    reload: () => fetchPage(1, false),
    loadMore: () => fetchPage(page + 1, true),
  };
}

export async function downloadOrdersCsv(client, exportPath, filters) {
  try {
    const params = {}; for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    const res = await client.get(exportPath, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `orders-${istDay(0)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) { toast.error('Export failed'); }
}

export function OrderFilterBar({ filters, onChange, stores, showPayment = false, onExport }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const cls = 'border rounded-lg px-2.5 py-1.5 text-xs bg-white';
  const activePreset = PRESETS.find(([, fn]) => { const [f, t] = fn(); return f === filters.from && t === filters.to; })?.[0];
  const dirty = Object.entries(filters).some(([k, v]) => v && v !== blankFilters[k]);
  return (
    <div className="bg-white border rounded-xl p-3 mb-3">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESETS.map(([label, fn]) => (
          <button key={label} onClick={() => { const [from, to] = fn(); set({ from, to }); }}
            className={`px-3 py-1 rounded-full text-[11px] font-bold ${activePreset === label ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
        ))}
        <input type="date" value={filters.from} onChange={e => set({ from: e.target.value })} className={cls} title="From" />
        <input type="date" value={filters.to} onChange={e => set({ to: e.target.value })} className={cls} title="To" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="relative col-span-2 sm:col-span-1">
          <FiSearch className="absolute left-2.5 top-2.5 text-gray-400" size={12} />
          <input placeholder="Order ID, customer, phone" value={filters.search} onChange={e => set({ search: e.target.value })} className={`${cls} w-full pl-7`} />
        </div>
        <input placeholder="Item (e.g. Tomato)" value={filters.item} onChange={e => set({ item: e.target.value })} className={cls} />
        <input placeholder="Location / area / pincode" value={filters.location} onChange={e => set({ location: e.target.value })} className={cls} />
        {stores && (
          <select value={filters.storeId} onChange={e => set({ storeId: e.target.value })} className={cls}>
            <option value="">All stores</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        )}
        <select value={filters.status} onChange={e => set({ status: e.target.value })} className={cls}>
          {STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {showPayment && (
          <select value={filters.payment} onChange={e => set({ payment: e.target.value })} className={cls}>
            <option value="">Payment: all</option><option value="paid">Paid</option><option value="pending">Payment pending</option><option value="failed">Payment failed</option>
          </select>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        {dirty ? <button onClick={() => onChange({ ...blankFilters })} className="text-[11px] font-bold text-gray-500 underline">Clear filters</button> : <span />}
        {onExport && <button onClick={onExport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-indigo-700"><FiDownload size={12} /> Export CSV</button>}
      </div>
    </div>
  );
}

export function OrderSummary({ summary, total }) {
  if (!summary) return null;
  const statuses = Object.entries(summary.byStatus || {});
  return (
    <div className="rounded-xl p-3 mb-3 text-white" style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)' }}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xl font-black leading-none">{summary.count}</p><p className="text-[10px] text-indigo-200 mt-1">orders</p></div>
        <div><p className="text-xl font-black leading-none">{inr(summary.gross)}</p><p className="text-[10px] text-indigo-200 mt-1">paid</p></div>
        <div><p className="text-xl font-black leading-none">{inr(summary.net)}</p><p className="text-[10px] text-indigo-200 mt-1">net of {inr(summary.refunded)} refunds</p></div>
      </div>
      {statuses.length > 0 && (
        <p className="text-[10px] text-indigo-200 mt-2 text-center">{statuses.map(([k, n]) => `${STATUS_LABEL[k] || k} ${n}`).join(' · ')}</p>
      )}
    </div>
  );
}

export function LoadMore({ hasMore, shown, total, onClick }) {
  if (!shown) return null;
  return (
    <div className="text-center mt-3">
      <p className="text-[11px] text-gray-400 mb-1">Showing {shown} of {total}</p>
      {hasMore && <button onClick={onClick} className="px-4 py-2 rounded-lg border text-xs font-bold text-indigo-700 bg-white">Load more</button>}
    </div>
  );
}
