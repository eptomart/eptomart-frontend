// ============================================
// ADMIN — ORDER MANAGEMENT
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiChevronDown, FiChevronUp, FiTruck, FiRefreshCw, FiMapPin, FiCheckCircle, FiXCircle, FiAlertTriangle, FiDownload, FiFileText, FiTag, FiPackage, FiImage } from 'react-icons/fi';
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

// ── Packaging Review Panel ──────────────────────────────
function PackagingReviewPanel({ order, onDone }) {
  const [lightbox,     setLightbox]     = useState(null); // url to show full-screen
  const [reviewing,    setReviewing]    = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const pkg = order.packaging;
  if (!pkg || (!pkg.images?.length && pkg.status === 'not_submitted')) return null;

  const STATUS_CONFIG = {
    not_submitted:  { bg: 'bg-gray-50 border-gray-200',    label: 'No Packaging Submitted',    badge: 'bg-gray-100 text-gray-600'  },
    pending_review: { bg: 'bg-yellow-50 border-yellow-300', label: 'Packaging Awaiting Review', badge: 'bg-yellow-100 text-yellow-800' },
    approved:       { bg: 'bg-green-50 border-green-200',  label: 'Packaging Approved ✓',       badge: 'bg-green-100 text-green-800'  },
    rejected:       { bg: 'bg-red-50 border-red-200',      label: 'Packaging Rejected',         badge: 'bg-red-100 text-red-800'    },
  };

  const cfg = STATUS_CONFIG[pkg.status] || STATUS_CONFIG.not_submitted;

  const handleReview = async (action) => {
    // action here is 'approve' or 'reject'
    if (action === 'reject' && !rejectReason.trim()) {
      return toast.error('Enter a rejection reason for the seller');
    }
    setReviewing(true);
    try {
      await api.patch(`/admin/orders/${order._id}/packaging-review`, {
        action,
        reason: rejectReason,
      });
      toast.success(action === 'approve' ? 'Packaging approved! Photos deleted & AWB can now be generated.' : 'Packaging rejected. Seller will be notified.');
      setShowReject(false);
      setRejectReason('');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <>
      <div className={`rounded-xl border p-4 space-y-3 ${cfg.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FiPackage size={14} /> Packaging Photos
          </p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Images grid with side labels — 4 fixed slots */}
        {(() => {
          const SIDES = [
            { key: 'front', label: 'Front', emoji: '🔵' },
            { key: 'back',  label: 'Back',  emoji: '🟢' },
            { key: 'left',  label: 'Left',  emoji: '🟡' },
            { key: 'right', label: 'Right', emoji: '🟠' },
          ];
          // Build side → image map (latest per side)
          const bySlot = {};
          (pkg.images || []).forEach(img => { if (img.side) bySlot[img.side] = img; });
          // Also handle legacy images without side (fill slots sequentially)
          const unsided = (pkg.images || []).filter(img => !img.side);
          let fill = 0;
          SIDES.forEach(s => { if (!bySlot[s.key] && unsided[fill]) { bySlot[s.key] = unsided[fill++]; } });

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SIDES.map(({ key, label, emoji }) => {
                const img = bySlot[key];
                return (
                  <div key={key} className={`rounded-xl overflow-hidden border-2 flex flex-col ${
                    img ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-200 bg-gray-50'
                  }`}>
                    {img ? (
                      <button
                        onClick={() => setLightbox(img.url)}
                        className="flex-1 relative group"
                      >
                        <img
                          src={img.url}
                          alt={`${label} side`}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <FiImage size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <div className="aspect-[4/3] flex flex-col items-center justify-center gap-1 text-gray-300">
                        <FiImage size={22} />
                        <span className="text-[10px]">Not uploaded</span>
                      </div>
                    )}
                    <div className={`text-center text-xs font-semibold py-1.5 ${img ? 'text-gray-700 bg-gray-50' : 'text-gray-400'}`}>
                      {emoji} {label}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {!pkg.images?.length && (
          <p className="text-xs text-gray-500">No images uploaded yet by seller.</p>
        )}

        {/* Submitted info */}
        {pkg.submittedAt && (
          <p className="text-xs text-gray-500">
            Submitted: {new Date(pkg.submittedAt).toLocaleString('en-IN')}
          </p>
        )}

        {/* Rejection reason (if rejected) */}
        {pkg.status === 'rejected' && pkg.rejectedReason && (
          <div className="bg-red-100 rounded-lg px-3 py-2">
            <p className="text-xs text-red-700 font-medium">Rejection reason: {pkg.rejectedReason}</p>
            {pkg.reviewedAt && (
              <p className="text-xs text-red-500 mt-0.5">
                Rejected on {new Date(pkg.reviewedAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        )}

        {/* Approval date (if approved) */}
        {pkg.status === 'approved' && pkg.reviewedAt && (
          <p className="text-xs text-green-600">
            Approved on {new Date(pkg.reviewedAt).toLocaleString('en-IN')}
          </p>
        )}

        {/* Action buttons — only when pending_review */}
        {pkg.status === 'pending_review' && pkg.images?.length > 0 && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleReview('approve')}
              disabled={reviewing}
              className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-60"
            >
              {reviewing ? <FiRefreshCw size={13} className="animate-spin" /> : <FiCheckCircle size={13} />}
              Approve Packaging
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={reviewing}
              className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-60"
            >
              <FiXCircle size={13} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-1">Reject Packaging</h3>
            <p className="text-sm text-gray-500 mb-4">Tell the seller what's wrong so they can re-photograph.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Images are blurry, please retake with better lighting..."
              rows={3}
              className="input-field mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowReject(false); setRejectReason(''); }}
                className="btn-outline flex-1">Cancel</button>
              <button onClick={() => handleReview('reject')} disabled={reviewing}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {reviewing ? <><FiRefreshCw size={13} className="animate-spin"/> Sending…</> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Package" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2">
            <FiXCircle size={22} />
          </button>
        </div>
      )}
    </>
  );
}

// ── Shiprocket shipment panel (per order) ───────────────
// ── Refresh AWB button — calls backend which calls Shiprocket assign/awb ──
function AwbRefreshButton({ orderId, onDone }) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/orders/${orderId}/refresh-awb`);
      if (data.awb) {
        toast.success(`AWB assigned: ${data.awb} (${data.courier || ''})`);
      } else {
        toast('Courier not assigned yet — try again in a few seconds', { icon: '⏳' });
      }
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not refresh AWB');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-1 text-xs bg-yellow-500 text-white px-2.5 py-1 rounded-lg hover:bg-yellow-600 transition-all disabled:opacity-60"
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        : <FiRefreshCw size={11} />}
      {loading ? 'Fetching…' : 'Refresh AWB'}
    </button>
  );
}

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

  // Already shipped — show AWB info + Refresh button if AWB is missing
  if (order.shiprocket?.orderId) {
    const awbMissing = !order.shiprocket.awb;
    return (
      <div className={`rounded-xl p-4 space-y-2 ${awbMissing ? 'bg-yellow-50 border border-yellow-300' : 'bg-indigo-50'}`}>
        <p className={`text-sm font-semibold flex items-center gap-2 ${awbMissing ? 'text-yellow-800' : 'text-indigo-800'}`}>
          <FiTruck size={14} /> Shiprocket Shipment Created
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <p className={`text-xs ${awbMissing ? 'text-yellow-700' : 'text-indigo-600'}`}>
            AWB: <span className="font-mono font-semibold">{order.shiprocket.awb || '—'}</span>
            {order.shiprocket.courier && <span> · {order.shiprocket.courier}</span>}
          </p>
          {awbMissing && (
            <AwbRefreshButton orderId={order._id} onDone={onDone} />
          )}
        </div>
        {order.shiprocket.trackingUrl && (
          <a href={order.shiprocket.trackingUrl} target="_blank" rel="noreferrer"
            className="text-xs text-indigo-600 underline block">Track shipment →</a>
        )}
        {awbMissing && (
          <p className="text-xs text-yellow-600">
            ⏳ Shiprocket assigns the AWB after matching a courier. Click Refresh to fetch it.
          </p>
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

// ── Payout finalization panel ───────────────────────────
function PayoutFinalizationPanel({ order, onDone }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyFee, setApplyFee] = useState(!order.payout?.isNewSellerBonus);
  const [packingCharge, setPackingCharge] = useState(order.payout?.packingCharge || 0);
  const [customDed, setCustomDed] = useState(order.payout?.customDeduction || 0);
  const [customNote, setCustomNote] = useState(order.payout?.customDeductionNote || '');
  const [fetchingCharge, setFetchingCharge] = useState(false);
  const [srCharge, setSrCharge] = useState(order.shiprocket?.shippingCharge || 0);

  if (!order.payout?.baseAmount) return null;

  const payout = order.payout;
  const previewNetPayout = Math.max(0, payout.baseAmount - (applyFee ? payout.platformFee : 0) - payout.shippingCost - packingCharge - customDed);

  const handleFetchCharge = async () => {
    setFetchingCharge(true);
    try {
      const { data } = await api.get(`/admin/orders/${order._id}/shiprocket-charge`);
      setSrCharge(data.freightCharge);
      toast.success(`Live Shiprocket charge: ₹${data.freightCharge.toFixed(2)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch Shiprocket charge');
    } finally {
      setFetchingCharge(false);
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/orders/${order._id}/recalculate-payout`, {
        applyPlatformFee: applyFee,
        packingCharge: parseFloat(packingCharge) || 0,
        customDeduction: parseFloat(customDed) || 0,
        customDeductionNote: customNote,
      });
      toast.success('Payout finalized successfully!');
      setExpanded(false);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalize payout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between hover:bg-blue-100/50 p-2 rounded-lg transition-colors"
        >
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            💰 Payout Breakdown
          </p>
          <span className="text-xs font-medium text-blue-600">{expanded ? '▼' : '▶'}</span>
        </button>

        {/* Current payout summary */}
        {!expanded && (
          <div className="mt-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Amount:</span>
              <span className="font-semibold text-gray-800">{formatINR(payout.baseAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee:</span>
              <span className={payout.isNewSellerBonus ? 'text-green-600 font-semibold' : 'text-red-600'}>{payout.isNewSellerBonus ? '✓ Waived' : `−${formatINR(payout.platformFee)}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span className="text-red-600">−{formatINR(payout.shippingCost)}</span>
            </div>
            {payout.packingCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Packing:</span>
                <span className="text-red-600">−{formatINR(payout.packingCharge)}</span>
              </div>
            )}
            {payout.customDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Other Deduction:</span>
                <span className="text-red-600">−{formatINR(payout.customDeduction)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-gray-800">Net Payout:</span>
              <span className="font-bold text-lg text-blue-700">{formatINR(payout.netPayout)}</span>
            </div>
          </div>
        )}

        {/* Expanded controls */}
        {expanded && (
          <div className="mt-4 space-y-4 p-3 bg-white rounded-lg border border-blue-100">
            {/* New seller bonus indicator */}
            {payout.isNewSellerBonus && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-green-800">✓ First 20 Orders Bonus Active</p>
                <p className="text-xs text-green-600 mt-1">Platform fee is waived for this seller's first 20 delivered orders.</p>
              </div>
            )}

            {/* Apply Platform Fee toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="applyFee"
                checked={applyFee}
                onChange={e => setApplyFee(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="applyFee" className="text-sm font-medium text-gray-700">
                Apply Platform Fee ({payout.platformFeeRate || 10}%)
              </label>
            </div>
            {applyFee && (
              <p className="text-xs text-gray-600 ml-6">−{formatINR(payout.platformFee)}</p>
            )}

            {/* Packing charge input */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Packing Charge (₹)</label>
              <input
                type="number"
                value={packingCharge}
                onChange={e => setPackingCharge(e.target.value)}
                step="0.01"
                min="0"
                className="input-field text-sm py-2 w-full"
                placeholder="0.00"
              />
            </div>

            {/* Custom deduction input */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Deduction (₹)</label>
              <input
                type="number"
                value={customDed}
                onChange={e => setCustomDed(e.target.value)}
                step="0.01"
                min="0"
                className="input-field text-sm py-2 w-full"
                placeholder="0.00"
              />
              <input
                type="text"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder="Reason for deduction (optional)"
                className="input-field text-sm py-2 w-full mt-2"
              />
            </div>

            {/* Fetch Shiprocket charge button */}
            {order.shiprocket?.shipmentId && (
              <div>
                <button
                  onClick={handleFetchCharge}
                  disabled={fetchingCharge}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all disabled:opacity-60"
                >
                  {fetchingCharge
                    ? <><span className="w-3 h-3 border-2 border-indigo-300/40 border-t-indigo-600 rounded-full animate-spin" /> Fetching…</>
                    : <>🔄 Fetch Live Shiprocket Charge</>
                  }
                </button>
                {srCharge > 0 && (
                  <p className="text-xs text-indigo-600 mt-2">Current: {formatINR(srCharge)}</p>
                )}
              </div>
            )}

            {/* Preview of net payout */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Preview (with changes)</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Est. Net Payout:</span>
                <span className="text-lg font-bold text-gray-900">{formatINR(previewNetPayout)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(false)}
                className="flex-1 btn-outline text-sm py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRecalculate}
                disabled={loading}
                className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading
                  ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Finalizing…</>
                  : <><FiCheckCircle size={14} /> Recalculate & Finalize</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </>
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

// ── Invoice / Document download helper ──────────────────
async function downloadBlob(url, filename, label) {
  try {
    const res  = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`${label} downloaded!`);
  } catch {
    toast.error(`Could not download ${label}`);
  }
}

// ── Invoice Actions Panel (per order) ───────────────────
function InvoiceActionsPanel({ order }) {
  const [loading, setLoading] = useState({});

  const dl = async (key, url, filename, label) => {
    setLoading(l => ({ ...l, [key]: true }));
    await downloadBlob(url, filename, label);
    setLoading(l => ({ ...l, [key]: false }));
  };

  const id = order._id;
  const oid = order.orderId;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📄 Documents</p>
      <div className="flex flex-wrap gap-2">
        {/* Customer Invoice */}
        <button
          onClick={() => dl('cust', `/invoices/admin/order/${id}/customer-invoice`, `invoice-${oid}.pdf`, 'Customer Invoice')}
          disabled={loading.cust}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
        >
          {loading.cust
            ? <span className="w-3 h-3 border-2 border-blue-400/40 border-t-blue-600 rounded-full animate-spin" />
            : <FiFileText size={12} />}
          Customer Invoice
        </button>

        {/* Admin Summary */}
        <button
          onClick={() => dl('admin', `/invoices/admin/order/${id}/download`, `admin-summary-${oid}.pdf`, 'Admin Summary')}
          disabled={loading.admin}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
        >
          {loading.admin
            ? <span className="w-3 h-3 border-2 border-purple-400/40 border-t-purple-600 rounded-full animate-spin" />
            : <FiDownload size={12} />}
          Admin Summary
        </button>

        {/* Shipping Label */}
        <button
          onClick={() => dl('label', `/invoices/admin/order/${id}/shipping-label`, `shipping-label-${oid}.pdf`, 'Shipping Label')}
          disabled={loading.label}
          className="flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
        >
          {loading.label
            ? <span className="w-3 h-3 border-2 border-orange-400/40 border-t-orange-600 rounded-full animate-spin" />
            : <FiTag size={12} />}
          Shipping Label
        </button>
      </div>
    </div>
  );
}

// ── Status config ────────────────────────────────────────
const STATUS_CFG = {
  placed:     { pill: 'bg-blue-100 text-blue-700',    bar: 'bg-blue-500',    label: 'Placed'     },
  confirmed:  { pill: 'bg-purple-100 text-purple-700',bar: 'bg-purple-500',  label: 'Confirmed'  },
  processing: { pill: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-500',   label: 'Processing' },
  shipped:    { pill: 'bg-indigo-100 text-indigo-700',bar: 'bg-indigo-500',  label: 'Shipped'    },
  delivered:  { pill: 'bg-green-100 text-green-700',  bar: 'bg-green-500',   label: 'Delivered'  },
  cancelled:  { pill: 'bg-red-100 text-red-700',      bar: 'bg-red-400',     label: 'Cancelled'  },
};

// ── Collect unique sellers from an order's items ─────────
function orderSellers(order) {
  const map = {};
  for (const item of order.items || []) {
    const s = item.product?.seller;
    if (s?._id && !map[s._id]) map[s._id] = s;
  }
  return Object.values(map);
}

// ── Main component ───────────────────────────────────────
export default function AdminOrders() {
  const [orders,        setOrders]        = useState([]);
  const [sellers,       setSellers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [expanded,      setExpanded]      = useState(null);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [sellerFilter,  setSellerFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);

  // Load sellers list for filter dropdown
  useEffect(() => {
    api.get('/sellers?limit=100').then(r => setSellers(r.data.sellers || [])).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.append('status', statusFilter);
      if (sellerFilter) params.append('seller', sellerFilter);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, statusFilter, sellerFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, updates) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, updates);
      toast.success('Order updated');
      fetchOrders();
    } catch { toast.error('Failed to update order'); }
  };

  const resetFilters = () => { setStatusFilter(''); setSellerFilter(''); setPage(1); };
  const hasFilter    = statusFilter || sellerFilter;

  return (
    <>
      <Helmet><title>Orders — Eptomart Admin</title></Helmet>

      <div className="space-y-5">

        {/* ── Header + Filters ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Orders</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} total orders</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <select value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field text-sm py-2 w-auto min-w-[140px]">
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            {/* Seller filter */}
            <select value={sellerFilter}
              onChange={e => { setSellerFilter(e.target.value); setPage(1); }}
              className="input-field text-sm py-2 w-auto min-w-[160px]">
              <option value="">All Sellers</option>
              {sellers.map(s => (
                <option key={s._id} value={s._id}>
                  {s.sellerId ? `[${s.sellerId}] ` : ''}{s.businessName}
                </option>
              ))}
            </select>
            {hasFilter && (
              <button onClick={resetFilters}
                className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-2 transition-colors">
                ✕ Clear
              </button>
            )}
            <button onClick={fetchOrders}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100 rounded-lg px-3 py-2 transition-colors">
              <FiRefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {hasFilter && (
          <div className="flex flex-wrap gap-2">
            {statusFilter && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${STATUS_CFG[statusFilter]?.pill || 'bg-gray-100 text-gray-600'}`}>
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('')} className="ml-0.5 hover:opacity-70">✕</button>
              </span>
            )}
            {sellerFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                Seller: {sellers.find(s => s._id === sellerFilter)?.businessName || '—'}
                <button onClick={() => setSellerFilter('')} className="ml-0.5 hover:opacity-70">✕</button>
              </span>
            )}
          </div>
        )}

        {/* ── Order Cards ── */}
        {loading ? <Loader fullPage={false} /> : (
          <div className="space-y-3">
            {orders.map(order => {
              const cfg      = STATUS_CFG[order.orderStatus] || STATUS_CFG.placed;
              const isOpen   = expanded === order._id;
              const sellers_ = orderSellers(order);
              const needsPkgReview = order.packaging?.status === 'pending_review';
              const needsPickup    = order.sellerPickup?.addressId && !order.sellerPickup?.adminAcknowledged;

              return (
                <div key={order._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">

                  {/* Coloured top bar */}
                  <div className={`h-1 w-full ${cfg.bar}`} />

                  {/* Collapsed header row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : order._id)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">

                      {/* Left: order id + date + customer */}
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="min-w-[90px]">
                          <p className="font-mono font-bold text-sm text-gray-900">#{order.orderId}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-800">{order.user?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{order.user?.email || order.user?.phone || ''}</p>
                        </div>

                        {/* Sellers involved */}
                        {sellers_.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {sellers_.map(s => (
                              <span key={s._id}
                                className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                                {s.sellerId && <span className="font-mono text-blue-500">[{s.sellerId}]</span>}
                                {s.businessName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: status + amount + chevron */}
                      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.paymentStatus} · {order.paymentMethod?.toUpperCase()}
                        </span>
                        {order.shiprocket?.awb && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                            <FiTruck size={10} /> {order.shiprocket.awb}
                          </span>
                        )}
                        {needsPkgReview && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium animate-pulse">
                            <FiPackage size={10} /> Pkg Review
                          </span>
                        )}
                        {needsPickup && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                            <FiMapPin size={10} /> Pickup Pending
                          </span>
                        )}
                        <span className="font-bold text-gray-900 text-sm">{formatINR(order.pricing?.total)}</span>
                        <span className="text-gray-400">{isOpen ? <FiChevronUp size={18}/> : <FiChevronDown size={18}/>}</span>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded detail panel ── */}
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50/40">

                      {/* Items table */}
                      <div className="px-5 pt-4 pb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Items</p>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          {order.items?.map((item, i) => {
                            const sellerName = item.product?.seller?.businessName;
                            const sellerId_  = item.product?.seller?.sellerId;
                            const productCode= item.product?.productCode;
                            return (
                              <div key={i}
                                className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                                <img src={item.image || item.product?.images?.[0]?.url}
                                  alt={item.name}
                                  className="w-11 h-11 object-cover rounded-lg flex-shrink-0 bg-gray-100" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    {productCode && (
                                      <span className="text-xs font-mono font-semibold text-primary-600">{productCode}</span>
                                    )}
                                    {sellerName && (
                                      <span className="text-xs text-gray-400">
                                        {sellerId_ && <span className="font-mono text-gray-500">[{sellerId_}] </span>}
                                        {sellerName}
                                      </span>
                                    )}
                                    {item.variant && <span className="text-xs text-gray-400">{item.variant}</span>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-semibold text-gray-800">{formatINR(item.price * item.quantity)}</p>
                                  <p className="text-xs text-gray-400">{formatINR(item.price)} × {item.quantity}</p>
                                </div>
                              </div>
                            );
                          })}
                          {/* Totals */}
                          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Subtotal · {order.items?.length} item(s)</span>
                            <div className="text-right">
                              {order.pricing?.discount > 0 && (
                                <p className="text-xs text-green-600">−{formatINR(order.pricing.discount)} discount</p>
                              )}
                              <p className="font-bold text-gray-800">{formatINR(order.pricing?.total)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Controls + action panels */}
                      <div className="px-5 pb-5 space-y-3 mt-2">

                        {/* Status controls */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Order Status</label>
                            <select defaultValue={order.orderStatus}
                              onChange={e => updateStatus(order._id, { status: e.target.value })}
                              className="input-field text-sm py-2">
                              {ORDER_STATUSES.map(s => (
                                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Status</label>
                            <select defaultValue={order.paymentStatus}
                              onChange={e => updateStatus(order._id, { paymentStatus: e.target.value })}
                              className="input-field text-sm py-2">
                              {PAYMENT_STATUSES.map(s => (
                                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Confirm new order */}
                        {order.orderStatus === 'placed' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-blue-800">⏳ Awaiting Confirmation</p>
                              <p className="text-xs text-blue-600 mt-0.5">Verify stock with seller, then confirm the order.</p>
                            </div>
                            <button onClick={() => updateStatus(order._id, { status: 'confirmed' })}
                              className="btn-primary text-sm whitespace-nowrap shrink-0">
                              ✓ Confirm Order
                            </button>
                          </div>
                        )}

                        {/* UPI verification */}
                        {order.paymentMethod === 'upi' && order.paymentDetails?.upiRef && order.paymentStatus === 'pending' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-orange-800 mb-2">💳 UPI Payment Reference</p>
                            <p className="font-mono text-sm text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg inline-block">
                              {order.paymentDetails.upiRef}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => updateStatus(order._id, { paymentStatus: 'paid', status: 'confirmed' })}
                                className="btn-primary text-sm">✓ Verify & Confirm</button>
                              <button onClick={() => updateStatus(order._id, { paymentStatus: 'failed' })}
                                className="bg-red-100 text-red-600 hover:bg-red-200 py-2 px-4 rounded-xl text-sm font-medium transition-colors">
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Pickup acknowledgment */}
                        {order.sellerPickup?.addressId && (
                          <PickupAcknowledgePanel order={order} onDone={fetchOrders} />
                        )}

                        {/* Packaging review */}
                        {(order.packaging?.images?.length > 0 || order.packaging?.status === 'pending_review') && (
                          <PackagingReviewPanel order={order} onDone={fetchOrders} />
                        )}

                        {/* Shiprocket */}
                        {['confirmed', 'processing', 'placed', 'shipped'].includes(order.orderStatus) &&
                          order.paymentStatus === 'paid' && (
                          <ShiprocketPanel order={order} onDone={fetchOrders} />
                        )}

                        {/* Payout finalization */}
                        {order.orderStatus === 'delivered' && (
                          <PayoutFinalizationPanel order={order} onDone={fetchOrders} />
                        )}

                        {/* Refund */}
                        {order.refund && order.refund.status !== 'not_applicable' && (
                          <RefundPanel refund={order.refund} />
                        )}

                        {/* Documents */}
                        <InvoiceActionsPanel order={order} />

                        {/* Delivery address */}
                        <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📍 Delivery Address</p>
                          <p className="font-medium text-gray-800">{order.shippingAddress?.fullName}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {order.shippingAddress?.phone && <span>{order.shippingAddress.phone} · </span>}
                            {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city},{' '}
                            {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
                          </p>
                        </div>

                        {/* Cancel & refund */}
                        <div className="flex justify-end">
                          <CancelRefundButton order={order} onDone={fetchOrders} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {orders.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <FiPackage size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-gray-500">No orders found</p>
                {hasFilter && <p className="text-sm text-gray-400 mt-1">Try clearing the filters</p>}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  page === p ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
