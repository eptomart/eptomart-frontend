import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiCheckCircle, FiPackage } from 'react-icons/fi';

const STATUS_COLOR = {
  placed:     'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

export default function SellerOrders() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState({});
  const [confirming, setConfirming] = useState({});

  useEffect(() => {
    api.get('/orders/seller/mine')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const confirmOrder = async (orderId) => {
    setConfirming(c => ({ ...c, [orderId]: true }));
    try {
      await api.patch(`/orders/${orderId}/seller-confirm`);
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, orderStatus: 'confirmed' } : o
      ));
      toast.success('Order confirmed! Customer will be notified.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setConfirming(c => ({ ...c, [orderId]: false }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const pendingCount = orders.filter(o => o.orderStatus === 'placed').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">My Orders</h2>
        {pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-full">
            {pendingCount} pending confirmation
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiPackage size={40} className="mx-auto mb-3 opacity-40" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id} className={`card overflow-hidden ${o.orderStatus === 'placed' ? 'border-2 border-yellow-300' : ''}`}>
              {/* Order header row */}
              <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-primary-600">#{o.orderId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {o.orderStatus}
                    </span>
                    {o.orderStatus === 'placed' && (
                      <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-200 animate-pulse">
                        ⏳ Awaiting your confirmation
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                    <span>👤 {o.user?.name || '—'}</span>
                    {o.user?.phone && <span>📞 {o.user.phone}</span>}
                    <span>🗓 {new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatINR(o.pricing?.total)}</p>
                    <p className="text-xs text-gray-400">{o.items?.length} item(s)</p>
                  </div>

                  {/* Confirm button — only for 'placed' orders */}
                  {o.orderStatus === 'placed' && (
                    <button
                      onClick={() => confirmOrder(o._id)}
                      disabled={confirming[o._id]}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
                    >
                      {confirming[o._id]
                        ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <FiCheckCircle size={15} />
                      }
                      {confirming[o._id] ? 'Confirming…' : 'Confirm Order'}
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpand(o._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    {expanded[o._id] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded items detail */}
              {expanded[o._id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="text-left pb-2">Product</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Price</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {o.items?.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-4 text-gray-700 font-medium">{item.name}</td>
                          <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-600">{formatINR(item.price)}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{formatINR(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Shipping address */}
                  {o.shippingAddress && (
                    <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
                      <span className="font-semibold text-gray-600">Ship to: </span>
                      {[o.shippingAddress.fullName, o.shippingAddress.addressLine1, o.shippingAddress.city, o.shippingAddress.state, o.shippingAddress.pincode].filter(Boolean).join(', ')}
                      {o.shippingAddress.phone && <span> · 📞 {o.shippingAddress.phone}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
