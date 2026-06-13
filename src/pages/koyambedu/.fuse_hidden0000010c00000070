import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  placed:                  { label: 'Order Placed',          color: 'bg-blue-100 text-blue-700',   icon: '📋' },
  pending_confirmation:    { label: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-700',icon: '⏳' },
  price_revision_pending:  { label: 'Price Revision',        color: 'bg-orange-100 text-orange-700',icon: '⚠️' },
  confirmed:               { label: 'Confirmed',             color: 'bg-green-100 text-green-700',  icon: '✅' },
  packing:                 { label: 'Packing',               color: 'bg-purple-100 text-purple-700',icon: '📦' },
  dispatched:              { label: 'On the Way',            color: 'bg-blue-100 text-blue-700',    icon: '🚚' },
  delivered:               { label: 'Delivered',             color: 'bg-green-100 text-green-700',  icon: '🏠' },
  cancelled:               { label: 'Cancelled',             color: 'bg-red-100 text-red-700',      icon: '❌' },
  refund_initiated:        { label: 'Refund Initiated',      color: 'bg-gray-100 text-gray-700',    icon: '💰' },
};

export default function KoyambeduOrders() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [revising, setRevising] = useState(null); // orderId being revised

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
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (orders.length === 0) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl">📦</p>
      <h2 className="font-bold text-gray-800 text-xl">No orders yet</h2>
      <Link to="/koyambedu" className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition">
        Shop Fresh Market
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-10">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-black text-lg">My Koyambedu Orders</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {orders.map(order => {
          const cfg = STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus, color: 'bg-gray-100 text-gray-700', icon: '📋' };
          const isPriceRevision = order.orderStatus === 'price_revision_pending';

          return (
            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
              <div className="p-4">
                {/* Order header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                    <p className="text-xs text-gray-500">{new Date(order.placedAt || order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                {/* Items preview */}
                <div className="space-y-1.5 mb-3">
                  {order.items?.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{it.name} × {it.quantity}{it.unitLabel || it.unit}</span>
                      <span className="text-gray-500">₹{((it.finalPrice || it.orderedPrice || 0) * it.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex justify-between items-center pt-2 border-t border-green-50">
                  <div>
                    <p className="text-xs text-gray-500">Total paid</p>
                    <p className="font-bold text-green-700 text-sm">₹{order.pricing?.total?.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Delivery</p>
                    <p className="text-xs text-gray-600">{order.deliverySlot}</p>
                  </div>
                </div>

                {/* PRICE REVISION ALERT */}
                {isPriceRevision && order.priceRevision?.revisedTotal && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="font-bold text-orange-700 text-sm mb-1">⚠️ Price Revision Request</p>
                    <p className="text-xs text-orange-600 mb-2">
                      Market prices changed. New total: <strong>₹{order.priceRevision.revisedTotal.toFixed(2)}</strong>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRevision(order._id, true)}
                        disabled={revising === order._id}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-700 disabled:opacity-60">
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRevision(order._id, false)}
                        disabled={revising === order._id}
                        className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-red-600 disabled:opacity-60">
                        ✕ Cancel Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress tracker */}
                {!['cancelled','refund_initiated'].includes(order.orderStatus) && (
                  <div className="mt-3 flex items-center gap-1 overflow-x-auto">
                    {['placed','confirmed','packing','dispatched','delivered'].map((s, i, arr) => {
                      const statuses = ['placed','pending_confirmation','price_revision_pending','confirmed','packing','dispatched','delivered'];
                      const currentIdx = statuses.indexOf(order.orderStatus);
                      const thisIdx    = statuses.indexOf(s);
                      const done       = currentIdx >= thisIdx;
                      return (
                        <div key={s} className="flex items-center gap-1 flex-shrink-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                          {i < arr.length - 1 && <div className={`w-6 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
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
