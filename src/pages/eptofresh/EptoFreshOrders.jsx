// ============================================
// EPTOFRESH ORDERS — Customer order list
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPackage, FiMapPin, FiStar } from 'react-icons/fi';

const STATUS_LABELS = {
  payment_pending:  { label: 'Awaiting Payment', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  placed:           { label: 'Order Placed',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  accepted:         { label: 'Accepted',         color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  preparing:        { label: 'Preparing',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  packed:           { label: 'Packed',           color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  admin_approved:   { label: 'Approved',         color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  porter_assigned:  { label: 'Driver Assigned',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  picked_up:        { label: 'Picked Up',        color: '#f4941c', bg: 'rgba(244,148,28,0.1)' },
  out_for_delivery: { label: 'On The Way',       color: '#f4941c', bg: 'rgba(244,148,28,0.1)' },
  delivered:        { label: 'Delivered',        color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  cancelled:        { label: 'Cancelled',        color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  rejected:         { label: 'Rejected',         color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  refunded:         { label: 'Refunded',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

export default function EptoFreshOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/eptofresh/orders').then(r => {
      if (r.data.success) setOrders(r.data.orders);
    }).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}><FiArrowLeft className="text-gray-900" /></button>
          <h1 className="text-gray-900 font-bold text-lg">My Orders</h1>
        </div>
        <div className="px-4 space-y-3 mt-2">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(0,0,0,0.03)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}><FiArrowLeft className="text-gray-900" /></button>
        <h1 className="text-gray-900 font-bold text-lg">EptoFresh Orders</h1>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-20">
          <FiPackage size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No orders yet</p>
          <button onClick={() => navigate('/eptofresh')} className="mt-4 px-5 py-2 rounded-2xl text-sm font-bold" style={{ background: '#f4941c', color: '#fff' }}>Order Now</button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {orders.map(order => {
          const s = STATUS_LABELS[order.orderStatus] || { label: order.orderStatus, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
          const canTrack = ['porter_assigned','picked_up','out_for_delivery'].includes(order.orderStatus);
          const canRate  = order.orderStatus === 'delivered' && !order.rated;
          const canConfirm = order.orderStatus === 'out_for_delivery';

          return (
            <div
              key={order._id}
              onClick={() => navigate(`/eptofresh/orders/${order._id}`)}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all"
              style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-gray-900 font-semibold text-sm">#{order.orderId}</p>
                  <p className="text-gray-400 text-xs">{order.seller?.shopName}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>

              <p className="text-gray-400 text-xs mb-2">{order.items?.length} item{order.items?.length > 1 ? 's' : ''}</p>

              <div className="flex items-center justify-between">
                <span className="text-orange-400 font-bold text-sm">₹{order.pricing?.total?.toFixed(2)}</span>
                <div className="flex gap-2">
                  {canTrack && (
                    <button onClick={e => { e.stopPropagation(); navigate(`/eptofresh/orders/${order._id}/tracking`); }}
                      className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1" style={{ background: 'rgba(244,148,28,0.12)', color: '#f4941c' }}>
                      <FiMapPin size={10} /> Track
                    </button>
                  )}
                  {canRate && (
                    <button onClick={e => { e.stopPropagation(); navigate(`/eptofresh/orders/${order._id}/review`); }}
                      className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                      <FiStar size={10} /> Rate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Order Detail page ────────────────────────────────────
export function EptoFreshOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [otp, setOtp]     = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get(`/eptofresh/orders/${orderId}`).then(r => { if (r.data.success) setOrder(r.data.order); }).catch(() => {});
  }, [orderId]);

  const confirmDelivery = async () => {
    setConfirming(true);
    try {
      const { data } = await api.post(`/eptofresh/orders/${orderId}/confirm-delivery`, { otp });
      if (data.success) { toast.success('Delivery confirmed!'); setOrder(o => ({ ...o, orderStatus: 'delivered' })); }
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP'); } finally { setConfirming(false); }
  };

  if (!order) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}><div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" /></div>;

  const s = STATUS_LABELS[order.orderStatus] || { label: order.orderStatus, color: '#94a3b8' };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F4F2' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}><FiArrowLeft className="text-gray-900" /></button>
        <div className="flex-1">
          <h1 className="text-gray-900 font-bold">Order #{order.orderId}</h1>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: STATUS_LABELS[order.orderStatus]?.bg || '', color: s.color }}>{s.label}</span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Items */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="text-gray-900 font-semibold mb-3">Items</h3>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5">
              <span className="text-gray-300">{item.productName} {item.variant?.label ? `(${item.variant.label})` : ''} × {item.quantity}</span>
              <span className="text-gray-900">₹{item.totalPrice}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="text-gray-900 font-semibold mb-2">Pricing</h3>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-gray-900">₹{order.pricing?.subtotal}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Delivery</span><span className="text-gray-900">{order.pricing?.deliveryCharge > 0 ? `₹${order.pricing.deliveryCharge}` : 'FREE'}</span></div>
          {order.pricing?.couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Coupon</span><span className="text-green-400">-₹{order.pricing.couponDiscount}</span></div>}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold"><span className="text-gray-900">Total</span><span className="text-orange-400">₹{order.pricing?.total}</span></div>
        </div>

        {/* OTP Delivery confirmation */}
        {order.orderStatus === 'out_for_delivery' && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.2)' }}>
            <p className="text-orange-400 font-semibold mb-2">Confirm Delivery</p>
            <p className="text-gray-400 text-xs mb-3">Enter the OTP shown by the delivery person</p>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" className="flex-1 px-3 py-2 rounded-xl text-gray-900 outline-none text-center tracking-widest font-bold text-lg" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '18px' }} />
              <button onClick={confirmDelivery} disabled={confirming || otp.length < 4} className="px-4 py-2 rounded-xl font-bold text-gray-900 disabled:opacity-50" style={{ background: '#f4941c' }}>
                {confirming ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* Status history */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="text-gray-900 font-semibold mb-3">Order Timeline</h3>
          <div className="space-y-3">
            {(order.statusHistory || []).map((h, i) => {
              const st = STATUS_LABELS[h.status] || { label: h.status, color: '#94a3b8' };
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: st.color }} />
                  <div>
                    <p className="text-gray-900 text-xs font-semibold">{st.label}</p>
                    {h.note && <p className="text-gray-400 text-xs">{h.note}</p>}
                    <p className="text-gray-600 text-[10px]">{new Date(h.timestamp).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
