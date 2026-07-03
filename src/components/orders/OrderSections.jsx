// ============================================
// UNIFIED ORDER DETAIL SECTIONS
// ItemsList · DeclinedItems · RefundSection ·
// WalletHistory · DocumentsSection · SupportSection
// All render canonical DTO fields from /api/v2/orders.
// Sections render nothing when they don't apply.
// ============================================
import React, { useState } from 'react';
import {
  FiDownload, FiFileText, FiHeadphones, FiMessageCircle,
  FiAlertCircle, FiCreditCard,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatINR, formatDate } from '../../utils/currency';

// ── Items list (ordered / confirmed) ─────────
export function ItemsList({ title, items = [], accent = '#111827', emptyText }) {
  if (!items.length) return emptyText ? (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-400">{emptyText}</p>
    </div>
  ) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{title}</h3>
      <div className="space-y-2.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            {it.image
              ? <img src={it.image} alt={it.name} className="w-10 h-10 object-cover rounded-xl bg-gray-100 shrink-0" />
              : <div className="w-10 h-10 rounded-xl bg-gray-50 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
              <p className="text-xs text-gray-500">
                {it.quantity}{it.unit ? ` ${it.unit}` : ''} × {formatINR(it.unitPrice)}
                {it.variantLabel ? ` · ${it.variantLabel}` : ''}
              </p>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: accent }}>
              {formatINR(it.lineTotal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Declined items ───────────────────────────
export function DeclinedItems({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-4">
      <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
        <FiAlertCircle size={14} /> Items Declined / Reduced
      </h3>
      <p className="text-[11px] text-gray-500 mb-3">
        These items (or part of their quantity) were unavailable. The amount is refunded.
      </p>
      <div className="space-y-2.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 bg-amber-50/60 rounded-xl p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
              <p className="text-xs text-gray-500">
                Declined: {it.declinedQty}{it.unit ? ` ${it.unit}` : ''} × {formatINR(it.unitPrice)}
              </p>
              {it.reason && <p className="text-[11px] text-amber-700 mt-0.5">Reason: {it.reason}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-green-700">{formatINR(it.refundAmount)}</p>
              <p className="text-[10px] text-gray-400">refund</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Refund details ───────────────────────────
const REFUND_STATUS_LABELS = {
  calculated: 'Calculated', pending: 'Pending', initiated: 'Initiated',
  processed: 'Processed', completed: 'Completed', failed: 'Failed',
  manual_required: 'Processing Manually', not_applicable: '—',
};

export function RefundSection({ refund, partialRefunds = [] }) {
  if (!refund && !partialRefunds.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
        <FiCreditCard size={14} /> Refund Details
      </h3>
      {refund && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-gray-400">Status</p><p className="font-semibold text-gray-800">{REFUND_STATUS_LABELS[refund.status] || refund.status}</p></div>
          <div><p className="text-gray-400">Amount</p><p className="font-semibold text-green-700">{formatINR(refund.amount)}</p></div>
          {refund.method && <div><p className="text-gray-400">Method</p><p className="font-semibold text-gray-800 capitalize">{String(refund.method).replace(/_/g, ' ')}</p></div>}
          {refund.date && <div><p className="text-gray-400">Date</p><p className="font-semibold text-gray-800">{formatDate(refund.date)}</p></div>}
        </div>
      )}
      {refund?.note && <p className="text-[11px] text-gray-500 mt-2">{refund.note}</p>}
      {partialRefunds.map((r, i) => (
        <div key={i} className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-100">
          <span className="text-gray-500">Partial refund · {r.status}{r.reason ? ` · ${r.reason}` : ''}</span>
          <span className="font-semibold text-green-700">{formatINR(r.amount)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Wallet history ───────────────────────────
export function WalletHistory({ transactions = [] }) {
  if (!transactions.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Wallet History</h3>
      <div className="space-y-2">
        {transactions.map((t, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold text-gray-700 capitalize">
                {t.type === 'credit' ? 'Wallet Credit' : 'Wallet Debit'}
                {t.reason ? ` · ${String(t.reason).replace(/_/g, ' ')}` : ''}
              </p>
              <p className="text-gray-400">{t.reference ? `Ref: ${t.reference} · ` : ''}{formatDate(t.date)}</p>
            </div>
            <span className={`font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
              {t.type === 'credit' ? '+' : '−'}{formatINR(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Documents ────────────────────────────────
export function DocumentsSection({ documents = [], orderId }) {
  const [downloading, setDownloading] = useState(null);
  if (!documents.length) return null;

  const download = async (doc) => {
    if (!doc.available) {
      toast(doc.note || 'Not available yet', { icon: '📄' });
      return;
    }
    setDownloading(doc.type);
    try {
      // Document URLs are API paths — fetch as blob with auth
      const path = doc.url.replace(/^\/api/, '');
      const res  = await api.get(path, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${doc.type}-${doc.number || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
        <FiFileText size={14} /> Documents
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => (
          <button key={doc.type} onClick={() => download(doc)}
            disabled={downloading === doc.type}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left border transition-colors
              ${doc.available ? 'border-gray-200 hover:border-gray-400 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
            <div>
              <p className="text-xs font-bold text-gray-800">{doc.label}</p>
              <p className="text-[10px] text-gray-400">
                {doc.number ? `${doc.number} · ` : ''}
                {doc.available ? (doc.generatedAt ? formatDate(doc.generatedAt) : 'Available') : (doc.note || 'Not available yet')}
              </p>
            </div>
            <FiDownload size={14} className={downloading === doc.type ? 'animate-pulse text-gray-300' : 'text-gray-400'} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Delivery acknowledgement (Koyambedu Daily) ─
// After delivery the customer confirms receipt:
//  1. Received all items      → order closes
//  2. Received partial/damaged → per-item missing qty → alert raised
//  3. Not received             → immediate alert to Seller Admin + Super Admin
export function DeliveryAckSection({ order, onDone }) {
  const [choice,     setChoice]     = useState('');
  const [missing,    setMissing]    = useState({}); // itemName → qty
  const [submitting, setSubmitting] = useState(false);

  if (order.vertical !== 'koyambedu') return null;

  // Already acknowledged — show the summary
  if (order.deliveryAck) {
    const ack = order.deliveryAck;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">Delivery Confirmation</h3>
        {ack.status === 'all_received' && (
          <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
            ✅ You confirmed all items were received. Order closed — thank you!
          </p>
        )}
        {ack.status === 'partial_issue' && (
          <div className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 space-y-1">
            <p className="font-bold">⚠️ You reported missing/damaged items — our team has been alerted.</p>
            {(ack.issues || []).map((i, k) => (
              <p key={k}>• {i.name}: {i.missingQty}{i.unit ? ` ${i.unit}` : ''} missing{i.note ? ` — ${i.note}` : ''}</p>
            ))}
          </div>
        )}
        {ack.status === 'not_received' && (
          <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
            🚨 You reported the order was not received. Our team has been alerted and will contact you shortly.
          </p>
        )}
      </div>
    );
  }

  if (!order.canAcknowledgeDelivery) return null;

  const items = order.itemsConfirmed?.length ? order.itemsConfirmed : order.itemsOrdered || [];

  const submit = async (status, extra = {}) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/koyambedu/orders/${order.id}/delivery-ack`, { status, ...extra });
      toast.success(data.message || 'Thank you!');
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not submit — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPartial = () => {
    const issues = items
      .filter(it => Number(missing[it.name]) > 0)
      .map(it => ({ name: it.name, unit: it.unit, missingQty: Number(missing[it.name]) }));
    if (!issues.length) { toast.error('Enter the missing quantity for at least one item'); return; }
    submit('partial_issue', { issues });
  };

  const OPTIONS = [
    { value: 'all_received',  label: 'Received all items',            emoji: '✅' },
    { value: 'partial_issue', label: 'Received partial / damaged',    emoji: '⚠️' },
    { value: 'not_received',  label: 'Not received',                  emoji: '🚨' },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-green-200 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-1">Confirm Your Delivery</h3>
      <p className="text-[11px] text-gray-400 mb-3">Your order is marked delivered — please confirm what you received.</p>

      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <label key={opt.value}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              choice === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
            }`}>
            <input type="radio" name="deliveryAck" value={opt.value}
              checked={choice === opt.value}
              onChange={() => setChoice(opt.value)}
              className="accent-green-600 w-4 h-4" />
            <span className="text-sm font-semibold text-gray-800">{opt.emoji} {opt.label}</span>
          </label>
        ))}
      </div>

      {/* Option 1 — close order */}
      {choice === 'all_received' && (
        <button onClick={() => submit('all_received')} disabled={submitting}
          className="mt-3 w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
          {submitting ? 'Closing…' : '✅ Close Order'}
        </button>
      )}

      {/* Option 2 — per-item missing quantity */}
      {choice === 'partial_issue' && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Enter missing / damaged quantity</p>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
                <p className="text-[10px] text-gray-400">Delivered qty: {it.quantity}{it.unit ? ` ${it.unit}` : ''}</p>
              </div>
              <input
                type="number" min="0" max={it.quantity} step="any" placeholder="0"
                value={missing[it.name] ?? ''}
                onChange={e => setMissing(m => ({ ...m, [it.name]: e.target.value }))}
                className="w-24 border border-gray-200 rounded-xl px-2.5 py-2 text-sm text-right"
              />
            </div>
          ))}
          <button onClick={submitPartial} disabled={submitting}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      )}

      {/* Option 3 — immediate alert */}
      {choice === 'not_received' && (
        <button onClick={() => submit('not_received')} disabled={submitting}
          className="mt-3 w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#b91c1c,#dc2626)' }}>
          {submitting ? 'Sending…' : '🚨 Send Alert'}
        </button>
      )}
    </div>
  );
}

// ── Support ──────────────────────────────────
export function SupportSection({ support = {}, sellerName }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
        <FiHeadphones size={14} /> Need Help?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {support.supportPhone && (
          <a href={`tel:${support.supportPhone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 hover:border-gray-400 font-semibold text-gray-700">
            <FiHeadphones size={13} /> Customer Support
          </a>
        )}
        <a href={support.raiseIssueUrl || '/contact'}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 hover:border-gray-400 font-semibold text-gray-700">
          <FiMessageCircle size={13} /> Raise an Issue{sellerName ? ` · ${sellerName}` : ''}
        </a>
      </div>
    </div>
  );
}
