// ============================================
// ADMIN — SELLER ORDER HISTORY + SETTLEMENTS
// ============================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowLeft, FiFilter, FiRefreshCw, FiCheckCircle, FiClock,
  FiDollarSign, FiPackage, FiTrendingUp, FiCalendar, FiDownload,
  FiChevronLeft, FiChevronRight, FiX,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ORDER_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'placed',      label: 'Placed' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'processing',  label: 'Processing' },
  { value: 'shipped',     label: 'Shipped' },
  { value: 'delivered',   label: 'Delivered' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'returned',    label: 'Returned' },
];

const STATUS_COLORS = {
  placed:     'bg-blue-50 text-blue-700',
  confirmed:  'bg-indigo-50 text-indigo-700',
  processing: 'bg-yellow-50 text-yellow-700',
  shipped:    'bg-purple-50 text-purple-700',
  delivered:  'bg-green-50 text-green-700',
  cancelled:  'bg-red-50 text-red-700',
  returned:   'bg-gray-100 text-gray-600',
};

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function SellerOrders() {
  const { sellerId } = useParams();
  const navigate     = useNavigate();

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [settling, setSettling] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [status,  setStatus]  = useState('');
  const [settled, setSettled] = useState('');
  const [sort,    setSort]    = useState('newest');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [day,     setDay]     = useState('');
  const [page,    setPage]    = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status, settled, sort, page, limit: 25 };
      if (day)        params.day  = day;
      else if (from)  params.from = from;
      if (!day && to) params.to   = to;

      const { data: res } = await api.get(`/admin/sellers/${sellerId}/orders`, { params });
      setData(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally { setLoading(false); }
  }, [sellerId, status, settled, sort, page, day, from, to]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [status, settled, sort, day, from, to]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const unsettled = (data?.orders || []).filter(o => o.payout?.status !== 'paid').map(o => o._id);
    if (selected.size === unsettled.length) setSelected(new Set());
    else setSelected(new Set(unsettled));
  };

  const handleSettle = async () => {
    if (!selected.size) return toast.error('Select orders to settle');
    setSettling(true);
    try {
      const { data: res } = await api.post(`/admin/sellers/${sellerId}/mark-settled`, { orderIds: [...selected] });
      toast.success(res.message);
      setSelected(new Set());
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Settlement failed');
    } finally { setSettling(false); }
  };

  const clearFilters = () => {
    setStatus(''); setSettled(''); setSort('newest');
    setFrom(''); setTo(''); setDay('');
  };

  const hasFilter = status || settled || day || from || to || sort !== 'newest';

  const seller = data?.seller;
  const stats  = data?.stats || {};

  return (
    <>
      <Helmet><title>{seller?.businessName || 'Seller'} Orders — Eptomart Admin</title></Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/admin/sellers')} className="mt-0.5 p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <FiArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {seller?.businessName || 'Seller'} — Orders
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {seller?.email}{seller?.phone ? ` · ${seller.phone}` : ''}{seller?.gstNumber ? ` · GST: ${seller.gstNumber}` : ''}
            </p>
          </div>
          <button onClick={fetchOrders} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FiPackage,    label: 'Total Orders',    val: stats.totalOrders  || 0,                     color: 'text-blue-600',   bg: 'bg-blue-50' },
            { icon: FiDollarSign, label: 'Total Revenue',   val: fmt(stats.totalRevenue),                     color: 'text-green-600',  bg: 'bg-green-50' },
            { icon: FiCheckCircle,label: 'Settled',         val: stats.settledCount || 0,                     color: 'text-emerald-600',bg: 'bg-emerald-50' },
            { icon: FiTrendingUp, label: 'Net Payout',      val: fmt(stats.totalNetPayout),                   color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-bold text-gray-800">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top Products */}
        {data?.topProducts?.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FiTrendingUp size={15} className="text-orange-500" /> Top Selling Products
            </p>
            <div className="flex flex-wrap gap-2">
              {data.topProducts.map(p => (
                <div key={p._id} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 text-xs">
                  <span className="font-semibold text-orange-700">{p.name}</span>
                  <span className="text-gray-500">{p.totalSold} sold · {fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date shortcuts */}
            <div className="flex items-center gap-1.5">
              <FiCalendar size={14} className="text-gray-400" />
              <input type="date" value={day} onChange={e => { setDay(e.target.value); setFrom(''); setTo(''); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
              <span className="text-xs text-gray-400">or range</span>
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setDay(''); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
              <span className="text-xs text-gray-400">→</span>
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setDay(''); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
            </div>

            {/* Status */}
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300">
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Settlement */}
            <select value={settled} onChange={e => setSettled(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300">
              <option value="">All Payment Status</option>
              <option value="true">Settled / Paid</option>
              <option value="false">Pending Settlement</option>
            </select>

            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="topselling">Highest Value</option>
            </select>

            {hasFilter && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                <FiX size={13} /> Clear filters
              </button>
            )}
          </div>

          {/* Batch settle bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600 font-medium">{selected.size} orders selected</span>
              <button onClick={handleSettle} disabled={settling}
                className="flex items-center gap-1.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-xl transition-colors disabled:opacity-60">
                <FiCheckCircle size={14} /> {settling ? 'Settling…' : 'Mark Settled'}
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading orders…</div>
          ) : !data?.orders?.length ? (
            <div className="p-12 text-center text-gray-400 text-sm">No orders found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3">
                      <input type="checkbox"
                        checked={selected.size > 0 && selected.size === (data?.orders || []).filter(o => o.payout?.status !== 'paid').length}
                        onChange={toggleAll}
                        className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Order</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Date</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Customer</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Items</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Amount</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Net Payout</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Status</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-xs">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.orders.map(order => {
                    const isSettled  = order.payout?.status === 'paid';
                    const isSelected = selected.has(order._id);
                    return (
                      <tr key={order._id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}>
                        <td className="px-4 py-3">
                          {!isSettled && (
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(order._id)} className="rounded" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/admin/orders?q=${order.orderId}`)}
                            className="font-mono text-xs font-bold text-orange-600 hover:underline">
                            #{order.orderId}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(order.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-800">{order.user?.name || '—'}</p>
                          <p className="text-[11px] text-gray-400">{order.user?.phone || order.user?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {(order.items || []).slice(0, 2).map((item, i) => (
                              <p key={i} className="text-[11px] text-gray-600 truncate max-w-[160px]">
                                {item.name} ×{item.quantity}
                              </p>
                            ))}
                            {order.items?.length > 2 && (
                              <p className="text-[11px] text-gray-400">+{order.items.length - 2} more</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {fmt(order.pricing?.total)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                          {order.payout?.netPayout ? fmt(order.payout.netPayout) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isSettled ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-green-700">
                              <FiCheckCircle size={12} /> Settled
                              {order.payout?.paidAt && <span className="text-gray-400 ml-1">{fmtDate(order.payout.paidAt)}</span>}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-orange-500">
                              <FiClock size={12} /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {data.page} of {data.pages} · {data.total} orders
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <FiChevronLeft size={15} />
                </button>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={data.page >= data.pages}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
