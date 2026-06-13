// ============================================
// PAYMENT SETTLEMENTS — SuperAdmin only
// Payout = base_price - platform_fee - shipping_cost
// (GST is collected from buyer but remitted to govt — NOT part of seller's profit)
// ============================================
import React, { useState, useEffect } from 'react';
import {
  FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle,
  FiChevronDown, FiChevronUp, FiRefreshCw, FiInfo,
} from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700', icon: FiClock         },
  settled:    { label: 'Settled',    cls: 'bg-green-100  text-green-700',  icon: FiCheckCircle   },
  on_hold:    { label: 'On Hold',    cls: 'bg-red-100    text-red-600',    icon: FiAlertCircle   },
};

export default function AdminSettlements() {
  const [sellers,   setSellers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);          // seller being settled
  const [expanded,  setExpanded]  = useState(null);          // seller showing payout detail
  const [payouts,   setPayouts]   = useState({});            // keyed by sellerId
  const [payLoading,setPayLoading]= useState(null);
  const [saving,    setSaving]    = useState(false);
  const [notes,     setNotes]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sellers');
      setSellers(data.sellers || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadPayouts = async (sellerId) => {
    if (payouts[sellerId] || payLoading === sellerId) return;
    setPayLoading(sellerId);
    try {
      const { data } = await api.get(`/sellers/${sellerId}/payouts`, { params: { limit: 10 } });
      setPayouts(prev => ({ ...prev, [sellerId]: data.orders || [] }));
    } catch (_) {
      setPayouts(prev => ({ ...prev, [sellerId]: [] }));
    } finally { setPayLoading(null); }
  };

  const toggleExpand = (s) => {
    if (expanded === s._id) {
      setExpanded(null);
    } else {
      setExpanded(s._id);
      loadPayouts(s._id);
    }
  };

  const markSettled = async (seller) => {
    if (!confirm(`Mark settlement as paid for ${seller.businessName}?`)) return;
    setSaving(true);
    try {
      await api.patch(`/sellers/${seller._id}`, {
        settlement: {
          status:        'settled',
          lastSettledAt: new Date().toISOString(),
          pendingAmount: 0,
          notes,
        },
      });
      toast.success('Settlement marked as paid');
      setSelected(null);
      setNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settlement');
    } finally { setSaving(false); }
  };

  const totalPending = sellers.reduce((sum, s) => sum + (s.settlement?.pendingAmount || 0), 0);
  const settledCount = sellers.filter(s => s.settlement?.status === 'settled').length;
  const pendingCount = sellers.filter(s => (s.settlement?.pendingAmount || 0) > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Payment Settlements</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Seller payouts after delivery. Formula: Base Price − Platform Fee − Shipping Cost.
          <span className="ml-1 text-xs text-orange-600">(GST is collected & remitted separately)</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-800">{formatINR(totalPending)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Pending Payouts</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sellers Awaiting Settlement</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">{settledCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Settled This Cycle</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {sellers.map(s => {
            const st     = s.settlement || {};
            const status = st.status || 'pending';
            const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const Icon   = cfg.icon;
            const pending = st.pendingAmount || 0;
            const isOpen  = expanded === s._id;

            return (
              <div key={s._id} className="card overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 p-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{s.businessName}</p>
                    <p className="text-xs text-gray-400">{s.contact?.email || s.contact?.phone || '—'}</p>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-bold ${pending > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {formatINR(pending)}
                    </p>
                    <p className="text-xs text-gray-400">pending</p>
                  </div>

                  {st.heldAmount > 0 && (
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-gray-600">{formatINR(st.heldAmount)}</p>
                      <p className="text-xs text-gray-400">held</p>
                    </div>
                  )}

                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {pending > 0 && (
                      <button
                        onClick={() => setSelected(s)}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Mark Settled
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpand(s)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      title="View payout breakdown"
                    >
                      {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded payout history */}
                {isOpen && (
                  <div className="border-t bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Recent Delivered Orders — Payout Breakdown</p>
                    {payLoading === s._id ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                        <FiRefreshCw size={14} className="animate-spin" /> Loading...
                      </div>
                    ) : (payouts[s._id] || []).length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">No delivered orders yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b">
                              <th className="text-left py-2 pr-3">Order</th>
                              <th className="text-right py-2 pr-3">Gross</th>
                              <th className="text-right py-2 pr-3 text-red-500">− GST</th>
                              <th className="text-right py-2 pr-3">= Base</th>
                              <th className="text-right py-2 pr-3 text-orange-600">− Fee</th>
                              <th className="text-right py-2 pr-3 text-blue-600">− Ship</th>
                              <th className="text-right py-2 font-bold text-green-600">= Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(payouts[s._id] || []).map(order => {
                              const p = order.payout || {};
                              return (
                                <tr key={order._id} className="border-b border-gray-100 hover:bg-white">
                                  <td className="py-2 pr-3">
                                    <p className="font-medium text-gray-700">{order.orderId}</p>
                                    <p className="text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                  </td>
                                  <td className="text-right py-2 pr-3 text-gray-600">{formatINR(p.grossAmount || order.pricing?.total || 0)}</td>
                                  <td className="text-right py-2 pr-3 text-red-500">−{formatINR(p.gstAmount || 0)}</td>
                                  <td className="text-right py-2 pr-3 text-gray-700">{formatINR(p.baseAmount || 0)}</td>
                                  <td className="text-right py-2 pr-3 text-orange-600">−{formatINR(p.platformFee || 0)}</td>
                                  <td className="text-right py-2 pr-3 text-blue-600">−{formatINR(p.shippingCost || 0)}</td>
                                  <td className="text-right py-2 font-bold text-green-600">{formatINR(p.netPayout || 0)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-white rounded-lg p-2 border">
                      <FiInfo size={12} className="flex-shrink-0 mt-0.5 text-orange-400" />
                      <span>GST is collected from the buyer and remitted to the government — it is deducted from gross to get the seller's actual revenue base. Platform fee ({s.defaultPlatformMargin ?? 10}%) and actual Shiprocket shipping cost are then deducted from the base.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sellers.length === 0 && (
            <div className="card p-12 text-center text-gray-400">No sellers found</div>
          )}
        </div>
      )}

      {/* Settlement confirmation modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiDollarSign size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Confirm Settlement</h3>
                <p className="text-sm text-gray-500">{selected.businessName}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Amount</span>
                <span className="font-bold text-orange-600">{formatINR(selected.settlement?.pendingAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bank</span>
                <span className="text-gray-700">{selected.bankDetails?.bankName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account</span>
                <span className="text-gray-700">{selected.bankDetails?.accountNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IFSC</span>
                <span className="text-gray-700">{selected.bankDetails?.ifscCode || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Transaction Ref</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="input-field resize-none text-sm"
                placeholder="UTR number, bank reference, etc."
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setSelected(null); setNotes(''); }} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={() => markSettled(selected)}
                disabled={saving}
                className="btn-primary flex-1 bg-green-500 hover:bg-green-600"
              >
                {saving ? 'Saving...' : '✅ Mark as Settled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
