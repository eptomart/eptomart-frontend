// ============================================
// ADMIN — ANALYTICS DASHBOARD
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiUsers, FiGlobe, FiMapPin, FiMonitor, FiSmartphone, FiTablet } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import Loader from '../../components/common/Loader';
import api from '../../utils/api';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

const DeviceIcon = ({ name }) => {
  const lower = (name || '').toLowerCase();
  if (lower === 'mobile')  return <FiSmartphone size={13} className="text-blue-500" />;
  if (lower === 'tablet')  return <FiTablet     size={13} className="text-purple-500" />;
  return <FiMonitor size={13} className="text-gray-500" />;
};

export default function AdminAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview'); // 'overview' | 'visitors'

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => setData(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage={false} />;
  if (!data)   return <div className="text-center text-red-500 py-10">Failed to load analytics</div>;

  const deviceData = data.deviceStats?.map(d => ({ name: d._id || 'Unknown', value: d.count })) || [];

  return (
    <>
      <Helmet><title>Analytics — Eptomart Admin</title></Helmet>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['overview', 'visitors'].map(t => (
              <button key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                  ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FiEye,   label: 'Total Visits',      value: data.totals.visits?.toLocaleString('en-IN'),          color: 'bg-blue-100 text-blue-600'   },
            { icon: FiUsers, label: 'Unique Visitors',   value: data.totals.uniqueVisitors?.toLocaleString('en-IN'),  color: 'bg-orange-100 text-orange-600'},
            { icon: FiEye,   label: "Today's Visits",    value: data.totals.todayVisits?.toLocaleString('en-IN'),     color: 'bg-green-100 text-green-600' },
            { icon: FiUsers, label: "Today's Unique",    value: data.totals.todayUnique?.toLocaleString('en-IN'),     color: 'bg-purple-100 text-purple-600'},
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

        {/* ── OVERVIEW TAB ───────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Daily Trend */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4">Daily Visitors (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.dailyTrend}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#f97316" strokeWidth={2.5} name="Total" dot={{ fill: '#f97316', r: 3 }} />
                    <Line type="monotone" dataKey="unique" stroke="#3b82f6" strokeWidth={2}   name="Unique" dot={{ fill: '#3b82f6', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Device Breakdown */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4">Device Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Pages */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4">Top Pages (30 days)</h3>
                <div className="space-y-2.5">
                  {data.topPages?.slice(0, 8).map((page, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 text-xs font-mono text-gray-700 truncate">{page._id}</div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="bg-orange-200 h-1.5 rounded-full" style={{ width: `${(page.visits / (data.topPages[0]?.visits || 1)) * 70}px` }} />
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{page.visits}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Browser Stats */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4">Browser Stats (30 days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.browserStats}>
                    <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Visits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Geo: Countries + Cities ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top Countries */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiGlobe size={16} className="text-orange-500" /> Top Countries (30 days)
                </h3>
                {(data.topCountries?.length || 0) === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Geo data will appear as visitors arrive</p>
                  : (
                    <div className="space-y-2.5">
                      {data.topCountries.map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-4 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 text-sm text-gray-700 truncate">{c._id || 'Unknown'}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="bg-blue-200 h-1.5 rounded-full" style={{ width: `${(c.count / (data.topCountries[0]?.count || 1)) * 70}px` }} />
                            <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Top Cities */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiMapPin size={16} className="text-orange-500" /> Top Cities (30 days)
                </h3>
                {(data.topCities?.length || 0) === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Geo data will appear as visitors arrive</p>
                  : (
                    <div className="space-y-2.5">
                      {data.topCities.map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-4 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{c._id || 'Unknown'}</p>
                            <p className="text-xs text-gray-400 truncate">{c.country}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="bg-green-200 h-1.5 rounded-full" style={{ width: `${(c.count / (data.topCities[0]?.count || 1)) * 70}px` }} />
                            <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* ── VISITORS TAB ────────────────────────────────────── */}
        {tab === 'visitors' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Recent Unique Visitors (Last 7 Days)</h3>
              <span className="text-xs text-gray-400">{data.recentVisitors?.length || 0} IPs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">IP Address</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                    <th className="px-4 py-3 text-left font-semibold">Device</th>
                    <th className="px-4 py-3 text-left font-semibold">Browser</th>
                    <th className="px-4 py-3 text-left font-semibold">Last Page</th>
                    <th className="px-4 py-3 text-right font-semibold">Visits</th>
                    <th className="px-4 py-3 text-right font-semibold">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data.recentVisitors || []).length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No visitor data yet</td></tr>
                  )}
                  {(data.recentVisitors || []).map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{v._id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          <FiMapPin size={12} className="text-orange-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">{v.city || '—'}{v.region && v.region !== v.city ? `, ${v.region}` : ''}</p>
                            <p className="text-xs text-gray-400">{v.country || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600">
                          <DeviceIcon name={v.device} />
                          {v.device || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{v.browser || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[140px]">{v.page || '—'}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 text-right">{v.visits}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right whitespace-nowrap">
                        {v.lastSeen ? new Date(v.lastSeen).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
