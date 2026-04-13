// ============================================
// ADMIN DASHBOARD
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiPackage, FiShoppingBag, FiDollarSign,
  FiEye, FiTrendingUp, FiAlertCircle
} from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Loader from '../../components/common/Loader';
import { formatINR, formatDate } from '../../utils/currency';
import api from '../../utils/api';

const StatCard = ({ icon: Icon, label, value, sub, color, href }) => (
  <Link to={href || '#'} className={`card p-5 hover:shadow-md transition-shadow border-l-4 ${color}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
        <Icon size={20} className={color.replace('border-', 'text-')} />
      </div>
    </div>
  </Link>
);

const ORDER_STATUS_COLORS = {
  placed: '#3b82f6', confirmed: '#8b5cf6', processing: '#f59e0b',
  shipped: '#6366f1', delivered: '#10b981', cancelled: '#ef4444',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage={false} />;
  if (!data) return <div className="text-center text-red-500">Failed to load dashboard</div>;

  const { stats, salesTrend, recentOrders, topProducts } = data;

  return (
    <>
      <Helmet><title>Dashboard — Eptomart Admin</title></Helmet>

      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FiUsers} label="Total Users" value={stats.users.total.toLocaleString('en-IN')}
            sub={`+${stats.users.newToday} today`} color="border-blue-500" href="/admin/users" />
          <StatCard icon={FiPackage} label="Products" value={stats.products.total.toLocaleString('en-IN')}
            sub={`${stats.products.outOfStock} out of stock`} color="border-orange-500" href="/admin/products" />
          <StatCard icon={FiShoppingBag} label="Total Orders" value={stats.orders.total.toLocaleString('en-IN')}
            sub={`${stats.orders.pending} pending`} color="border-purple-500" href="/admin/orders" />
          <StatCard icon={FiDollarSign} label="Total Revenue" value={formatINR(stats.revenue.total)}
            sub={`${formatINR(stats.revenue.today)} today`} color="border-green-500" />
          <StatCard icon={FiEye} label="Total Visitors" value={stats.visitors.total.toLocaleString('en-IN')}
            sub={`${stats.visitors.today} today`} color="border-cyan-500" href="/admin/analytics" />
          <StatCard icon={FiShoppingBag} label="Today's Orders" value={stats.orders.today.toLocaleString('en-IN')}
            sub="orders placed today" color="border-indigo-500" href="/admin/orders" />
          <StatCard icon={FiDollarSign} label="This Month" value={formatINR(stats.revenue.thisMonth)}
            sub="monthly revenue" color="border-teal-500" />
          <StatCard icon={FiAlertCircle} label="Out of Stock" value={stats.products.outOfStock}
            sub="products need restocking" color="border-red-500" href="/admin/products" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-primary-500" /> Revenue (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={salesTrend}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatINR(v), 'Revenue']} labelFormatter={v => `Date: ${v}`} />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders Chart */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">📦 Orders (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesTrend}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Recent Orders</h3>
              <Link to="/admin/orders" className="text-sm text-primary-500 hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {recentOrders?.slice(0, 5).map(order => (
                <div key={order._id} className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiShoppingBag className="text-gray-500" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-xs">#{order.orderId}</p>
                    <p className="text-gray-500 text-xs truncate">{order.user?.name || order.user?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatINR(order.pricing?.total)}</p>
                    <span className={`badge text-xs ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} capitalize`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Top Selling Products</h3>
              <Link to="/admin/products" className="text-sm text-primary-500 hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {topProducts?.map((product, i) => (
                <div key={product._id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                  <img
                    src={product.images?.[0]?.url}
                    alt={product.name}
                    className="w-9 h-9 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{product.name}</p>
                    <p className="text-gray-400 text-xs">{product.soldCount} sold</p>
                  </div>
                  <span className="font-bold text-gray-700">{formatINR(product.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
