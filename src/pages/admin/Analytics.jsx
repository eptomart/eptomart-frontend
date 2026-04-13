// ============================================
// ADMIN — ANALYTICS DASHBOARD
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiUsers, FiMonitor, FiSmartphone } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import Loader from '../../components/common/Loader';
import api from '../../utils/api';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => setData(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage={false} />;
  if (!data) return <div className="text-center text-red-500">Failed to load analytics</div>;

  const deviceData = data.deviceStats?.map(d => ({ name: d._id || 'Unknown', value: d.count })) || [];

  return (
    <>
      <Helmet><title>Analytics — Eptomart Admin</title></Helmet>

      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FiEye, label: 'Total Visits', value: data.totals.visits?.toLocaleString('en-IN'), color: 'bg-blue-100 text-blue-600' },
            { icon: FiUsers, label: 'Unique Visitors', value: data.totals.uniqueVisitors?.toLocaleString('en-IN'), color: 'bg-orange-100 text-orange-600' },
            { icon: FiEye, label: "Today's Visits", value: data.totals.todayVisits?.toLocaleString('en-IN'), color: 'bg-green-100 text-green-600' },
            { icon: FiUsers, label: "Today's Unique", value: data.totals.todayUnique?.toLocaleString('en-IN'), color: 'bg-purple-100 text-purple-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{value || '0'}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">Daily Visitors (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dailyTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#f97316" strokeWidth={2.5} name="Total Visits" dot={{ fill: '#f97316' }} />
                <Line type="monotone" dataKey="unique" stroke="#3b82f6" strokeWidth={2} name="Unique Visitors" dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Pages */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">Top Pages (30 days)</h3>
            <div className="space-y-2">
              {data.topPages?.slice(0, 8).map((page, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 text-sm font-mono text-gray-700 truncate">{page._id}</div>
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 h-2 rounded-full" style={{ width: `${(page.visits / data.topPages[0].visits) * 80}px` }} />
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{page.visits}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Stats */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">Browser Stats (30 days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.browserStats}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 bg-orange-50 border border-orange-200">
          <p className="text-sm text-orange-700">
            💡 <strong>Tip:</strong> For more detailed analytics, add your Google Analytics 4 Measurement ID in the .env file and include the GA4 script in your index.html.
          </p>
        </div>
      </div>
    </>
  );
}
