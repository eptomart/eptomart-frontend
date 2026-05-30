// ============================================
// ADMIN — Farmer Fresh Management Panel
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiUsers, FiPackage, FiCreditCard, FiBarChart2, FiCheck, FiX, FiPlus, FiMapPin, FiEye } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Farmer Profile Modal ──────────────────────────────────────
function FarmerProfileModal({ farmerId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/uzhavar/admin/farmers/${farmerId}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load farmer profile'))
      .finally(() => setLoading(false));
  }, [farmerId]);

  const farmer   = data?.farmer;
  const products = data?.products || [];
  const stats    = data?.stats || {};

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            🧑‍🌾 {loading ? 'Loading...' : farmer?.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><FiX size={18} /></button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 animate-pulse">Loading profile...</div>
        ) : !farmer ? (
          <div className="py-16 text-center text-red-400">Farmer not found</div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Status badge */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold px-3 py-1 rounded-full capitalize ${
                farmer.verificationStatus === 'approved' ? 'bg-green-100 text-green-700'
                : farmer.verificationStatus === 'pending'  ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-600'
              }`}>{farmer.verificationStatus}</span>
              {farmer.isActive && <span className="text-xs bg-green-50 text-green-600 font-semibold px-2.5 py-1 rounded-full">● Active</span>}
              {farmer.rejectionReason && <span className="text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-full">❌ {farmer.rejectionReason}</span>}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Orders',   value: stats.totalOrders   || 0, icon: '📦' },
                { label: 'Pending Orders', value: stats.pendingOrders  || 0, icon: '⏳' },
                { label: 'Total Revenue',  value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: '💰' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <p className="font-black text-gray-800 text-base">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Basic info */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">📋 Basic Info</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ['Name',     farmer.name],
                  ['Phone',    farmer.phone],
                  ['Language', farmer.language === 'ta' ? 'Tamil' : farmer.language === 'en' ? 'English' : 'Both'],
                  ['Delivery radius', `${farmer.deliveryRadius} km`],
                  ['Ratings', farmer.ratings?.average > 0 ? `${farmer.ratings.average.toFixed(1)} ⭐ (${farmer.ratings.count})` : 'No ratings yet'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{k}</span>
                    <span className="text-gray-800 font-medium">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">📍 Location</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ['Village',  farmer.address?.village],
                  ['Taluk',    farmer.address?.taluk],
                  ['District', farmer.address?.district],
                  ['Pincode',  farmer.address?.pincode],
                  ['State',    farmer.address?.state || 'Tamil Nadu'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{k}</span>
                    <span className="text-gray-800 font-medium">{v || '—'}</span>
                  </div>
                ))}
              </div>
              {farmer.gpsLocation?.coordinates?.some(c => c !== 0) && (
                <div className="mt-2 text-xs text-green-600 font-mono bg-green-50 rounded-lg px-3 py-1.5">
                  🛰 GPS: {farmer.gpsLocation.coordinates[1]?.toFixed(5)}, {farmer.gpsLocation.coordinates[0]?.toFixed(5)}
                  <a href={`https://maps.google.com/?q=${farmer.gpsLocation.coordinates[1]},${farmer.gpsLocation.coordinates[0]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="ml-2 underline hover:text-green-700">View on map ↗</a>
                </div>
              )}
            </div>

            {/* Bank details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">🏦 Bank Details</p>
              {farmer.bankAccount?.bankName ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {[
                    ['Bank name',    farmer.bankAccount.bankName],
                    ['Account name', farmer.bankAccount.accountName],
                    ['Account No.',  farmer.bankAccount.accountNumber || '—'],
                    ['IFSC',         farmer.bankAccount.ifsc || '—'],
                    ['Verified',     farmer.bankAccount.verified ? '✅ Yes' : '⏳ Pending'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">{k}</span>
                      <span className="text-gray-800 font-medium">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No bank details on record</p>
              )}
              {/* Bank document */}
              {farmer.bankAccount?.bankDoc && (
                <div className="mt-3">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Bank Document</p>
                  {/\.(jpg|jpeg|png|webp)/i.test(farmer.bankAccount.bankDoc) ? (
                    <a href={farmer.bankAccount.bankDoc} target="_blank" rel="noopener noreferrer">
                      <img src={farmer.bankAccount.bankDoc} alt="Bank Doc"
                        className="h-20 w-32 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                    </a>
                  ) : (
                    <a href={farmer.bankAccount.bankDoc} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 border border-blue-200">
                      📄 View / Download Bank Doc
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Documents */}
            {(farmer.aadhaarDoc || farmer.farmProofDoc || farmer.aadhaarNumber) && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">📄 KYC Documents</p>
                {farmer.aadhaarNumber && (
                  <p className="text-sm text-gray-700 mb-2">Aadhaar: <span className="font-mono font-bold">{farmer.aadhaarNumber}</span></p>
                )}
                <div className="flex flex-wrap gap-3">
                  {farmer.aadhaarDoc && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Aadhaar Card</p>
                      {/\.(jpg|jpeg|png|webp)/i.test(farmer.aadhaarDoc) ? (
                        <a href={farmer.aadhaarDoc} target="_blank" rel="noopener noreferrer">
                          <img src={farmer.aadhaarDoc} alt="Aadhaar"
                            className="h-20 w-32 object-cover rounded-lg border hover:opacity-90" />
                        </a>
                      ) : (
                        <a href={farmer.aadhaarDoc} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100">
                          📄 View Aadhaar
                        </a>
                      )}
                    </div>
                  )}
                  {farmer.farmProofDoc && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Farm Proof</p>
                      {/\.(jpg|jpeg|png|webp)/i.test(farmer.farmProofDoc) ? (
                        <a href={farmer.farmProofDoc} target="_blank" rel="noopener noreferrer">
                          <img src={farmer.farmProofDoc} alt="Farm Proof"
                            className="h-20 w-32 object-cover rounded-lg border hover:opacity-90" />
                        </a>
                      ) : (
                        <a href={farmer.farmProofDoc} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100">
                          🌾 View Farm Proof
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listed products */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                🥬 Products ({products.length})
              </p>
              {products.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No products listed</p>
              ) : (
                <div className="space-y-2">
                  {products.map(prod => (
                    <div key={prod._id} className={`flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0 ${!prod.isActive ? 'opacity-50' : ''}`}>
                      <div>
                        <span className="font-medium text-gray-800">{prod.name}</span>
                        {prod.nameTa && <span className="text-gray-400 text-xs ml-1">({prod.nameTa})</span>}
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${prod.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p className="font-semibold text-gray-800">₹{prod.pricePerUnit}/{prod.unit}</p>
                        <p>{prod.availableQuantity} {prod.unit} · {prod.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const TN_DISTRICTS = [
  'Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul',
  'Erode','Kallakurichi','Kancheepuram','Kanyakumari','Karur','Krishnagiri','Madurai',
  'Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai',
  'Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni',
  'Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupathur','Tiruppur','Tiruvallur',
  'Tiruvannamalai','Tiruvarur','Vellore','Viluppuram','Virudhunagar',
];

const EMPTY_FORM = {
  name: '', phone: '', languagePreference: 'tamil',
  village: '', taluk: '', district: '', pincode: '',
  lat: '', lng: '',
  deliveryRadius: '5',
  bankName: '', accountHolderName: '', accountNumber: '', ifsc: '',
  notes: '',
};

// ── Add Farmer Modal ──────────────────────────────────────────
function AddFarmerModal({ onClose, onAdded }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const detectGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { set('lat', pos.coords.latitude.toFixed(6)); set('lng', pos.coords.longitude.toFixed(6)); setGpsLoading(false); },
      ()  => { toast.error('Could not get location'); setGpsLoading(false); }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.district || !form.pincode) {
      return toast.error('Name, phone, district and pincode are required');
    }
    setSaving(true);
    try {
      await api.post('/uzhavar/admin/farmers', form);
      toast.success('Farmer added & approved!');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add farmer');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400';
  const lbl = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-800 flex items-center gap-2">🧑‍🌾 Add Farmer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><FiX size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Basic Info */}
          <div className="bg-green-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black text-green-700 uppercase tracking-wider">Basic Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Full Name *</label>
                <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Farmer name" required />
              </div>
              <div>
                <label className={lbl}>Phone *</label>
                <input className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" maxLength={10} required />
              </div>
            </div>
            <div>
              <label className={lbl}>Language</label>
              <select className={inp} value={form.languagePreference} onChange={e => set('languagePreference', e.target.value)}>
                <option value="tamil">Tamil</option>
                <option value="english">English</option>
                <option value="telugu">Telugu</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black text-blue-700 uppercase tracking-wider">Location</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Village / Area</label>
                <input className={inp} value={form.village} onChange={e => set('village', e.target.value)} placeholder="Village name" />
              </div>
              <div>
                <label className={lbl}>Taluk</label>
                <input className={inp} value={form.taluk} onChange={e => set('taluk', e.target.value)} placeholder="Taluk" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>District *</label>
                <select className={inp} value={form.district} onChange={e => set('district', e.target.value)} required>
                  <option value="">Select district</option>
                  {TN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Pincode *</label>
                <input className={inp} value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="6-digit" maxLength={6} required />
              </div>
            </div>
            {/* GPS */}
            <div>
              <label className={lbl}>GPS Coordinates (optional)</label>
              <div className="flex gap-2">
                <input className={inp} value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="Latitude" />
                <input className={inp} value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="Longitude" />
                <button type="button" onClick={detectGPS} disabled={gpsLoading}
                  className="flex-shrink-0 flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  <FiMapPin size={12} /> {gpsLoading ? '...' : 'GPS'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Used for nearby search. Enter manually or use GPS button.</p>
            </div>
            <div>
              <label className={lbl}>Delivery Radius</label>
              <select className={inp} value={form.deliveryRadius} onChange={e => set('deliveryRadius', e.target.value)}>
                <option value="3">3 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
              </select>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black text-yellow-700 uppercase tracking-wider">Bank Details (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Bank Name</label>
                <input className={inp} value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. Indian Bank" />
              </div>
              <div>
                <label className={lbl}>Account Holder</label>
                <input className={inp} value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)} placeholder="Name on account" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Account Number</label>
                <input className={inp} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Account number" />
              </div>
              <div>
                <label className={lbl}>IFSC Code</label>
                <input className={inp} value={form.ifsc} onChange={e => set('ifsc', e.target.value.toUpperCase())} placeholder="IFSC" maxLength={11} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Admin Notes (internal)</label>
            <textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any internal notes..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
              {saving ? <span className="animate-spin">⏳</span> : <FiCheck size={14} />}
              {saving ? 'Adding...' : 'Add & Approve Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UzhavarAdmin() {
  const [tab, setTab]               = useState('stats');
  const [stats, setStats]           = useState(null);
  const [farmers, setFarmers]       = useState([]);
  const [orders, setOrders]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [farmerFilter, setFarmerFilter]   = useState('pending');
  const [orderFilter, setOrderFilter]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

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
      <Helmet><title>Farmer Fresh Admin</title></Helmet>
      {showAddModal && (
        <AddFarmerModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { load(); setFarmerFilter('approved'); }}
        />
      )}
      {selectedFarmer && (
        <FarmerProfileModal
          farmerId={selectedFarmer}
          onClose={() => setSelectedFarmer(null)}
        />
      )}
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-black text-gray-800 mb-5 flex items-center gap-2">
          🌾 Farmer Fresh — Admin
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
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
                    <button key={s} onClick={() => setFarmerFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${farmerFilter === s ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      {s || 'All'}
                    </button>
                  ))}
                  <button onClick={() => setShowAddModal(true)}
                    className="ml-auto flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
                    <FiPlus size={13} /> Add Farmer
                  </button>
                </div>
                <div className="space-y-3">
                  {farmers.length === 0 && <div className="text-center py-8 text-gray-400">No farmers found</div>}
                  {farmers.map(farmer => (
                    <div key={farmer._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-800">{farmer.name}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                              farmer.verificationStatus === 'approved' ? 'bg-green-100 text-green-700'
                              : farmer.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-600'
                            }`}>{farmer.verificationStatus}</span>
                          </div>
                          <p className="text-sm text-gray-500">{farmer.address?.village}, {farmer.address?.district}, {farmer.address?.pincode}</p>
                          <p className="text-xs text-gray-400">📞 {farmer.phone} · 📍 {farmer.deliveryRadius} km radius · 🗣 {farmer.language}</p>
                          {farmer.gpsLocation?.coordinates?.some(c => c !== 0) && (
                            <p className="text-xs text-green-600">🛰 GPS: {farmer.gpsLocation.coordinates[1]?.toFixed(4)}, {farmer.gpsLocation.coordinates[0]?.toFixed(4)}</p>
                          )}
                          {farmer.rejectionReason && (
                            <p className="text-xs text-red-500 mt-1">❌ Reason: {farmer.rejectionReason}</p>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={() => setSelectedFarmer(farmer._id)}
                            className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 border border-blue-200">
                            <FiEye size={11} /> View Profile
                          </button>
                          {farmer.verificationStatus === 'pending' && (
                            <>
                              <button onClick={() => farmerAction(farmer._id, 'approve')}
                                className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700">
                                <FiCheck size={11} /> Approve
                              </button>
                              <button onClick={() => {
                                const r = prompt('Rejection reason (shown to farmer):');
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

                      {/* Documents section */}
                      {(farmer.aadhaarDoc || farmer.farmProofDoc) && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">📄 Submitted Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {farmer.aadhaarDoc && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase">Aadhaar Card</span>
                                <div className="flex gap-1.5">
                                  {farmer.aadhaarDoc.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                    <a href={farmer.aadhaarDoc} target="_blank" rel="noopener noreferrer">
                                      <img src={farmer.aadhaarDoc} alt="Aadhaar" className="h-16 w-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                                    </a>
                                  ) : (
                                    <a href={farmer.aadhaarDoc} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-100">
                                      📄 View / Download Aadhaar
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                            {farmer.farmProofDoc && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase">Farm Proof</span>
                                <div className="flex gap-1.5">
                                  {farmer.farmProofDoc.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                    <a href={farmer.farmProofDoc} target="_blank" rel="noopener noreferrer">
                                      <img src={farmer.farmProofDoc} alt="Farm Proof" className="h-16 w-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                                    </a>
                                  ) : (
                                    <a href={farmer.farmProofDoc} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-100">
                                      🌾 View / Download Farm Proof
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                            {!farmer.aadhaarDoc && !farmer.farmProofDoc && (
                              <p className="text-xs text-gray-400 italic">No documents uploaded</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bank details summary */}
                      {farmer.bankAccount?.bankName && (
                        <div className="border-t border-gray-100 pt-2 mt-2 flex items-center gap-3">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">🏦 Bank</p>
                            <p className="text-xs text-gray-600">{farmer.bankAccount.bankName} · {farmer.bankAccount.accountName}</p>
                          </div>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${farmer.bankAccount.bankDoc ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                            {farmer.bankAccount.bankDoc ? '📄 Doc ✓' : '📄 No Doc'}
                          </span>
                        </div>
                      )}
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
                        <th className="pb-2 font-semibold">Booking Fee</th>
                        <th className="pb-2 font-semibold">Balance to Farmer</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-8 text-gray-400">No orders</td></tr>
                      )}
                      {orders.map(order => (
                        <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 font-mono text-xs">{order.orderNumber}</td>
                          <td className="py-2.5">{order.buyer?.name}</td>
                          <td className="py-2.5">{order.farmer?.name}</td>
                          <td className="py-2.5">
                            <span className={`text-xs font-semibold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-gray-400'}`}>
                              ₹{order.bookingFee?.total?.toFixed(2) ?? '24.78'}
                              {order.paymentStatus === 'paid' && <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">PAID</span>}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`text-xs font-semibold ${order.status === 'delivered' ? 'text-green-600' : 'text-amber-600'}`}>
                              ₹{order.balancePayableToFarmer?.toFixed(2) || order.subtotal?.toFixed(2) || '—'}
                              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {order.status === 'delivered' ? 'SETTLED' : 'PENDING'}
                              </span>
                            </span>
                          </td>
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
