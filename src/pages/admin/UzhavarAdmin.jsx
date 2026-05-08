// ============================================
// ADMIN — Uzhavar Fresh Management Panel
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiUsers, FiPackage, FiCreditCard, FiBarChart2, FiCheck, FiX, FiEye } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TABS = ['stats', 'farmers', 'orders', 'subscriptions'];

export default function UzhavarAdmin() {
  const [tab, setTab]               = useState('stats');
  const [stats, setStats]           = useState(null);
  const [farmers, setFarmers]       = useState([]);
  const [orders, setOrders]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [farmerFilter, setFarmerFilter]   = useState('pending');
  const [orderFilter, setOrderFilter]     = useState('');
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        const r = await api.get('/uzhavar/admin/stats');
        setStats(r.data.stats);
      } else if (tab === 'farmers') {
        const r = await api.get('/uzhavar/admin/farmers', { params: { status: farmerFilter || undefined } });
        setFarmers(r.data.farmers || []);
      } else if (tab === 'orders') {
        const r = await api.get('/uzhavar/admin/orders', { params: { status: orderFilter || undefined } });
        setOrders(r.data.orders || []);
      } else if (tab === 'subscriptions') {
        const r = await api.get('/uzhavar/admin/subscriptions');
        setSubscriptions(r.data.subscriptions || []);
      }
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, farmerFilter, orderFilter]);

  useEffect(() => { load(); }, [load]);

  const farmerAction = async (farmerId, action, reason) => {
    try {
      await api.patch(`/uzhavar/admin/farmers/${farmerId}/action`, { action, reason });
      toast.success(`Farmer ${action}d`);
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <>
      <Helmet><title>Uzhavar Admin</title></Helmet>
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-black text-gray-800 mb-5 flex items-center gap-2">
          🌾 Uzhavar Fresh — Admin
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'stats',         label: '📊 Stats',         icon: FiBarChart2 },
            { key: 'farmers',       label: '🧑‍🌾 Farmers',       icon: FiUsers },
            { key: 'orders',        label: '📦 Orders',         icon: FiPackage },
            { key: 'subscriptions', label: '💳 Subscriptions',  icon: FiCreditCard },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl animate-bounce">🌱</div>
          </div>
        ) : (
          <>
            {/* ── Stats ─────────────────────────────────── */}
            {tab === 'stats' && stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Verified Farmers', value: stats.totalFarmers,        icon: '🧑‍🌾', color: 'green' },
                  { label: 'Pending Approval', value: stats.pendingFarmers,       icon: '⏳', color: 'yellow' },
                  { label: 'Total Orders',     value: stats.totalOrders,          icon: '📦', color: 'blue' },
                  { label: 'Active Subs',      value: stats.activeSubscriptions,  icon: '💳', color: 'purple' },
                  { label: "Today's Orders",   value: stats.todayOrders,          icon: '🌅', color: 'orange' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className={`text-2xl font-black text-${s.color}-600`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Farmers ──────────────────────────────── */}
            {tab === 'farmers' && (
              <>
                <div className="flex gap-2 mb-4">
                  {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
                    <button key={s} onClick={() => setFarmerFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${farmerFilter === s ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      {s || 'All'}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {farmers.length === 0 && <div className="text-center py-8 text-gray-400">No farmers found</div>}
                  {farmers.map(farmer => (
                    <div key={farmer._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-800">{farmer.name}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                              farmer.verificationStatus === 'approved' ? 'bg-green-100 text-green-700'
                              : farmer.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-600'
                            }`}>{farmer.verificationStatus}</span>
                          </div>
                          <p className="text-sm text-gray-500">{farmer.address?.village}, {farmer.address?.district}</p>
                          <p className="text-xs text-gray-400">📞 {farmer.phone} · 📍 {farmer.deliveryRadius}km</p>
                          {farmer.aadhaarDoc && (
                            <a href={farmer.aadhaarDoc} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline">View Aadhaar Doc</a>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {farmer.verificationStatus === 'pending' && (
                            <>
                              <button onClick={() => farmerAction(farmer._id, 'approve')}
                                className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700">
                                <FiCheck size={11} /> Approve
                              </button>
                              <button onClick={() => {
                                const r = prompt('Rejection reason:');
                                if (r !== null) farmerAction(farmer._id, 'reject', r);
                              }}
                                className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 border border-red-200">
                                <FiX size={11} /> Reject
                              </button>
                            </>
                          )}
                          {farmer.verificationStatus === 'approved' && (
                            <button onClick={() => farmerAction(farmer._id, 'suspend')}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100">
                              Suspend
                            </button>
                          )}
                          {(farmer.verificationStatus === 'rejected' || farmer.verificationStatus === 'suspended') && (
                            <button onClick={() => farmerAction(farmer._id, 'approve')}
                              className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                              <FiCheck size={11} /> Re-approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Orders ───────────────────────────────── */}
            {tab === 'orders' && (
              <>
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {['', 'pending_farmer', 'farmer_accepted', 'buyer_confirmed', 'delivered', 'cancelled', 'auto_cancelled'].map(s => (
                    <button key={s} onClick={() => setOrderFilter(s)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${orderFilter === s ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      {s ? s.replace(/_/g, ' ') : 'All'}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="pb-2 font-semibold">Order #</th>
                        <th className="pb-2 font-semibold">Buyer</th>
                        <th className="pb-2 font-semibold">Farmer</th>
                        <th className="pb-2 font-semibold">Amount</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">No orders</td></tr>
                      )}
                      {orders.map(order => (
                        <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 font-mono text-xs">{order.orderNumber}</td>
                          <td className="py-2.5">{order.buyer?.name}</td>
                          <td className="py-2.5">{order.farmer?.name}</td>
                          <td className="py-2.5 font-semibold text-green-600">₹{order.grandTotal}</td>
                          <td className="py-2.5 capitalize text-xs">{order.bookingType}</td>
                          <td className="py-2.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-700'
                              : order.status?.includes('cancel') ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── Subscriptions ────────────────────────── */}
            {tab === 'subscriptions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                      <th className="pb-2 font-semibold">Buyer</th>
                      <th className="pb-2 font-semibold">Plan</th>
                      <th className="pb-2 font-semibold">Amount</th>
                      <th className="pb-2 font-semibold">Orders Used</th>
                      <th className="pb-2 font-semibold">Valid Till</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">No subscriptions</td></tr>
                    )}
                    {subscriptions.map(sub => (
                      <tr key={sub._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5">{sub.buyer?.name}<br/><span className="text-xs text-gray-400">{sub.buyer?.email}</span></td>
                        <td className="py-2.5 capitalize font-semibold">{sub.plan}</td>
                        <td className="py-2.5 text-green-600 font-bold">₹{sub.pricing?.total}</td>
                        <td className="py-2.5">{sub.ordersUsed}</td>
                        <td className="py-2.5 text-xs">{sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {sub.isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
