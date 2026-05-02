import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiCheckCircle, FiPackage, FiMapPin, FiX, FiDownload, FiUploadCloud, FiAlertCircle, FiTruck, FiExternalLink } from 'react-icons/fi';

const STATUS_COLOR = {
  placed:     'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

// ── Confirm Modal with pickup address selector ────────────
function ConfirmModal({ order, onClose, onConfirmed }) {
  const [addresses,      setAddresses]      = useState([]);
  const [loadingAddrs,   setLoadingAddrs]   = useState(true);
  const [selectedId,     setSelectedId]     = useState('');
  const [confirming,     setConfirming]     = useState(false);

  useEffect(() => {
    setLoadingAddrs(true);
    api.get('/sellers/me/pickup-addresses')
      .then(r => {
        const all = r.data.addresses || [];
        setAddresses(all);
        // Pre-select default approved address, or main
        const def = all.find(a => a.isDefault && a.status === 'approved');
        const first = all.find(a => a.status === 'approved');
        setSelectedId(def?._id || first?._id || 'main');
      })
      .catch(() => toast.error('Could not load addresses'))
      .finally(() => setLoadingAddrs(false));
  }, []);

  const approvedAddresses = addresses.filter(a => a.status === 'approved');
  const hasPending        = addresses.some(a => a.status === 'pending');

  const handleConfirm = async () => {
    if (!selectedId) {
      toast.error('Please select a pickup address');
      return;
    }
    setConfirming(true);
    try {
      await api.patch(`/orders/${order._id}/seller-confirm`, { pickupAddressId: selectedId });
      toast.success('Order confirmed! Admin will acknowledge the pickup.');
      onConfirmed(order._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-800">Confirm Order #{order.orderId}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select the warehouse this order will ship from</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <p><span className="font-medium">Items:</span> {order.items?.length} · <span className="font-medium">Total:</span> {formatINR(order.pricing?.total)}</p>
            <p className="mt-0.5"><span className="font-medium">Ship to:</span>{' '}
              {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Pickup address selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FiMapPin size={14} /> Select Pickup / Warehouse
            </label>

            {loadingAddrs ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                Loading addresses…
              </div>
            ) : (
              <div className="space-y-2">
                {/* Main address (always available) */}
                <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selectedId === 'main' ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="pickup" value="main"
                    checked={selectedId === 'main'}
                    onChange={() => setSelectedId('main')}
                    className="mt-0.5 accent-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Main Business Address</p>
                    <p className="text-xs text-gray-500 mt-0.5">Default registered address</p>
                  </div>
                </label>

                {/* Approved pickup addresses */}
                {approvedAddresses.map(addr => (
                  <label key={addr._id}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selectedId === addr._id ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="pickup" value={addr._id}
                      checked={selectedId === addr._id}
                      onChange={() => setSelectedId(addr._id)}
                      className="mt-0.5 accent-primary-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{addr.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </label>
                ))}

                {/* Pending addresses notice */}
                {hasPending && (
                  <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                    ⏳ Some of your addresses are awaiting admin approval and cannot be selected yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-xl">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={confirming || !selectedId || loadingAddrs}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-60">
            {confirming
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Confirming…</>
              : <><FiCheckCircle size={15} /> Confirm Order</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Packaging Upload Section (per-side: Front/Back/Left/Right) ────────────
const PACKAGING_SIDES = [
  { key: 'front', label: 'Front',  emoji: '🔵', hint: 'Label side'  },
  { key: 'back',  label: 'Back',   emoji: '🟢', hint: 'Seal side'   },
  { key: 'left',  label: 'Left',   emoji: '🟡', hint: 'Left view'   },
  { key: 'right', label: 'Right',  emoji: '🟠', hint: 'Right view'  },
];

function PackagingUploadSection({ order, onPackagingUpdated }) {
  const [uploadingFor, setUploadingFor] = useState(null);
  const [packaging,    setPackaging]    = useState(order.packaging || {});

  useEffect(() => { setPackaging(order.packaging || {}); }, [order.packaging]);

  const packagingStatus = packaging.status || 'not_submitted';
  const isRejected      = packagingStatus === 'rejected';
  const locked          = packagingStatus === 'approved';
  const isPending       = packagingStatus === 'pending_review';

  // When rejected, treat all slots as empty (force full re-upload)
  const imagesBySide = useMemo(() => {
    if (isRejected) return {}; // all slots reset on rejection
    const map = {};
    (packaging.images || []).forEach(img => { if (img.side) map[img.side] = img; });
    return map;
  }, [packaging, isRejected]);

  const coveredSides = Object.keys(imagesBySide);
  const allDone      = coveredSides.length >= 4;

  const handleSideUpload = async (side, file) => {
    if (!file) return;
    setUploadingFor(side);
    try {
      const fd = new FormData();
      fd.append('images', file);
      fd.append('side', side);
      const { data } = await api.post(`/orders/${order._id}/package-images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPackaging(data.packaging || {});
      onPackagingUpdated(order._id, data.packaging);

      if (data.missingSides?.length === 0) {
        toast.success('✅ All 4 sides submitted for review!');
      } else {
        const sideLabel = PACKAGING_SIDES.find(s => s.key === side)?.label || side;
        const next = data.missingSides?.[0];
        const nextLabel = PACKAGING_SIDES.find(s => s.key === next)?.label;
        toast.success(`${sideLabel} uploaded!${nextLabel ? ` Upload ${nextLabel} next.` : ''}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-3">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <FiPackage size={14} className="text-orange-500" /> Packaging Photos
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          locked    ? 'bg-green-100 text-green-700' :
          isPending ? 'bg-yellow-100 text-yellow-800' :
          isRejected? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {locked     ? '✓ Approved' :
           isPending  ? '⏳ Pending Review' :
           isRejected ? '✗ Rejected' :
           `${coveredSides.length}/4 uploaded`}
        </span>
      </div>

      {/* Rejection banner — resubmit prompt */}
      {isRejected && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 mb-3 space-y-1">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <FiAlertCircle size={13} /> Packaging Rejected — Re-upload all 4 photos
          </p>
          {packaging.rejectedReason && (
            <p className="text-xs text-red-600">Reason: {packaging.rejectedReason}</p>
          )}
          <p className="text-[11px] text-red-500">Upload fresh photos for all 4 sides below to resubmit.</p>
        </div>
      )}

      {/* Approved message */}
      {locked && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
          ✅ Photos approved by admin. AWB label will be generated shortly.
        </p>
      )}

      {/* Pending review message */}
      {isPending && !isRejected && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
          ⏳ Photos submitted. Waiting for admin approval before AWB is released.
        </p>
      )}

      {/* 4 side cards — 2 cols mobile, 4 cols on wider screens */}
      {!locked && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PACKAGING_SIDES.map(({ key, label, emoji, hint }) => {
            const uploaded = imagesBySide[key];
            const isBusy   = uploadingFor === key;
            const inputId  = `pkg-${order._id}-${key}`;

            return (
              <div key={key} className={`rounded-xl border-2 overflow-hidden transition-all flex flex-col ${
                uploaded
                  ? 'border-green-400 bg-white shadow-sm'
                  : isRejected
                    ? 'border-dashed border-red-300 bg-red-50/60'
                    : 'border-dashed border-gray-300 bg-gray-50'
              }`}>
                {/* Photo or placeholder */}
                {uploaded ? (
                  <div className="relative flex-1">
                    <img src={uploaded.url} alt={`${label} side`}
                      className="w-full aspect-square object-cover" />
                    <span className="absolute top-1.5 left-1.5 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-semibold leading-none">
                      ✓ {label}
                    </span>
                    {/* Hover: replace */}
                    <label htmlFor={inputId}
                      className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer">
                      <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-lg">
                        Replace
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center gap-1 px-1">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                    <span className="text-[10px] text-gray-400 text-center">{hint}</span>
                  </div>
                )}

                {/* Upload button */}
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleSideUpload(key, e.target.files[0]); e.target.value = ''; }}
                />
                <label htmlFor={inputId}
                  className={`flex items-center justify-center gap-1 text-[11px] font-medium cursor-pointer py-2 border-t transition-colors ${
                    uploaded
                      ? 'border-gray-100 text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                      : isRejected
                        ? 'border-red-200 text-red-600 hover:bg-red-100'
                        : 'border-dashed border-gray-300 text-orange-600 hover:bg-orange-50'
                  }`}>
                  {isBusy
                    ? <><span className="w-3 h-3 border-2 border-orange-400/40 border-t-orange-500 rounded-full animate-spin" /> Uploading…</>
                    : uploaded
                      ? <><FiUploadCloud size={11} /> Replace</>
                      : <><FiUploadCloud size={11} /> {isRejected ? 'Re-upload' : 'Upload'}</>
                  }
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* Approved: show read-only grid */}
      {locked && packaging.images?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PACKAGING_SIDES.map(({ key, label }) => {
            const img = packaging.images?.find(i => i.side === key);
            return img ? (
              <div key={key} className="rounded-xl overflow-hidden border border-green-200 shadow-sm">
                <img src={img.url} alt={`${label} side`} className="w-full aspect-square object-cover" />
                <p className="text-center text-[10px] font-semibold text-green-700 py-1.5 bg-green-50">✓ {label}</p>
              </div>
            ) : (
              <div key={key} className="rounded-xl border border-gray-200 aspect-square flex items-center justify-center bg-gray-50">
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress footer */}
      {!locked && !isRejected && !isPending && (
        <p className="text-[11px] text-gray-500 mt-2.5 text-center">
          {allDone
            ? '✅ All 4 sides submitted — awaiting admin approval'
            : `Upload Front, Back, Left & Right photos to submit. ${4 - coveredSides.length} remaining.`}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function SellerOrders() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState({});
  const [modalOrder, setModalOrder] = useState(null); // order to confirm

  useEffect(() => {
    api.get('/orders/seller/mine')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const handleConfirmed = (orderId) => {
    setOrders(prev => prev.map(o =>
      o._id === orderId ? { ...o, orderStatus: 'confirmed' } : o
    ));
  };

  const handlePackagingUpdated = (orderId, packagingData) => {
    setOrders(prev => prev.map(o =>
      o._id === orderId ? { ...o, packaging: packagingData } : o
    ));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const pendingCount = orders.filter(o => o.orderStatus === 'placed').length;

  return (
    <div>
      {/* Confirm modal */}
      {modalOrder && (
        <ConfirmModal
          order={modalOrder}
          onClose={() => setModalOrder(null)}
          onConfirmed={handleConfirmed}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">My Orders</h2>
        {pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-full">
            {pendingCount} pending confirmation
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiPackage size={40} className="mx-auto mb-3 opacity-40" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id} className={`card overflow-hidden ${o.orderStatus === 'placed' ? 'border-2 border-yellow-300' : ''}`}>
              {/* Order header row */}
              <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-primary-600">#{o.orderId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {o.orderStatus}
                    </span>
                    {o.orderStatus === 'placed' && (
                      <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-200 animate-pulse">
                        ⏳ Awaiting your confirmation
                      </span>
                    )}
                    {/* Show pickup info for confirmed orders */}
                    {o.sellerPickup?.city && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${o.sellerPickup.adminAcknowledged ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                        <FiMapPin size={10} />
                        {o.sellerPickup.label} · {o.sellerPickup.city}
                        {o.sellerPickup.adminAcknowledged ? ' ✓' : ' (pending admin ack)'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                    <span>👤 {o.user?.name || '—'}</span>
                    {o.user?.phone && <span>📞 {o.user.phone}</span>}
                    <span>🗓 {new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatINR(o.pricing?.total)}</p>
                    <p className="text-xs text-gray-400">{o.items?.length} item(s)</p>
                  </div>

                  {/* Confirm button — only for 'placed' orders */}
                  {o.orderStatus === 'placed' && (
                    <button
                      onClick={() => setModalOrder(o)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <FiCheckCircle size={15} />
                      Confirm Order
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpand(o._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    {expanded[o._id] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded items detail */}
              {expanded[o._id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="text-left pb-2">Product</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Price</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {o.items?.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-4 text-gray-700 font-medium">{item.name}</td>
                          <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-600">{formatINR(item.price)}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{formatINR(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pickup address */}
                  {o.sellerPickup?.city && (
                    <div className={`text-xs rounded-xl px-3 py-2 flex items-start gap-2 ${o.sellerPickup.adminAcknowledged ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
                      <FiMapPin size={12} className="mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">Pickup: </span>
                        {o.sellerPickup.label} — {[o.sellerPickup.street, o.sellerPickup.city, o.sellerPickup.state, o.sellerPickup.pincode].filter(Boolean).join(', ')}
                        {o.sellerPickup.adminAcknowledged
                          ? <span className="ml-1 font-semibold text-green-700">✓ Admin acknowledged</span>
                          : <span className="ml-1 text-orange-600"> — awaiting admin acknowledgment</span>
                        }
                      </div>
                    </div>
                  )}

                  {/* Shipping section — AWB and tracking for shipped/delivered orders */}
                  {(o.orderStatus === 'shipped' || o.orderStatus === 'delivered') && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FiTruck size={14} className="text-blue-600" />
                        <span className="font-semibold text-sm text-gray-700">Shipping Details</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {/* AWB Number */}
                        <div className="flex items-start justify-between">
                          <span className="text-gray-600">AWB Number:</span>
                          <span className="font-mono font-semibold text-gray-800">
                            {o.shiprocket?.awb || o.trackingNumber || (
                              <span className="text-orange-600">⏳ AWB Pending</span>
                            )}
                          </span>
                        </div>

                        {/* Courier */}
                        {(o.shiprocket?.courier || o.deliveryPartner) && (
                          <div className="flex items-start justify-between">
                            <span className="text-gray-600">Courier:</span>
                            <span className="font-semibold text-gray-800">{o.shiprocket?.courier || o.deliveryPartner}</span>
                          </div>
                        )}

                        {/* Tracking Link */}
                        {o.shiprocket?.trackingUrl && (
                          <div className="flex items-start justify-between">
                            <span className="text-gray-600">Track Shipment:</span>
                            <a href={o.shiprocket.trackingUrl} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                              Track Now <FiExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shipping address */}
                  {o.shippingAddress && (
                    <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                      <span className="font-semibold text-gray-600">Deliver to: </span>
                      {[o.shippingAddress.fullName, o.shippingAddress.addressLine1, o.shippingAddress.city, o.shippingAddress.state, o.shippingAddress.pincode].filter(Boolean).join(', ')}
                      {o.shippingAddress.phone && <span> · 📞 {o.shippingAddress.phone}</span>}
                    </div>
                  )}

                  {/* Packaging upload section — shown only for confirmed/processing orders */}
                  {(o.orderStatus === 'confirmed' || o.orderStatus === 'processing') && (
                    <PackagingUploadSection order={o} onPackagingUpdated={handlePackagingUpdated} />
                  )}

                  {/* Seller payout invoice + customer invoice downloads */}
                  {['shipped','delivered','processing'].includes(o.orderStatus) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {/* Bonus badge for this order */}
                      {o.payout?.isNewSellerBonus && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <span className="text-green-600 text-sm">🎁</span>
                          <p className="text-xs font-semibold text-green-800">
                            New Seller Offer — Platform fee waived for this order!
                          </p>
                        </div>
                      )}
                    <div className="flex flex-wrap gap-2">
                      {/* Payout Statement */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await api.get(`/invoices/seller/order/${o._id}/download`, { responseType: 'blob' });
                            const blob = new Blob([res.data], { type: 'application/pdf' });
                            const url  = URL.createObjectURL(blob);
                            const a    = document.createElement('a');
                            a.href     = url;
                            a.download = `payout-statement-${o.orderId}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success('Payout statement downloaded!');
                          } catch { toast.error('Could not download payout statement'); }
                        }}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <FiDownload size={12} /> Payout Statement
                      </button>

                      {/* Customer Invoice */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await api.get(`/invoices/seller/order/${o._id}/customer-invoice`, { responseType: 'blob' });
                            const blob = new Blob([res.data], { type: 'application/pdf' });
                            const url  = URL.createObjectURL(blob);
                            const a    = document.createElement('a');
                            a.href     = url;
                            a.download = `customer-invoice-${o.orderId}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success('Customer invoice downloaded!');
                          } catch { toast.error('Could not download customer invoice'); }
                        }}
                        className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <FiDownload size={12} /> Customer Invoice
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
