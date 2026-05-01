// ============================================
// ADMIN — VISITOR IP + LOCATION TRACKING
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  FiGlobe, FiMonitor, FiSmartphone, FiTablet, FiRefreshCw,
  FiFilter, FiX, FiMapPin, FiChevronLeft, FiChevronRight,
  FiUser, FiAlertCircle,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

const DeviceIcon = ({ device }) => {
  const d = (device || '').toLowerCase();
  if (d === 'mobile')  return <FiSmartphone size={13} className="text-blue-500" />;
  if (d === 'tablet')  return <FiTablet     size={13} className="text-purple-500" />;
  return <FiMonitor size={13} className="text-gray-500" />;
};

const FLAG_BASE = 'https://flagcdn.com/16x12';
const countryCode = (name) => {
  const map = { India: 'in', 'United States': 'us', 'United Kingdom': 'gb', Germany: 'de', France: 'fr', Singapore: 'sg', Australia: 'au', Canada: 'ca' };
  return map[name] || '';
};

export default function Visitors() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [day,    setDay]    = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [country,setCountry]= useState('');
  const [city,   setCity]   = useState('');
  const [page,   setPage]   = useState('');
  const [device, setDevice] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [showBots, setShowBots] = useState('false');
  const [pg,     setPg]     = useState(1);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { pg, limit: 50, isBot: showBots };
      if (day)    { params.day = day; }
      else        { if (from) params.from = from; if (to) params.to = to; }
      if (country) params.country = country;
      if (city)    params.city    = city;
      if (page)    params.page    = page;
      if (device)  params.device  = device;
      if (ipFilter)params.ip      = ipFilter;

      const { data: res } = await api.get('/analytics/visitors', { params });
      setData(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load visitors');
    } finally { setLoading(false); }
  }, [pg, day, from, to, country, city, page, device, ipFilter, showBots]);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);
  useEffect(() => { setPg(1); }, [day, from, to, country, city, page, device, ipFilter, showBots]);

  const clearFilters = () => {
    setDay(''); setFrom(''); setTo(''); setCountry('');
    setCity(''); setPage(''); setDevice(''); setIpFilter(''); setShowBots('false');
  };

  const hasFilter = day || from || to || country || city || page || device || ipFilter || showBots !== 'false';

  const stats = data?.stats || {};

  return (
    <>
      <Helmet><title>Visitor Tracking — Eptomart Admin</title></Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🌐 Visitor Tracking</h1>
            <p className="text-sm text-gray-500 mt-0.5">IP addresses, locations, devices, and page visits</p>
          </div>
          <button onClick={fetchVisitors} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Visits',      val: stats.total         || 0, icon: '📊' },
            { label: 'Unique IPs',        val: stats.uniqueIps     || 0, icon: '👥' },
            { label: 'Unique Sessions',   val: stats.uniqueSessions|| 0, icon: '🔗' },
            { label: 'Bots Filtered',     val: stats.bots          || 0, icon: '🤖' },
          ].map(({ label, val, icon }) => (
            <div key={label} className="card p-4">
              <p className="text-xl mb-0.5">{icon}</p>
              <p className="text-2xl font-bold text-gray-800">{val.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Top countries + cities */}
        {(data?.topCountries?.length > 0 || data?.topCities?.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {data?.topCountries?.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiGlobe size={14} className="text-blue-500" /> Top Countries
                </p>
                <div className="space-y-2">
                  {data.topCountries.map(c => (
                    <div key={c._id} className="flex items-center gap-2">
                      {countryCode(c._id) && (
                        <img src={`${FLAG_BASE}/${countryCode(c._id)}.png`} alt={c._id}
                          className="w-4 h-3 object-cover rounded-sm" />
                      )}
                      <button className="text-xs text-gray-700 hover:text-orange-600 transition-colors flex-1 text-left truncate"
                        onClick={() => setCountry(c._id)}>
                        {c._id || 'Unknown'}
                      </button>
                      <span className="text-xs font-semibold text-gray-500">{c.count.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data?.topCities?.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiMapPin size={14} className="text-orange-500" /> Top Cities
                </p>
                <div className="space-y-2">
                  {data.topCities.map(c => (
                    <div key={c._id} className="flex items-center gap-2">
                      <button className="text-xs text-gray-700 hover:text-orange-600 transition-colors flex-1 text-left truncate"
                        onClick={() => setCity(c._id)}>
                        {c._id || 'Unknown'}{c.country ? `, ${c.country}` : ''}
                      </button>
                      <span className="text-xs font-semibold text-gray-500">{c.count.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FiFilter size={14} className="text-gray-400" />

            {/* Date */}
            <input type="date" value={day} onChange={e => { setDay(e.target.value); setFrom(''); setTo(''); }}
              placeholder="Single day"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
            <span className="text-xs text-gray-400">or</span>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setDay(''); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
            <span className="text-xs text-gray-400">→</span>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setDay(''); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />

            {/* Country */}
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-orange-300" />

            {/* City */}
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-orange-300" />

            {/* Page */}
            <input value={page} onChange={e => setPage(e.target.value)} placeholder="URL path"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-28 focus:outline-none focus:ring-1 focus:ring-orange-300" />

            {/* Device */}
            <select value={device} onChange={e => setDevice(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300">
              <option value="">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Desktop</option>
            </select>

            {/* IP */}
            <input value={ipFilter} onChange={e => setIpFilter(e.target.value)} placeholder="IP address"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-32 font-mono focus:outline-none focus:ring-1 focus:ring-orange-300" />

            {/* Bots */}
            <select value={showBots} onChange={e => setShowBots(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300">
              <option value="false">Humans Only</option>
              <option value="true">Bots Only</option>
              <option value="">All (incl. bots)</option>
            </select>

            {hasFilter && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                <FiX size={12} /> Clear
              </button>
            )}
          </div>

          {(country || city) && (
            <div className="flex gap-2 flex-wrap pt-1">
              {country && (
                <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  <FiGlobe size={10} /> {country}
                  <button onClick={() => setCountry('')} className="ml-1 hover:text-blue-900"><FiX size={10} /></button>
                </span>
              )}
              {city && (
                <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  <FiMapPin size={10} /> {city}
                  <button onClick={() => setCity('')} className="ml-1 hover:text-orange-900"><FiX size={10} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading visitors…</div>
          ) : !data?.visitors?.length ? (
            <div className="p-12 text-center text-gray-400 text-sm">No visitor records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Time</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">IP Address</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Location</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Device / Browser</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Page</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Referrer</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.visitors.map(v => (
                    <tr key={v._id} className={`hover:bg-gray-50 transition-colors ${v.isBot ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(v.timestamp)}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs font-mono text-blue-600 hover:underline"
                          onClick={() => setIpFilter(v.ip)}>
                          {v.ip || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {countryCode(v.country) && (
                            <img src={`${FLAG_BASE}/${countryCode(v.country)}.png`} alt={v.country}
                              className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
                          )}
                          <div>
                            <button className="text-xs text-gray-700 hover:text-orange-600 block"
                              onClick={() => { setCity(v.city || ''); setCountry(v.country || ''); }}>
                              {v.city || v.country || '—'}
                            </button>
                            {v.city && v.country && (
                              <span className="text-[11px] text-gray-400">{v.country}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <DeviceIcon device={v.device} />
                          <div>
                            <p className="text-xs text-gray-700">{v.browser || '—'}</p>
                            <p className="text-[11px] text-gray-400">{v.os || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-gray-600 hover:text-orange-600 font-mono truncate max-w-[160px] block"
                          onClick={() => setPage(v.page)} title={v.page}>
                          {v.page || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[120px]" title={v.referrer}>
                        {v.referrer || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {v.isBot ? (
                          <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                            <FiAlertCircle size={11} /> Bot
                          </span>
                        ) : v.userId ? (
                          <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                            <FiUser size={11} /> Member
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Guest</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {data.page} of {data.pages} · {data.total.toLocaleString('en-IN')} records
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={data.page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <FiChevronLeft size={15} />
                </button>
                <button onClick={() => setPg(p => Math.min(data.pages, p + 1))} disabled={data.page >= data.pages}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
