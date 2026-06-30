// ============================================
// KOYAMBEDU WALLET — Customer wallet page
// Shows balance, credit history, refund request form
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiArrowDownCircle, FiArrowUpCircle, FiCreditCard,
} from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TXN_ICONS = {
  credit: <FiArrowDownCircle size={16} className="text-green-600" />,
  debit:  <FiArrowUpCircle size={16} className="text-red-500" />,
};

export default function KoyambeduWallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '', bankAccountName: '', bankAccountNumber: '',
    confirmAccountNumber: '', bankIfsc: '', bankName: '',
  });

  useEffect(() => {
    api.get('/koyambedu/wallet')
      .then(r => setWallet(r.data.wallet))
      .catch(() => toast.error('Failed to load wallet'))
      .finally(() => setLoading(false));
  }, []);

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (Number(form.amount) > (wallet?.balance || 0)) return toast.error('Amount exceeds wallet balance');
    if (form.bankAccountNumber !== form.confirmAccountNumber) return toast.error('Account numbers do not match');
    setSubmitting(true);
    try {
      await api.post('/koyambedu/wallet/refund-request', {
        ...form, amount: Number(form.amount),
      });
      toast.success('Refund request submitted! We will process it within 3-5 business days.');
      setShowRefundForm(false);
      // Refresh wallet
      const r = await api.get('/koyambedu/wallet');
      setWallet(r.data.wallet);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = wallet?.refundRequests?.some(r => r.status === 'pending');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F5F4F2' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">My Wallet</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">Koyambedu Daily Credits</p>
          </div>
          <FaWallet className="text-white/60" size={18} />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* Balance card */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#064e3b 0%,#059669 100%)', boxShadow: '0 8px 32px rgba(6,95,70,0.35)' }}>
          <p className="text-emerald-200 text-xs font-semibold mb-1">Available Credit</p>
          <p className="text-4xl font-black mb-4">₹{(wallet?.balance || 0).toLocaleString('en-IN')}</p>
          <p className="text-emerald-200 text-xs">Credits from cancelled orders &amp; declined items</p>

          {!showRefundForm && !hasPendingRequest && (wallet?.balance || 0) > 0 && (
            <button onClick={() => setShowRefundForm(true)}
              className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition">
              <FiCreditCard size={13} /> Request Bank Refund
            </button>
          )}
          {hasPendingRequest && (
            <div className="mt-4 text-xs bg-white/15 rounded-xl px-3 py-2 text-white/80">
              ⏳ You have a pending refund request — we'll process it soon
            </div>
          )}
        </div>

        {/* Refund request form */}
        {showRefundForm && (
          <div className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <FiCreditCard size={14} className="text-green-600" /> Request Refund to Bank
            </p>
            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Refund Amount (₹)</label>
                <input type="number" required min="1" max={wallet?.balance || 0}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max ₹${wallet?.balance || 0}`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                <input type="text" required value={form.bankAccountName}
                  onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))}
                  placeholder="As per bank records"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                <input type="text" required value={form.bankAccountNumber}
                  onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                  placeholder="Enter account number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confirm Account Number</label>
                <input type="text" required value={form.confirmAccountNumber}
                  onChange={e => setForm(f => ({ ...f, confirmAccountNumber: e.target.value }))}
                  placeholder="Re-enter account number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">IFSC Code</label>
                <input type="text" required value={form.bankIfsc}
                  onChange={e => setForm(f => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bank Name (optional)</label>
                <input type="text" value={form.bankName}
                  onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. State Bank of India"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRefundForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 active:scale-95 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Credit history */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-bold text-gray-800 text-sm">Credit History</p>
          </div>
          {!wallet?.transactions?.length ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-300 text-xs mt-1">Credits from cancelled orders appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...wallet.transactions].reverse().map((txn, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: txn.type === 'credit' ? '#f0fdf4' : '#fef2f2' }}>
                    {TXN_ICONS[txn.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {txn.reason === 'order_cancelled' ? 'Order Cancelled'
                        : txn.reason === 'item_declined' ? 'Item Declined'
                        : txn.reason === 'refund_paid'   ? 'Bank Refund Paid'
                        : txn.reason || 'Transaction'}
                    </p>
                    {txn.orderId && (
                      <p className="text-xs text-gray-400">Order #{txn.orderId}</p>
                    )}
                    <p className="text-[10px] text-gray-300">
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <p className={`font-bold text-sm shrink-0 ${txn.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refund requests history */}
        {wallet?.refundRequests?.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="font-bold text-gray-800 text-sm">Refund Requests</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[...wallet.refundRequests].reverse().map((rr, i) => {
                const statusColor = {
                  pending: 'text-amber-600 bg-amber-50',
                  confirmed: 'text-blue-600 bg-blue-50',
                  cancelled: 'text-red-600 bg-red-50',
                  refunded: 'text-green-600 bg-green-50',
                }[rr.status] || 'text-gray-600 bg-gray-50';
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800 text-sm">₹{rr.amount.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
                        {rr.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Requested {new Date(rr.requestedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                    {rr.adminNote && <p className="text-xs text-gray-500 mt-1">Note: {rr.adminNote}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
