// ============================================
// KOYAMBEDU — UNIFIED ORDER DETAIL PAGE
// Roles: Customer | Seller Admin | Super Admin
// Shows: Items Ordered → Items Declined → Items Confirmed
//        Payment Summary (from backend) → Timeline → Invoices
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiPackage, FiCheckCircle, FiClock, FiAlertTriangle,
  FiTruck, FiHome, FiXCircle, FiRefreshCw, FiList, FiDownload,
  FiFileText, FiShare2, FiChevronDown, FiChevronUp, FiMapPin,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Status config ─────────────────────────────
const STATUS_CONFIG = {
  placed:                { label: 'Order Placed',          color: '#3b82f6', bg: '#eff6ff',   Icon: FiList },
  pending_confirmation:  { label: 'Awaiting SA Review',    color: '#d97706', bg: '#fffbeb',   Icon: FiClock },
  sa_review_submitted:   { label: 'Awaiting Approval',     color: '#9333ea', bg: '#faf5ff',   Icon: FiClock },
  price_revision_pending:{ label: 'Price Revision',        color: '#ea580c', bg: '#fff7ed',   Icon: FiAlertTriangle },
  confirmed:             { label: 'Confirmed',             color: '#16a34a', bg: '#f0fdf4',   Icon: FiCheckCircle },
  packing:               { label: 'Packing',               color: '#9333ea', bg: '#faf5ff',   Icon: FiPackage },
  dispatched:            { label: 'On the Way',            color: '#0284c7', bg: '#e0f2fe',   Icon: FiTruck },
  delivered:             { label: 'Delivered',             color: '#059669', bg: '#d1fae5',   Icon: FiHome },
  cancelled:             { label: 'Cancelled',             color: '#dc2626', bg: '#fef2f2',   Icon: FiXCircle },
  refund_initiated:      { label: 'Refund Initiated',      color: '#6b7280', bg: '#f3f4f6',   Icon: FiRefreshCw },
};

const TIMELINE_LABELS = {
  order_placed:           '🛒 Order Placed',
  item_confirmed:         '✅ Item Confirmed',
  item_declined:          '❌ Item Declined',
  qty_reduced:            '📉 Quantity Reduced',
  sa_review_submitted:    '📤 Submitted to Super Admin',
  review_rejected:        '🔄 Review Sent for Revision',
  admin_approved:         '✅ Super Admin Approved',
  refund_credited_wallet: '💰 Refund Credited to Wallet',
  packing:                '📦 Packing Started',
  dispatched:             '🚚 Out for Delivery',
  delivered:              '🏠 Delivered',
  order_cancelled:        '❌ Order Cancelled',
};

const fmt     = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// ── Invoice HTML generator ────────────────────
const buildInvoiceHtml = (order, type = 'proforma') => {
  const r2   = n => Math.round((Number(n) || 0) * 100) / 100;
  const fmtC = n => `INR ${r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calc    = order.calculatedPricing || {};
  const pricing = order.pricing || {};
  const addr    = order.shippingAddress || {};

  const invoiceNo = type === 'tax'
    ? (order.invoices?.tax?.number          || `TAX-${order.orderId}`)
    : type === 'confirmation'
    ? (order.invoices?.confirmation?.number  || `CONF-${order.orderId}`)
    : (order.invoices?.proforma?.number      || `PRO-${order.orderId}`);

  const title = type === 'tax' ? 'FINAL TAX INVOICE'
              : type === 'confirmation' ? 'ORDER CONFIRMATION'
              : 'PROFORMA INVOICE';

  // Source items: tax invoice uses confirmed-only; proforma/confirmation uses all ordered items
  const sourceItems = type === 'tax'
    ? (order.items || []).filter(it => it.itemStatus !== 'declined')
    : (order.itemsOrdered?.length ? order.itemsOrdered : order.items || []);

  // ── Build item rows ──────────────────────────────────────────
  let subtotal = 0;
  const rows = sourceItems.map((it, idx) => {
    const qty  = r2(it.confirmedQty != null && type === 'tax' ? it.confirmedQty : (it.orderedQty || it.quantity || 0));
    const price = r2(it.unitPrice || it.finalPrice || it.orderedPrice || 0);
    const lineAmt = r2(price * qty);
    subtotal += lineAmt;
    const gradeHtml = it.gradeKey
      ? `<br><small style="color:#6b7280;font-style:italic;font-size:10px">Grade: ${it.gradeName || it.gradeKey}</small>`
      : '';
    return `<tr style="background:${idx % 2 === 0 ? '#f9fafb' : '#ffffff'}">
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:center;color:#9ca3af;font-size:11px;width:4%">${idx + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;width:38%"><strong style="font-size:12px">${it.name}</strong>${gradeHtml}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;width:10%;font-size:12px">${qty}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:center;width:8%;font-size:11px;color:#6b7280">${it.unit || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;width:19%;font-size:12px;font-family:monospace">${fmtC(price)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;width:21%;font-size:12px;font-weight:600;font-family:monospace">${fmtC(lineAmt)}</td>
    </tr>`;
  }).join('');

  // ── Declined items ──────────────────────────────────────────
  const declinedItems = (order.items || []).filter(it => it.itemStatus === 'declined' || it.itemStatus === 'partial');
  const declinedRows = type !== 'tax' ? declinedItems.map((it, idx) => {
    const decQty = r2(it.declinedQty || it.orderedQty || it.quantity || 0);
    const price  = r2(it.orderedPrice || it.finalPrice || 0);
    const gradeHtml = it.gradeKey
      ? `<br><small style="font-style:italic;font-size:10px">Grade: ${it.gradeName || it.gradeKey}</small>`
      : '';
    return `<tr style="background:${idx % 2 === 0 ? '#fff5f5' : '#ffffff'}">
      <td style="padding:5px 8px;text-align:center;color:#dc2626;font-size:11px;width:4%">${idx + 1}</td>
      <td style="padding:5px 8px;width:34%;color:#dc2626"><strong style="font-size:12px">${it.name}</strong>${gradeHtml}</td>
      <td style="padding:5px 8px;text-align:right;width:10%;font-size:12px">${decQty}</td>
      <td style="padding:5px 8px;text-align:center;width:8%;font-size:11px;color:#9ca3af">${it.unit || ''}</td>
      <td style="padding:5px 8px;text-align:right;width:19%;font-size:12px;font-family:monospace">${fmtC(price)}</td>
      <td style="padding:5px 8px;text-align:right;width:25%;font-size:12px;font-family:monospace;color:#dc2626">${fmtC(r2(price * decQty))}</td>
    </tr>`;
  }).join('') : '';

  // ── Wallet adjustments ──────────────────────────────────────
  const walletAdj     = r2(calc.walletAdjustment || pricing.walletAdjustment || 0);
  const priceRevCredit = r2(order.dailyPriceRevision?.totalCreditToWallet || 0);
  const priceRevDebit  = r2(order.dailyPriceRevision?.totalDebitFromWallet || 0);
  const procCredit     = r2(order.procurementPricing?.totalWalletCredit || 0);
  const procDebit      = r2(order.procurementPricing?.totalWalletDue || 0);
  const couponDisc     = r2(calc.couponDiscount || pricing.discount || 0);
  const delivFee       = r2(calc.deliveryCharge || pricing.deliveryCharge || pricing.deliveryFee || 0);
  const platFee        = r2(calc.platformFee || pricing.platformFee || 0);
  const packFee        = r2(calc.packingLogisticsFee || pricing.packingLogisticsFee || 0);
  const declinedRefund = r2(calc.declinedRefundAmount || 0);
  const finalAmt       = r2(calc.finalPayableAmount && calc.finalPayableAmount > 0 ? calc.finalPayableAmount : (pricing.total || subtotal));

  // Helper: one summary row (right-aligned label + value)
  const sumRow = (label, value, color = '#374151', bg = 'transparent') =>
    `<tr style="background:${bg}">
      <td style="padding:4px 8px;font-size:12px;color:${color}">${label}</td>
      <td style="padding:4px 8px;text-align:right;font-size:12px;font-family:monospace;color:${color}">${value}</td>
    </tr>`;

  const summaryRows = [
    sumRow('Items Subtotal', fmtC(subtotal)),
    delivFee > 0  ? sumRow('Delivery Charge', fmtC(delivFee)) : '',
    platFee  > 0  ? sumRow('Platform Fee', fmtC(platFee)) : '',
    packFee  > 0  ? sumRow('Packing &amp; Logistics', fmtC(packFee)) : '',
    couponDisc > 0 ? sumRow('Coupon Discount (−)', `&minus; ${fmtC(couponDisc)}`, '#16a34a', '#f0fdf4') : '',
    walletAdj > 0  ? sumRow('Wallet Credit Applied (−)', `&minus; ${fmtC(walletAdj)}`, '#16a34a', '#f0fdf4') : '',
    walletAdj < 0  ? sumRow('Wallet Debt Recovered (+)', `+ ${fmtC(Math.abs(walletAdj))}`, '#dc2626', '#fff7ed') : '',
    priceRevCredit > 0 ? sumRow('Price Revision Credit (−)', `&minus; ${fmtC(priceRevCredit)}`, '#16a34a', '#f0fdf4') : '',
    priceRevDebit  > 0 ? sumRow('Price Revision Debit (+)',  `+ ${fmtC(priceRevDebit)}`,  '#dc2626', '#fff7ed') : '',
    procCredit > 0 ? sumRow('Procurement Credit (−)', `&minus; ${fmtC(procCredit)}`, '#16a34a', '#f0fdf4') : '',
    procDebit  > 0 ? sumRow('Procurement Debit (+)',  `+ ${fmtC(procDebit)}`,  '#dc2626', '#fff7ed') : '',
    sumRow('GST / Tax', 'NIL (Exempt)', '#9ca3af'),
  ].join('');

  // ── GST exemption notice — shown on every invoice type ──────
  const GST_NOTE = '<div style="margin-top:8px;padding:7px 10px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:3px">'
    + '<p style="font-size:10px;color:#166534;margin:0"><strong>GST Exemption Notice:</strong> '
    + 'This bill is exempt from Goods &amp; Services Tax (GST). Fresh vegetables, fruits, flowers, '
    + 'and produce are exempt from GST as per Chapter 7 &amp; 8, Notification No. 2/2017-Central Tax (Rate) '
    + 'of the Indian GST law. No GST is charged or collected on this transaction.</p></div>';

  // ── Disclaimer ──────────────────────────────────────────────
  const disclaimer = type === 'proforma'
    ? '<p style="color:#6b7280;font-size:11px;margin-top:10px">⚠️ This is a Proforma Invoice — <b>not a tax invoice</b>. Final Tax Invoice will be generated after successful delivery.</p>' + GST_NOTE
    : type === 'confirmation'
    ? '<p style="color:#6b7280;font-size:11px;margin-top:10px">This document confirms items for delivery after seller review. Final Tax Invoice issued upon delivery.</p>' + GST_NOTE
    : GST_NOTE;

  const addrParts = [addr.addressLine1 || addr.address, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 20px; max-width: 860px; margin: 0 auto; }
  @media print { .no-print { display: none !important } body { padding: 0 } }
  table { border-collapse: collapse; }
  th { font-weight: 600; }
</style>
</head><body>

<div class="no-print" style="margin-bottom:16px;display:flex;gap:8px">
  <button onclick="window.print()" style="background:#065f46;color:#fff;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨 Print / Save PDF</button>
  <button onclick="window.close()" style="background:#f3f4f6;color:#374151;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:14px">✕ Close</button>
</div>

<!-- HEADER -->
<table width="100%" style="margin-bottom:14px">
  <tr>
    <td width="55%" valign="top">
      <div style="color:#065f46;font-size:24px;font-weight:bold;line-height:1">EPTOMART</div>
      <div style="color:#374151;font-size:12px;margin-top:3px">Koyambedu Daily — Fresh from the Market</div>
      <div style="color:#9ca3af;font-size:11px;margin-top:2px">GSTIN: Exempt (Fresh Produce) &nbsp;|&nbsp; support@eptomart.com</div>
    </td>
    <td width="45%" valign="top" style="text-align:right">
      <div style="color:#065f46;font-size:18px;font-weight:bold">${title}</div>
      <div style="color:#6b7280;font-size:11px;margin-top:4px">Invoice No.: <strong style="color:#111">${invoiceNo}</strong></div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px">Order Ref.: <strong style="color:#111">${order.orderId}</strong></div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px">Date: <strong style="color:#111">${fmtDate(order.placedAt || order.createdAt)}</strong></div>
    </td>
  </tr>
</table>

<hr style="border:none;border-top:2px solid #065f46;margin:0 0 12px">

<!-- PARTY & DELIVERY BLOCKS -->
<table width="100%" style="margin-bottom:14px">
  <tr>
    <td width="50%" valign="top">
      <div style="font-size:10px;font-weight:bold;color:#065f46;letter-spacing:.05em;margin-bottom:4px">BILLED TO</div>
      <div style="font-size:13px;font-weight:bold">${addr.fullName || order.buyer?.name || '—'}</div>
      <div style="font-size:12px;color:#374151;margin-top:2px">${addrParts}</div>
      ${addr.landmark ? `<div style="font-size:12px;color:#6b7280">Landmark: ${addr.landmark}</div>` : ''}
      <div style="font-size:12px;color:#374151;margin-top:2px">Phone: ${addr.phone || '—'}</div>
    </td>
    <td width="50%" valign="top" style="text-align:right">
      <div style="font-size:10px;font-weight:bold;color:#065f46;letter-spacing:.05em;margin-bottom:4px">DELIVERY DETAILS</div>
      ${order.deliveryDate ? `<div style="font-size:12px;color:#374151"><strong>Date:</strong> ${fmtDate(order.deliveryDate)}</div>` : ''}
      ${order.deliverySlot ? `<div style="font-size:12px;color:#374151"><strong>Slot:</strong> ${order.deliverySlot}</div>` : ''}
      <div style="font-size:12px;color:#374151"><strong>Payment:</strong> ${(order.paymentMethod || 'Online').toUpperCase()}</div>
      <div style="font-size:12px;color:#374151"><strong>Status:</strong> ${(order.orderStatus || '').replace(/_/g,' ').toUpperCase()}</div>
    </td>
  </tr>
</table>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 10px">

<!-- ITEMS TABLE -->
<div style="font-size:11px;font-weight:bold;color:#374151;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em">${type === 'tax' ? 'Items Delivered' : 'Items Ordered'}</div>
<table width="100%" style="border:1px solid #e5e7eb;margin-bottom:16px">
  <thead>
    <tr style="background:#065f46;color:#fff">
      <th style="padding:7px 8px;text-align:center;width:4%;font-size:11px">S.No</th>
      <th style="padding:7px 8px;text-align:left;width:38%;font-size:11px">Description / Grade</th>
      <th style="padding:7px 8px;text-align:right;width:10%;font-size:11px">Qty</th>
      <th style="padding:7px 8px;text-align:center;width:8%;font-size:11px">Unit</th>
      <th style="padding:7px 8px;text-align:right;width:19%;font-size:11px">Rate</th>
      <th style="padding:7px 8px;text-align:right;width:21%;font-size:11px">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

${declinedRows ? `
<div style="font-size:11px;font-weight:bold;color:#dc2626;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em">Items Declined / Not Delivered</div>
<table width="100%" style="border:1px solid #fecaca;margin-bottom:16px">
  <thead>
    <tr style="background:#fef2f2;color:#dc2626">
      <th style="padding:6px 8px;text-align:center;width:4%;font-size:11px">S.No</th>
      <th style="padding:6px 8px;text-align:left;width:34%;font-size:11px">Product / Grade</th>
      <th style="padding:6px 8px;text-align:right;width:10%;font-size:11px">Ordered</th>
      <th style="padding:6px 8px;text-align:center;width:8%;font-size:11px">Unit</th>
      <th style="padding:6px 8px;text-align:right;width:19%;font-size:11px">Rate</th>
      <th style="padding:6px 8px;text-align:right;width:25%;font-size:11px">Refund Amount</th>
    </tr>
  </thead>
  <tbody>${declinedRows}</tbody>
</table>` : ''}

<!-- TOTALS -->
<table width="100%">
  <tr>
    <td valign="top" width="52%">
      ${declinedRefund > 0 ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px;font-size:11px;color:#92400e;max-width:300px">
        Note: ${fmtC(declinedRefund)} for declined/reduced items has been credited to your Eptomart Wallet and is not charged in this invoice.
      </div>` : ''}
    </td>
    <td valign="top" width="48%">
      <table width="100%" style="border:1px solid #e5e7eb;border-radius:6px">
        <tbody>
          ${summaryRows}
          <tr><td colspan="2" style="padding:0"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0"></td></tr>
          <tr style="background:#065f46">
            <td style="padding:8px 10px;font-size:13px;font-weight:bold;color:#fff">Total Amount Payable</td>
            <td style="padding:8px 10px;text-align:right;font-size:14px;font-weight:bold;color:#fff;font-family:monospace">${fmtC(finalAmt)}</td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</table>

${disclaimer}

<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 8px">
<div style="text-align:center;color:#9ca3af;font-size:10px">
  This is a computer-generated document and does not require a signature. &nbsp;|&nbsp; Eptomart — Koyambedu Daily &nbsp;|&nbsp; eptomart.com
</div>

</body></html>`;
};

const openInvoice = (order, type) => {
  const html = buildInvoiceHtml(order, type);
  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};

const shareInvoice = async (order, type) => {
  const html = buildInvoiceHtml(order, type);
  if (navigator.share) {
    const file = new File([new Blob([html], { type: 'text/html' })], `Invoice-${order.orderId}.html`, { type: 'text/html' });
    try { await navigator.share({ files: [file], title: `Invoice ${order.orderId}` }); return; } catch {}
  }
  openInvoice(order, type);
};

// ── Reusable card ─────────────────────────────
const Card = ({ title, titleColor = '#065f46', badge, children }) => (
  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontWeight: 700, fontSize: 14, color: titleColor }}>{title}</span>
      {badge && <span style={{ fontSize: 11, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{badge.label}</span>}
    </div>
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

const PayRow = ({ label, value, bold, color, divider }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: divider ? '10px 0 6px' : '5px 0', borderTop: divider ? '1px solid #f3f4f6' : 'none' }}>
    <span style={{ fontSize: 13, color: bold ? '#111' : '#6b7280', fontWeight: bold ? 700 : 400 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color || (bold ? '#065f46' : '#111') }}>{value}</span>
  </div>
);

export default function KoyambeduOrderDetail() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();

  const [order,        setOrder]        = useState(null);
  const [calc,         setCalc]         = useState(null);
  const [timeline,     setTimeline]     = useState(null); // null = not loaded yet
  const [loading,      setLoading]      = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  const isAdmin   = location.pathname.includes('koyambedu-admin') || location.pathname.includes('admin');
  const isSA      = location.pathname.includes('seller-admin');
  const isCustomer = !isAdmin && !isSA;

  const loadOrder = useCallback(async () => {
    try {
      let orderData;
      if (isCustomer) {
        const { data } = await api.get(`/koyambedu/my-orders/${orderId}`);
        orderData = data.order;
      } else {
        // Admin/SA fetch all orders filtered by orderId
        const { data } = await api.get(`/koyambedu/admin/orders`, { params: { search: orderId } });
        orderData = (data.orders || []).find(o => o._id === orderId || o.orderId === orderId);
      }
      setOrder(orderData);
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId, isCustomer]);

  const loadCalc = useCallback(async () => {
    try {
      const { data } = await api.get(`/koyambedu/orders/${orderId}/calculation`);
      setCalc(data.calculatedPricing);
    } catch {}
  }, [orderId]);

  const loadTimeline = useCallback(async () => {
    if (timeline !== null) return; // already loaded
    try {
      const { data } = await api.get(`/koyambedu/orders/${orderId}/timeline`);
      setTimeline(data.timeline || []);
    } catch { setTimeline([]); }
  }, [orderId, timeline]);

  useEffect(() => { loadOrder(); loadCalc(); }, [loadOrder, loadCalc]);

  // ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F2' }}>
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" style={{ background: '#F5F4F2' }}>
      <FiXCircle size={40} className="text-red-400" />
      <p className="text-gray-600">Order not found</p>
      <button onClick={() => navigate(-1)} style={{ color: '#065f46', fontWeight: 600, fontSize: 14 }}>← Go Back</button>
    </div>
  );

  const statusCfg  = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed;
  const pricing    = order.pricing || {};
  const effective  = calc || order.calculatedPricing || {};
  const addr       = order.shippingAddress || {};

  const itemsOrdered = order.itemsOrdered?.length
    ? order.itemsOrdered
    : (order.items || []).map(it => ({
        ...it, orderedQty: it.orderedQty || it.quantity, unitPrice: it.orderedPrice || it.finalPrice,
      }));

  const itemsDeclined  = (order.items || []).filter(it => it.itemStatus === 'declined' || it.itemStatus === 'partial');
  const itemsConfirmed = (order.items || []).filter(it => it.itemStatus !== 'declined');
  const hasDeclines    = itemsDeclined.length > 0;
  const isDelivered    = order.orderStatus === 'delivered';
  const isConfirmed    = ['confirmed','packing','dispatched','delivered'].includes(order.orderStatus);

  const fullAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.pincode, addr.landmark].filter(Boolean).join(', ');
  const bestInvoiceType = isDelivered && order.invoices?.tax?.isAvailable ? 'tax'
    : isConfirmed && order.invoices?.confirmation?.isAvailable ? 'confirmation'
    : 'proforma';

  return (
    <div className="min-h-screen pb-16" style={{ background: '#F5F4F2' }}>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#065f46', padding: '12px 16px', paddingTop: `calc(12px + env(safe-area-inset-top))`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <FiArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Order #{order.orderId}</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>{fmtDate(order.placedAt || order.createdAt)}</p>
        </div>
        <div style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
          {statusCfg.label}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Delivery info ── */}
        <Card title="Delivery Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>Delivery Date</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{fmtDate(order.deliveryDate)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>Time Slot</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{order.deliverySlot || '—'}</p>
            </div>
          </div>
          {fullAddress && (
            <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <FiMapPin size={14} style={{ color: '#9ca3af', marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>{fullAddress}</p>
            </div>
          )}
        </Card>

        {/* ── SECTION 1: Items Ordered (immutable original) ── */}
        <Card
          title="Items Ordered"
          titleColor="#1d4ed8"
          badge={{ label: `${itemsOrdered.length} item${itemsOrdered.length !== 1 ? 's' : ''}`, bg: '#eff6ff', color: '#3b82f6' }}
        >
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Your original order — this record never changes.</p>
          {itemsOrdered.map((it, i) => {
            const qty   = it.orderedQty || it.quantity || 0;
            const price = it.unitPrice || it.orderedPrice || it.finalPrice || 0;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < itemsOrdered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{it.name}</p>
                  {it.gradeKey && <p style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', margin: '1px 0 0' }}>Grade: {it.gradeName || it.gradeKey}</p>}
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{qty} {it.unit} × {fmt(price)}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: 0, flexShrink: 0, paddingLeft: 8 }}>{fmt(price * qty)}</p>
              </div>
            );
          })}
        </Card>

        {/* ── SECTION 2: Items Declined ── */}
        {hasDeclines && (
          <Card
            title="Items Declined"
            titleColor="#dc2626"
            badge={{ label: `${itemsDeclined.length} declined`, bg: '#fef2f2', color: '#dc2626' }}
          >
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Cannot be supplied. Refund will be processed.</p>
            {itemsDeclined.map((it, i) => {
              const decQty = it.declinedQty || (it.orderedQty || it.quantity || 0);
              const price  = it.orderedPrice || it.finalPrice || 0;
              return (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < itemsDeclined.length - 1 ? '1px solid #fef2f2' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: 0 }}>{it.name}</p>
                      {it.gradeKey && <p style={{ fontSize: 11, color: '#f87171', fontStyle: 'italic', margin: '1px 0 0' }}>Grade: {it.gradeName || it.gradeKey}</p>}
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Declined: {decQty} {it.unit} × {fmt(price)}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>Reason: {it.declinedReason || 'Unavailable'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: 0 }}>−{fmt(price * decQty)}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Refund</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Total Refund Amount</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{fmt(effective.declinedRefundAmount)}</span>
            </div>
          </Card>
        )}

        {/* ── SECTION 3: Items Confirmed ── */}
        <Card
          title={isDelivered ? 'Items Delivered' : 'Items Confirmed'}
          titleColor="#065f46"
          badge={{ label: `${itemsConfirmed.filter(i => i.itemStatus !== 'declined').length} items`, bg: '#f0fdf4', color: '#16a34a' }}
        >
          {!isConfirmed && !hasDeclines && (
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Pending Seller Admin review. All items confirmed by default.</p>
          )}
          {(hasDeclines || isConfirmed
            ? itemsConfirmed.filter(it => it.itemStatus !== 'declined')
            : itemsOrdered
          ).map((it, i, arr) => {
            const confirmedQty = it.confirmedQty != null ? it.confirmedQty : (it.orderedQty || it.quantity || 0);
            const price        = it.orderedPrice || it.unitPrice || it.finalPrice || 0;
            const isPartial    = it.itemStatus === 'partial';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>
                    {it.name}
                    {isPartial && <span style={{ marginLeft: 6, fontSize: 10, background: '#fff7ed', color: '#d97706', padding: '1px 6px', borderRadius: 99 }}>Partial</span>}
                  </p>
                  {it.gradeKey && <p style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', margin: '1px 0 0' }}>Grade: {it.gradeName || it.gradeKey}</p>}
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                    {confirmedQty} {it.unit} × {fmt(price)}
                    {isPartial ? ` (ordered: ${it.orderedQty || it.quantity})` : ''}
                  </p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46', margin: 0, flexShrink: 0, paddingLeft: 8 }}>{fmt(price * confirmedQty)}</p>
              </div>
            );
          })}
        </Card>

        {/* ── PAYMENT SUMMARY ── */}
        <Card title="Payment Summary" titleColor="#374151">
          {(effective.originalOrderValue || pricing.subtotal || 0) > 0 && (
            <PayRow label="Original Order Value" value={fmt(effective.originalOrderValue || pricing.subtotal)} />
          )}
          {(effective.declinedRefundAmount || 0) > 0 && (
            <PayRow label="Declined Refund (−)" value={`−${fmt(effective.declinedRefundAmount)}`} color="#dc2626" />
          )}
          <PayRow label="Confirmed Items Total" value={fmt(effective.confirmedItemsTotal || pricing.subtotal)} />
          {(effective.platformFee || pricing.platformFee || 0) > 0 && (
            <PayRow label="Platform Fee" value={fmt(effective.platformFee || pricing.platformFee)} />
          )}
          {(effective.packingLogisticsFee || 0) > 0 && (
            <PayRow label="Packing & Logistics Fee" value={fmt(effective.packingLogisticsFee)} />
          )}
          {(effective.deliveryCharge || pricing.deliveryCharge || 0) > 0 && (
            <PayRow label="Delivery Charge" value={fmt(effective.deliveryCharge || pricing.deliveryCharge)} />
          )}
          <PayRow label="GST" value="0% (Exempt)" />
          {(effective.couponDiscount || pricing.discount || 0) > 0 && (
            <PayRow label="Coupon Discount (−)" value={`−${fmt(effective.couponDiscount || pricing.discount)}`} color="#16a34a" />
          )}
          {(() => {
            const wa = effective.walletAdjustment || pricing.walletAdjustment || 0;
            if (wa > 0) return <PayRow label="Wallet Credit Applied (−)" value={`−${fmt(wa)}`} color="#16a34a" />;
            if (wa < 0) return <PayRow label="Wallet Debt Recovered (+)" value={`+${fmt(Math.abs(wa))}`} color="#dc2626" />;
            return null;
          })()}
          {(order.procurementPricing?.totalWalletCredit || 0) > 0 && (
            <PayRow label="Procurement Credit (−)" value={`−${fmt(order.procurementPricing.totalWalletCredit)}`} color="#16a34a" />
          )}
          {(order.procurementPricing?.totalWalletDue || 0) > 0 && (
            <PayRow label="Procurement Debit (+)" value={`+${fmt(order.procurementPricing.totalWalletDue)}`} color="#dc2626" />
          )}
          {(order.dailyPriceRevision?.totalCreditToWallet || 0) > 0 && (
            <PayRow label="Price Revision Credit (−)" value={`−${fmt(order.dailyPriceRevision.totalCreditToWallet)}`} color="#16a34a" />
          )}
          {(order.dailyPriceRevision?.totalDebitFromWallet || 0) > 0 && (
            <PayRow label="Price Revision Debit (+)" value={`+${fmt(order.dailyPriceRevision.totalDebitFromWallet)}`} color="#dc2626" />
          )}
          <PayRow
            label="Final Amount"
            value={fmt(effective.finalPayableAmount || pricing.total)}
            bold divider
          />
          {/* Paid via payment method — shows the net amount charged to Razorpay/COD */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              ✓ Paid via {(order.paymentMethod || '').toUpperCase()}
            </span>
            <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>
              {fmt(effective.finalPayableAmount || pricing.total)}
            </span>
          </div>
        </Card>

        {/* ── DOCUMENTS ── */}
        <Card title="Documents & Invoices" titleColor="#374151">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Proforma — always available */}
            <button onClick={() => openInvoice(order, 'proforma')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
              <FiFileText size={18} style={{ color: '#3b82f6' }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', margin: 0 }}>Proforma Invoice</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Order summary at placement</p>
              </div>
              <FiDownload size={16} style={{ color: '#3b82f6' }} />
            </button>

            {/* Order Confirmation — after Super Admin approval */}
            {order.invoices?.confirmation?.isAvailable && (
              <button onClick={() => openInvoice(order, 'confirmation')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
                <FiCheckCircle size={18} style={{ color: '#16a34a' }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#065f46', margin: 0 }}>Order Confirmation</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Confirmed items after review</p>
                </div>
                <FiDownload size={16} style={{ color: '#16a34a' }} />
              </button>
            )}

            {/* Final Tax Invoice — only after delivery */}
            {order.invoices?.tax?.isAvailable && isDelivered && (
              <button onClick={() => openInvoice(order, 'tax')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
                <FiFileText size={18} style={{ color: '#065f46' }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#065f46', margin: 0 }}>Final Tax Invoice</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Delivered items only · GST 0%</p>
                </div>
                <FiDownload size={16} style={{ color: '#065f46' }} />
              </button>
            )}

            {/* Share best available */}
            <button onClick={() => shareInvoice(order, bestInvoiceType)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
              <FiShare2 size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>Share via WhatsApp</span>
            </button>

          </div>
        </Card>

        {/* ── MARKET PRICE ADJUSTMENT (Feature 9) ── */}
        {order.procurementPricing?.walletAdjustmentApplied && (() => {
          const pp = order.procurementPricing;
          return (
            <Card title="Market Price Adjustment" titleColor="#4f46e5">
              {/* Per-item breakdown */}
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e7ff', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 4, padding: '8px 12px', background: '#f5f3ff', fontSize: 10, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
                  <span>Product</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'center' }}>Est ₹</span><span style={{ textAlign: 'center' }}>Actual ₹</span><span style={{ textAlign: 'right' }}>Adjustment</span>
                </div>
                {(pp.items || []).map((it, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 4, padding: '8px 12px', borderTop: '1px solid #ede9fe', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{it.name}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{it.confirmedQty} {it.unit}</p>
                    </div>
                    <p style={{ fontSize: 12, textAlign: 'center', color: '#6b7280' }}>{it.confirmedQty}</p>
                    <p style={{ fontSize: 12, textAlign: 'center', color: '#6b7280' }}>₹{it.estimatedUnitPrice?.toFixed(2)}</p>
                    <p style={{ fontSize: 12, textAlign: 'center', fontWeight: 600, color: '#374151' }}>₹{it.actualUnitPrice?.toFixed(2)}</p>
                    <div style={{ textAlign: 'right' }}>
                      {it.walletAction === 'credit' && (
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 8 }}>+₹{it.walletAmount?.toFixed(2)}</span>
                          <p style={{ fontSize: 9, color: '#16a34a', margin: '2px 0 0', fontStyle: 'italic' }}>Credited to Wallet</p>
                        </div>
                      )}
                      {it.walletAction === 'due' && (
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '2px 6px', borderRadius: 8 }}>-₹{it.walletAmount?.toFixed(2)}</span>
                          <p style={{ fontSize: 9, color: '#d97706', margin: '2px 0 0', fontStyle: 'italic' }}>Next order</p>
                        </div>
                      )}
                      {it.walletAction === 'none' && <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Net totals */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e0e7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>Estimated Total</span>
                  <span style={{ fontWeight: 700 }}>₹{pp.totalEstimated?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>Final Procurement Total</span>
                  <span style={{ fontWeight: 700 }}>₹{pp.totalActual?.toFixed(2)}</span>
                </div>
                {pp.totalWalletCredit > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#16a34a' }}>
                    <span>✅ Wallet Credited</span>
                    <span style={{ fontWeight: 700 }}>+₹{pp.totalWalletCredit?.toFixed(2)}</span>
                  </div>
                )}
                {pp.totalWalletDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#d97706' }}>
                    <span>⚠️ Recovered in Next Order</span>
                    <span style={{ fontWeight: 700 }}>-₹{pp.totalWalletDue?.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 6, color: pp.netWalletAdjustment >= 0 ? '#16a34a' : '#d97706' }}>
                  <span>Net Adjustment</span>
                  <span>{pp.netWalletAdjustment >= 0 ? `+₹${pp.netWalletAdjustment?.toFixed(2)} Wallet Credit` : `-₹${Math.abs(pp.netWalletAdjustment)?.toFixed(2)} Pending Recovery`}</span>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* ── DAILY PRICE REVISIONS ── (admin only, when at least one revision applied) */}
        {isAdmin && order.dailyPriceRevision?.revisions?.length > 0 && (() => {
          const dpr = order.dailyPriceRevision;
          const fmt = n => `₹${Number(n || 0).toFixed(2)}`;
          return (
            <Card title="Daily Price Revisions" titleColor="#0e7490">
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                Automatic price adjustments applied when today&apos;s market prices differed from the ordered price.
                {dpr.priceLocked && (
                  <span style={{ marginLeft: 8, color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '1px 6px', borderRadius: 6, fontSize: 10 }}>
                    PRICES LOCKED (Invoice Generated)
                  </span>
                )}
              </p>

              {/* Summary row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {dpr.totalCreditApplied > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 14px', flex: 1 }}>
                    <p style={{ fontSize: 10, color: '#16a34a', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>Total Credited</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', margin: '2px 0 0' }}>+{fmt(dpr.totalCreditApplied)}</p>
                  </div>
                )}
                {dpr.totalDebitApplied > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', flex: 1 }}>
                    <p style={{ fontSize: 10, color: '#b45309', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>Total Debited</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#b45309', margin: '2px 0 0' }}>-{fmt(dpr.totalDebitApplied)}</p>
                  </div>
                )}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', flex: 1 }}>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>Revisions Count</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#374151', margin: '2px 0 0' }}>{dpr.revisions.length}</p>
                </div>
              </div>

              {/* Per-revision breakdown */}
              {dpr.revisions.map((rev, ri) => (
                <div key={ri} style={{ marginBottom: 12, border: '1px solid #cffafe', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#ecfeff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0e7490' }}>
                      Revision #{ri + 1}
                      <span style={{ marginLeft: 8, fontWeight: 400, color: '#64748b', textTransform: 'capitalize' }}>({rev.triggeredBy?.replace(/_/g, ' ')})</span>
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{new Date(rev.appliedAt).toLocaleString('en-IN')}</span>
                  </div>
                  {(rev.items || []).map((it, ii) => (
                    <div key={ii} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', gap: 4, padding: '8px 12px', borderTop: '1px solid #cffafe', alignItems: 'center', fontSize: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>{it.name}{it.gradeKey ? ` (${it.gradeKey})` : ''}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Qty: {it.qty}</p>
                      </div>
                      <p style={{ margin: 0, color: '#6b7280', textAlign: 'center' }}>₹{Number(it.previousFinalPrice).toFixed(2)}</p>
                      <p style={{ margin: 0, fontWeight: 700, color: it.diff > 0 ? '#16a34a' : '#d97706', textAlign: 'center' }}>₹{Number(it.newFinalPrice).toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{it.diff > 0 ? '↓ Dropped' : '↑ Rose'}</p>
                      <p style={{ margin: 0, fontWeight: 700, textAlign: 'right', color: it.walletAction === 'credit' ? '#16a34a' : '#d97706' }}>
                        {it.walletAction === 'credit' ? '+' : '-'}{fmt(it.walletAmount)}
                      </p>
                    </div>
                  ))}
                  <div style={{ padding: '6px 12px', background: '#f8fafc', display: 'flex', gap: 12, fontSize: 11 }}>
                    {rev.totalCredit > 0 && <span style={{ color: '#16a34a', fontWeight: 700 }}>Credited: +{fmt(rev.totalCredit)}</span>}
                    {rev.totalDebit > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>Debited: -{fmt(rev.totalDebit)}</span>}
                    <span style={{ color: '#64748b', marginLeft: 'auto' }}>
                      Net: <strong style={{ color: (rev.netWalletChange ?? 0) >= 0 ? '#16a34a' : '#d97706' }}>
                        {(rev.netWalletChange ?? 0) >= 0 ? '+' : ''}{fmt(rev.netWalletChange)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          );
        })()}

        {/* ── ORDER TIMELINE ── */}
        <Card title="Order Timeline" titleColor="#374151">
          <button
            onClick={() => { loadTimeline(); setShowTimeline(v => !v); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              {showTimeline ? 'Hide Timeline' : 'View Timeline'} ({order.timeline?.length || 0} events)
            </span>
            {showTimeline ? <FiChevronUp size={16} style={{ color: '#6b7280' }} /> : <FiChevronDown size={16} style={{ color: '#6b7280' }} />}
          </button>

          {showTimeline && (
            <div style={{ marginTop: 14, paddingLeft: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }} />
              {(timeline !== null ? timeline : order.timeline || []).map((ev, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', left: -20, top: 3, width: 10, height: 10, borderRadius: '50%', background: '#065f46', border: '2px solid #fff', boxShadow: '0 0 0 2px #065f46' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{TIMELINE_LABELS[ev.event] || ev.event}</p>
                  {ev.description && <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0', lineHeight: 1.4 }}>{ev.description}</p>}
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{fmtTime(ev.timestamp)}</p>
                </div>
              ))}
              {!(timeline?.length || order.timeline?.length) && (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>No events yet.</p>
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
