// ============================================
// KOYAMBEDU ORDER DETAIL — Full order view
// ============================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPackage, FiCheckCircle, FiClock, FiAlertTriangle,
  FiTruck, FiHome, FiXCircle, FiRefreshCw, FiList, FiDownload, FiEye,
  FiMapPin,
} from 'react-icons/fi';
import { FaLeaf, FaFileInvoice } from 'react-icons/fa';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  placed:                 { label: 'Order Placed',          color: '#3b82f6', bg: '#eff6ff',   Icon: FiList },
  pending_confirmation:   { label: 'Awaiting Confirmation', color: '#d97706', bg: '#fffbeb',   Icon: FiClock },
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

export default function KoyambeduOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [revising, setRevising] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  useEffect(() => {
    api.get(`/koyambedu/my-orders/${orderId}`)
      .then(r => setOrder(r.data.order))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleRevision = async (approve) => {
    setRevising(true);
    try {
      const { data } = await api.post(`/koyambedu/orders/${orderId}/approve-revision`, { approve });
      toast.success(data.message);
      setOrder(prev => ({ ...prev, ...data.order }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to respond');
    } finally {
      setRevising(false);
    }
  };

  const handleInvoice = async (action) => {
    setDlLoading(true);
    try {
      const res = await api.get(`/koyambedu/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${order?.orderId || orderId}.pdf`;
        a.click();
      }
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Invoice not available yet');
    } finally {
      setDlLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: '#F5F4F2' }}>
      <p className="font-bold text-gray-800">Order not found</p>
      <button onClick={() => navigate('/koyambedu/orders')}
        className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
        Back to Orders
      </button>
    </div>
  );

  const cfg = STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus, color: '#6b7280', bg: '#f3f4f6', Icon: FiList };
  const isCancelled     = ['cancelled', 'refund_initiated'].includes(order.orderStatus);
  const isPriceRevision = order.orderStatus === 'price_revision_pending';
  const currentIdx      = ALL_STATUSES.indexOf(order.orderStatus);
  const isDelivered     = order.orderStatus === 'delivered';

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F5F4F2' }}>

      {/* ── Header ── */}
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
            <h1 className="text-white font-extrabold text-base leading-tight">Order Details</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">{order.orderId}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.Icon && <cfg.Icon size={10} />} {cfg.label}
          </span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── Order meta ── */}
        <div className="bg-white rounded-2xl p-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400">Order ID</p>
              <p className="text-sm font-bold text-gray-800">{order.orderId}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Order Date</p>
              <p className="text-sm font-semibold text-gray-700">
                {new Date(order.placedAt || order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {order.deliveryDate && (
              <div>
                <p className="text-[10px] text-gray-400">Delivery Date</p>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
            {order.deliverySlot && (
              <div>
                <p className="text-[10px] text-gray-400">Delivery Slot</p>
                <p className="text-sm font-semibold text-gray-700">{order.deliverySlot}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Progress tracker ── */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FiTruck size={13} className="text-green-600" /> Order Progress
            </p>
            <div className="flex items-center gap-1 overflow-x-auto">
              {PROGRESS_STEPS.map((s, i, arr) => {
                const thisIdx = ALL_STATUSES.indexOf(s);
                const done    = currentIdx >= thisIdx;
                const label   = STATUS_CONFIG[s]?.label || s;
                return (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition"
                        style={{ background: done ? '#16a34a' : '#e5e7eb', color: done ? '#fff' : '#9ca3af' }}>
                        {i + 1}
                      </div>
                      <p className="text-[8px] text-center w-12 leading-tight" style={{ color: done ? '#16a34a' : '#9ca3af' }}>
                        {label}
                      </p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-6 h-0.5 rounded-full mb-4" style={{ background: done ? '#16a34a' : '#e5e7eb' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Price revision alert ── */}
        {isPriceRevision && order.priceRevision?.revisedTotal && (
          <div className="rounded-2xl p-4" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
            <p className="font-bold text-orange-700 text-sm mb-1 flex items-center gap-1.5">
              <FiAlertTriangle size={13} /> Price Revision Request
            </p>
            <p className="text-xs text-orange-600 mb-3">
              Market prices changed. New total: <strong>₹{order.priceRevision.revisedTotal.toFixed(2)}</strong>
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleRevision(true)} disabled={revising}
                className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                ✓ Approve
              </button>
              <button onClick={() => handleRevision(false)} disabled={revising}
                className="flex-1 bg-red-500 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                ✕ Cancel Order
              </button>
            </div>
          </div>
        )}

        {/* ── All products ── */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <FaLeaf size={12} className="text-green-600" />
            <p className="text-sm font-bold text-gray-800">
              Items Ordered ({order.items?.length || 0})
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items?.map((item, i) => {
              const unitPrice  = item.finalPrice || item.orderedPrice || 0;
              const lineTotal  = unitPrice * item.quantity;
              const declined   = item.status === 'declined';
              return (
                <div key={i} className={`px-4 py-3 flex items-center gap-3 ${declined ? 'opacity-50' : ''}`}>
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <FaLeaf size={16} className="text-green-300" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity}{item.unit} × ₹{unitPrice}/{item.unit}
                    </p>
                    {declined && (
                      <span className="text-[10px] font-bold text-red-500 mt-0.5 block">Declined — refunded to wallet</span>
                    )}
                  </div>
                  <p className="font-bold text-green-700 text-sm shrink-0">
                    {declined ? <span className="line-through text-gray-300">₹{lineTotal.toFixed(0)}</span> : `₹${lineTotal.toFixed(0)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Payment summary ── */}
        <div className="bg-white rounded-2xl p-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FaLeaf size={12} className="text-green-600" /> Payment Summary
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.pricing?.subtotal?.toFixed(2)}</span>
            </div>
            {order.pricing?.deliveryFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery fee</span>
                <span>₹{order.pricing.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {order.pricing?.platformFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Platform fee</span>
                <span>₹{order.pricing.platformFee.toFixed(2)}</span>
              </div>
            )}
            {order.pricing?.walletCredit > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Wallet credit used</span>
                <span>-₹{order.pricing.walletCredit.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-green-700 text-base">₹{order.pricing?.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Payment method</span>
              <span className="capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* ── Delivery address ── */}
        {order.shippingAddress && (
          <div className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FiMapPin size={12} className="text-green-600" /> Delivery Address
            </p>
            <p className="text-sm font-semibold text-gray-700">{order.shippingAddress.fullName}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {[
                order.shippingAddress.address,
                order.shippingAddress.city,
                order.shippingAddress.state,
                order.shippingAddress.pincode,
              ].filter(Boolean).join(', ')}
            </p>
            {order.shippingAddress.phone && (
              <p className="text-xs text-gray-500 mt-1">📞 {order.shippingAddress.phone}</p>
            )}
          </div>
        )}

        {/* ── Invoice ── */}
        <div className="bg-white rounded-2xl p-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FaFileInvoice size={13} className="text-green-600" /> Invoice
          </p>
          {(isDelivered || order.orderStatus === 'confirmed' || order.orderStatus === 'packing' || order.orderStatus === 'dispatched') ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleInvoice('view')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-green-700 active:scale-[0.98] transition disabled:opacity-50"
                style={{ background: '#f0fdf4', border: '1.5px solid rgba(22,163,74,0.3)' }}>
                <FiEye size={14} /> View
              </button>
              <button
                onClick={() => handleInvoice('download')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white active:scale-[0.98] transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
                <FiDownload size={14} /> Download
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">
              Invoice will be available once your order is confirmed
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
