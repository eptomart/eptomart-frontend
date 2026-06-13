// ============================================
// EPTOFRESH ADMIN PANEL
// Full control: sellers, products, orders, payouts
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { FiGrid, FiUsers, FiPackage, FiShoppingBag, FiDollarSign, FiTag, FiCheck, FiX, FiCamera, FiBarChart2, FiSettings, FiPlus, FiMapPin, FiArrowLeft, FiEdit2, FiSave } from 'react-icons/fi';

export default function EptoFreshAdmin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [tab, setTab] = useState('dashboard');
  const [dash, setDash] = useState(null);

  useEffect(() => {
    api.get('/eptofresh/admin/dashboard').then(r => { if (r.data.success) setDash(r.data); }).catch(() => {});
  }, []);

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', Icon: FiGrid },
    { key: 'sellers',   label: 'Sellers',   Icon: FiUsers },
    { key: 'products',  label: 'Products',  Icon: FiPackage },
    { key: 'orders',    label: 'Orders',    Icon: FiShoppingBag },
    { key: 'payouts',   label: 'Payouts',   Icon: FiDollarSign },
    { key: 'coupons',   label: 'Coupons',   Icon: FiTag },
    { key: 'config',    label: 'Config',    Icon: FiSettings },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <FiArrowLeft className="text-white" size={18} />
        </button>
        <div>
          <h1 className="text-white font-bold text-xl">🥩 EptoFresh Admin</h1>
          <p className="text-gray-500 text-xs mt-0.5">Hyperlocal Proteins Marketplace</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex overflow-x-auto scrollbar-hide border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all"
            style={{ color: tab === t.key ? '#f4941c' : 'rgba(255,255,255,0.4)', borderBottom: tab === t.key ? '2px solid #f4941c' : '2px solid transparent' }}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'dashboard'  && <DashboardTab dash={dash} />}
        {tab === 'sellers'    && <SellersTab />}
        {tab === 'products'   && <ProductsTab />}
        {tab === 'orders'     && <OrdersTab />}
        {tab === 'payouts'    && <PayoutsTab />}
        {tab === 'coupons'    && <CouponsTab />}
        {tab === 'config'     && <DeliveryConfigTab />}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────
function DashboardTab({ dash }) {
  if (!dash) return <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" /></div>;

  const stats = dash.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Orders',       value: stats.totalOrders,         color: '#60a5fa' },
          { label: 'Today Orders',       value: stats.todayOrders,         color: '#f4941c' },
          { label: 'Active Sellers',     value: stats.activeSellers,       color: '#34d399' },
          { label: 'Pending Approvals',  value: stats.pendingPackedApprovals + stats.pendingSellers, color: '#f87171' },
          { label: 'Revenue',            value: `₹${(stats.totalRevenue||0).toFixed(0)}`, color: '#a78bfa' },
          { label: 'Pending Payouts',    value: `₹${(stats.pendingPayouts||0).toFixed(0)}`, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.pendingPackedApprovals > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <p className="text-purple-400 font-semibold">📦 {stats.pendingPackedApprovals} order{stats.pendingPackedApprovals > 1 ? 's' : ''} waiting for photo approval</p>
          <p className="text-gray-500 text-xs">Verify packed product photos to trigger Porter delivery</p>
        </div>
      )}

      <div>
        <p className="text-white font-semibold mb-3 text-sm">Recent Orders</p>
        <div className="space-y-2">
          {(dash.recentOrders || []).map(o => (
            <div key={o._id} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-white text-xs font-semibold">#{o.orderId}</p>
                <p className="text-gray-500 text-[10px]">{o.seller?.shopName}</p>
              </div>
              <div className="text-right">
                <p className="text-orange-400 text-xs font-bold">₹{o.pricing?.total}</p>
                <p className="text-gray-600 text-[10px] capitalize">{o.orderStatus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sellers ──────────────────────────────────────────────
const MEAT_CATEGORIES = [
  { key: 'chicken',       label: '🍗 Chicken' },
  { key: 'mutton',        label: '🥩 Mutton' },
  { key: 'fish',          label: '🐟 Fish' },
  { key: 'seafood',       label: '🦐 Seafood' },
  { key: 'beef',          label: '🥩 Beef' },
  { key: 'pork',          label: '🐖 Pork' },
  { key: 'ready_to_cook', label: '🍱 Ready to Cook' },
];

const BLANK_FORM = {
  shopName: '', ownerName: '', phone: '', email: '',
  addressLine1: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '',
  lat: '', lng: '',
  categories: [],
  fssaiNumber: '', panNumber: '', gstNumber: '',
};

function AddSellerModal({ onClose, onCreated }) {
  const [form, setForm]     = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCat = (k) => setForm(f => ({
    ...f,
    categories: f.categories.includes(k)
      ? f.categories.filter(c => c !== k)
      : [...f.categories, k],
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.shopName || !form.ownerName || !form.phone) {
      toast.error('Shop name, owner name, and phone are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/eptofresh/admin/sellers', form);
      if (data.success) {
        toast.success(`${form.shopName} added as approved seller!`);
        onCreated(data.seller);
        onClose();
      } else {
        toast.error(data.message || 'Failed to create seller');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create seller');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#fff',
    padding: '10px 12px',
    fontSize: 15,
    width: '100%',
    outline: 'none',
  };
  const labelStyle = { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{ background: '#0f2035', maxHeight: '92vh', padding: '24px 20px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">➕ Add Seller</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <FiX className="text-gray-400" size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Basic Info */}
          <div>
            <label style={labelStyle}>Shop Name *</label>
            <input style={inputStyle} value={form.shopName} onChange={e => set('shopName', e.target.value)} placeholder="e.g. Raja Chicken Shop" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Owner Name *</label>
              <input style={inputStyle} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Full name" required />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input style={inputStyle} type="tel" inputMode="numeric" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="optional" />
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Address Line 1</label>
            <input style={inputStyle} value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="Street, area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Pincode</label>
              <input style={inputStyle} type="tel" inputMode="numeric" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="600001" />
            </div>
          </div>

          {/* GPS Coordinates */}
          <div>
            <label style={labelStyle}><FiMapPin size={10} style={{ display:'inline', marginRight:3 }} />GPS Coordinates (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <input style={inputStyle} type="text" inputMode="decimal" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="Latitude e.g. 13.0827" />
              <input style={inputStyle} type="text" inputMode="decimal" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="Longitude e.g. 80.2707" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>Used for distance-based search. Find on Google Maps → right-click location → copy coordinates.</p>
          </div>

          {/* Categories */}
          <div>
            <label style={labelStyle}>Categories</label>
            <div className="flex flex-wrap gap-2">
              {MEAT_CATEGORIES.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCat(c.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: form.categories.includes(c.key) ? '#f4941c' : 'rgba(255,255,255,0.07)',
                    color:      form.categories.includes(c.key) ? '#fff'    : 'rgba(255,255,255,0.5)',
                    border:     form.categories.includes(c.key) ? 'none'    : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* KYC */}
          <div>
            <label style={labelStyle}>KYC / Documents</label>
            <div className="grid grid-cols-1 gap-3">
              <input style={inputStyle} value={form.fssaiNumber} onChange={e => set('fssaiNumber', e.target.value)} placeholder="FSSAI Number (optional)" />
              <input style={inputStyle} value={form.panNumber}   onChange={e => set('panNumber',   e.target.value)} placeholder="PAN Number (optional)" />
              <input style={inputStyle} value={form.gstNumber}   onChange={e => set('gstNumber',   e.target.value)} placeholder="GST Number (optional)" />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 mt-2"
            style={{ background: '#f4941c' }}
          >
            {saving ? 'Creating seller…' : '✓  Add as Approved Seller'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditSellerModal({ seller, onClose, onUpdated }) {
  const [form, setForm] = useState({
    shopName:    seller.shopName    || '',
    ownerName:   seller.ownerName   || '',
    phone:       seller.contact?.phone || '',
    email:       seller.contact?.email || '',
    addressLine1: seller.address?.addressLine1 || '',
    city:        seller.address?.city  || 'Chennai',
    state:       seller.address?.state || 'Tamil Nadu',
    pincode:     seller.address?.pincode || '',
    lat:         seller.location?.coordinates ? String(seller.location.coordinates[1]) : '',
    lng:         seller.location?.coordinates ? String(seller.location.coordinates[0]) : '',
    categories:  seller.categories  || [],
    fssaiNumber: seller.kyc?.fssaiNumber || '',
    panNumber:   seller.kyc?.panNumber   || '',
    gstNumber:   seller.kyc?.gstNumber   || '',
  });
  const [saving, setSaving]       = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCat = (k) => setForm(f => ({
    ...f,
    categories: f.categories.includes(k) ? f.categories.filter(c => c !== k) : [...f.categories, k],
  }));

  const getGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude.toFixed(6));
        set('lng', pos.coords.longitude.toFixed(6));
        toast.success('GPS captured!');
        setGpsLoading(false);
      },
      () => { toast.error('GPS denied'); setGpsLoading(false); }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.shopName || !form.ownerName || !form.phone) {
      toast.error('Shop name, owner name, and phone are required'); return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/eptofresh/admin/sellers/${seller._id}`, form);
      if (data.success) {
        toast.success(`${form.shopName} updated!`);
        onUpdated(data.seller || { ...seller, ...form });
        onClose();
      } else { toast.error(data.message || 'Update failed'); }
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: '#fff', padding: '10px 12px', fontSize: 15, width: '100%', outline: 'none',
  };
  const labelStyle = { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{ background: '#0f2035', maxHeight: '92vh', padding: '24px 20px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><FiEdit2 size={16} className="text-orange-400" /> Edit Seller</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <FiX className="text-gray-400" size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={labelStyle}>Shop Name *</label>
            <input style={inputStyle} value={form.shopName} onChange={e => set('shopName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Owner Name *</label>
              <input style={inputStyle} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="Street, area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Pincode</label>
              <input style={inputStyle} type="tel" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value)} />
            </div>
          </div>

          {/* GPS */}
          <div>
            <label style={labelStyle}><FiMapPin size={10} style={{ display:'inline', marginRight:3 }} />GPS Coordinates</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input style={inputStyle} type="text" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="Latitude" />
              <input style={inputStyle} type="text" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="Longitude" />
            </div>
            <button type="button" onClick={getGPS} disabled={gpsLoading}
              className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'rgba(244,148,28,0.1)', color: '#f4941c', border: '1px solid rgba(244,148,28,0.2)' }}>
              <FiMapPin size={12} /> {gpsLoading ? 'Getting GPS…' : 'Auto-fill GPS from current location'}
            </button>
          </div>

          {/* Categories */}
          <div>
            <label style={labelStyle}>Categories</label>
            <div className="flex flex-wrap gap-2">
              {MEAT_CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => toggleCat(c.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: form.categories.includes(c.key) ? '#f4941c' : 'rgba(255,255,255,0.07)',
                    color:      form.categories.includes(c.key) ? '#fff'    : 'rgba(255,255,255,0.5)',
                    border:     form.categories.includes(c.key) ? 'none'    : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* KYC */}
          <div>
            <label style={labelStyle}>KYC Numbers</label>
            <div className="space-y-2">
              <input style={inputStyle} value={form.fssaiNumber} onChange={e => set('fssaiNumber', e.target.value)} placeholder="FSSAI Number" />
              <input style={inputStyle} value={form.panNumber}   onChange={e => set('panNumber',   e.target.value)} placeholder="PAN Number" />
              <input style={inputStyle} value={form.gstNumber}   onChange={e => set('gstNumber',   e.target.value)} placeholder="GST Number" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            style={{ background: '#f4941c' }}>
            <FiSave size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SellersTab() {
  const [sellers, setSellers]       = useState([]);
  const [filter, setFilter]         = useState('pending_review');
  const [acting, setActing]         = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [editSeller, setEditSeller] = useState(null); // seller object being edited
  const [linkingId, setLinkingId]   = useState(null); // sellerId currently being linked
  const [linkPhone, setLinkPhone]   = useState('');
  const [linkEmail, setLinkEmail]   = useState('');
  const [linkBusy, setLinkBusy]     = useState(false);
  const [rejectId, setRejectId]     = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadSellers = () => {
    api.get(`/eptofresh/admin/sellers?status=${filter}&limit=50`).then(r => { if (r.data.success) setSellers(r.data.sellers); }).catch(() => {});
  };

  useEffect(() => { loadSellers(); }, [filter]);

  const approve = async (id) => {
    setActing(id + 'approve');
    await api.post(`/eptofresh/admin/sellers/${id}/approve`).then(r => { if (r.data.success) { toast.success('Seller approved'); setSellers(s => s.filter(x => x._id !== id)); } }).catch(() => toast.error('Failed'));
    setActing(null);
  };
  const reject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Enter a rejection reason'); return; }
    await api.post(`/eptofresh/admin/sellers/${id}/reject`, { reason: rejectReason })
      .then(r => { if (r.data.success) { toast.success('Seller rejected'); setSellers(s => s.filter(x => x._id !== id)); setRejectId(null); setRejectReason(''); } })
      .catch(() => toast.error('Failed'));
  };
  const startLink = (s) => {
    setLinkingId(String(s._id));
    setLinkPhone(s.contact?.phone || '');
    setLinkEmail(s.contact?.email || '');
  };
  const confirmLink = async (sellerId) => {
    if (!linkPhone.trim() && !linkEmail.trim()) { toast.error('Enter phone or email'); return; }
    setLinkBusy(true);
    try {
      const payload = {};
      if (linkPhone.trim()) payload.phone = linkPhone.trim();
      if (linkEmail.trim()) payload.email = linkEmail.trim();
      const { data } = await api.post(`/eptofresh/admin/sellers/${sellerId}/link-user`, payload);
      if (data.success) {
        toast.success(data.message);
        setSellers(prev => prev.map(x => x._id === sellerId ? { ...x, user: true } : x));
        setLinkingId(null);
        setLinkPhone('');
        setLinkEmail('');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Link failed'); }
    finally { setLinkBusy(false); }
  };

  const onCreated = (seller) => {
    if (filter === 'approved') setSellers(s => [seller, ...s]);
  };

  const onUpdated = (updated) => {
    setSellers(s => s.map(x => x._id === updated._id ? { ...x, ...updated } : x));
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {['pending_review','approved','rejected','suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize"
              style={{ background: filter === f ? '#f4941c' : 'rgba(255,255,255,0.07)', color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white whitespace-nowrap ml-2 shrink-0"
          style={{ background: '#f4941c' }}
        >
          <FiPlus size={13} /> Add Seller
        </button>
      </div>

      <div className="space-y-3">
        {sellers.map(s => (
          <div key={s._id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold">{s.shopName}</p>
                  {s.user
                    ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>✓ linked</span>
                    : <button onClick={() => startLink(s)} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold cursor-pointer" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>⚠ link user</button>
                  }
                </div>
                <p className="text-gray-400 text-xs">{s.ownerName} • {s.contact?.phone}</p>
                <p className="text-gray-600 text-xs">{s.address?.city} • {s.address?.pincode}</p>
                {s.location?.coordinates && (
                  <p className="text-gray-700 text-[10px]">
                    <FiMapPin size={9} style={{ display:'inline', marginRight:2 }} />
                    {s.location.coordinates[1]?.toFixed(4)}, {s.location.coordinates[0]?.toFixed(4)}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {(s.categories || []).map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(244,148,28,0.1)', color: '#f4941c' }}>{c.replace('_',' ')}</span>)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={() => setEditSeller(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'rgba(244,148,28,0.1)', color: '#f4941c', border: '1px solid rgba(244,148,28,0.2)' }}
                >
                  <FiEdit2 size={11} /> Edit
                </button>
                {s.kyc?.panUrl && (
                  <a href={s.kyc.panUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] underline">{s.kyc.panNumber}</a>
                )}
              </div>
            </div>

            {/* KYC info */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
              <span>FSSAI: {s.kyc?.fssaiNumber || '—'}</span>
              <span>PAN: {s.kyc?.panNumber || '—'}</span>
              <span>GST: {s.kyc?.gstNumber || 'N/A'}</span>
              <span>Aadhaar: {s.kyc?.aadhaarNumber ? '✓' : '—'}</span>
            </div>

            {/* Inline link-user form */}
            {linkingId === String(s._id) && (
              <div className="mt-2 mb-2 rounded-xl p-3 space-y-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <p className="text-yellow-300 text-xs font-semibold">Link to Eptomart login account</p>
                <p className="text-yellow-200/50 text-[10px]">Enter the phone OR email the seller used to sign up on Eptomart</p>
                <input
                  type="tel"
                  value={linkPhone}
                  onChange={e => setLinkPhone(e.target.value)}
                  placeholder="Phone (10 digits)"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}
                />
                <input
                  type="email"
                  value={linkEmail}
                  onChange={e => setLinkEmail(e.target.value)}
                  placeholder="Or email address"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}
                />
                <div className="flex gap-2">
                  <button onClick={() => confirmLink(s._id)} disabled={linkBusy}
                    className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#f4941c' }}>
                    {linkBusy ? 'Linking…' : 'Confirm Link'}
                  </button>
                  <button onClick={() => { setLinkingId(null); setLinkPhone(''); setLinkEmail(''); }}
                    className="px-3 py-2 rounded-lg text-xs text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Inline reject form */}
            {rejectId === String(s._id) && (
              <div className="mt-2 mb-2 rounded-xl p-3 space-y-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p className="text-red-400 text-xs font-semibold">Rejection reason</p>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete KYC documents"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}
                />
                <div className="flex gap-2">
                  <button onClick={() => reject(s._id)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171' }}>
                    Confirm Reject
                  </button>
                  <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                    className="px-3 py-2 rounded-lg text-xs text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {s.status === 'pending_review' && (
              <div className="flex gap-2">
                <button onClick={() => approve(s._id)} disabled={acting === s._id + 'approve'}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                  style={{ background: '#34d399' }}>
                  <FiCheck size={13} /> Approve
                </button>
                <button onClick={() => { setRejectId(String(s._id)); setRejectReason(''); }} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                  <FiX size={13} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {sellers.length === 0 && <p className="text-gray-600 text-center py-8">No sellers in this status</p>}
      </div>

      {showAdd    && <AddSellerModal  onClose={() => setShowAdd(false)}    onCreated={onCreated} />}
      {editSeller && <EditSellerModal onClose={() => setEditSeller(null)} onUpdated={onUpdated} seller={editSeller} />}
    </div>
  );
}

// ── Products Approval ────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [acting, setActing]     = useState(null);

  useEffect(() => {
    api.get('/eptofresh/admin/products/pending').then(r => { if (r.data.success) setProducts(r.data.products); }).catch(() => {});
  }, []);

  const approve = async (id) => {
    setActing(id);
    await api.post(`/eptofresh/admin/products/${id}/approve`).then(r => { if (r.data.success) { toast.success('Product approved'); setProducts(p => p.filter(x => x._id !== id)); } }).catch(() => toast.error('Failed'));
    setActing(null);
  };
  const reject = async (id) => {
    const reason = window.prompt('Reason?');
    if (!reason) return;
    await api.post(`/eptofresh/admin/products/${id}/reject`, { reason }).then(r => { if (r.data.success) setProducts(p => p.filter(x => x._id !== id)); }).catch(() => {});
  };

  return (
    <div className="space-y-3">
      {products.length === 0 && <p className="text-gray-600 text-center py-8">No products pending approval</p>}
      {products.map(p => (
        <div key={p._id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex gap-3 mb-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700 shrink-0 flex items-center justify-center">
              {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-xl">🥩</span>}
            </div>
            <div>
              <p className="text-white font-semibold">{p.name}</p>
              <p className="text-gray-400 text-xs capitalize">{p.category.replace('_',' ')} • {p.seller?.shopName}</p>
              <p className="text-orange-400 text-xs">₹{p.basePrice}/{p.unit}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => approve(p._id)} disabled={acting === p._id}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
              style={{ background: '#34d399' }}><FiCheck size={12} /> Approve</button>
            <button onClick={() => reject(p._id)} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}><FiX size={12} /> Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('packed');
  const [acting, setActing] = useState(null);

  useEffect(() => {
    api.get(`/eptofresh/admin/orders?status=${filter}&limit=30`).then(r => { if (r.data.success) setOrders(r.data.orders); }).catch(() => {});
  }, [filter]);

  const approvePhotos = async (id) => {
    setActing(id);
    await api.post(`/eptofresh/admin/orders/${id}/approve-packed`).then(r => {
      if (r.data.success) { toast.success('Photos approved, Porter notified!'); setOrders(o => o.filter(x => x._id !== id)); }
    }).catch(err => toast.error(err.response?.data?.message || 'Failed'));
    setActing(null);
  };

  const rejectPhotos = async (id) => {
    const reason = window.prompt('Rejection reason?'); if (!reason) return;
    await api.post(`/eptofresh/admin/orders/${id}/reject-packed`, { reason }).then(r => {
      if (r.data.success) { toast.success('Photos rejected, seller notified'); setOrders(o => o.filter(x => x._id !== id)); }
    }).catch(() => toast.error('Failed'));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['packed','accepted','placed','out_for_delivery','delivered','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize"
            style={{ background: filter === f ? '#f4941c' : 'rgba(255,255,255,0.07)', color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            {f.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-gray-600 text-center py-8">No orders</p>}
        {orders.map(o => (
          <div key={o._id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">#{o.orderId}</p>
                <p className="text-gray-400 text-xs">{o.seller?.shopName} • {o.shippingAddress?.city}</p>
                <p className="text-gray-600 text-xs">{o.distanceKm?.toFixed(1)} km</p>
              </div>
              <p className="text-orange-400 font-bold">₹{o.pricing?.total}</p>
            </div>

            {/* Packed photos */}
            {o.orderStatus === 'packed' && (
              <div className="mb-3">
                <p className="text-purple-400 text-xs font-semibold mb-2 flex items-center gap-1"><FiCamera size={12} /> Packed Photos</p>
                <div className="flex gap-2 flex-wrap">
                  {(o.packedPhotos || []).map((ph, i) => (
                    <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer">
                      <img src={ph.url} alt="packed" className="w-16 h-16 rounded-xl object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                    </a>
                  ))}
                  {!o.packedPhotos?.length && <p className="text-gray-600 text-xs">No photos uploaded</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approvePhotos(o._id)} disabled={acting === o._id || !o.packedPhotos?.length}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                    style={{ background: '#34d399' }}><FiCheck size={12} /> Approve & Book Porter</button>
                  <button onClick={() => rejectPhotos(o._id)} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}><FiX size={12} /> Reject Photos</button>
                </div>
              </div>
            )}

            {/* Porter status */}
            {o.porter?.status && (
              <p className="text-blue-400 text-xs">🚗 Porter: {o.porter.status}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payouts ───────────────────────────────────────────────
function PayoutsTab() {
  const [payouts, setPayouts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    api.get('/eptofresh/admin/payouts?status=pending&limit=50').then(r => { if (r.data.success) setPayouts(r.data.payouts); }).catch(() => {});
  }, []);

  const settle = async () => {
    if (!selected.length) return toast.error('Select payouts to settle');
    const ref = window.prompt('Transfer reference (UTR / Transaction ID)'); if (!ref) return;
    setSettling(true);
    await api.post('/eptofresh/admin/payouts/settle', { payoutIds: selected, transferRef: ref, transferMode: 'bank' })
      .then(r => { if (r.data.success) { toast.success(r.data.message); setPayouts(p => p.filter(x => !selected.includes(x._id))); setSelected([]); } })
      .catch(() => toast.error('Failed'));
    setSettling(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold">{payouts.length} pending payouts</p>
        <button onClick={settle} disabled={!selected.length || settling} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: '#34d399' }}>
          {settling ? 'Processing...' : `Settle (${selected.length})`}
        </button>
      </div>

      <div className="space-y-2">
        {payouts.length === 0 && <p className="text-gray-600 text-center py-8">No pending payouts</p>}
        {payouts.map(p => (
          <label key={p._id} className="flex items-center gap-3 rounded-xl p-3 cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${selected.includes(p._id) ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
            <input type="checkbox" checked={selected.includes(p._id)} onChange={e => setSelected(s => e.target.checked ? [...s, p._id] : s.filter(x => x !== p._id))} className="w-4 h-4 accent-green-400" />
            <div className="flex-1">
              <p className="text-white text-xs font-semibold">#{p.orderId}</p>
              <p className="text-gray-500 text-[10px]">{p.seller?.shopName} • {p.seller?.bankDetails?.upiId || p.seller?.bankDetails?.accountNumber}</p>
            </div>
            <p className="text-green-400 font-bold text-sm">₹{p.sellerReceives?.toFixed(2)}</p>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Coupons ───────────────────────────────────────────────
function CouponsTab() {
  const [subTab, setSubTab]   = useState('coupons');
  const [coupons, setCoupons] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percent', discountValue: '',
    minOrderValue: 0, maxUsage: 100, validFrom: '', validTo: '',
    platformRestriction: 'all', assignedSellerId: '', assignedSellerName: '',
  });

  useEffect(() => {
    api.get('/eptofresh/admin/coupons').then(r => { if (r.data.success) setCoupons(r.data.coupons); }).catch(() => {});
    api.get('/eptofresh/admin/promo-requests?status=pending').then(r => { if (r.data.success) setRequests(r.data.coupons); }).catch(() => {});
  }, []);

  const createCoupon = async () => {
    try {
      const { data } = await api.post('/eptofresh/admin/coupons', form);
      if (data.success) { toast.success('Coupon created'); setCoupons(c => [data.coupon, ...c]); setShowAdd(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggle = async (id) => {
    await api.patch(`/eptofresh/admin/coupons/${id}/toggle`).then(r => { if (r.data.success) setCoupons(c => c.map(x => x._id === id ? r.data.coupon : x)); }).catch(() => {});
  };

  const approveRequest = async (id) => {
    try {
      const { data } = await api.post(`/eptofresh/admin/promo-requests/${id}/approve`);
      if (data.success) {
        toast.success('Promo approved & activated');
        setRequests(r => r.filter(x => x._id !== id));
        setCoupons(c => [data.coupon, ...c]);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const rejectRequest = async (id) => {
    const reason = window.prompt('Reject reason (optional):') || '';
    try {
      const { data } = await api.post(`/eptofresh/admin/promo-requests/${id}/reject`, { reason });
      if (data.success) { toast.success('Request rejected'); setRequests(r => r.filter(x => x._id !== id)); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'coupons',  label: 'Admin Coupons' },
          { key: 'requests', label: `Seller Requests${requests.length ? ` (${requests.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: subTab === t.key ? '#f4941c' : 'rgba(255,255,255,0.07)', color: '#fff' }}>
            {t.label}
          </button>
        ))}
        {subTab === 'coupons' && (
          <button onClick={() => setShowAdd(!showAdd)} className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>+ New</button>
        )}
      </div>

      {/* ── Admin Coupons sub-tab ── */}
      {subTab === 'coupons' && (
        <>
          {showAdd && (
            <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white text-sm font-semibold mb-1">New Coupon</p>

              {/* Discount type selector */}
              <div>
                <label className="text-gray-400 text-xs">Discount Type</label>
                <select value={form.discountType} onChange={e => setForm(v => ({ ...v, discountType: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle}>
                  <option value="percent" className="bg-gray-900">% Percent (excludes shipping)</option>
                  <option value="flat"    className="bg-gray-900">₹ Flat amount</option>
                </select>
              </div>

              {[
                { key: 'code',          label: 'Coupon Code',                   type: 'text',   placeholder: 'FRESH20' },
                { key: 'description',   label: 'Description',                   type: 'text',   placeholder: 'e.g. 20% off on proteins' },
                { key: 'discountValue', label: form.discountType === 'percent' ? 'Discount % (excl. shipping)' : 'Discount ₹', type: 'number', placeholder: '20' },
                { key: 'minOrderValue', label: 'Min Order Value (₹)',           type: 'number', placeholder: '0' },
                { key: 'maxUsage',      label: 'Max Uses (total times)',         type: 'number', placeholder: '100' },
                { key: 'validFrom',     label: 'Valid From',                    type: 'date' },
                { key: 'validTo',       label: 'Valid To / Expiry',             type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={inputStyle} />
                </div>
              ))}
              {/* Platform restriction */}
              <div>
                <label className="text-gray-400 text-xs">Applies To (Platform)</label>
                <select value={form.platformRestriction} onChange={e => setForm(v => ({ ...v, platformRestriction: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle}>
                  <option value="all"         className="bg-gray-900">🌐 All platforms</option>
                  <option value="main"        className="bg-gray-900">🛒 Eptomart Main only</option>
                  <option value="koyambedu"   className="bg-gray-900">🥬 Koyambedu Daily only</option>
                  <option value="uzhavar"     className="bg-gray-900">🌾 Uzhavar Fresh only</option>
                  <option value="eptofresh"   className="bg-gray-900">🥩 EptoFresh Proteins only</option>
                </select>
              </div>
              {/* Optional: restrict to one seller */}
              {form.platformRestriction !== 'all' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-gray-400 text-xs">Seller ID (optional — leave blank for all sellers on this platform)</label>
                    <input type="text" value={form.assignedSellerId} onChange={e => setForm(v => ({ ...v, assignedSellerId: e.target.value }))}
                      placeholder="MongoDB ObjectId of the seller"
                      className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs">Seller Name (for display)</label>
                    <input type="text" value={form.assignedSellerName} onChange={e => setForm(v => ({ ...v, assignedSellerName: e.target.value }))}
                      placeholder="e.g. Fresh Meats by Kumar"
                      className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={createCoupon} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#f4941c' }}>Create Coupon</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {coupons.filter(c => c.requestStatus !== 'pending').map(c => (
              <div key={c._id} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-white font-bold text-sm">{c.code}</p>
                  <p className="text-gray-400 text-xs">
                    {c.discountType === 'flat' ? `₹${c.discountValue} off` : `${c.discountValue}% off (excl. shipping)`}
                    {' • '} Min ₹{c.minOrderValue}
                  </p>
                  <p className="text-gray-600 text-[10px]">Used: {c.usedCount}/{c.maxUsage} • Expires: {new Date(c.validTo).toLocaleDateString('en-IN')}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {c.platformRestriction && c.platformRestriction !== 'all' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(244,148,28,0.15)', color: '#f4941c' }}>
                        {c.platformRestriction === 'main' ? '🛒 Eptomart' : c.platformRestriction === 'koyambedu' ? '🥬 Koyambedu' : c.platformRestriction === 'uzhavar' ? '🌾 Uzhavar' : '🥩 EptoFresh'}
                      </span>
                    )}
                    {c.assignedSellerName && (
                      <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                        👤 {c.assignedSellerName}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(c._id)} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: c.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: c.isActive ? '#34d399' : '#f87171' }}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
            {coupons.filter(c => c.requestStatus !== 'pending').length === 0 && (
              <p className="text-gray-600 text-sm text-center py-6">No coupons yet</p>
            )}
          </div>
        </>
      )}

      {/* ── Seller Requests sub-tab ── */}
      {subTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No pending promo requests from sellers</p>
          )}
          {requests.map(c => (
            <div key={c._id} className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-bold text-sm">{c.code}</p>
                  <p className="text-orange-400 text-xs font-semibold">{c.requestedBy?.shopName || 'Seller'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span>
              </div>
              <p className="text-gray-300 text-xs">{c.discountValue}% off (excl. shipping) • Min ₹{c.minOrderValue} • Max {c.maxUsage} uses</p>
              <p className="text-gray-500 text-xs">Valid: {new Date(c.validFrom).toLocaleDateString('en-IN')} – {new Date(c.validTo).toLocaleDateString('en-IN')}</p>
              <div className="flex gap-1 flex-wrap">
                {c.platformRestriction && c.platformRestriction !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(244,148,28,0.15)', color: '#f4941c' }}>
                    {c.platformRestriction === 'main' ? '🛒 Eptomart' : c.platformRestriction === 'koyambedu' ? '🥬 Koyambedu' : c.platformRestriction === 'uzhavar' ? '🌾 Uzhavar' : '🥩 EptoFresh'}
                  </span>
                )}
                {c.assignedSellerName && (
                  <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>👤 {c.assignedSellerName}</span>
                )}
              </div>
              {c.requestReason && <p className="text-gray-400 text-xs italic">"{c.requestReason}"</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => approveRequest(c._id)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>✓ Approve</button>
                <button onClick={() => rejectRequest(c._id)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delivery Config ──────────────────────────────────────
function DeliveryConfigTab() {
  const DEFAULTS = {
    freeDeliveryThreshold: 1049,
    freeDeliveryDistanceLimit: 10,
    highValueSurchargePerSlab: 50,
    highValueSlabSizeKm: 2,
    standardSurchargePerSlab: 50,
    standardSlabSizeKm: 3,
    standardBaseBeyond12km: 199,
    maxServiceableDistance: 0,
  };
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get('/eptofresh/admin/delivery-config')
      .then(r => { if (r.data.success) setConfig({ ...DEFAULTS, ...r.data.config }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/eptofresh/admin/delivery-config', config);
      if (data.success) toast.success('Delivery config saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'freeDeliveryThreshold',     label: 'Free Delivery Threshold (₹)',           hint: 'Orders ≥ this amount qualify for free delivery' },
    { key: 'freeDeliveryDistanceLimit', label: 'Free Delivery Distance Limit (km)',      hint: 'Free delivery only within this distance' },
    { key: 'highValueSurchargePerSlab', label: 'High Value Surcharge per Slab (₹)',      hint: 'Charge per slab for orders ≥ threshold beyond limit' },
    { key: 'highValueSlabSizeKm',       label: 'High Value Slab Size (km)',              hint: 'km per slab for high value long-distance orders' },
    { key: 'standardSurchargePerSlab',  label: 'Standard Surcharge per Slab (₹)',        hint: 'Extra charge per slab beyond 12km for standard orders' },
    { key: 'standardSlabSizeKm',        label: 'Standard Slab Size (km)',               hint: 'km per slab for standard orders beyond 12km' },
    { key: 'standardBaseBeyond12km',    label: 'Standard Base Charge beyond 12km (₹)',   hint: 'Base delivery charge when distance > 12km' },
    { key: 'maxServiceableDistance',    label: 'Max Serviceable Distance (km)',          hint: '0 = unlimited. Orders beyond this are rejected.' },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-xl p-3" style={{ background: 'rgba(244,148,28,0.06)', border: '1px solid rgba(244,148,28,0.15)' }}>
        <p className="text-orange-400 text-xs font-semibold">⚙️ Global Delivery Rules</p>
        <p className="text-gray-500 text-xs mt-0.5">Changes apply to all new delivery quotes immediately. No code changes needed.</p>
      </div>

      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="text-white text-sm font-semibold block mb-0.5">{f.label}</label>
          <p className="text-gray-500 text-xs mb-1">{f.hint}</p>
          <input
            type="number"
            value={config[f.key] ?? ''}
            onChange={e => setConfig(c => ({ ...c, [f.key]: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }}
          />
        </div>
      ))}

      {/* Live preview */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-white text-xs font-semibold mb-3">📊 Current Policy Preview</p>
        <div className="space-y-1 text-xs text-gray-400">
          <p>• Free delivery: Orders ≥ ₹{config.freeDeliveryThreshold} within {config.freeDeliveryDistanceLimit} km → <span className="text-green-400">FREE</span></p>
          <p>• Orders ≥ ₹{config.freeDeliveryThreshold} beyond {config.freeDeliveryDistanceLimit} km → ₹{config.highValueSurchargePerSlab} per {config.highValueSlabSizeKm} km</p>
          <p>• Standard 0–6 km → ₹49</p>
          <p>• Standard 6–10 km → ₹149</p>
          <p>• Standard 10–12 km → ₹{config.standardBaseBeyond12km}</p>
          <p>• Standard {'>'} 12 km → ₹{config.standardBaseBeyond12km} + ₹{config.standardSurchargePerSlab} per {config.standardSlabSizeKm} km</p>
          {config.maxServiceableDistance > 0 && (
            <p className="text-red-400">• Max distance: {config.maxServiceableDistance} km (orders beyond this are rejected)</p>
          )}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-60" style={{ background: '#f4941c' }}>
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}
