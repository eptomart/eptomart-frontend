import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Promo Request Section ──────────────────────────────────
function PromoRequestSection() {
  const [open,       setOpen]       = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests,   setRequests]   = useState([]);
  const [form, setForm] = useState({
    code: '', discountValue: '', minOrderValue: '', maxUsage: '50',
    validFrom: '', validTo: '', description: '', requestReason: '',
  });

  useEffect(() => {
    if (open) {
      api.get('/coupon/my-requests').then(r => { if (r.data.success) setRequests(r.data.coupons); }).catch(() => {});
    }
  }, [open]);

  const submit = async () => {
    if (!form.code || !form.discountValue || !form.validFrom || !form.validTo) {
      toast.error('Fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/coupon/request', { ...form, platform: 'koyambedu' });
      if (data.success) {
        toast.success('Promo request sent to admin!');
        setRequests(r => [data.coupon, ...r]);
        setShowForm(false);
        setForm({ code: '', discountValue: '', minOrderValue: '', maxUsage: '50', validFrom: '', validTo: '', description: '', requestReason: '' });
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const statusColor = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626', admin_created: '#16a34a' };

  return (
    <div className="mx-4 mt-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-green-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎟️</span>
          <span className="text-gray-800 font-semibold text-sm">Promo Code Requests</span>
          {requests.some(r => r.requestStatus === 'pending') && (
            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PENDING</span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bg-white border border-green-100 rounded-2xl mt-1 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Request a % discount promo from admin (shipping excluded)</p>
            <button onClick={() => setShowForm(v => !v)}
              className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-green-600">+ Request</button>
          </div>

          {showForm && (
            <div className="space-y-2.5 pt-1">
              {[
                { key: 'code',          label: 'Promo Code *',           type: 'text',   placeholder: 'KOYA10' },
                { key: 'discountValue', label: 'Discount % *',           type: 'number', placeholder: '10' },
                { key: 'minOrderValue', label: 'Min Order (₹)',          type: 'number', placeholder: '0' },
                { key: 'maxUsage',      label: 'Max Uses',               type: 'number', placeholder: '50' },
                { key: 'validFrom',     label: 'Valid From *',           type: 'date' },
                { key: 'validTo',       label: 'Valid To *',             type: 'date' },
                { key: 'description',   label: 'Description',            type: 'text',   placeholder: 'Weekend offer' },
                { key: 'requestReason', label: 'Reason',                 type: 'text',   placeholder: 'Festival promo' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-green-500" />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={submit} disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50">
                  {submitting ? 'Sending…' : 'Submit Request'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-100">Cancel</button>
              </div>
            </div>
          )}

          {requests.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">My Requests</p>
              {requests.map(c => (
                <div key={c._id} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-gray-800 text-xs font-bold">{c.code}</p>
                    <p className="text-gray-400 text-[10px]">{c.discountValue}% off · max {c.maxUsage} uses</p>
                  </div>
                  <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-full"
                    style={{ background: `${statusColor[c.requestStatus] || '#6b7280'}15`, color: statusColor[c.requestStatus] || '#6b7280' }}>
                    {c.requestStatus === 'admin_created' ? 'Active' : c.requestStatus}
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

const STATUS_COLOR = {
  pending_confirmation:   'bg-yellow-100 text-yellow-700',
  price_revision_pending: 'bg-orange-100 text-orange-700',
  confirmed:              'bg-green-100 text-green-700',
  packing:                'bg-purple-100 text-purple-700',
  dispatched:             'bg-blue-100 text-blue-700',
  delivered:              'bg-gray-100 text-gray-600',
  cancelled:              'bg-red-100 text-red-700',
};

export default function KoyambeduSellerDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [tab,     setTab]     = useState('orders');
  const [loading, setLoading] = useState(true);
  const [revModal, setRevModal] = useState(null); // { orderId, items: [{productId, name, originalPrice}] }
  const [revisedPrices, setRevisedPrices] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/koyambedu/seller/profile'),
      api.get('/koyambedu/seller/orders'),
    ]).then(([pRes, oRes]) => {
      setProfile(pRes.data.seller);
      setOrders(oRes.data.orders || []);
    }).catch(err => {
      if (err?.response?.status === 404 || err?.response?.status === 403) {
        navigate('/koyambedu/seller/register');
      } else {
        toast.error('Failed to load dashboard');
      }
    }).finally(() => setLoading(false));
  }, []);

  const confirmStock = async (orderId) => {
    try {
      await api.post(`/koyambedu/seller/orders/${orderId}/confirm-stock`);
      toast.success('Stock confirmed!');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: 'confirmed' } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    }
  };

  const submitRevision = async (orderId) => {
    const revisedItems = Object.entries(revisedPrices)
      .map(([productId, revisedPrice]) => ({ productId, revisedPrice: Number(revisedPrice) }))
      .filter(r => r.revisedPrice > 0);
    try {
      await api.post(`/koyambedu/seller/orders/${orderId}/request-price-revision`, { revisedItems });
      toast.success('Price revision sent to buyer');
      setRevModal(null);
      setRevisedPrices({});
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: 'price_revision_pending' } : o));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;

  if (!profile.isApproved) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8 text-center">
      <p className="text-5xl mb-4">⏳</p>
      <h2 className="font-bold text-gray-800 text-xl">Application Under Review</h2>
      <p className="text-gray-500 text-sm mt-2">Your Koyambedu seller application is being reviewed by our team. We'll notify you via WhatsApp once approved.</p>
    </div>
  );

  const todayOrders   = orders.filter(o => ['pending_confirmation','confirmed','packing'].includes(o.orderStatus));
  const pendingOrders = orders.filter(o => o.orderStatus === 'pending_confirmation');
  const todayEarnings = orders.filter(o => o.orderStatus === 'delivered').reduce((s, o) => s + (o.estimatedPayout || 0), 0);

  return (
    <div className="min-h-screen bg-green-50 pb-10">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-200 text-xs">Seller Dashboard</p>
            <h1 className="font-black text-xl mt-0.5">{profile.businessName}</h1>
            {profile.stallNumber && <p className="text-green-200 text-xs mt-0.5">Stall {profile.stallNumber} · {profile.marketSection}</p>}
          </div>
          <Link to="/koyambedu/seller/products" className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
            📦 Products
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            ['Today Orders', todayOrders.length, '📋'],
            ['Pending',      pendingOrders.length, '⏳'],
            ['Est. Earnings',`₹${todayEarnings.toFixed(0)}`, '💰'],
          ].map(([label, val, icon]) => (
            <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center">
              <p className="text-lg">{icon}</p>
              <p className="font-black text-sm mt-0.5">{val}</p>
              <p className="text-[9px] text-green-200 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECURITY NOTICE */}
      <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
        <p className="text-blue-700 text-[11px] font-medium">
          🔒 Buyer details are managed exclusively by Eptomart. You will never see buyer address or phone number.
        </p>
      </div>

      {/* Promo Code Requests */}
      <PromoRequestSection />

      {/* Tabs */}
      <div className="flex border-b border-green-100 bg-white mt-4 px-4">
        {[['orders','Orders'],['pending','Pending Action']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-3 mr-4 text-sm font-semibold border-b-2 transition ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'}`}>
            {label} {t === 'pending' && pendingOrders.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {(tab === 'orders' ? orders : pendingOrders).map(order => (
          <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                {order.orderStatus.replace(/_/g,' ')}
              </span>
            </div>

            {/* Items (buyer-safe — no address) */}
            <div className="space-y-1 mb-3">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{it.name} × {it.quantity}{it.unitLabel || it.unit}</span>
                  <span className="text-gray-400">₹{it.sellerPayout?.toFixed(0)} payout</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-green-50">
              <div>
                <p className="text-xs text-gray-500">Delivery: {order.deliverySlot}</p>
                <p className="text-xs font-semibold text-green-700 mt-0.5">Est. Payout: ₹{order.estimatedPayout?.toFixed(0)}</p>
              </div>
              <div className="flex gap-2">
                {order.orderStatus === 'pending_confirmation' && (
                  <>
                    <button onClick={() => confirmStock(order._id)}
                      className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 transition">
                      ✓ Confirm
                    </button>
                    <button onClick={() => {
                      setRevModal({ orderId: order._id, items: order.items });
                      setRevisedPrices({});
                    }}
                      className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-orange-600 transition">
                      ↑ Revise Price
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {(tab === 'orders' ? orders : pendingOrders).length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📦</p>
            <p className="text-gray-500 text-sm">No orders yet</p>
          </div>
        )}
      </div>

      {/* Price revision modal */}
      {revModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[9995] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5">
            <h3 className="font-bold text-gray-800 text-base mb-1">Request Price Revision</h3>
            <p className="text-xs text-gray-500 mb-4">Enter the current market price for each item. Buyer will be notified for approval.</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {revModal.items.map(item => (
                <div key={String(item.product)} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">Original: ₹{item.orderedPrice}/{item.unitLabel || item.unit}</p>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="New price"
                      value={revisedPrices[String(item.product)] || ''}
                      onChange={e => setRevisedPrices(p => ({ ...p, [String(item.product)]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRevModal(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => submitRevision(revModal.orderId)} className="flex-1 bg-orange-500 text-white font-bold py-2.5 rounded-xl hover:bg-orange-600">
                Send to Buyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
