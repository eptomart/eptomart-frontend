// ============================================
// KOYAMBEDU SELLER ADMIN — Orders View
// Per-item review: confirm / decline / reduce-qty
// Submit for Super Admin approval
// NO cancel / NO refund initiation (SA restriction)
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiFilter, FiPackage, FiChevronDown, FiChevronUp,
  FiCheckCircle, FiXCircle, FiEdit2, FiSend, FiAlertTriangle,
} from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  placed:                 'bg-blue-100 text-blue-700',
  pending_confirmation:   'bg-yellow-100 text-yellow-700',
  reported:               'bg-rose-100 text-rose-700',
  sa_review_submitted:    'bg-purple-100 text-purple-700',
  price_revision_pending: 'bg-orange-100 text-orange-700',
  confirmed:              'bg-green-100 text-green-700',
  packing:                'bg-purple-100 text-purple-700',
  dispatched:             'bg-sky-100 text-sky-700',
  delivered:              'bg-emerald-100 text-emerald-700',
  cancelled:              'bg-red-100 text-red-700',
  refund_initiated:       'bg-gray-100 text-gray-600',
};
const STATUS_LABEL = {
  placed: 'Placed', pending_confirmation: 'Awaiting Review',
  sa_review_submitted: 'Submitted for Approval',
  price_revision_pending: 'Price Revision', confirmed: 'Confirmed',
  packing: 'Procurement in Progress', dispatched: 'On the Way',
  delivered: 'Delivered', reported: 'Reported by Customer', cancelled: 'Cancelled', refund_initiated: 'Refund',
};

const ITEM_STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fffbeb' },
  confirmed: { label: 'Confirmed', color: '#16a34a', bg: '#f0fdf4' },
  declined:  { label: 'Declined',  color: '#dc2626', bg: '#fef2f2' },
  partial:   { label: 'Partial',   color: '#9333ea', bg: '#faf5ff' },
};

const SLOTS = ['Morning (6AM-9AM)', 'Afternoon (12PM-3PM)', 'Evening (4PM-7PM)'];

const SA_STATUS_OPTIONS = [
  { value: 'confirmed',  label: '✅ Confirmed',    desc: 'Order confirmed, ready to pack' },
  { value: 'packing',    label: '📦 Procurement',  desc: 'Procurement is in progress' },
  { value: 'dispatched', label: '🚚 Dispatched',   desc: 'Out for delivery' },
  { value: 'delivered',  label: '🏠 Delivered',    desc: 'Delivered to customer' },
];

const DECLINE_REASONS = ['unavailable', 'out_of_stock', 'quality_issue', 'seller_issue', 'other'];

// Can SA review items for this order?
const canReviewItems = (order) =>
  ['placed', 'pending_confirmation'].includes(order.orderStatus)
  && order.saReview?.status !== 'submitted';

// Has SA made any item changes?
const hasAnyReview = (order) =>
  (order.items || []).some(it => it.itemStatus && it.itemStatus !== 'pending');

// Approval is only needed when something was declined or reduced
const hasDeclines = (order) =>
  (order.items || []).some(it => ['declined', 'partial'].includes(it.itemStatus));

export default function KoyambeduSellerAdminOrders() {
  const navigate = useNavigate();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState({});
  const [filters,   setFilters]   = useState({ orderDate: '', deliveryDate: '', deliverySlot: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Status modal (for confirmed/packing/dispatched/delivered)
  const [statusModal,    setStatusModal]    = useState(null);
  const [newStatus,      setNewStatus]      = useState('');
  const [delivPartner,   setDelivPartner]   = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Per-item action state
  const [itemAction,   setItemAction]   = useState(null); // { orderId, itemId, type: 'confirm'|'decline'|'reduce' }
  const [declineReason, setDeclineReason] = useState('unavailable');
  const [reduceQty,    setReduceQty]    = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Submit for approval
  const [submitting, setSubmitting] = useState(null); // orderId

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.orderDate)    params.orderDate    = filters.orderDate;
      if (filters.deliveryDate) params.deliveryDate = filters.deliveryDate;
      if (filters.deliverySlot) params.deliverySlot = filters.deliverySlot;
      if (filters.status)       params.status       = filters.status;
      const { data } = await api.get('/koyambedu/seller-admin/orders', { params });
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  // ── Per-item actions ──────────────────────────
  const confirmAll = async (orderId) => {
    if (!confirm('Confirm ALL pending items at their ordered quantities?')) return;
    try {
      const { data } = await api.post(`/koyambedu/seller-admin/orders/${orderId}/confirm-all`);
      toast.success(data.message || 'All items confirmed');
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not confirm items');
    }
  };

  const markAvailable = async (orderId, itemId, itemName) => {
    if (!confirm(`Mark "${itemName}" as available? The decline/reduction and its refund will be withdrawn and the original quantity confirmed.`)) return;
    try {
      const { data } = await api.patch(`/koyambedu/seller-admin/orders/${orderId}/items/${itemId}/available`);
      toast.success(data.message || 'Item restored');
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not restore item');
    }
  };

  const openItemAction = (orderId, itemId, type, item) => {
    setItemAction({ orderId, itemId, type });
    setDeclineReason('unavailable');
    setReduceQty(String(item?.orderedQty || item?.quantity || ''));
  };

  const submitItemAction = async () => {
    if (!itemAction) return;
    setActionLoading(true);
    const { orderId, itemId, type } = itemAction;
    try {
      if (type === 'confirm') {
        await api.patch(`/koyambedu/seller-admin/orders/${orderId}/items/${itemId}/confirm`);
        toast.success('Item confirmed');
      } else if (type === 'decline') {
        await api.patch(`/koyambedu/seller-admin/orders/${orderId}/items/${itemId}/decline`, { reason: declineReason });
        toast.success('Item declined');
      } else if (type === 'reduce') {
        const qty = Number(reduceQty);
        if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); setActionLoading(false); return; }
        await api.patch(`/koyambedu/seller-admin/orders/${orderId}/items/${itemId}/reduce-qty`, { confirmedQty: qty });
        toast.success('Quantity updated');
      }
      setItemAction(null);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  // ── Submit for Super Admin approval ──────────
  const submitForApproval = async (orderId) => {
    setSubmitting(orderId);
    try {
      await api.post(`/koyambedu/seller-admin/orders/${orderId}/submit-review`);
      toast.success('Order submitted for Super Admin approval');
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submit failed');
    } finally { setSubmitting(null); }
  };

  // ── Status modal ──────────────────────────────
  const openStatusModal = (order) => {
    setStatusModal(order);
    setNewStatus(order.orderStatus);
    setDelivPartner(order.deliveryPartner || '');
  };

  const submitStatusUpdate = async () => {
    if (!newStatus) { toast.error('Select a status'); return; }
    setStatusUpdating(true);
    try {
      await api.patch(`/koyambedu/seller-admin/orders/${statusModal._id}/status`, {
        status: newStatus, deliveryPartner: delivPartner,
      });
      toast.success('Status updated');
      setOrders(prev => prev.map(o => o._id === statusModal._id ? { ...o, orderStatus: newStatus } : o));
      setStatusModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally { setStatusUpdating(false); }
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F5F4F2' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">Received Orders</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white active:scale-95 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiFilter size={12} /> Filters {(filters.orderDate || filters.deliveryDate || filters.deliverySlot || filters.status) ? '●' : ''}
          </button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-emerald-200 mb-1">Order Date</p>
              <input type="date" value={filters.orderDate}
                onChange={e => setFilters(f => ({ ...f, orderDate: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 mb-1">Delivery Date</p>
              <input type="date" value={filters.deliveryDate}
                onChange={e => setFilters(f => ({ ...f, deliveryDate: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none" />
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-emerald-200 mb-1">Delivery Slot</p>
              <select value={filters.deliverySlot}
                onChange={e => setFilters(f => ({ ...f, deliverySlot: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none">
                <option value="">All Slots</option>
                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 mb-1">Order Status</p>
              <select value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl px-2.5 py-2 text-xs bg-white/90 text-gray-800 outline-none">
                <option value="">All statuses</option>
                <option value="placed,pending_confirmation">Awaiting Review</option>
                <option value="sa_review_submitted">Submitted for Approval</option>
                <option value="confirmed">Confirmed</option>
                <option value="packing">Procurement in Progress</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="reported">Reported by Customer</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button onClick={() => setFilters({ orderDate: '', deliveryDate: '', deliverySlot: '' })}
              className="col-span-2 text-xs text-emerald-200 underline text-center">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
          <FiPackage size={40} className="text-gray-300" />
          <p className="font-bold text-gray-600">No orders found</p>
          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {orders.map(order => {
          const isExpanded = expanded[order._id];
          const myItems    = order.myItems || order.items || [];
          const calc       = order.calculatedPricing || {};
          const canReview  = canReviewItems(order);
          const alreadySubmitted = order.saReview?.status === 'submitted';
          const reviewable = hasAnyReview(order) || myItems.some(it => !it.itemStatus || it.itemStatus === 'pending');
          const pendingRefund = calc.declinedRefundAmount || order.saReview?.pendingRefundAmount || 0;
          const isPostApproval = ['confirmed','packing','dispatched'].includes(order.orderStatus);
          const isFinalised    = ['delivered','reported','closed','cancelled'].includes(order.orderStatus);

          return (
            <div key={order._id} className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

              {/* Order header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[order.orderStatus] || order.orderStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>📦 {myItems.length} item{myItems.length !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-green-700">
                    ₹{(calc.finalPayableAmount || order.pricing?.total || 0).toFixed(0)}
                  </span>
                </div>

                {(order.deliveryDate || order.deliverySlot) && (
                  <div className="text-xs text-gray-500 mb-2">
                    {order.deliveryDate && (
                      <span className="mr-3">📅 {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                    )}
                    {order.deliverySlot && <span>🕐 {order.deliverySlot}</span>}
                  </div>
                )}

                {/* Declined value display — refund handling is between Super Admin & customer */}
                {pendingRefund > 0 && !['confirmed','packing','dispatched','delivered','closed','cancelled'].includes(order.orderStatus) && (
                  <div className="mb-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <FiAlertTriangle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <p className="text-xs font-bold text-red-700">Declined value: ₹{pendingRefund.toFixed(2)}</p>
                  </div>
                )}

                {/* Already submitted notice */}
                {alreadySubmitted && (
                  <div className="mb-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                    <FiSend size={13} style={{ color: '#9333ea', flexShrink: 0 }} />
                    <div>
                      <p className="text-xs font-bold text-purple-700">Submitted for approval</p>
                      <p className="text-[10px] text-purple-500">Super Admin is reviewing</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => toggle(order._id)}
                    className="flex items-center gap-1 text-xs font-bold text-green-700 active:opacity-70">
                    {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                    {isExpanded ? 'Hide items' : 'View items'}
                  </button>

                  {/* Confirm All — fastest path when everything is available */}
                  {canReview && myItems.some(it => !it.itemStatus || it.itemStatus === 'pending') && (
                    <button
                      onClick={() => confirmAll(order._id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl active:scale-95 transition"
                      style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
                      <FiCheckCircle size={12} /> Confirm All
                    </button>
                  )}

                  {/* Submit for approval — only when review done and not yet submitted */}
                  {canReview && hasDeclines(order) && !alreadySubmitted && (
                    <button
                      onClick={() => submitForApproval(order._id)}
                      disabled={submitting === order._id}
                      className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl active:scale-95 transition disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#7e22ce,#9333ea)' }}>
                      <FiSend size={12} />
                      {submitting === order._id ? 'Submitting…' : 'Submit for Approval'}
                    </button>
                  )}

                  {/* Finalised — SA has no further control */}
                  {isFinalised && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500">
                      🔒 Order finalised — contact Super Admin for changes
                    </span>
                  )}

                  {/* Status update for post-confirmation stages */}
                  {isPostApproval && (
                    <button onClick={() => openStatusModal(order)}
                      className="text-xs font-bold text-white px-3 py-1.5 rounded-xl active:scale-95 transition"
                      style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
                      Update Status
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded items with per-item actions */}
              {isExpanded && (
                <div className="border-t border-gray-50">
                  <div className="divide-y divide-gray-50">
                    {myItems.map((item) => {
                      const itemId     = item._id;
                      const price      = item.orderedPrice || item.finalPrice || 0;
                      const orderedQty = item.orderedQty || item.quantity || 0;
                      const confirmedQty = item.confirmedQty != null ? item.confirmedQty : orderedQty;
                      const itemCfg    = ITEM_STATUS_CONFIG[item.itemStatus || 'pending'];
                      const canAction  = canReview && item.itemStatus !== 'declined';

                      return (
                        <div key={itemId} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {item.product?.images?.[0]?.url
                              ? <img src={item.product.images[0].url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5" />
                              : <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5 text-lg">🌿</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800 text-sm">
                                  {item.name}{item.gradeKey ? <span className="text-green-700 font-medium text-xs"> ({item.gradeName || item.gradeKey})</span> : null}
                                </p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: itemCfg.bg, color: itemCfg.color }}>
                                  {itemCfg.label}
                                </span>
                              </div>

                              {/* Qty details */}
                              <p className="text-xs text-gray-400 mt-0.5">
                                Ordered: {orderedQty} {item.unit} × ₹{price}/{item.unit}
                              </p>
                              {(item.itemStatus === 'partial' || item.confirmedQty != null) && (
                                <p className="text-xs mt-0.5">
                                  <span style={{ color: '#16a34a' }}>Confirmed: {confirmedQty} {item.unit}</span>
                                  {item.declinedQty > 0 && (
                                    <span style={{ color: '#dc2626', marginLeft: 8 }}>Declined: {item.declinedQty} {item.unit}</span>
                                  )}
                                </p>
                              )}
                              {item.declinedReason && item.itemStatus === 'declined' && (
                                <p className="text-[10px] text-red-400 mt-0.5">Reason: {item.declinedReason}</p>
                              )}

                              <p className="font-bold text-green-700 text-sm mt-1">
                                ₹{(price * (item.itemStatus === 'declined' ? 0 : confirmedQty)).toFixed(0)}
                              </p>

                              {/* Restore: item arranged → withdraw decline/refund, confirm original qty */}
                              {canReview && ['declined', 'partial'].includes(item.itemStatus) && (
                                <button
                                  onClick={() => markAvailable(order._id, itemId, item.name)}
                                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition mt-2"
                                  style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' }}>
                                  <FiCheckCircle size={11} /> Available — restore full qty
                                </button>
                              )}

                              {/* Per-item action buttons — SA only, not available after submit */}
                              {canAction && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {item.itemStatus !== 'confirmed' && (
                                    <button
                                      onClick={() => openItemAction(order._id, itemId, 'confirm', item)}
                                      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition"
                                      style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>
                                      <FiCheckCircle size={11} /> Confirm
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openItemAction(order._id, itemId, 'reduce', item)}
                                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition"
                                    style={{ background: '#fff7ed', color: '#d97706', border: '1px solid #fde68a' }}>
                                    <FiEdit2 size={11} /> Reduce Qty
                                  </button>
                                  <button
                                    onClick={() => openItemAction(order._id, itemId, 'decline', item)}
                                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition"
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                    <FiXCircle size={11} /> Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculation summary */}
                  {(calc.declinedRefundAmount > 0 || calc.finalPayableAmount > 0) && (
                    <div className="px-4 py-3 border-t border-gray-50 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Order Summary</p>
                      {calc.originalOrderValue > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Original Order Value</span>
                          <span className="font-semibold">₹{calc.originalOrderValue?.toFixed(2)}</span>
                        </div>
                      )}
                      {calc.declinedRefundAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-red-500">Declined Value</span>
                          <span className="font-semibold text-red-600">−₹{calc.declinedRefundAmount?.toFixed(2)}</span>
                        </div>
                      )}
                      {calc.deliveryCharge > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Delivery Charge</span>
                          <span className="font-semibold">₹{calc.deliveryCharge?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                        <span className="font-bold text-gray-700">Final Payable</span>
                        <span className="font-bold text-green-700">₹{calc.finalPayableAmount?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-500">
                    Customer: {order.buyer?.name || 'Guest'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Per-item action sheet ── */}
      {itemAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setItemAction(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">
                {itemAction.type === 'confirm' ? '✅ Confirm Item'
                  : itemAction.type === 'decline' ? '❌ Decline Item'
                  : '📉 Reduce Quantity'}
              </h3>
              <button onClick={() => setItemAction(null)} className="text-gray-400 text-xl font-bold leading-none">✕</button>
            </div>

            {itemAction.type === 'decline' && (
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">Reason for Declining</label>
                <div className="grid grid-cols-2 gap-2">
                  {DECLINE_REASONS.map(r => (
                    <button key={r} onClick={() => setDeclineReason(r)}
                      className={`text-xs font-semibold py-2.5 px-3 rounded-xl border-2 text-left capitalize transition ${
                        declineReason === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                      }`}>
                      {r.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {itemAction.type === 'reduce' && (
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Confirmed Quantity (must be less than ordered)</label>
                <input
                  type="number" value={reduceQty} onChange={e => setReduceQty(e.target.value)}
                  min={1} step={1}
                  placeholder="Enter confirmed qty"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                <p className="text-xs text-gray-400 mt-1">The difference will be recorded as declined quantity.</p>
              </div>
            )}

            {itemAction.type === 'confirm' && (
              <p className="text-sm text-gray-600">Mark this item as confirmed for delivery at the ordered quantity.</p>
            )}

            {/* SA restriction notice */}
            <div className="px-3 py-2 rounded-xl text-xs text-gray-500" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              ℹ️ Declines and quantity reductions require Super Admin approval — submit the order for approval after reviewing all items. Orders confirmed in full are confirmed immediately.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setItemAction(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">
                Cancel
              </button>
              <button onClick={submitItemAction} disabled={actionLoading}
                className="flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition active:scale-95"
                style={{
                  background: itemAction.type === 'decline'
                    ? 'linear-gradient(135deg,#b91c1c,#dc2626)'
                    : itemAction.type === 'reduce'
                    ? 'linear-gradient(135deg,#b45309,#d97706)'
                    : 'linear-gradient(135deg,#065f46,#16a34a)',
                }}>
                {actionLoading ? 'Saving…'
                  : itemAction.type === 'confirm' ? 'Confirm Item'
                  : itemAction.type === 'decline' ? 'Decline Item'
                  : 'Reduce Quantity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Update Modal (post-approval flow) ── */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">Update Order Status</h3>
                <p className="text-xs text-gray-400">{statusModal.orderId}</p>
              </div>
              <button onClick={() => setStatusModal(null)} className="text-gray-400 text-xl font-bold leading-none">✕</button>
            </div>

            <div className="space-y-2">
              {SA_STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setNewStatus(opt.value)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${newStatus === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <p className={`font-bold text-sm ${newStatus === opt.value ? 'text-green-700' : 'text-gray-700'}`}>{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {newStatus === 'dispatched' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Delivery Partner (optional)</label>
                <input type="text" value={delivPartner} onChange={e => setDelivPartner(e.target.value)}
                  placeholder="e.g. Porter, Dunzo, Own vehicle"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStatusModal(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">
                Cancel
              </button>
              <button onClick={submitStatusUpdate} disabled={statusUpdating}
                className="flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition active:scale-95"
                style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
                {statusUpdating ? 'Updating…' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
