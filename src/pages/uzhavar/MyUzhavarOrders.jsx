// ============================================
// UZHAVAR FRESH — Buyer: My Orders
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiStar } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  payment_pending:   'bg-gray-100 text-gray-600',
  pending_farmer:    'bg-yellow-100 text-yellow-700',
  farmer_accepted:   'bg-blue-100 text-blue-700',
  buyer_confirmed:   'bg-indigo-100 text-indigo-700',
  out_for_delivery:  'bg-orange-100 text-orange-700',
  delivered:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-600',
  auto_cancelled:    'bg-red-100 text-red-600',
};

const STATUS_LABEL = {
  payment_pending:   'Awaiting Payment',
  pending_farmer:    'Waiting for Farmer',
  farmer_accepted:   '✅ Farmer Accepted — Confirm Now!',
  buyer_confirmed:   'Confirmed',
  out_for_delivery:  '🚚 Out for Delivery',
  delivered:         '✅ Delivered',
  cancelled:         'Cancelled',
  auto_cancelled:    'Auto-Cancelled',
};

export default function MyUzhavarOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating]     = useState({ freshness: 5, quality: 5, delivery: 5, behaviour: 5, comment: '' });

  useEffect(() => {
    api.get('/uzhavar/my-orders')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (orderId) => {
    try {
      await api.post(`/uzhavar/orders/${orderId}/confirm`);
      toast.success('Order confirmed!');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'buyer_confirmed' } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Confirm failed');
    }
  };

  const handleRate = async () => {
    try {
      await api.post(`/uzhavar/orders/${ratingOrder}/rate`, rating);
      toast.success('Thanks for your rating! 🌟');
      setRatingOrder(null);
      setOrders(prev => prev.map(o => o._id === ratingOrder ? { ...o, rating: { ...rating, ratedAt: new Date() } } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rating failed');
    }
  };

  return (
    <>
      <Helmet><title>My Uzhavar Orders</title></Helmet>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 min-h-screen pb-12">
        <button onClick={() => navigate('/uzhavar')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 mb-4">
          <FiArrowLeft size={14} /> Uzhavar Fresh
        </button>
        <h1 className="text-xl font-black text-gray-800 mb-4">My Orders 🌾</h1>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🛒</div>
            <p>No orders yet</p>
            <button onClick={() => navigate('/uzhavar')}
              className="mt-4 bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold">
              Order Fresh Produce
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-800">{order.orderNumber}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    🧑‍🌾 {order.farmer?.name} · {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>

                <div className="px-4 py-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-700">{item.name} × {item.quantity} {item.unit}</span>
                      <span className="text-gray-800 font-medium">₹{item.lineTotal}</span>
                    </div>
                  ))}
                  {/* Payment split breakdown */}
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>💳 Booking fee (paid online)</span>
                      <span className="font-semibold text-gray-700">₹{order.bookingFee?.total?.toFixed(2) ?? '24.78'}</span>
                    </div>
                    {order.balancePayableToFarmer > 0 && (
                      <div className={`flex justify-between text-xs font-semibold rounded-lg px-2 py-1.5 ${
                        order.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span>🤝 {order.status === 'delivered' ? 'Paid to farmer at delivery' : 'Pay farmer at delivery'}</span>
                        <span>₹{order.balancePayableToFarmer?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  {order.status === 'farmer_accepted' && (
                    <button onClick={() => handleConfirm(order._id)}
                      className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors">
                      ✅ Confirm Order
                    </button>
                  )}
                  {order.status === 'delivered' && !order.rating?.ratedAt && (
                    <button onClick={() => setRatingOrder(order._id)}
                      className="flex-1 bg-yellow-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-yellow-600 transition-colors">
                      ⭐ Rate Farmer
                    </button>
                  )}
                </div>

                {/* Confirm deadline warning */}
                {order.status === 'farmer_accepted' && order.buyerConfirmDeadline && (
                  <div className="px-4 pb-3 text-xs text-orange-600 font-medium">
                    ⏰ Confirm before {new Date(order.buyerConfirmDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} or auto-cancelled
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Rating modal */}
      {ratingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="font-black text-lg text-center mb-4">Rate your farmer 🌾</h3>
            {['freshness', 'quality', 'delivery', 'behaviour'].map(k => (
              <div key={k} className="flex items-center justify-between mb-3">
                <span className="capitalize text-sm text-gray-700 w-24">{k}</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(r => ({ ...r, [k]: n }))}
                      className={`w-7 h-7 rounded-full text-sm transition-colors ${rating[k] >= n ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <textarea value={rating.comment} onChange={e => setRating(r => ({ ...r, comment: e.target.value }))}
              placeholder="Comment (optional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-green-400 resize-none" rows={2} />
            <div className="flex gap-2">
              <button onClick={() => setRatingOrder(null)}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-xl">Cancel</button>
              <button onClick={handleRate}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl">Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
