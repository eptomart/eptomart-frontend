// ============================================
// UNIFIED MY ORDERS — one page, every vertical.
// Tabs are config-driven from /api/v2/orders/verticals:
// future verticals appear automatically.
// ============================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPackage, FiFilter, FiX } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import Loader from '../../components/common/Loader';
import OrderCard from '../../components/orders/OrderCard';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ALL_TAB = { key: 'all', name: 'All Orders', emoji: '📦', color: '#374151' };

// ── Date range presets ────────────────────────
const fmtYMD = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const DATE_PRESETS = [
  { key: 'all',        label: 'All Time' },
  { key: 'today',      label: 'Today' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'last_week',  label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom',     label: 'Between Dates…' },
];

function presetRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  switch (key) {
    case 'today':      return [today, today];
    case 'this_week': {
      const start = new Date(today); start.setDate(today.getDate() - dow);
      return [start, today];
    }
    case 'last_week': {
      const end = new Date(today); end.setDate(today.getDate() - dow - 1);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      return [start, end];
    }
    case 'this_month': return [new Date(now.getFullYear(), now.getMonth(), 1), today];
    case 'last_month': return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      new Date(now.getFullYear(), now.getMonth(), 0),
    ];
    default: return [null, null];
  }
}

const STATUS_OPTIONS = [
  { value: '',                 label: 'All Statuses' },
  { value: 'placed',           label: 'Placed' },
  { value: 'seller_review',    label: 'Under Review' },
  { value: 'confirmed',        label: 'Confirmed' },
  { value: 'packing,packed',   label: 'Packing' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'reported',         label: 'Reported' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'closed',           label: 'Closed' },
  { value: 'refund_processing,refunded', label: 'Refunds' },
];

export default function UnifiedOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const [tabs,    setTabs]    = useState([ALL_TAB]);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Filters ──
  const [showFilters,  setShowFilters]  = useState(false);
  const [datePreset,   setDatePreset]   = useState('all');
  const [customFrom,   setCustomFrom]   = useState('');
  const [customTo,     setCustomTo]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') return [customFrom || null, customTo || null];
    const [f, t] = presetRange(datePreset);
    return [f ? fmtYMD(f) : null, t ? fmtYMD(t) : null];
  }, [datePreset, customFrom, customTo]);

  const filtersActive = datePreset !== 'all' || !!statusFilter;

  // Load vertical tabs once (registry-driven)
  useEffect(() => {
    api.get('/v2/orders/verticals')
      .then(r => setTabs([ALL_TAB, ...(r.data.verticals || [])]))
      .catch(() => {}); // fall back to All tab only
  }, []);

  const loadOrders = useCallback(async (tab, pageNum, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = { vertical: tab === 'all' ? 'all' : tab, page: pageNum, limit: 20 };
      const [from, to] = dateRange;
      if (from) params.from = from;
      if (to)   params.to   = to;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/v2/orders', { params });
      setOrders(prev => append ? [...prev, ...(data.orders || [])] : (data.orders || []));
      setHasMore(!!data.hasMore);
      setPage(pageNum);
      if (data.failedVerticals?.length) {
        toast.error(`Some orders couldn't be loaded (${data.failedVerticals.join(', ')})`);
      }
    } catch {
      if (!append) setOrders([]);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dateRange, statusFilter]);

  useEffect(() => { loadOrders(activeTab, 1, false); }, [activeTab, loadOrders]);

  const switchTab = (key) => {
    setSearchParams(key === 'all' ? {} : { tab: key }, { replace: true });
  };

  return (
    <>
      <Helmet><title>My Orders — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">📦 My Orders</h1>

        {/* ── Vertical tabs (config-driven) ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-3">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => switchTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={activeTab === tab.key ? { background: tab.color } : {}}>
              {tab.emoji} {tab.shortName || tab.name}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="mb-4">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              filtersActive ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            <FiFilter size={12} />
            Filters{filtersActive ? ' · On' : ''}
            {filtersActive && (
              <span onClick={(e) => { e.stopPropagation(); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(''); }}
                className="ml-1 rounded-full bg-white/20 p-0.5"><FiX size={11} /></span>
            )}
          </button>

          {showFilters && (
            <div className="mt-2 bg-white rounded-2xl border border-gray-100 p-3 space-y-3"
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              {/* Date presets */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Order Date</p>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_PRESETS.map(p => (
                    <button key={p.key} onClick={() => setDatePreset(p.key)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        datePreset === p.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-2.5 py-2 text-xs" />
                    <span className="text-gray-400 text-xs">to</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-2.5 py-2 text-xs" />
                  </div>
                )}
              </div>
              {/* Status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Order Status</p>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <Loader fullPage={false} />
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage size={64} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No orders yet</h3>
            <Link to="/" className="btn-primary text-sm">Start Shopping</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {orders.map(order => (
                <OrderCard key={`${order.vertical}-${order.id}`} order={order} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button onClick={() => loadOrders(activeTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-400">
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
