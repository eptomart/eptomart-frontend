// ============================================
// EPTOFRESH SELLER DASHBOARD
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { FiGrid, FiPackage, FiShoppingBag, FiDollarSign, FiToggleLeft, FiToggleRight, FiLogOut, FiTag, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const STATUS_COLORS = {
  placed: '#60a5fa', accepted: '#34d399', preparing: '#f59e0b',
  packed: '#a78bfa', delivered: '#34d399', cancelled: '#f87171',
};

// ── Seller Promo Request Section ─────────────────────────
function PromoRequestSection() {
  const [open, setOpen] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountValue: '', minOrderValue: '',
    maxUsage: '50', validFrom: '', validTo: '', requestReason: '',
  });

  useEffect(() => {
    if (open) {
      api.get('/eptofresh/seller/promo-requests').then(r => { if (r.data.success) setMyRequests(r.data.coupons); }).catch(() => {});
    }
  }, [open]);

  const submit = async () => {
    if (!form.code || !form.discountValue || !form.validFrom || !form.validTo) {
      toast.error('Fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/eptofresh/seller/promo-request', form);
      if (data.success) {
        toast.success('Promo request submitted to admin!');
        setMyRequests(r => [data.coupon, ...r]);
        setShowForm(false);
        setForm({ code: '', description: '', discountValue: '', minOrderValue: '', maxUsage: '50', validFrom: '', validTo: '', requestReason: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' };
  const statusColor = { pending: '#fbbf24', approved: '#34d399', rejected: '#f87171' };

  return (
    <div className="px-4 mt-4">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.2)' }}>
        <div className="flex items-center gap-2">
          <FiTag style={{ color: '#f4941c' }} size={16} />
          <span className="text-white font-semibold text-sm">Promo Codes</span>
          {myRequests.some(r => r.requestStatus === 'pending') && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>PENDING</span>
          )}
        </div>
        {open ? <FiChevronUp size={16} style={{ color: '#f4941c' }} /> : <FiChevronDown size={16} style={{ color: '#f4941c' }} />}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs">Request a % discount promo from admin (shipping excluded)</p>
            <button onClick={() => setShowForm(v => !v)}
              className="px-3 py-1 rounded-xl text-xs font-bold text-white"
              style={{ background: '#f4941c' }}>
              + Request
            </button>
          </div>

          {showForm && (
            <div className="space-y-3 pt-1">
              {[
                { key: 'code',          label: 'Promo Code *',              type: 'text',   placeholder: 'MYSHOP20' },
                { key: 'discountValue', label: 'Discount % (excl. shipping) *', type: 'number', placeholder: '10' },
                { key: 'minOrderValue', label: 'Min Order Value (₹)',       type: 'number', placeholder: '0' },
                { key: 'maxUsage',      label: 'Max Uses',                  type: 'number', placeholder: '50' },
                { key: 'validFrom',     label: 'Valid From *',              type: 'date' },
                { key: 'validTo',       label: 'Valid To *',                type: 'date' },
                { key: 'description',   label: 'Description',               type: 'text',   placeholder: 'e.g. Weekend offer' },
                { key: 'requestReason', label: 'Reason for request',        type: 'text',   placeholder: 'e.g. Festival promotion' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={inputStyle} />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={submit} disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{ background: '#f4941c' }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-gray-400"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* My existing requests */}
          {myRequests.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider">My Requests</p>
              {myRequests.map(c => (
                <div key={c._id} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-white text-xs font-bold">{c.code}</p>
                    <p className="text-gray-500 text-[10px]">{c.discountValue}% off • Max {c.maxUsage} uses</p>
                  </div>
                  <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-full"
                    style={{ background: `${statusColor[c.requestStatus] || '#94a3b8'}20`, color: statusColor[c.requestStatus] || '#94a3b8' }}>
                    {c.requestStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EptoFreshSellerDashboard() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [dash, setDash]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => {
    api.get('/eptofresh/seller/dashboard')
      .then(r => { if (r.data.success) setDash(r.data); })
      .catch(() => navigate('/eptofresh/seller/register'))
      .finally(() => setLoading(false));
  }, []);

  const toggleOpen = async () => {
    setTogglingOpen(true);
    try {
      const { data } = await api.put('/eptofresh/seller/profile', { isOpen: !dash.seller.isOpen });
      if (data.success) setDash(d => ({ ...d, seller: { ...d.seller, isOpen: data.seller.isOpen } }));
    } catch { toast.error('Failed to update status'); } finally { setTogglingOpen(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1729' }}>
        <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabs = [
    { path: '/eptofresh/seller',          label: 'Dashboard', Icon: FiGrid },
    { path: '/eptofresh/seller/products', label: 'Products',  Icon: FiPackage },
    { path: '/eptofresh/seller/orders',   label: 'Orders',    Icon: FiShoppingBag },
    { path: '/eptofresh/seller/payouts',  label: 'Payouts',   Icon: FiDollarSign },
  ];

  if (dash?.seller?.status === 'pending_review') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0B1729' }}>
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-white text-xl font-bold mb-2">Application Under Review</h2>
        <p className="text-gray-400 text-sm">Your EptoFresh seller application is being reviewed. You'll be notified within 24 hours.</p>
        <p className="text-gray-600 text-xs mt-4">{dash.seller.shopName} — {dash.seller.sellerCode}</p>
      </div>
    );
  }

  if (dash?.seller?.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0B1729' }}>
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-white text-xl font-bold mb-2">Application Rejected</h2>
        <p className="text-gray-400 text-sm">Please contact support for more information.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">{dash?.seller?.shopName}</h1>
            <p className="text-gray-500 text-xs">EptoFresh Seller Panel</p>
          </div>
          <button
            onClick={toggleOpen}
            disabled={togglingOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: dash?.seller?.isOpen ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: dash?.seller?.isOpen ? '#34d399' : '#f87171' }}
          >
            {dash?.seller?.isOpen ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
            {dash?.seller?.isOpen ? 'Open' : 'Closed'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Today', value: dash?.stats?.todayOrders || 0, icon: '📋' },
            { label: 'Pending', value: dash?.stats?.pendingOrders || 0, icon: '⏳' },
            { label: 'Payout', value: `₹${(dash?.stats?.pendingPayout || 0).toFixed(0)}`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-white font-bold text-sm">{s.value}</div>
              <div className="text-gray-500 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Code Request */}
      <PromoRequestSection />

      {/* Recent orders */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Recent Orders</h3>
          <Link to="/eptofresh/seller/orders" className="text-orange-400 text-xs">View All</Link>
        </div>

        {dash?.recentOrders?.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-6">No orders yet</p>
        )}

        <div className="space-y-2">
          {(dash?.recentOrders || []).map(order => (
            <div key={order._id} onClick={() => navigate(`/eptofresh/seller/orders/${order._id}`)}
              className="flex items-center justify-between rounded-xl p-3 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-white text-xs font-semibold">#{order.orderId}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                  style={{ background: `${STATUS_COLORS[order.orderStatus] || '#94a3b8'}1a`, color: STATUS_COLORS[order.orderStatus] || '#94a3b8' }}>
                  {order.orderStatus}
                </span>
              </div>
              <span className="text-orange-400 font-bold text-sm">₹{order.pricing?.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: 'rgba(11,23,41,0.97)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex">
          {tabs.map(t => {
            const isActive = location.pathname === t.path;
            return (
              <button key={t.path} onClick={() => navigate(t.path)} className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
                <t.Icon size={20} style={{ color: isActive ? '#f4941c' : 'rgba(255,255,255,0.35)' }} />
                <span className="text-[9px] font-semibold" style={{ color: isActive ? '#f4941c' : 'rgba(255,255,255,0.35)' }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
