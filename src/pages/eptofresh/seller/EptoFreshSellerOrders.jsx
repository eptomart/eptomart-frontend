// ============================================
// EPTOFRESH SELLER ORDERS
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCheck, FiX, FiUpload, FiCamera } from 'react-icons/fi';

const STATUS_LABELS = {
  placed: { label: 'New Order',      color: '#60a5fa', action: true },
  accepted: { label: 'Accepted',     color: '#34d399' },
  preparing: { label: 'Preparing',   color: '#f59e0b' },
  packed: { label: 'Awaiting Admin', color: '#a78bfa' },
  admin_approved: { label: 'Approved', color: '#34d399' },
  porter_assigned: { label: 'Driver Assigned', color: '#60a5fa' },
  picked_up: { label: 'Picked Up',   color: '#f4941c' },
  out_for_delivery: { label: 'Delivered', color: '#f4941c' },
  delivered: { label: 'Delivered',   color: '#34d399' },
  cancelled: { label: 'Cancelled',   color: '#f87171' },
  rejected: { label: 'Rejected',     color: '#f87171' },
};

export default function EptoFreshSellerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('placed');

  const fetchOrders = async () => {
    try {
      const { data } = await api.get(`/eptofresh/seller/orders?status=${filter}`);
      if (data.success) setOrders(data.orders);
    } catch { toast.error('Failed to load orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F4F2' }}>
      <div className="flex items-center gap-3 px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate('/eptofresh/seller')} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}><FiArrowLeft className="text-gray-900" /></button>
        <h1 className="text-gray-900 font-bold text-lg">Orders</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {['placed', 'accepted', 'preparing', 'packed', 'delivered', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize"
            style={{ background: filter === f ? '#f4941c' : 'rgba(0,0,0,0.05)', color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            {STATUS_LABELS[f]?.label || f}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {loading && [1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(0,0,0,0.03)' }} />)}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">No orders in this status</div>
        )}

        {orders.map(order => {
          const s = STATUS_LABELS[order.orderStatus] || { label: order.orderStatus, color: '#94a3b8' };
          return (
            <div key={order._id}
              onClick={() => navigate(`/eptofresh/seller/orders/${order._id}`)}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.98]"
              style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-gray-900 font-semibold text-sm">#{order.orderId}</p>
                  <p className="text-gray-400 text-xs">{order.items?.length} item{order.items?.length > 1 ? 's' : ''}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${s.color}1a`, color: s.color }}>
                  {s.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-400 font-bold">₹{order.pricing?.total}</span>
                <span className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Order Detail ────────────────────────────────────────
export function EptoFreshSellerOrderDetail() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const fileRef     = useRef();
  const [order, setOrder]       = useState(null);
  const [actioning, setActioning] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [uploading, setUploading]       = useState(false);

  useEffect(() => {
    api.get(`/eptofresh/seller/orders/${orderId}`).then(r => { if (r.data.success) setOrder(r.data.order); }).catch(() => {});
  }, [orderId]);

  const accept = async () => {
    setActioning(true);
    try {
      const { data } = await api.post(`/eptofresh/seller/orders/${orderId}/accept`);
      if (data.success) { toast.success('Order accepted!'); setOrder(o => ({ ...o, orderStatus: 'accepted' })); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setActioning(false); }
  };

  const reject = async () => {
    setActioning(true);
    try {
      const { data } = await api.post(`/eptofresh/seller/orders/${orderId}/reject`, { reason: rejectReason });
      if (data.success) { toast.success('Order rejected'); setOrder(o => ({ ...o, orderStatus: 'rejected' })); setShowReject(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setActioning(false); }
  };

  const uploadPhotos = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    try {
      const { data } = await api.post(`/eptofresh/seller/orders/${orderId}/packed-photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) { toast.success('Photos uploaded! Awaiting admin approval.'); setOrder(o => ({ ...o, orderStatus: 'packed', packedPhotos: data.photos })); }
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); } finally { setUploading(false); }
  };

  if (!order) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}><div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F4F2' }}>
      <div className="flex items-center gap-3 px-4 pt-10 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}><FiArrowLeft className="text-gray-900" /></button>
        <h1 className="text-gray-900 font-bold">Order #{order.orderId}</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Items — Seller sees: product, qty, cut, variant ONLY */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="text-gray-900 font-semibold mb-3">Items to Prepare</h3>
          {order.items?.map((item, i) => (
            <div key={i} className="py-2.5 border-b border-gray-800 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-900 font-semibold text-sm">{item.productName}</p>
                  {item.variant?.label && <p className="text-gray-400 text-xs">{item.variant.label}</p>}
                  {item.cutType && <p className="text-orange-400 text-xs capitalize">Cut: {item.cutType}</p>}
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-bold">× {item.quantity}</p>
                  <p className="text-gray-400 text-xs">₹{item.totalPrice}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2 flex justify-between">
            <span className="text-gray-400 text-sm">Your payout</span>
            <span className="text-green-400 font-bold text-sm">₹{order.pricing?.sellerReceives?.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        {order.orderStatus === 'placed' && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
              <p className="text-gray-900 font-semibold mb-1">New Order!</p>
              <p className="text-gray-400 text-xs mb-3">Accept to start preparing, or reject if unavailable</p>
              <div className="flex gap-3">
                <button onClick={accept} disabled={actioning}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-900 flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: '#34d399' }}>
                  <FiCheck size={16} /> Accept
                </button>
                <button onClick={() => setShowReject(true)} className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                  <FiX size={16} /> Reject
                </button>
              </div>
            </div>

            {showReject && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <label className="text-gray-400 text-xs block mb-1">Rejection reason</label>
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Out of stock today" className="w-full px-3 py-2 rounded-xl text-sm text-gray-900 mb-2 outline-none" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
                <button onClick={reject} disabled={actioning} className="w-full py-2.5 rounded-xl font-bold text-gray-900 disabled:opacity-60" style={{ background: '#ef4444' }}>Confirm Reject</button>
              </div>
            )}
          </div>
        )}

        {/* Upload packed photos */}
        {['accepted', 'preparing'].includes(order.orderStatus) && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <p className="text-gray-900 font-semibold mb-1">Upload Packed Photos</p>
            <p className="text-gray-400 text-xs mb-3">Take photos of the packed products for admin verification</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => uploadPhotos(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#a78bfa', color: '#fff' }}>
              <FiCamera size={16} />
              {uploading ? 'Uploading...' : 'Take / Upload Photos'}
            </button>
          </div>
        )}

        {/* Packed photos status */}
        {order.orderStatus === 'packed' && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
            <p className="text-blue-400 font-semibold">⏳ Waiting for admin to verify photos</p>
            <p className="text-gray-400 text-xs mt-1">Once approved, a delivery driver will be assigned</p>
          </div>
        )}

        {/* Porter info — driver name only, no phone */}
        {order.porter?.driverName && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <p className="text-green-400 font-semibold mb-1">🚗 Driver Assigned</p>
            <p className="text-gray-900 text-sm">{order.porter.driverName}</p>
            <p className="text-gray-400 text-xs">Status: {order.porter.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
