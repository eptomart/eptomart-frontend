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
