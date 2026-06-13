// ============================================
// EPTOFRESH SELLER DASHBOARD — Premium Redesign
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  FiGrid, FiPackage, FiShoppingBag, FiDollarSign,
  FiToggleLeft, FiToggleRight, FiTag, FiChevronDown, FiChevronUp,
  FiHome, FiMapPin, FiClock, FiAlertCircle, FiTrendingUp,
  FiPlus, FiChevronRight, FiStar, FiX,
} from 'react-icons/fi';

const STATUS_META = {
  placed:    { color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  label:'New' },
  accepted:  { color:'#34d399', bg:'rgba(52,211,153,0.12)',  label:'Accepted' },
  preparing: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  label:'Preparing' },
  packed:    { color:'#a78bfa', bg:'rgba(167,139,250,0.12)', label:'Packed' },
  delivered: { color:'#34d399', bg:'rgba(52,211,153,0.12)',  label:'Delivered' },
  cancelled: { color:'#f87171', bg:'rgba(248,113,113,0.12)', label:'Cancelled' },
};

// ── Promo Request section ─────────────────────────────────
function PromoSection() {
  const [open, setOpen]         = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code:'', description:'', discountValue:'', minOrderValue:'', maxUsage:'50', validFrom:'', validTo:'', requestReason:'' });

  useEffect(() => {
    if (open) api.get('/eptofresh/seller/promo-requests').then(r => { if (r.data.success) setMyRequests(r.data.coupons); }).catch(()=>{});
  }, [open]);

  const submit = async () => {
    if (!form.code || !form.discountValue || !form.validFrom || !form.validTo) { toast.error('Fill all required fields'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/eptofresh/seller/promo-request', form);
      if (data.success) {
        toast.success('Promo request sent to admin!');
        setMyRequests(r => [data.coupon, ...r]);
        setShowForm(false);
        setForm({ code:'', description:'', discountValue:'', minOrderValue:'', maxUsage:'50', validFrom:'', validTo:'', requestReason:'' });
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const statusColor = { pending:'#fbbf24', approved:'#34d399', rejected:'#f87171' };
  const iStyle = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', fontSize:16 };

  return (
    <div>
      <button onClick={() => setOpen(v=>!v)}
        className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-all"
        style={{ background:'rgba(244,148,28,0.07)', border:'1px solid rgba(244,148,28,0.18)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'rgba(244,148,28,0.15)' }}>
            <FiTag size={15} style={{ color:'#f4941c' }} />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-semibold">Promo Codes</p>
            <p className="text-gray-500 text-[10px]">Request discounts for your customers</p>
          </div>
          {myRequests.some(r=>r.requestStatus==='pending') && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background:'rgba(251,191,36,0.2)',color:'#fbbf24' }}>PENDING</span>
          )}
        </div>
        {open ? <FiChevronUp size={16} style={{ color:'#f4941c' }} /> : <FiChevronDown size={16} style={{ color:'#f4941c' }} />}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl p-4 space-y-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs">Request a % discount promo from admin</p>
            <button onClick={() => setShowForm(v=>!v)}
              className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-white"
              style={{ background:'#f4941c' }}>
              <FiPlus size={11} /> Request
            </button>
          </div>
          {showForm && (
            <div className="space-y-3 pt-1">
              {[
                { key:'code',label:'Promo Code *',type:'text',ph:'MYSHOP20' },
                { key:'discountValue',label:'Discount % *',type:'number',ph:'10' },
                { key:'minOrderValue',label:'Min Order (₹)',type:'number',ph:'0' },
                { key:'maxUsage',label:'Max Uses',type:'number',ph:'50' },
                { key:'validFrom',label:'Valid From *',type:'date' },
                { key:'validTo',label:'Valid To *',type:'date' },
                { key:'requestReason',label:'Reason',type:'text',ph:'e.g. Festival offer' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs block mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key]} placeholder={f.ph}
                    onChange={e => setForm(v=>({...v,[f.key]:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={iStyle} />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={submit} disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{ background:'#f4941c' }}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 rounded-xl text-sm text-gray-400"
                  style={{ background:'rgba(255,255,255,0.05)' }}>Cancel</button>
              </div>
            </div>
          )}
          {myRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider font-semibold">My Requests</p>
              {myRequests.map(c => (
                <div key={c._id} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p className="text-white text-xs font-bold">{c.code}</p>
                    <p className="text-gray-500 text-[10px]">{c.discountValue}% · Max {c.maxUsage} uses</p>
                  </div>
                  <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-full"
                    style={{ background:`${statusColor[c.requestStatus]||'#94a3b8'}18`, color:statusColor[c.requestStatus]||'#94a3b8' }}>
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
  const navigate  = useNavigate();
  const loc       = useLocation();
  const [dash, setDash]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState(false);

  useEffect(() => {
    api.get('/eptofresh/seller/dashboard')
      .then(r => { if (r.data.success) setDash(r.data); })
      .catch(() => navigate('/eptofresh/seller/register'))
      .finally(() => setLoading(false));
  }, []);

  const toggleOpen = async () => {
    setToggling(true);
    try {
      const { data } = await api.put('/eptofresh/seller/profile', { isOpen: !dash.seller.isOpen });
      if (data.success) setDash(d => ({ ...d, seller: { ...d.seller, isOpen: data.seller.isOpen } }));
    } catch { toast.error('Failed to update status'); }
    finally { setToggling(false); }
  };

  const tabs = [
    { path:'/eptofresh/seller',          label:'Dashboard', Icon:FiGrid },
    { path:'/eptofresh/seller/products', label:'Products',  Icon:FiPackage },
    { path:'/eptofresh/seller/orders',   label:'Orders',    Icon:FiShoppingBag },
    { path:'/eptofresh/seller/payouts',  label:'Payouts',   Icon:FiDollarSign },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#0A0705' }}>
      <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
    </div>
  );

  if (dash?.seller?.status === 'rejected') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background:'#0A0705' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)' }}>
        <FiAlertCircle size={30} className="text-red-400" />
      </div>
      <h2 className="text-white text-lg font-bold mb-1">Application Rejected</h2>
      <p className="text-gray-400 text-sm mb-5">Please contact support for more information.</p>
      <button onClick={() => navigate('/eptofresh')}
        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background:'#f4941c' }}>Back to EptoFresh</button>
    </div>
  );

  const seller  = dash?.seller;
  const stats   = dash?.stats || {};
  const isOpen  = seller?.isOpen;
  const isPending = seller?.status === 'pending_review';

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background:'#0A0705' }}>

      {/* ── HERO HEADER ── */}
      <div style={{ background:'linear-gradient(180deg,#1c1208 0%,#130b04 65%,#0A0705 100%)', borderBottom:'1px solid rgba(255,160,60,0.08)' }}>
        <div className="px-4 pt-12 pb-5">

          {/* Back link */}
          <button onClick={() => navigate('/eptofresh')}
            className="flex items-center gap-1.5 mb-4 text-xs font-semibold"
            style={{ color:'rgba(255,255,255,0.3)' }}>
            <FiHome size={12} /> EptoFresh Home
          </button>

          {/* Shop identity + toggle */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#1a0e06,#2a1a0a)', border:'1px solid rgba(244,148,28,0.2)' }}>
                {seller?.shopImage
                  ? <img src={seller.shopImage} className="w-full h-full object-cover" alt="shop" />
                  : <FiShoppingBag size={20} style={{ color:'rgba(244,148,28,0.6)' }} />}
              </div>
              <div>
                <h1 className="text-white font-extrabold text-base leading-tight">{seller?.shopName}</h1>
                <p className="text-gray-500 text-[11px] mt-0.5">{seller?.address?.city || 'EptoFresh Seller'}</p>
                {isPending && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                    style={{ background:'rgba(251,191,36,0.15)',color:'#fbbf24' }}>
                    <FiClock size={9} /> Under Review
                  </span>
                )}
              </div>
            </div>

            {/* Open/Closed toggle — prominent */}
            <button onClick={toggleOpen} disabled={toggling}
              className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: isOpen ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.10)',
                border: `1.5px solid ${isOpen ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.25)'}`,
              }}>
              {isOpen
                ? <FiToggleRight size={26} style={{ color:'#34d399' }} />
                : <FiToggleLeft  size={26} style={{ color:'#f87171' }} />}
              <span className="text-[10px] font-bold" style={{ color: isOpen ? '#34d399' : '#f87171' }}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </button>
          </div>

          {/* Pending review banner */}
          {isPending && (
            <div className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-4"
              style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)' }}>
              <FiClock size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-yellow-300 font-bold text-xs">Application Under Review</p>
                <p className="text-yellow-200/50 text-[11px] mt-0.5">Set up your products now. Shop goes live once admin approves (usually within 24h).</p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:'Today',   value: stats.todayOrders  || 0,                         Icon:FiShoppingBag, color:'#60a5fa' },
              { label:'Pending', value: stats.pendingOrders || 0,                         Icon:FiClock,       color:'#fbbf24' },
              { label:'Rating',  value: (stats.avgRating   || 0).toFixed(1),              Icon:FiStar,        color:'#fbbf24' },
              { label:'Payout',  value:`₹${Math.round(stats.pendingPayout||0)}`,          Icon:FiDollarSign,  color:'#34d399' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 flex flex-col items-center gap-1"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <s.Icon size={15} style={{ color:s.color }} />
                <div className="text-white font-extrabold text-sm leading-none">{s.value}</div>
                <div className="text-gray-600 text-[9px] font-semibold uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {[
          { label:'Add Product',    sub:'List new items',      Icon:FiPlus,     color:'#f4941c', to:'/eptofresh/seller/products' },
          { label:'View Orders',    sub:`${stats.pendingOrders||0} pending`,     Icon:FiShoppingBag, color:'#60a5fa', to:'/eptofresh/seller/orders' },
          { label:'Update Location',sub:'Pin your shop',       Icon:FiMapPin,   color:'#34d399', to:'/eptofresh/seller/location' },
          { label:'Payouts',        sub:'Track earnings',      Icon:FiTrendingUp,color:'#a78bfa',to:'/eptofresh/seller/payouts' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.to)}
            className="flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all active:scale-[0.97]"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=`${a.color}40`}
            onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:`${a.color}18` }}>
              <a.Icon size={16} style={{ color:a.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-tight truncate">{a.label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{a.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── PROMO CODES ── */}
      <div className="px-4 mt-4">
        <PromoSection />
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm">Recent Orders</p>
          <Link to="/eptofresh/seller/orders"
            className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color:'#f4941c' }}>
            View All <FiChevronRight size={12} />
          </Link>
        </div>

        {!dash?.recentOrders?.length && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <FiShoppingBag size={28} className="mx-auto mb-2 text-gray-700" />
            <p className="text-gray-500 text-sm">No orders yet</p>
            <p className="text-gray-700 text-xs mt-1">Share your shop link to start getting orders</p>
          </div>
        )}

        <div className="space-y-2">
          {(dash?.recentOrders || []).map(order => {
            const m = STATUS_META[order.orderStatus] || { color:'#94a3b8', bg:'rgba(148,163,184,0.12)', label: order.orderStatus };
            return (
              <button key={order._id}
                onClick={() => navigate(`/eptofresh/seller/orders/${order._id}`)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background:m.bg }}>
                  <FiShoppingBag size={14} style={{ color:m.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-xs font-bold">#{order.orderId}</p>
                  <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full"
                    style={{ background:m.bg, color:m.color }}>
                    {m.label}
                  </span>
                </div>
                <span className="text-orange-400 font-extrabold text-sm shrink-0">₹{order.pricing?.total}</span>
                <FiChevronRight size={13} className="text-gray-700 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background:'rgba(8,15,28,0.97)', borderTop:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(12px)' }}>
        <div className="flex">
          {tabs.map(t => {
            const active = loc.pathname === t.path;
            return (
              <button key={t.path} onClick={() => navigate(t.path)}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 relative">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background:'#f4941c' }} />
                )}
                <t.Icon size={20} style={{ color: active ? '#f4941c' : 'rgba(255,255,255,0.28)' }} />
                <span className="text-[9px] font-bold" style={{ color: active ? '#f4941c' : 'rgba(255,255,255,0.28)' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
