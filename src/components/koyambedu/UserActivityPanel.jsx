// ============================================
// KOYAMBEDU DAILY — Super Admin "User Activity"
// Everything a customer did: what they looked at, searched, put in the cart,
// started to pay for, ordered, got refunded… with filters, a per-customer
// profile + timeline, funnel / insight numbers and CSV export.
// Data: GET /koyambedu/admin/activity (+ /summary, /users, /user/:id, /export)
// ============================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { istDay } from '../express/OrderSearch';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(d));
const ago = (d) => {
  if (!d) return '—';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

const GROUPS = [
  ['browsing', '👀 Browsing'], ['cart', '🛒 Cart'], ['checkout', '💳 Payment'], ['orders', '📦 Orders'],
  ['wallet', '👛 Wallet'], ['requests', '📝 Requests'], ['account', '👤 Account'],
];
const GROUP_ICON = { browsing: '👀', cart: '🛒', checkout: '💳', orders: '📦', wallet: '👛', requests: '📝', account: '👤' };
const GROUP_TONE = {
  browsing: 'bg-sky-50 text-sky-700', cart: 'bg-amber-50 text-amber-700', checkout: 'bg-orange-50 text-orange-700', orders: 'bg-green-50 text-green-700',
  wallet: 'bg-purple-50 text-purple-700', requests: 'bg-pink-50 text-pink-700', account: 'bg-gray-100 text-gray-600',
};
const ORDER_STATUSES = ['payment_pending', 'placed', 'pending_confirmation', 'confirmed', 'packing', 'dispatched', 'delivered', 'cancelled', 'closed', 'refund_initiated'];
const PRESETS = [['Today', () => [istDay(0), istDay(0)]], ['Yesterday', () => [istDay(-1), istDay(-1)]], ['7 days', () => [istDay(-6), istDay(0)]], ['30 days', () => [istDay(-29), istDay(0)]], ['All time', () => ['', '']]];
const blank = { search: '', product: '', location: '', device: '', orderStatus: '', from: '', to: '', groups: [] };

const toParams = (f, extra = {}) => {
  const p = { ...extra };
  for (const [k, v] of Object.entries(f)) { if (k === 'groups') { if (v.length) p.group = v.join(','); } else if (v) p[k] = v; }
  return p;
};
const cls = 'border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-green-500';

export default function UserActivityPanel({ cartsView }) {
  const [view, setView] = useState('feed');           // feed | customers | insights | carts
  const [filters, setFilters] = useState({ ...blank, from: istDay(-6), to: istDay(0) });
  const [customer, setCustomer] = useState(null);     // { userId, name } → profile + timeline
  const preset = PRESETS.find(([, fn]) => { const [a, b] = fn(); return a === filters.from && b === filters.to; })?.[0];
  const dirty = Object.entries(filters).some(([k, v]) => (k === 'groups' ? v.length : v && !['from', 'to'].includes(k)));

  const set = (patch) => setFilters(f => ({ ...f, ...patch }));
  const openCustomer = (e) => { setCustomer({ userId: e.userId, name: e.userName }); setView('feed'); window.scrollTo({ top: 0 }); };

  return (
    <div className="space-y-3 pb-6">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {[['feed', 'Activity'], ['customers', 'Customers'], ['insights', 'Insights'], ['carts', 'Carts now']].map(([k, l]) => (
          <button key={k} onClick={() => { setView(k); if (k !== 'feed') setCustomer(null); }}
            className={`flex-1 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${view === k ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {view !== 'carts' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(([label, fn]) => (
              <button key={label} onClick={() => { const [from, to] = fn(); set({ from, to }); }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${preset === label ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
            ))}
            <input type="date" value={filters.from} onChange={e => set({ from: e.target.value })} className={cls} />
            <input type="date" value={filters.to} onChange={e => set({ to: e.target.value })} className={cls} />
          </div>
          {view === 'feed' && (
            <div className="flex flex-wrap gap-1.5">
              {GROUPS.map(([k, l]) => {
                const on = filters.groups.includes(k);
                return <button key={k} onClick={() => set({ groups: on ? filters.groups.filter(g => g !== k) : [...filters.groups, k] })}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>;
              })}
              {filters.groups.length === 0 && <span className="text-[11px] text-gray-400 self-center">showing everything</span>}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input placeholder="Customer name / phone / email" value={filters.search} onChange={e => set({ search: e.target.value })} className={`${cls} col-span-2 sm:col-span-1`} />
            <input placeholder="Product (e.g. Tomato)" value={filters.product} onChange={e => set({ product: e.target.value })} className={cls} />
            <input placeholder="Area / city / pincode" value={filters.location} onChange={e => set({ location: e.target.value })} className={cls} />
            {view === 'feed' && (
              <>
                <select value={filters.device} onChange={e => set({ device: e.target.value })} className={cls}>
                  <option value="">Any device</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option>
                </select>
                <select value={filters.orderStatus} onChange={e => set({ orderStatus: e.target.value })} className={cls}>
                  <option value="">Any order status</option>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            {dirty ? <button onClick={() => setFilters(f => ({ ...blank, from: f.from, to: f.to }))} className="text-[11px] font-bold text-gray-500 underline">Clear filters</button> : <span />}
            {view === 'feed' && <ExportButton filters={filters} customer={customer} />}
          </div>
        </div>
      )}

      {view === 'feed' && (customer
        ? <CustomerView customer={customer} filters={filters} onBack={() => setCustomer(null)} onOpen={openCustomer} />
        : <Feed filters={filters} onOpenCustomer={openCustomer} />)}
      {view === 'customers' && <Customers filters={filters} onOpen={(u) => { setCustomer({ userId: u.userId, name: u.name }); setView('feed'); window.scrollTo({ top: 0 }); }} />}
      {view === 'insights' && <Insights filters={filters} />}
      {view === 'carts' && cartsView}
    </div>
  );
}

function ExportButton({ filters, customer }) {
  const go = async () => {
    try {
      const res = await api.get('/koyambedu/admin/activity/export', { params: toParams(filters, customer ? { userId: customer.userId } : {}), responseType: 'blob' });
      const url = URL.createObjectURL(res.data); const a = document.createElement('a');
      a.href = url; a.download = `koyambedu-activity-${istDay(0)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };
  return <button onClick={go} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-green-700">⬇ Export CSV</button>;
}

// ── activity feed (newest first, grouped by day, cursor paging) ──────────────
function useFeed(filters, extra = {}) {
  const [events, setEvents] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const req = useRef(0);
  const key = JSON.stringify([filters, extra]);

  const load = useCallback((append, before) => {
    const id = ++req.current; if (!append) setLoading(true);
    return api.get('/koyambedu/admin/activity', { params: toParams(filters, { limit: 40, ...extra, ...(before ? { before } : {}) }) })
      .then(({ data }) => {
        if (id !== req.current) return;
        setEvents(prev => append ? [...prev, ...data.events] : data.events); setHasMore(!!data.hasMore); setCursor(data.nextBefore); setError('');
      })
      .catch(e => { if (id === req.current) { const m = e?.response?.data?.message || e?.message || 'Network problem'; setError(m); toast.error(`Failed to load activity — ${m}`); } })
      .finally(() => { if (id === req.current) setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { const t = setTimeout(() => load(false), 300); return () => clearTimeout(t); }, [load]);
  return { events, hasMore, loading, error, reload: () => load(false), more: () => load(true, cursor) };
}

function EventRow({ e, onOpenCustomer, showCustomer = true }) {
  return (
    <div className="flex gap-2.5 py-2.5 border-b border-gray-100 last:border-0">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${GROUP_TONE[e.group] || 'bg-gray-100'}`}>{GROUP_ICON[e.group] || '•'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 leading-snug">
          <b>{e.label}</b>{e.detail ? <span className="text-gray-600"> — {e.detail}</span> : null}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {showCustomer && <button onClick={() => onOpenCustomer?.(e)} className="font-semibold text-green-700 hover:underline">{e.userName}</button>}
          {showCustomer && e.phone ? ` · ${e.phone}` : ''}{showCustomer ? ' · ' : ''}{fmtTime(e.at)}
          {e.device ? ` · ${e.device}` : ''}{e.area ? ` · 📍${e.area}` : ''}
        </p>
      </div>
      {e.amount > 0 && ['order_placed', 'payment_started', 'in_cart', 'wallet_credit', 'wallet_debit'].includes(e.type) && (
        <span className={`text-xs font-black shrink-0 ${e.type === 'wallet_debit' ? 'text-red-600' : e.type === 'order_placed' ? 'text-green-700' : 'text-gray-600'}`}>{e.type === 'wallet_debit' ? '−' : ''}{inr(e.amount)}</span>
      )}
    </div>
  );
}

function Timeline({ feed, onOpenCustomer, showCustomer }) {
  const days = useMemo(() => {
    const out = []; let cur = null;
    for (const e of feed.events) { const k = dayKey(e.at); if (!cur || cur.k !== k) { cur = { k, label: fmtDay(e.at), items: [] }; out.push(cur); } cur.items.push(e); }
    return out;
  }, [feed.events]);
  if (feed.loading && feed.events.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Loading…</p>;
  if (feed.error && feed.events.length === 0) return <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center justify-between gap-2"><span>Couldn't load: {feed.error}</span><button onClick={feed.reload} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold">Retry</button></div>;
  if (!feed.events.length) return <p className="text-sm text-gray-400 text-center py-8">No activity matches these filters.</p>;
  return (
    <div className="space-y-3">
      {days.map(d => (
        <div key={d.k} className="bg-white rounded-2xl border border-gray-200 px-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-gray-400 pt-3">{d.label}</p>
          {d.items.map(e => <EventRow key={e.id} e={e} onOpenCustomer={onOpenCustomer} showCustomer={showCustomer} />)}
        </div>
      ))}
      {feed.hasMore && <div className="text-center"><button onClick={feed.more} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-green-700">Load more</button></div>}
    </div>
  );
}

function Feed({ filters, onOpenCustomer }) {
  const feed = useFeed(filters);
  return <Timeline feed={feed} onOpenCustomer={onOpenCustomer} showCustomer />;
}

// ── one customer: profile card + their own timeline ───────────────────────
function CustomerView({ customer, filters, onBack }) {
  const [p, setP] = useState(null);
  useEffect(() => { api.get(`/koyambedu/admin/activity/user/${customer.userId}`).then(({ data }) => setP(data.profile)).catch(() => toast.error('Failed to load customer')); }, [customer.userId]);
  const feed = useFeed({ ...filters, search: '' }, { userId: customer.userId });
  const Stat = ({ l, v, sub }) => <div className="bg-gray-50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400">{l}</p><p className="text-sm font-black text-gray-800">{v}</p>{sub && <p className="text-[10px] text-gray-400">{sub}</p>}</div>;
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs font-bold text-gray-500">← All customers' activity</button>
      <div className="bg-white rounded-2xl border border-gray-200 p-3">
        {!p ? <p className="text-sm text-gray-400">Loading…</p> : (
          <>
            <p className="font-black text-gray-800">{p.name}</p>
            <p className="text-xs text-gray-500">📞 {p.phone || '—'}{p.email ? ` · ✉️ ${p.email}` : ''}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Joined {p.joined ? fmtDay(p.joined) : '—'} · last active {ago(p.lastActive || p.lastLogin)}{p.device ? ` · ${p.device}` : ''}{p.area ? ` · 📍${p.area}${p.pincode ? ` ${p.pincode}` : ''}` : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <Stat l="Orders" v={p.orders} sub={p.cancelledOrders ? `${p.cancelledOrders} cancelled` : null} />
              <Stat l="Total spend" v={inr(p.spend)} sub={p.lastOrderAt ? `last ${ago(p.lastOrderAt)}` : 'no orders yet'} />
              <Stat l="Wallet" v={inr(p.walletBalance)} sub={p.walletReserved ? `${inr(p.walletReserved)} reserved` : null} />
              <Stat l="In cart now" v={`${p.cart.itemCount} · ${inr(p.cart.value)}`} sub={p.cart.updatedAt ? `updated ${ago(p.cart.updatedAt)}` : null} />
            </div>
            {p.cart.items.length > 0 && <p className="text-[11px] text-gray-500 mt-2">🛒 {p.cart.items.map(i => `${i.name}${i.gradeName ? ` (${i.gradeName})` : ''} × ${i.quantity}${i.unit || ''}`).join(', ')}</p>}
            {p.topViewed.length > 0 && <p className="text-[11px] text-gray-500 mt-1">👀 Most viewed: {p.topViewed.map(t => `${t.name} (${t.views})`).join(', ')}</p>}
          </>
        )}
      </div>
      <Timeline feed={feed} showCustomer={false} />
    </div>
  );
}

// ── customers list ────────────────────────────────────────────────────────
function Customers({ filters, onOpen }) {
  const [rows, setRows] = useState(null);
  const [sort, setSort] = useState('lastActive');
  const key = JSON.stringify([filters, sort]);
  useEffect(() => {
    setRows(null);
    const t = setTimeout(() => api.get('/koyambedu/admin/activity/users', { params: toParams(filters, { sort, limit: 100 }) })
      .then(({ data }) => setRows(data.users || [])).catch(e => { toast.error(e?.response?.data?.message || 'Failed to load customers'); setRows([]); }), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-400">{rows ? `${rows.length} customer${rows.length === 1 ? '' : 's'}` : 'Loading…'}</p>
        <select value={sort} onChange={e => setSort(e.target.value)} className={cls}>
          <option value="lastActive">Most recently active</option><option value="orders">Most orders</option><option value="spend">Highest spend</option><option value="events">Most activity</option>
        </select>
      </div>
      {rows?.map(u => (
        <button key={u.userId} onClick={() => onOpen(u)} className="w-full text-left bg-white rounded-2xl border border-gray-200 p-3 hover:border-green-400">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="font-bold text-sm text-gray-800 truncate">{u.name}</p><p className="text-[11px] text-gray-400">📞 {u.phone || '—'} · active {ago(u.lastActive)}</p></div>
            <div className="text-right shrink-0"><p className="font-black text-green-700 text-sm">{inr(u.spend)}</p><p className="text-[10px] text-gray-400">{u.orders} order{u.orders === 1 ? '' : 's'}</p></div>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">👀 {u.views} views · 🛒 {u.cartAdds} cart changes · {u.events} actions</p>
        </button>
      ))}
      {rows && rows.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No customers match.</p>}
    </div>
  );
}

// ── insights ──────────────────────────────────────────────────────────────
function Insights({ filters }) {
  const [s, setS] = useState(null);
  const key = JSON.stringify(filters);
  useEffect(() => {
    setS(null);
    const t = setTimeout(() => api.get('/koyambedu/admin/activity/summary', { params: toParams(filters) })
      .then(({ data }) => setS(data.summary)).catch(e => { toast.error(e?.response?.data?.message || 'Failed to load insights'); setS({}); }), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!s) return <p className="text-sm text-gray-400 text-center py-8">Loading…</p>;
  const f = s.funnel || { viewers: 0, carted: 0, ordered: 0 };
  const top = Math.max(f.viewers, f.carted, f.ordered, 1);
  const Bar = ({ l, v, tone }) => (
    <div className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600">{l}</span><b className="text-gray-800">{v}{f.viewers && l !== 'Viewed products' ? <span className="text-gray-400 font-normal"> · {Math.round((v / f.viewers) * 100)}%</span> : ''}</b></div>
      <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${tone}`} style={{ width: `${(v / top) * 100}%` }} /></div></div>
  );
  const List = ({ title, rows, render, empty }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-3"><p className="text-xs font-black text-gray-500 uppercase mb-2">{title}</p>
      {rows?.length ? rows.map((r, i) => <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">{render(r)}</div>) : <p className="text-xs text-gray-400">{empty}</p>}</div>
  );
  const maxEv = Math.max(1, ...(s.trend || []).map(d => d.events));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center"><p className="text-xl font-black text-gray-800">{s.activeUsers || 0}</p><p className="text-[10px] text-gray-400">active customers</p></div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center"><p className="text-xl font-black text-amber-600">{s.abandoned?.count || 0}</p><p className="text-[10px] text-gray-400">abandoned carts</p></div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center"><p className="text-xl font-black text-amber-600">{inr(s.abandoned?.value)}</p><p className="text-[10px] text-gray-400">sitting in carts</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-3">
        <p className="text-xs font-black text-gray-500 uppercase mb-2">From looking to buying</p>
        <Bar l="Viewed products" v={f.viewers} tone="bg-sky-400" /><Bar l="Added to cart" v={f.carted} tone="bg-amber-400" /><Bar l="Placed an order" v={f.ordered} tone="bg-green-500" />
        <p className="text-[10px] text-gray-400">Customers (not events) in the chosen dates. Product views are counted from when this feature went live.</p>
      </div>
      <List title="Most viewed products" rows={s.topViewed} empty="No product views yet" render={r => <><span className="text-gray-700 truncate pr-2">{r.name}</span><span className="text-gray-500 shrink-0">{r.views} views · {r.users} people</span></>} />
      <List title="Most added to cart" rows={s.topCarted} empty="No cart activity yet" render={r => <><span className="text-gray-700 truncate pr-2">{r.name}</span><span className="text-gray-500 shrink-0">{r.adds} changes · {r.users} people</span></>} />
      <List title="What customers search for" rows={s.topSearches} empty="No searches yet" render={r => <><span className="text-gray-700 truncate pr-2">“{r.query}”</span><span className="text-gray-500 shrink-0">{r.searches}× · {r.users} people</span></>} />
      <div className="bg-white rounded-2xl border border-gray-200 p-3">
        <p className="text-xs font-black text-gray-500 uppercase mb-2">Day by day</p>
        {(s.trend || []).length === 0 ? <p className="text-xs text-gray-400">No activity in this period</p> : s.trend.map(d => (
          <div key={d.day} className="flex items-center gap-2 text-[11px] py-0.5">
            <span className="w-16 text-gray-500 shrink-0">{fmtDay(d.day + 'T12:00:00+05:30').replace(/, \d{4}$/, '')}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-sky-400" style={{ width: `${(d.events / maxEv) * 100}%` }} /></div>
            <span className="w-24 text-right text-gray-500 shrink-0">{d.activeUsers} users · {d.orders} ord</span>
          </div>
        ))}
      </div>
    </div>
  );
}
