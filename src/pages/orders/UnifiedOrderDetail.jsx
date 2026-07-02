// ============================================
// UNIFIED ORDER DETAILS — one screen for every
// vertical. Sections render dynamically from the
// canonical DTO; non-applicable sections hide.
// Route: /orders/:vertical/:id
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiMapPin, FiTruck, FiExternalLink } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import Loader from '../../components/common/Loader';
import OrderTimeline from '../../components/orders/OrderTimeline';
import PaymentSummary from '../../components/orders/PaymentSummary';
import {
  ItemsList, DeclinedItems, RefundSection, WalletHistory,
  DocumentsSection, SupportSection,
} from '../../components/orders/OrderSections';
import { formatINR, formatDate } from '../../utils/currency';
import api from '../../utils/api';

const STATUS_COLORS = {
  payment_pending: 'bg-gray-100 text-gray-600',
  placed: 'bg-blue-100 text-blue-700',
  seller_review: 'bg-yellow-100 text-yellow-700',
  changes_pending_approval: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  packing: 'bg-purple-100 text-purple-700',
  packed: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-red-100 text-red-700',
  refund_processing: 'bg-cyan-100 text-cyan-700',
  refunded: 'bg-cyan-100 text-cyan-800',
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-gray-400 text-[11px]">{label}</p>
      <p className="font-semibold text-gray-800 text-xs">{value}</p>
    </div>
  );
}

export default function UnifiedOrderDetail() {
  const { vertical, id } = useParams();
  const [order,   setOrder]   = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/v2/orders/${vertical}/${id}`)
      .then(r => setOrder(r.data.order))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [vertical, id]);

  if (loading) return (<><Navbar /><Loader /><Footer /></>);

  if (error || !order) return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-20 text-center min-h-screen">
        <p className="text-gray-500 mb-4">{error || 'Order not found'}</p>
        <Link to="/orders" className="btn-primary text-sm">Back to My Orders</Link>
      </main>
      <Footer />
    </>
  );

  const vm = order.verticalMeta || {};
  const addr = order.address || {};
  const addressText = [
    addr.addressLine1 || addr.addressLine, addr.addressLine2, addr.landmark,
    addr.city, addr.state, addr.pincode,
  ].filter(Boolean).join(', ');

  return (
    <>
      <Helmet><title>Order #{order.orderId} — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-6 min-h-screen space-y-4">
        {/* ── Header ── */}
        <div>
          <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 mb-3">
            <FiArrowLeft size={13} /> My Orders
          </Link>
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ borderTop: `3px solid ${vm.color}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="flex items-center gap-1.5 text-xs font-bold mb-1" style={{ color: vm.color }}>
                  <span>{vm.emoji}</span> {vm.name}
                </span>
                <h1 className="font-mono font-bold text-gray-800 text-lg">#{order.orderId}</h1>
                <p className="text-xs text-gray-400">Placed {formatDate(order.placedAt)}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.statusLabel}
                </span>
                <p className="font-bold text-lg mt-1.5" style={{ color: vm.color }}>
                  {formatINR(order.totalAmount)}
                </p>
              </div>
            </div>

            {/* Order information grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
              <InfoRow label="Seller" value={order.seller?.name} />
              <InfoRow label="Customer" value={order.customer?.name} />
              <InfoRow label="Payment" value={order.paymentMethod ? `${String(order.paymentMethod).toUpperCase()} · ${order.paymentStatus}` : order.paymentStatus} />
              <InfoRow label="Delivery Date" value={order.deliveryDate ? formatDate(order.deliveryDate) : null} />
              <InfoRow label="Delivery Slot" value={order.delivery?.deliverySlot || order.delivery?.scheduledSlot} />
              <InfoRow label="Delivery Partner" value={order.delivery?.partner} />
            </div>

            {addressText && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 flex items-start gap-1.5">
                <FiMapPin size={12} className="mt-0.5 shrink-0 text-gray-400" />
                <span><span className="font-semibold">{addr.fullName || addr.name}</span> — {addressText}</span>
              </div>
            )}

            {order.delivery?.trackingUrl && (
              <a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                <FiTruck size={13} /> Track Shipment <FiExternalLink size={11} />
              </a>
            )}
            {order.payFarmerOnDelivery > 0 && (
              <p className="mt-3 text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2.5 py-1.5">
                🌾 Pay farmer on delivery: <b>{formatINR(order.payFarmerOnDelivery)}</b>
              </p>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        <OrderTimeline timeline={order.timeline} />

        {/* ── Items Ordered (original, never changes) ── */}
        <ItemsList title="Items Ordered" items={order.itemsOrdered} accent={vm.color} />

        {/* ── Items Declined ── */}
        <DeclinedItems items={order.itemsDeclined} />

        {/* ── Items Confirmed (only when different from ordered) ── */}
        {order.itemsDeclined?.length > 0 && (
          <ItemsList title="Items Confirmed (deliverable)" items={order.itemsConfirmed}
            accent="#16a34a" emptyText="No items confirmed." />
        )}

        {/* ── Payment Summary ── */}
        <PaymentSummary summary={order.paymentSummary} paymentMethod={order.paymentMethod} />

        {/* ── Refund ── */}
        <RefundSection refund={order.refund} partialRefunds={order.partialRefunds} />

        {/* ── Wallet ── */}
        <WalletHistory transactions={order.walletHistory} />

        {/* ── Documents ── */}
        <DocumentsSection documents={order.documents} orderId={order.orderId} />

        {/* ── Support ── */}
        <SupportSection support={order.support} sellerName={order.seller?.name} />
      </main>
      <Footer />
    </>
  );
}
