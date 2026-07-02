// ============================================
// UNIFIED PAYMENT SUMMARY
// Displays paymentSummary computed by the backend
// calculation service — never computes locally.
// ============================================
import React from 'react';
import { formatINR } from '../../utils/currency';

function Row({ label, value, negative, bold }) {
  if (value == null) return null;
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-gray-800 pt-1.5 border-t border-gray-200' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span className={negative ? 'text-green-600' : ''}>{negative ? '− ' : ''}{formatINR(Math.abs(value))}</span>
    </div>
  );
}

export default function PaymentSummary({ summary, paymentMethod }) {
  if (!summary) return null;
  const s = summary;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">
        Payment Summary
        {paymentMethod && (
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
            {paymentMethod}
          </span>
        )}
      </h3>
      <div className="space-y-1.5 text-xs">
        <Row label="Original Order Value" value={s.originalOrderValue} />
        {s.refundAmount > 0 && <Row label="Refund (declined items)" value={s.refundAmount} negative />}
        {s.platformFee > 0 && <Row label="Platform Fee" value={s.platformFee} />}
        {s.packingFee > 0 && <Row label="Packing & Logistics Fee" value={s.packingFee} />}
        {s.logisticsFee > 0 && <Row label="Logistics Fee" value={s.logisticsFee} />}
        {s.deliveryCharge > 0 && <Row label="Delivery Charge" value={s.deliveryCharge} />}
        {s.deliveryCharge === 0 && <div className="flex justify-between text-gray-600"><span>Delivery Charge</span><span className="text-green-600 font-semibold">FREE</span></div>}
        {s.gst > 0 && <Row label="GST" value={s.gst} />}
        {s.couponDiscount > 0 && <Row label="Coupon Discount" value={s.couponDiscount} negative />}
        {s.walletAdjustment > 0 && <Row label="Wallet Adjustment" value={s.walletAdjustment} negative />}
        <Row label="Final Amount" value={s.finalPaidAmount} bold />
      </div>
      {(s.notes || []).map((n, i) => (
        <p key={i} className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">{n}</p>
      ))}
    </div>
  );
}
