// ============================================
// FRUIT BASKETS & HAMPERS — My Orders
// Deliberately its own simple list (not wired into the Unified Orders
// module) — keeps this vertical fully standalone per the feature spec.
// ============================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiGift, FiClock, FiCheckCircle, FiTruck, FiXCircle } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';

const STATUS_META = {
  placed:           { label: 'Placed',          color: '#f59e0b', Icon: FiClock },
  confirmed:        { label: 'Confirmed',       color: '#0ea5e9', Icon: FiCheckCircle },
  preparing:        { label: 'Preparing',       color: '#0ea5e9', Icon: FiClock },
  out_for_delivery: { label: 'Out for Delivery',color: '#8b5cf6', Icon: FiTruck },
  delivered:        { label: 'Delivered',       color: '#16a34a', Icon: FiCheckCircle },
  cancelled:        { label: 'Cancelled',       color: '#dc2626', Icon: FiXCircle },
};

export default function FruitBasketMyOrders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get('/fruitbaskets/my-orders').then(r => setOrders(r.data.orders || [])).catch(() => setOrders([]));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2"><FiGift /> My Fruit Basket Orders</h1>

        {orders === null ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 90 }} />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-3">No orders yet.</p>
            <Link to="/fruitbaskets" className="text-emerald-700 font-bold text-sm">Browse Baskets →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => {
              const meta = STATUS_META[o.orderStatus] || STATUS_META.placed;
              return (
                <div key={o._id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-800">#{o.orderId}</span>
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: `${meta.color}18` }}>
                      <meta.Icon size={11} /> {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {o.items?.map(it => `${it.name} × ${it.quantity}`).join(', ')}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-[11px] text-gray-400">
                      {new Date(o.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {o.deliverySlot?.label}
                    </span>
                    <span className="text-sm font-black text-emerald-700">₹{o.pricing?.total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
