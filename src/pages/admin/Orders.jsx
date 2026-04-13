// ============================================
// ADMIN — ORDER MANAGEMENT
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import { formatINR, formatDate } from '../../utils/currency';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/orders?page=${page}&limit=15${statusFilter ? `&status=${statusFilter}` : ''}`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const updateStatus = async (orderId, updates) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, updates);
      toast.success('Order updated');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update order');
    }
  };

  const STATUS_COLORS = {
    placed: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-purple-100 text-purple-700',
    processing: 'bg-yellow-100 text-yellow-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <>
      <Helmet><title>Orders — Eptomart Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>

        {loading ? <Loader fullPage={false} /> : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order._id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div>
                      <p className="font-mono font-bold text-sm">#{order.orderId}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.user?.name}</p>
                      <p className="text-xs text-gray-400">{order.user?.email || order.user?.phone}</p>
                    </div>
                    <span className={`badge capitalize ${STATUS_COLORS[order.orderStatus]}`}>
                      {order.orderStatus}
                    </span>
                    <span className={`badge capitalize ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.paymentStatus} • {order.paymentMethod?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-primary-600">{formatINR(order.pricing?.total)}</span>
                    {expanded === order._id ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </button>

                {expanded === order._id && (
                  <div className="border-t p-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />
                          <span className="flex-1">{item.name}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                          <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Update Controls */}
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Order Status</label>
                        <select
                          defaultValue={order.orderStatus}
                          onChange={(e) => updateStatus(order._id, { status: e.target.value })}
                          className="input-field text-sm py-2"
                        >
                          {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                        <select
                          defaultValue={order.paymentStatus}
                          onChange={(e) => updateStatus(order._id, { paymentStatus: e.target.value })}
                          className="input-field text-sm py-2"
                        >
                          {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* UPI Verification */}
                    {order.paymentMethod === 'upi' && order.paymentDetails?.upiRef && order.paymentStatus === 'pending' && (
                      <div className="bg-orange-50 rounded-xl p-4">
                        <p className="text-sm font-semibold mb-1">UPI Payment Reference</p>
                        <p className="font-mono text-sm text-orange-700">{order.paymentDetails.upiRef}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => updateStatus(order._id, { paymentStatus: 'paid', status: 'confirmed' })}
                            className="btn-primary btn-sm">✓ Verify Payment</button>
                          <button onClick={() => updateStatus(order._id, { paymentStatus: 'failed' })}
                            className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm">✗ Reject</button>
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Delivery Address</p>
                      <p className="text-gray-500">
                        {order.shippingAddress?.fullName} • {order.shippingAddress?.phone}<br />
                        {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium ${page === p ? 'bg-primary-500 text-white' : 'bg-white text-gray-600'}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
