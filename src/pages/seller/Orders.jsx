import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';

const STATUS_COLOR = {
  placed:     'bg-gray-100 text-gray-600',
  confirmed:  'bg-blue-100 text-blue-600',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

export default function SellerOrders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/seller/mine').then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">My Orders</h2>

      {orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No orders yet</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-4">Order ID</th>
                <th className="text-left p-4 hidden sm:table-cell">Customer</th>
                <th className="text-left p-4">Items</th>
                <th className="text-left p-4 hidden md:table-cell">Total</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs font-medium text-primary-600">#{o.orderId}</td>
                  <td className="p-4 hidden sm:table-cell text-gray-700">{o.user?.name || '—'}</td>
                  <td className="p-4 text-gray-600">{o.items?.length} item(s)</td>
                  <td className="p-4 hidden md:table-cell font-medium">{formatINR(o.pricing?.total)}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
