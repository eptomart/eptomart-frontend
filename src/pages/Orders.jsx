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

export default function Orders() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cancelOrder = async (orderId) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.put(`/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: 'cancelled' } : o));
      toast.success('Order cancelled');
    } catch { toast.error('Cannot cancel this order'); }
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
                    <span className={`badge ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'} capitalize`}>
                      {order.orderStatus}
                    </span>
                    <span className={`badge ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} capitalize`}>
                      {order.paymentStatus}
                    </span>
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
                          {order.invoice.pdfUrl && (
                            <a href={order.invoice.pdfUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-all">
                              <FiDownload size={12} /> Download PDF
                            </a>
                          )}
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
