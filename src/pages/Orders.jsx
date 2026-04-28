// ============================================
// ORDERS PAGE — with invoice download
// ============================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPackage, FiChevronDown, FiChevronUp, FiMapPin, FiFileText, FiDownload } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Loader from '../components/common/Loader';
import OrderTrackingTimeline from '../components/order/OrderTrackingTimeline';
import { formatINR, formatDate } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  placed:     'bg-blue-100 text-blue-700',
  confirmed:  'bg-purple-100 text-purple-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  returned:   'bg-gray-100 text-gray-700',
};

// Derive a human-readable status label for the customer
const getStatusLabel = (order) => {
  const { orderStatus, paymentStatus, paymentMethod } = order;
  if (orderStatus === 'placed') {
    if (paymentMethod === 'cod') return { label: 'Order Placed — Pay on Delivery', color: 'bg-blue-100 text-blue-700' };
    if (paymentStatus === 'paid') return { label: 'Payment Received — Awaiting Seller', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Order Placed', color: 'bg-blue-100 text-blue-700' };
  }
  return { label: orderStatus, color: STATUS_COLORS[orderStatus] || 'bg-gray-100 text-gray-700' };
};

export default function Orders() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cancelOrder = async (orderId) => {
    if (!confirm('Cancel this order?')) return;
    try {
      const { data } = await api.put(`/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, orderStatus: 'cancelled', refund: data.refund } : o
      ));
      const refundStatus = data.refund?.status;
      if (refundStatus === 'initiated') {
        toast.success('Order cancelled! Refund initiated — credit in 5-7 business days.');
      } else if (refundStatus === 'manual_required') {
        toast('Order cancelled. Refund will be processed manually within 2-3 business days.', { icon: '🔄', duration: 5000 });
      } else {
        toast.success(data.message || 'Order cancelled');
      }
    } catch { toast.error('Cannot cancel this order'); }
  };

  const downloadInvoice = async (order) => {
    const inv = order.invoice;
    if (!inv) return;
    // COD: only after delivery
    if (order.paymentMethod === 'cod' && order.orderStatus !== 'delivered') {
      toast('Invoice available after your order is delivered.', { icon: '📦' });
      return;
    }
    setDownloading(d => ({ ...d, [inv._id]: true }));
    try {
      const res = await api.get(`/invoices/${inv._id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoice-${inv.invoiceNumber || order.orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
    } catch (err) {
      // Parse blob JSON error from backend
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          if (json.codPending) { toast('Invoice available after delivery.', { icon: '📦' }); return; }
          toast.error(json.message || 'Download failed');
        } catch { toast.error('Download failed'); }
        return;
      }
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(d => ({ ...d, [inv._id]: false }));
    }
  };

  return (
    <>
      <Helmet><title>My Orders — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📦 My Orders</h1>

        {loading ? <Loader fullPage={false} /> : orders.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage size={64} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No orders yet</h3>
            <Link to="/shop" className="btn-primary text-sm">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="card overflow-hidden">
                {/* Order Header */}
                <button
                  onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left flex-wrap gap-y-1">
                    <div>
                      <p className="font-mono font-bold text-gray-800">#{order.orderId}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    {(() => { const s = getStatusLabel(order); return (
                      <span className={`badge ${s.color} capitalize`}>{s.label}</span>
                    ); })()}
                    {order.paymentStatus === 'paid' && order.orderStatus !== 'placed' && order.orderStatus !== 'cancelled' && (
                      <span className="badge bg-green-100 text-green-700">Paid</span>
                    )}
                    {order.paymentStatus === 'refunded' && (
                      <span className="badge bg-purple-100 text-purple-700">Refunded</span>
                    )}
                    {order.refund?.status === 'initiated' && (
                      <span className="badge bg-blue-100 text-blue-700">💰 Refund Initiated</span>
                    )}
                    {order.refund?.status === 'manual_required' && (
                      <span className="badge bg-orange-100 text-orange-700">🔄 Refund Processing</span>
                    )}
                    {order.invoice?.invoiceNumber && (
                      <span className="text-xs text-gray-400 font-mono hidden sm:block">
                        INV: {order.invoice.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary-600">{formatINR(order.pricing?.total)}</span>
                    {expanded === order._id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </div>
                </button>

                {/* Order Details */}
                {expanded === order._id && (
                  <div className="border-t p-4">
                    {/* Items */}
                    <div className="space-y-3 mb-4">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex gap-3">
                          <img src={item.image || 'https://via.placeholder.com/60'} alt={item.name}
                            className="w-14 h-14 object-cover rounded-xl bg-gray-100" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatINR(item.price)}</p>
                          </div>
                          <span className="font-semibold text-sm">{formatINR(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t pt-4 mb-4">
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Delivery Address</p>
                        <p className="text-gray-500 text-xs leading-relaxed">
                          {order.shippingAddress?.fullName}<br />
                          {order.shippingAddress?.addressLine1},{' '}
                          {order.shippingAddress?.city}<br />
                          {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Payment Summary</p>
                        <p className="text-xs text-gray-500 uppercase mb-1">{order.paymentMethod}</p>
                        <div className="space-y-0.5 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Subtotal (excl. GST)</span>
                            <span>{formatINR(order.gstBreakdown?.subtotalExGst || order.pricing?.subtotal)}</span>
                          </div>
                          {order.gstBreakdown?.cgstTotal > 0 && (
                            <>
                              <div className="flex justify-between"><span>CGST</span><span>{formatINR(order.gstBreakdown.cgstTotal)}</span></div>
                              <div className="flex justify-between"><span>SGST</span><span>{formatINR(order.gstBreakdown.sgstTotal)}</span></div>
                            </>
                          )}
                          {order.gstBreakdown?.igstTotal > 0 && (
                            <div className="flex justify-between"><span>IGST</span><span>{formatINR(order.gstBreakdown.igstTotal)}</span></div>
                          )}
                          <div className="flex justify-between">
                            <span>Shipping</span>
                            <span>{order.pricing?.shipping === 0 ? 'FREE' : formatINR(order.pricing?.shipping)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatINR(order.pricing?.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice actions */}
                    {order.invoice && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-xs font-semibold text-green-800">Tax Invoice Generated</p>
                          <p className="text-xs text-green-600 font-mono">{order.invoice.invoiceNumber}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/invoice/${order.invoice._id}`}
                            className="flex items-center gap-1.5 text-xs bg-white border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-all">
                            <FiFileText size={12} /> View Invoice
                          </Link>
                          <button
                            onClick={() => downloadInvoice(order)}
                            disabled={!!downloading[order.invoice._id]}
                            className="flex items-center gap-1.5 text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-all disabled:opacity-60">
                            {downloading[order.invoice._id]
                              ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                              : <FiDownload size={12} />}
                            {downloading[order.invoice._id] ? 'Downloading…' : 'Download PDF'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tracking */}
                    <div className="border-t pt-3">
                      <button
                        onClick={e => { e.stopPropagation(); document.getElementById(`tl-${order._id}`)?.classList.toggle('hidden'); }}
                        className="flex items-center gap-2 text-primary-500 text-sm font-medium hover:underline mb-2"
                      >
                        <FiMapPin size={14} /> Track Order
                      </button>
                      <div id={`tl-${order._id}`} className="hidden bg-gray-50 rounded-xl">
                        <OrderTrackingTimeline order={order} />
                      </div>
                    </div>

                    {/* Refund info banner */}
                    {order.refund && order.refund.status !== 'not_applicable' && (
                      <div className={`mt-3 rounded-xl p-3 text-xs
                        ${order.refund.status === 'initiated' || order.refund.status === 'processed'
                          ? 'bg-blue-50 border border-blue-200 text-blue-800'
                          : 'bg-orange-50 border border-orange-200 text-orange-800'}`}>
                        <p className="font-semibold mb-0.5">
                          {order.refund.status === 'initiated' ? '💰 Refund Initiated' :
                           order.refund.status === 'processed' ? '✅ Refund Processed' :
                           '🔄 Refund in Progress'}
                        </p>
                        {order.refund.amount && (
                          <p>Amount: <span className="font-medium">{formatINR(order.refund.amount)}</span></p>
                        )}
                        <p className="mt-0.5 text-opacity-80">
                          {order.refund.status === 'initiated'
                            ? 'Will reflect in your account within 5-7 business days.'
                            : 'Our team will process the refund within 2-3 business days.'}
                        </p>
                      </div>
                    )}

                    {['placed', 'confirmed'].includes(order.orderStatus) && (
                      <button onClick={() => cancelOrder(order._id)} className="mt-3 text-sm text-red-500 hover:underline">
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
