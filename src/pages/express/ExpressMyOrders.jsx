// ============================================
// EPTOMART EXPRESS — My Orders
// Simple list view, mirrors the pattern of other verticals' my-orders
// pages. No detail/tracking page yet — that comes with the fulfilment
// phase (Store Manager workflow).
// ============================================
import { useEffect, useState } from 'react';
import { FiZap, FiPackage } from 'react-icons/fi';
import api from '../../utils/api';

const STATUS_LABEL = {
  placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_COLOR = {
  placed: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700', out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function ExpressMyOrders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get('/express/my-orders').then(({ data }) => setOrders(data.orders || [])).catch(() => setOrders([]));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <FiZap className="text-amber-500" size={20} />
        <h1 className="text-xl font-black text-indigo-900">Eptomart Express — My Orders</h1>
      </div>

      {orders === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FiPackage size={32} className="mx-auto mb-2" />
          <p className="text-sm">No orders yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map(o => (
            <div key={o._id} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-gray-800">{o.orderId}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{new Date(o.createdAt).toLocaleString('en-IN')}</p>
              <ul className="text-xs text-gray-600 mb-2">
                {o.items?.map((it, i) => <li key={i}>{it.name} × {it.quantity} — ₹{it.lineTotal}</li>)}
              </ul>
              <p className="font-bold text-gray-800 text-sm pt-2 border-t">Total: ₹{o.pricing?.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
