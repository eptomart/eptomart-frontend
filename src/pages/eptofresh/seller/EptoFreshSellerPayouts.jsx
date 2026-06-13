// ============================================
// EPTOFRESH SELLER PAYOUTS
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { FiArrowLeft, FiDollarSign } from 'react-icons/fi';

export default function EptoFreshSellerPayouts() {
  const navigate = useNavigate();
  const [data, setData]     = useState({ payouts: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/eptofresh/seller/payouts')
      .then(r => { if (r.data.success) setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? data.payouts : data.payouts.filter(p => p.status === filter);

  const STATUS_COLORS = { pending: '#fbbf24', settled: '#34d399', processing: '#60a5fa', failed: '#f87171' };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0D0A07' }}>
      <div className="flex items-center gap-3 px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate('/eptofresh/seller')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}><FiArrowLeft className="text-white" /></button>
        <h1 className="text-white font-bold text-lg">Payouts</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {[
          { label: 'Total Earnings', value: `₹${(data.summary.totalEarnings || 0).toFixed(0)}`, color: '#34d399' },
          { label: 'Pending',        value: `₹${(data.summary.pendingPayout || 0).toFixed(0)}`,  color: '#fbbf24' },
          { label: 'Settled',        value: `₹${(data.summary.totalSettled  || 0).toFixed(0)}`,  color: '#60a5fa' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-sm" style={{ color: c.color }}>{c.value}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="mx-4 mt-4 rounded-xl p-3" style={{ background: 'rgba(244,148,28,0.06)', border: '1px solid rgba(244,148,28,0.12)' }}>
        <p className="text-orange-400 text-xs font-semibold mb-1">Commission Structure</p>
        <p className="text-gray-400 text-xs">Platform fee: 10% + 18% GST on fee = 11.8% total deduction</p>
        <p className="text-gray-400 text-xs mt-0.5">Example: ₹1000 order → You receive ₹882</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto">
        {['all','pending','settled','processing'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize"
            style={{ background: filter === f ? '#f4941c' : 'rgba(255,255,255,0.07)', color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Payout list */}
      <div className="px-4 mt-4 space-y-2">
        {loading && [1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
        {!loading && filtered.length === 0 && <p className="text-gray-600 text-center py-8">No payouts yet</p>}

        {filtered.map(p => (
          <div key={p._id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <p className="text-white text-sm font-semibold">#{p.orderId}</p>
              <p className="text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
              <div className="flex gap-2 mt-0.5">
                <span className="text-gray-600 text-[10px]">Order: ₹{p.orderTotal}</span>
                <span className="text-red-400 text-[10px]">Deduction: ₹{p.totalDeduction?.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-bold text-sm">₹{p.sellerReceives?.toFixed(2)}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize" style={{ background: `${STATUS_COLORS[p.status] || '#94a3b8'}1a`, color: STATUS_COLORS[p.status] || '#94a3b8' }}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
