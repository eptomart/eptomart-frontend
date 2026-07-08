// ============================================
// KOYAMBEDU WALLET — v2
// Features:
//  • Positive (green) and negative (red) balance display
//  • Filter tabs: All / Credits / Debits / Adjustments / Cashback
//  • Pagination (20 per page)
//  • New transaction category labels
//  • Refund request form (positive balance only)
// ============================================
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiArrowDownCircle, FiArrowUpCircle,
  FiCreditCard, FiFilter, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

// ── Category display config ────────────────────────────────
const CATEGORY_LABELS = {
  order_cancelled:         { label: 'Order Cancelled',              color: 'green', icon: '↩️' },
  item_declined:           { label: 'Item Declined — Refund',       color: 'green', icon: '↩️' },
  price_adjustment_credit: { label: 'Price Adjustment — Credited',  color: 'green', icon: '📉' },
  price_adjustment_due:    { label: 'Price Adjustment — Due',       color: 'red',   icon: '📈' },
  debt_recovery:           { label: 'Debt Recovery',                color: 'green', icon: '🔄' },
  wallet_applied:          { label: 'Wallet Applied at Checkout',   color: 'red',   icon: '🛒' },
  cashback:                { label: 'Cashback',                     color: 'green', icon: '🎁' },
  manual_credit:           { label: 'Manual Credit',                color: 'green', icon: '👤' },
  manual_debit:            { label: 'Manual Debit',                 color: 'red',   icon: '👤' },
  refund_paid:             { label: 'Bank Refund Paid',             color: 'red',   icon: '🏦' },
  refund_requested:        { label: 'Refund Requested (Reserved)',  color: 'amber', icon: '🔒' },
  refund_released:         { label: 'Refund Cancelled (Released)',  color: 'green', icon: '🔓' },
  price_revision_credit:   { label: 'Daily Price Drop — Refunded', color: 'green', icon: '📉' },
  price_revision_debit:    { label: 'Daily Price Rise — Recovered',color: 'red',   icon: '📈' },
  manual:                  { label: 'Transaction',                  color: 'gray',  icon: '💳' },
};

const FILTER_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'credits',     label: 'Credits' },
  { key: 'debits',      label: 'Debits' },
  { key: 'adjustments', label: 'Adjustments' },
  { key: 'cashback',    label: 'Cashback' },
];

const FILTER_FN = {
  all:         () => true,
  // Credits: cancellations, declined items, cashback, manual — NOT price adjustments
  credits:     t => t.type === 'credit' && !['price_adjustment_credit', 'price_adjustment_due', 'debt_recovery', 'price_revision_credit'].includes(t.category),
  // Debits: wallet applied at checkout, manual debits, bank refunds — NOT price adjustment dues
  debits:      t => t.type === 'debit'  && !['price_adjustment_due', 'price_revision_debit'].includes(t.category),
  // Adjustments: all price-related movements (both credit + debit sides)
  adjustments: t => ['price_adjustment_credit', 'price_adjustment_due', 'debt_recovery', 'price_revision_credit', 'price_revision_debit'].includes(t.category),
  cashback:    t => t.category === 'cashback',
};

export default function KoyambeduWallet() {
  const navigate = useNavigate();
  const [wallet,      setWallet]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page,        setPage]        = useState(1);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
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

  // Sort newest first, apply filter
  const allTxns = useMemo(() => {
    if (!wallet?.transactions) return [];
    return [...wallet.transactions].reverse();
  }, [wallet?.transactions]);

  const filteredTxns = useMemo(() => {
    const fn = FILTER_FN[activeFilter] || FILTER_FN.all;
    return allTxns.filter(fn);
  }, [allTxns, activeFilter]);

  const totalPages = Math.ceil(filteredTxns.length / PAGE_SIZE);
  const pageTxns   = filteredTxns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setPage(1);
  };

  const balance         = wallet?.balance ?? 0;
  const reservedBalance = wallet?.reservedBalance ?? 0;
  const availableBalance = Math.max(0, balance - reservedBalance);
  const isNegative      = balance < 0;
  // Block re-request if a pending OR confirmed request is active (funds already reserved)
  const hasActiveRequest = wallet?.refundRequests?.some(r => r.status === 'pending' || r.status === 'confirmed');

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (Number(form.amount) > availableBalance) return toast.error(`Amount exceeds available balance of ₹${availableBalance.toFixed(2)}`);
    if (form.bankAccountNumber !== form.confirmAccountNumber) return toast.error('Account numbers do not match');
    setSubmitting(true);
    try {
      await api.post('/koyambedu/wallet/refund-request', { ...form, amount: Number(form.amount) });
      toast.success('Refund request submitted! We will process it within 3-5 business days.');
      setShowRefundForm(false);
      const r = await api.get('/koyambedu/wallet');
      setWallet(r.data.wallet);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-10 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: isNegative
          ? 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%)'
          : 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
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
            <p className="text-white/70 text-[10px] mt-0.5">Koyambedu Daily</p>
          </div>
          <FaWallet className="text-white/60" size={18} />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── Balance Card ── */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: isNegative
              ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
              : 'linear-gradient(135deg,#064e3b,#059669)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
          <p className="text-white/70 text-xs font-semibold mb-1">
            {isNegative ? 'Pending Recovery' : 'Total Wallet Balance'}
          </p>
          <p className="text-4xl font-black text-white mb-1">
            {isNegative ? '-' : ''}₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {isNegative ? (
            <p className="text-red-200 text-xs leading-relaxed">
              This amount will be automatically collected in your next order.
            </p>
          ) : (
            <p className="text-emerald-200 text-xs">
              Credits from price adjustments, cancellations &amp; declined items
            </p>
          )}

          {/* Negative balance tip */}
          {isNegative && (
            <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 text-xs text-white/80">
              ℹ️ Market prices increased during procurement. This will be recovered in your next Koyambedu order.
            </div>
          )}

          {/* Reservation breakdown */}
          {!isNegative && reservedBalance > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-white/60 text-[10px] font-semibold">Refund Reserved</p>
                <p className="text-amber-300 font-black text-sm">₹{reservedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-white/60 text-[10px] font-semibold">Available to Spend</p>
                <p className="text-white font-black text-sm">₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          {/* Refund button (only for positive available balance) */}
          {!isNegative && !showRefundForm && !hasActiveRequest && availableBalance > 0 && (
            <button onClick={() => setShowRefundForm(true)}
              className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition">
              <FiCreditCard size={13} /> Request Bank Refund
            </button>
          )}
          {hasActiveRequest && !isNegative && (
            <div className="mt-4 text-xs bg-white/15 rounded-xl px-3 py-2 text-white/80">
              ⏳ Refund in progress — ₹{reservedBalance.toFixed(2)} reserved until processed
            </div>
          )}
        </div>

        {/* ── Balance info chips ── */}
        {!isNegative && balance > 0 && (
          <div className="flex gap-2">
            <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-green-700 text-xs font-bold">Available</p>
              <p className="text-green-800 font-black text-sm mt-0.5">₹{availableBalance.toFixed(2)}</p>
              <p className="text-green-600 text-[10px] mt-0.5">Auto-applied next order</p>
            </div>
            {reservedBalance > 0 ? (
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <p className="text-amber-700 text-xs font-bold">Reserved</p>
                <p className="text-amber-800 font-black text-sm mt-0.5">₹{reservedBalance.toFixed(2)}</p>
                <p className="text-amber-600 text-[10px] mt-0.5">Refund in progress</p>
              </div>
            ) : (
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-blue-700 text-xs font-bold">Transactions</p>
                <p className="text-blue-800 font-black text-sm mt-0.5">{allTxns.length}</p>
                <p className="text-blue-600 text-[10px] mt-0.5">Total history</p>
              </div>
            )}
          </div>
        )}

        {/* ── Refund request form ── */}
        {showRefundForm && (
          <div className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <FiCreditCard size={14} className="text-green-600" /> Request Refund to Bank
            </p>
            <form onSubmit={handleRefundSubmit} className="space-y-3">
              {[
                { key: 'amount',            label: 'Refund Amount (₹)',    type: 'number', placeholder: `Max ₹${availableBalance.toFixed(2)}` },
                { key: 'bankAccountName',   label: 'Account Holder Name',  type: 'text',   placeholder: 'As per bank records' },
                { key: 'bankAccountNumber', label: 'Account Number',       type: 'text',   placeholder: 'Enter account number' },
                { key: 'confirmAccountNumber', label: 'Confirm Account Number', type: 'text', placeholder: 'Re-enter account number' },
                { key: 'bankIfsc',          label: 'IFSC Code',            type: 'text',   placeholder: 'e.g. SBIN0001234' },
                { key: 'bankName',          label: 'Bank Name (optional)', type: 'text',   placeholder: 'e.g. State Bank of India', required: false },
              ].map(({ key, label, type, placeholder, required = true }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={type} required={required}
                    value={form[key]}
                    onChange={e => setForm(f => ({
                      ...f,
                      [key]: key === 'bankIfsc' ? e.target.value.toUpperCase() : e.target.value,
                    }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400"
                  />
                </div>
              ))}
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

        {/* ── Transaction History ── */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

          {/* Title + filter button */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="font-bold text-gray-800 text-sm">Transaction History</p>
            <span className="text-[10px] text-gray-400 font-semibold">{filteredTxns.length} records</span>
          </div>

          {/* Filter tabs */}
          <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => handleFilterChange(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                  activeFilter === tab.key
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Empty state */}
          {filteredTxns.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <FiFilter size={24} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No {activeFilter === 'all' ? '' : activeFilter} transactions yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {pageTxns.map((txn, i) => {
                  const cat   = CATEGORY_LABELS[txn.category] || CATEGORY_LABELS[txn.type === 'credit' ? 'manual' : 'manual'];
                  const isCredit = txn.type === 'credit';
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm"
                        style={{ background: isCredit ? '#f0fdf4' : '#fef2f2' }}>
                        {cat.icon || (isCredit
                          ? <FiArrowDownCircle size={16} className="text-green-600" />
                          : <FiArrowUpCircle  size={16} className="text-red-500" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{cat.label}</p>
                        {txn.productName && (
                          <p className="text-xs text-gray-500 mt-0.5">{txn.productName}</p>
                        )}
                        {txn.orderId && (
                          <p className="text-xs text-gray-400">Order #{txn.orderId}</p>
                        )}
                        {txn.reason && (
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{txn.reason}</p>
                        )}
                        <p className="text-[10px] text-gray-300 mt-0.5">
                          {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Amount + balance */}
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                          {isCredit ? '+' : '−'}₹{txn.amount?.toFixed(2)}
                        </p>
                        {txn.balanceAfter !== undefined && (
                          <p className="text-[10px] text-gray-300 mt-0.5">
                            Bal: {txn.balanceAfter < 0 ? '-' : ''}₹{Math.abs(txn.balanceAfter).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 border border-gray-200">
                    <FiChevronLeft size={14} className="text-gray-600" />
                  </button>
                  <p className="text-xs text-gray-500 font-semibold">Page {page} of {totalPages}</p>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 border border-gray-200">
                    <FiChevronRight size={14} className="text-gray-600" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Refund Requests History ── */}
        {wallet?.refundRequests?.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="font-bold text-gray-800 text-sm">Refund Requests</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[...wallet.refundRequests].reverse().map((rr, i) => {
                const cfg = {
                  pending:   'text-amber-600 bg-amber-50',
                  confirmed: 'text-blue-600 bg-blue-50',
                  cancelled: 'text-red-600 bg-red-50',
                  refunded:  'text-green-600 bg-green-50',
                }[rr.status] || 'text-gray-600 bg-gray-50';
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800 text-sm">₹{rr.amount.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${cfg}`}>
                        {rr.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Requested {new Date(rr.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
