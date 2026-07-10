// ============================================
// KOYAMBEDU ORDERS — My Order History
// Compact header matching EptoFresh layout
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPackage, FiCheckCircle, FiClock, FiAlertTriangle,
  FiTruck, FiHome, FiXCircle, FiRefreshCw, FiList, FiFileText,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  placed:                 { label: 'Order Placed',          color: '#3b82f6', bg: '#eff6ff',   Icon: FiList },
  pending_confirmation:   { label: 'Awaiting Confirmation', color: '#d97706', bg: '#fffbeb',   Icon: FiClock },
  sa_review_submitted:    { label: 'Under Review',          color: '#9333ea', bg: '#faf5ff',   Icon: FiClock },
  price_revision_pending: { label: 'Price Revision',        color: '#ea580c', bg: '#fff7ed',   Icon: FiAlertTriangle },
  confirmed:              { label: 'Confirmed',             color: '#16a34a', bg: '#f0fdf4',   Icon: FiCheckCircle },
  packing:                { label: 'Packing',               color: '#9333ea', bg: '#faf5ff',   Icon: FiPackage },
  dispatched:             { label: 'On the Way',            color: '#0284c7', bg: '#e0f2fe',   Icon: FiTruck },
  delivered:              { label: 'Delivered',             color: '#059669', bg: '#d1fae5',   Icon: FiHome },
  cancelled:              { label: 'Cancelled',             color: '#dc2626', bg: '#fef2f2',   Icon: FiXCircle },
  refund_initiated:       { label: 'Refund Initiated',      color: '#6b7280', bg: '#f3f4f6',   Icon: FiRefreshCw },
};

const PROGRESS_STEPS = ['placed', 'confirmed', 'packing', 'dispatched', 'delivered'];
const ALL_STATUSES   = ['placed', 'pending_confirmation', 'price_revision_pending', 'confirmed', 'packing', 'dispatched', 'delivered'];

export default function KoyambeduOrders() {
  const navigate = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [revising, setRevising] = useState(null);

  useEffect(() => {
    api.get('/koyambedu/my-orders')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const handleRevision = async (orderId, approve) => {
    setRevising(orderId);
    try {
      const { data } = await api.post(`/koyambedu/orders/${orderId}/approve-revision`, { approve });
      toast.success(data.message);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...data.order } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to respond');
    } finally {
      setRevising(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (orders.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: '#F5F4F2' }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2"
        style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.12)' }}>
        <FaLeaf size={32} className="text-green-300" />
      </div>
      <p className="font-bold text-gray-800 text-lg">No orders yet</p>
      <p className="text-gray-400 text-sm">Your Koyambedu orders will appear here</p>
      <Link to="/koyambedu"
        className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition text-sm">
        Shop Fresh Market
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F5F4F2' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
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
            <h1 className="text-white font-extrabold text-base leading-tight">My Orders</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">Koyambedu Daily</p>
          </div>
          <Link to="/koyambedu/wallet"
            className="flex items-center gap-1 text-xs font-bold text-white/90 px-3 py-1.5 rounded-full active:scale-95 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            💳 Wallet
          </Link>
        </div>
      </div>

      {/* ── Cancellation deadline notice ── */}
      <div className="mx-4 mt-4 rounded-2xl p-3.5 flex items-start gap-3"
        style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
        <span className="text-lg shrink-0 leading-none mt-0.5">⏰</span>
        <div>
          <p className="text-xs font-extrabold text-orange-800 leading-snug">
            Cancellation Deadline — 1:00 AM
          </p>
          <p className="text-[11px] text-orange-700 mt-1 leading-relaxed">
            Orders placed today can be cancelled before <strong>1:00 AM</strong>.
            Call or WhatsApp our Help Desk:{' '}
            <a href="tel:+919514519518"
              className="font-bold underline"
              style={{ color: '#c2410c' }}>
              +91 95145 19518
            </a>
          </p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {orders.map(order => {
          const cfg = STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus, color: '#6b7280', bg: '#f3f4f6', Icon: FiList };
          const isPriceRevision = order.orderStatus === 'price_revision_pending';
          const isCancelled     = ['cancelled', 'refund_initiated'].includes(order.orderStatus);
          const currentIdx      = ALL_STATUSES.indexOf(order.orderStatus);

          return (
            <div key={order._id} className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="p-4">

                {/* Order header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.placedAt || order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.Icon && <cfg.Icon size={11} />} {cfg.label}
                  </span>
                </div>

                {/* Items preview */}
                <div className="space-y-1.5 mb-3">
                  {order.items?.slice(0, 3).map((it, i) => {
                    const confirmedQty = it.confirmedQty != null ? it.confirmedQty : (it.quantity || it.orderedQty || 0);
                    const isDeclined = it.itemStatus === 'declined';
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className={isDeclined ? 'text-red-400 line-through' : 'text-gray-700'}>
                          {it.name}{it.gradeKey ? ` - ${it.gradeName || it.gradeKey}` : ''} × {confirmedQty}{it.unit}
                          {isDeclined && ' (declined)'}
                        </span>
                        <span className="text-gray-500 shrink-0 ml-2">
                          {isDeclined ? '—' : `₹${((it.finalPrice || it.orderedPrice || 0) * confirmedQty).toFixed(0)}`}
                        </span>
                      </div>
                    );
                  })}
                  {order.items?.length > 3 && (
                    <Link to={`/koyambedu/orders/${order._id}`} className="text-xs text-green-600 font-semibold">
                      +{order.items.length - 3} more items — view all
                    </Link>
                  )}
                </div>

                {/* Pricing summary */}
                {(() => {
                  const calc = order.calculatedPricing || {};
                  const pricing = order.pricing || {};
                  const total = calc.finalPayableAmount || pricing.total || 0;
                  const delivery = calc.deliveryCharge || pricing.deliveryCharge || 0;
                  const declined = calc.declinedRefundAmount || 0;
                  return (
                    <div className="pt-3 border-t border-gray-50 space-y-1 mb-2">
                      {declined > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-red-500">Declined refund</span>
                          <span className="text-red-600 font-semibold">−₹{declined.toFixed(2)}</span>
                        </div>
                      )}
                      {delivery > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Delivery charge</span>
                          <span className="text-gray-600">₹{delivery.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-gray-400">Total paid</p>
                          <p className="font-bold text-green-700 text-sm">₹{total.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          {order.deliveryDate && (
                            <p className="text-xs text-gray-700 font-semibold">
                              📅 {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                          {order.deliverySlot && <p className="text-xs text-gray-500">{order.deliverySlot}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Delivery address — full */}
                {order.shippingAddress && (
                  <div className="text-xs text-gray-400 mb-2 leading-relaxed">
                    📍 {[
                      order.shippingAddress.addressLine1,
                      order.shippingAddress.addressLine2,
                      order.shippingAddress.city,
                      order.shippingAddress.pincode,
                    ].filter(Boolean).join(', ')}
                  </div>
                )}

                {/* View details + Invoice button */}
                <div className="mt-2 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <Link to={`/koyambedu/orders/${order._id}`}
                    className="text-xs font-bold text-green-700 flex items-center gap-1 active:opacity-70">
                    View full details →
                  </Link>
                  <Link to={`/koyambedu/orders/${order._id}`}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition"
                    style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
                    <FiFileText size={11} /> Invoice
                  </Link>
                </div>

                {/* Price revision alert */}
                {isPriceRevision && order.priceRevision?.revisedTotal && (
                  <div className="mt-3 rounded-xl p-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <p className="font-bold text-orange-700 text-sm mb-1 flex items-center gap-1.5"><FiAlertTriangle size={13} /> Price Revision Request</p>
                    <p className="text-xs text-orange-600 mb-3">
                      Market prices changed. New total: <strong>₹{order.priceRevision.revisedTotal.toFixed(2)}</strong>
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleRevision(order._id, true)} disabled={revising === order._id}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                        ✓ Approve
                      </button>
                      <button onClick={() => handleRevision(order._id, false)} disabled={revising === order._id}
                        className="flex-1 bg-red-500 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                        ✕ Cancel Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress tracker */}
                {!isCancelled && (
                  <div className="mt-3 flex items-center gap-1 overflow-x-auto">
                    {PROGRESS_STEPS.map((s, i, arr) => {
                      const thisIdx = ALL_STATUSES.indexOf(s);
                      const done    = currentIdx >= thisIdx;
                      return (
                        <div key={s} className="flex items-center gap-1 shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition`}
                            style={{ background: done ? '#16a34a' : '#e5e7eb', color: done ? '#fff' : '#9ca3af' }}>
                            {i + 1}
                          </div>
                          {i < arr.length - 1 && (
                            <div className="w-6 h-0.5 rounded-full" style={{ background: done ? '#16a34a' : '#e5e7eb' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
