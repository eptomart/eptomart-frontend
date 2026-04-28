// ============================================
// ADMIN — ORDER MANAGEMENT
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiChevronDown, FiChevronUp, FiTruck, FiRefreshCw, FiMapPin, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import { formatINR, formatDate } from '../../utils/currency';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ORDER_STATUSES   = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// ── Seller Pickup Acknowledgment panel ──────────────────
function PickupAcknowledgePanel({ order, onDone }) {
  const [acking, setAcking] = useState(false);
  const p = order.sellerPickup;
  if (!p?.addressId) return null;

  if (p.adminAcknowledged) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <FiCheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Pickup Acknowledged</p>
          <p className="text-xs text-green-600 mt-0.5">
            <FiMapPin size={10} className="inline mr-0.5" />
            {p.label} — {[p.street, p.city, p.state, p.pincode].filter(Boolean).join(', ')}
            {p.sellerName && <span className="ml-1 text-green-500">({p.sellerName})</span>}
          </p>
        </div>
      </div>
    );
  }

  const handleAck = async () => {
    setAcking(true);
    try {
      await api.post(`/admin/orders/${order._id}/acknowledge-pickup`);
      toast.success('Pickup acknowledged. Seller notified.');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge');
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
        <FiMapPin size={14} /> Seller Selected Pickup — Pending Your Acknowledgment
      </p>
      <div className="text-xs text-orange-700 space-y-0.5">
        <p><span className="font-semibold">Warehouse:</span> {p.label}</p>
        <p><span className="font-semibold">Address:</span> {[p.street, p.city, p.state, p.pincode].filter(Boolean).join(', ')}</p>
        {p.phone && <p><span className="font-semibold">Phone:</span> {p.phone}</p>}
        {p.sellerName && <p><span className="font-semibold">Seller:</span> {p.sellerName}</p>}
      </div>
      <button onClick={handleAck} disabled={acking}
        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60">
        {acking
          ? <><FiRefreshCw size={13} className="animate-spin" /> Acknowledging…</>
          : <><FiCheckCircle size={13} /> Acknowledge Pickup</>
        }
      </button>
    </div>
  );
}

// ── Shiprocket shipment panel (per order) ───────────────
function ShiprocketPanel({ order, onDone }) {
  const [sellerId,    setSellerId]    = useState('');
  const [sellers,     setSellers]     = useState([]);     // sellers who have items in this order
  const [addresses,   setAddresses]   = useState([]);
  const [addrId,      setAddrId]      = useState('');
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [shipping,    setShipping]    = useState(false);

  // Derive unique seller IDs from order items (populated products → seller)
  useEffect(() => {
    if (!order.items) return;
    const seen = new Map();
    order.items.forEach(item => {
      const s = item.product?.seller;
      if (s && !seen.has(s._id || s)) {
        seen.set(s._id || s, { _id: s._id || s, businessName: s.businessName || 'Seller' });
      }
    });
    const list = [...seen.values()];
    setSellers(list);
    if (list.length === 1) setSellerId(list[0]._id);
  }, [order.items]);

  // Load seller pickup addresses when sellerId changes
  useEffect(() => {
    if (!sellerId) { setAddresses([]); setAddrId(''); return; }
    setLoadingAddr(true);
    api.get(`/sellers/${sellerId}/pickup-addresses`)
      .then(r => {
        setAddresses(r.data.addresses || []);
        const def = r.data.addresses?.find(a => a.isDefault);
        setAddrId(def?._id || r.data.addresses?.[0]?._id || 'main');
      })
      .catch(() => toast.error('Could not load seller addresses'))
      .finally(() => setLoadingAddr(false));
  }, [sellerId]);

  const handleShip = async () => {
    if (!addrId) return toast.error('Select a pickup address first');
    setShipping(true);
    try {
      const { data } = await api.post(`/admin/orders/${order._id}/ship`, { pickupAddressId: addrId });
      toast.success(`Shipment created! AWB: ${data.shiprocket?.awb || '—'}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shipment');
    } finally {
      setShipping(false);
    }
  };

  // Already shipped
  if (order.shiprocket?.orderId) {
    return (
      <div className="bg-indigo-50 rounded-xl p-4 space-y-1">
        <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
          <FiTruck size={14} /> Shiprocket Shipment Created
        </p>
        <p className="text-xs text-indigo-600">AWB: <span className="font-mono">{order.shiprocket.awb || '—'}</span> · {order.shiprocket.courier || '—'}</p>
        {order.shiprocket.trackingUrl && (
          <a href={order.shiprocket.trackingUrl} target="_blank" rel="noreferrer"
            className="text-xs text-indigo-600 underline">Track shipment</a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <FiTruck size={14} /> Create Shiprocket Shipment
      </p>

      {sellers.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Seller</label>
          <select value={sellerId} onChange={e => setSellerId(e.target.value)} className="input-field text-sm py-2">
            <option value="">Select seller…</option>
            {sellers.map(s => <option key={s._id} value={s._id}>{s.businessName}</option>)}
          </select>
        </div>
      )}

      {sellerId && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Pickup Address {loadingAddr && <span className="text-gray-400">(loading…)</span>}
          </label>
          {addresses.length === 0 && !loadingAddr ? (
            <p className="text-xs text-orange-600">No pickup addresses found. Seller's main address will be used.</p>
          ) : (
            <select value={addrId} onChange={e => setAddrId(e.target.value)} className="input-field text-sm py-2" disabled={loadingAddr}>
              {addresses.map(a => (
                <option key={a._id} value={a._id}>
                  {a.isMain ? '📍 ' : ''}{a.label || 'Address'} — {a.city}, {a.pincode}{a.isDefault ? ' ★' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <button
        onClick={handleShip}
        disabled={shipping || !sellerId || loadingAddr}
        className="btn-primary text-sm flex items-center gap-2 py-2 disabled:opacity-50"
      >
        {shipping ? <><FiRefreshCw size={13} className="animate-spin" /> Creating…</> : <><FiTruck size={13} /> Create Shipment</>}
      </button>
    </div>
  );
}

// ── Refund status panel ──────────────────────────────────
function RefundPanel({ refund }) {
  if (!refund || refund.status === 'not_applicable') return null;

  const config = {
    initiated:       { bg: 'bg-green-50 border-green-200',  icon: <FiCheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />, label: '💰 Refund Initiated', labelColor: 'text-green-800' },
    processed:       { bg: 'bg-green-50 border-green-200',  icon: <FiCheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />, label: '✅ Refund Processed',  labelColor: 'text-green-800' },
    manual_required: { bg: 'bg-orange-50 border-orange-300', icon: <FiAlertTriangle size={14} className="text-orange-600 shrink-0 mt-0.5" />, label: '⚠️ Manual Refund Required', labelColor: 'text-orange-800' },
    failed:          { bg: 'bg-red-50 border-red-300',      icon: <FiXCircle size={14} className="text-red-600 shrink-0 mt-0.5" />, label: '❌ Refund Failed',       labelColor: 'text-red-800' },
    pending:         { bg: 'bg-yellow-50 border-yellow-300', icon: <FiRefreshCw size={14} className="text-yellow-600 shrink-0 mt-0.5" />, label: '🔄 Refund Pending',    labelColor: 'text-yellow-800' },
  };

  const c = config[refund.status] || config.pending;

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${c.bg}`}>
      {c.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${c.labelColor}`}>{c.label}</p>
        {refund.amount && (
          <p className="text-xs text-gray-600 mt-0.5">Amount: <span className="font-medium">{formatINR(refund.amount)}</span></p>
        )}
        {refund.razorpayRefundId && (
          <p className="text-xs text-gray-500 mt-0.5 font-mono">Refund ID: {refund.razorpayRefundId}</p>
        )}
        {refund.note && (
          <p className="text-xs text-gray-600 mt-1">{refund.note}</p>
        )}
        {refund.initiatedAt && (
          <p className="text-xs text-gray-400 mt-0.5">{new Date(refund.initiatedAt).toLocaleString('en-IN')}</p>
        )}
      </div>
    </div>
  );
}

// ── Cancel + Refund button (admin) ───────────────────────
function CancelRefundButton({ order, onDone }) {
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [note, setNote] = useState('');

  if (['cancelled', 'delivered', 'returned'].includes(order.orderStatus)) return null;

  const handle = async () => {
    setCancelling(true);
    try {
      const { data } = await api.post(`/admin/orders/${order._id}/cancel-refund`, { note });
      const refundStatus = data.refund?.status;
      if (refundStatus === 'initiated') {
        toast.success('Order cancelled & Razorpay refund initiated automatically');
      } else if (refundStatus === 'manual_required') {
        toast('Order cancelled. Manual refund required — check refund panel.', { icon: '⚠️' });
      } else {
        toast.success('Order cancelled');
      }
      setShowConfirm(false);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
        <FiXCircle size={14} /> Cancel & Refund
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-800 mb-1">Cancel Order #{order.orderId}</h3>
            <p className="text-sm text-gray-500 mb-3">
              {order.paymentStatus === 'paid' && order.paymentMethod === 'razorpay'
                ? '💰 Razorpay refund of ' + formatINR(order.pricing?.total) + ' will be initiated automatically.'
                : order.paymentStatus === 'paid' && order.paymentMethod === 'upi'
                ? '⚠️ UPI refund requires manual transfer. Admin will be notified.'
                : 'No payment to refund.'}
            </p>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={2} className="input-field mb-4 resize-none text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={handle} disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {cancelling ? <><FiRefreshCw size={13} className="animate-spin" /> Processing…</> : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ───────────────────────────────────────
export default function AdminOrders() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [statusFilter,setStatusFilter]= useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/orders?page=${page}&limit=15${statusFilter ? `&status=${statusFilter}` : ''}`
      );
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, updates) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, updates);
      toast.success('Order updated');
      fetchOrders();
    } catch {
      toast.error('Failed to update order');
    }
  };

  const STATUS_COLORS = {
    placed:     'bg-blue-100 text-blue-700',
    confirmed:  'bg-purple-100 text-purple-700',
    processing: 'bg-yellow-100 text-yellow-700',
    shipped:    'bg-indigo-100 text-indigo-700',
    delivered:  'bg-green-100 text-green-700',
    cancelled:  'bg-red-100 text-red-700',
  };

  return (
    <>
      <Helmet><title>Orders — Eptomart Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>

        {loading ? <Loader fullPage={false} /> : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order._id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 text-left flex-wrap">
                    <div>
                      <p className="font-mono font-bold text-sm">#{order.orderId}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.user?.name}</p>
                      <p className="text-xs text-gray-400">{order.user?.email || order.user?.phone}</p>
                    </div>
                    <span className={`badge capitalize ${STATUS_COLORS[order.orderStatus]}`}>
                      {order.orderStatus}
                    </span>
                    <span className={`badge capitalize ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.paymentStatus} · {order.paymentMethod?.toUpperCase()}
                    </span>
                    {order.shiprocket?.awb && (
                      <span className="badge bg-indigo-100 text-indigo-700 flex items-center gap-1">
                        <FiTruck size={11} /> {order.shiprocket.awb}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-2 shrink-0">
                    <span className="font-bold text-primary-600">{formatINR(order.pricing?.total)}</span>
                    {expanded === order._id ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </button>

                {expanded === order._id && (
                  <div className="border-t p-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />
                          <span className="flex-1">{item.name}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                          <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Update Controls */}
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Order Status</label>
                        <select
                          defaultValue={order.orderStatus}
                          onChange={e => updateStatus(order._id, { status: e.target.value })}
                          className="input-field text-sm py-2"
                        >
                          {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                        <select
                          defaultValue={order.paymentStatus}
                          onChange={e => updateStatus(order._id, { paymentStatus: e.target.value })}
                          className="input-field text-sm py-2"
                        >
                          {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Confirm Order */}
                    {order.orderStatus === 'placed' && (
                      <div className="bg-blue-50 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Order Awaiting Confirmation</p>
                          <p className="text-xs text-blue-600 mt-0.5">Verify with seller that items are available, then confirm.</p>
                        </div>
                        <button
                          onClick={() => updateStatus(order._id, { status: 'confirmed' })}
                          className="btn-primary text-sm whitespace-nowrap"
                        >
                          ✓ Confirm Order
                        </button>
                      </div>
                    )}

                    {/* UPI Verification */}
                    {order.paymentMethod === 'upi' && order.paymentDetails?.upiRef && order.paymentStatus === 'pending' && (
                      <div className="bg-orange-50 rounded-xl p-4">
                        <p className="text-sm font-semibold mb-1">UPI Payment Reference</p>
                        <p className="font-mono text-sm text-orange-700">{order.paymentDetails.upiRef}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => updateStatus(order._id, { paymentStatus: 'paid', status: 'confirmed' })}
                            className="btn-primary btn-sm">✓ Verify Payment</button>
                          <button onClick={() => updateStatus(order._id, { paymentStatus: 'failed' })}
                            className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm">✗ Reject</button>
                        </div>
                      </div>
                    )}

                    {/* Seller pickup acknowledgment — show whenever sellerPickup is set */}
                    {order.sellerPickup?.addressId && (
                      <PickupAcknowledgePanel order={order} onDone={fetchOrders} />
                    )}

                    {/* Shiprocket Shipment Panel — show for confirmed / processing / paid orders */}
                    {['confirmed', 'processing', 'placed', 'shipped'].includes(order.orderStatus) &&
                     order.paymentStatus === 'paid' && (
                      <ShiprocketPanel order={order} onDone={fetchOrders} />
                    )}

                    {/* Refund status */}
                    {order.refund && order.refund.status !== 'not_applicable' && (
                      <RefundPanel refund={order.refund} />
                    )}

                    {/* Cancel & Refund button */}
                    <div className="flex justify-end">
                      <CancelRefundButton order={order} onDone={fetchOrders} />
                    </div>

                    {/* Delivery Address */}
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Delivery Address</p>
                      <p className="text-gray-500">
                        {order.shippingAddress?.fullName} · {order.shippingAddress?.phone}<br />
                        {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city},{' '}
                        {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {orders.length === 0 && (
              <div className="card p-10 text-center text-gray-400">No orders found.</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium ${page === p ? 'bg-primary-500 text-white' : 'bg-white text-gray-600'}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
