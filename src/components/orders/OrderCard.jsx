// ============================================
// UNIFIED ORDER CARD — works for every vertical
// Data comes from /api/v2/orders (canonical DTO)
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight, FiCalendar, FiPackage } from 'react-icons/fi';
import { formatINR, formatDate } from '../../utils/currency';

// Canonical status → badge colors
const STATUS_COLORS = {
  payment_pending:          'bg-gray-100 text-gray-600',
  placed:                   'bg-blue-100 text-blue-700',
  seller_review:            'bg-yellow-100 text-yellow-700',
  changes_pending_approval: 'bg-orange-100 text-orange-700',
  confirmed:                'bg-green-100 text-green-700',
  packing:                  'bg-purple-100 text-purple-700',
  packed:                   'bg-purple-100 text-purple-800',
  out_for_delivery:         'bg-indigo-100 text-indigo-700',
  delivered:                'bg-green-200 text-green-800',
  cancelled:                'bg-red-100 text-red-700',
  closed:                   'bg-gray-200 text-gray-700',
  returned:                 'bg-red-100 text-red-700',
  refund_processing:        'bg-cyan-100 text-cyan-700',
  refunded:                 'bg-cyan-100 text-cyan-800',
};

const PAYMENT_LABELS = {
  pending: 'Payment Pending', paid: 'Paid', partially_paid: 'Partially Paid',
  failed: 'Payment Failed', refunded: 'Refunded',
};

export default function OrderCard({ order }) {
  const vm = order.verticalMeta || {};
  const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700';

  return (
    <Link to={order.detailUrl}
      className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-300 transition-all overflow-hidden"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ background: `${vm.color}12` }}>
        <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: vm.color }}>
          <span>{vm.emoji}</span> {vm.name}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
          {order.statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between p-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono font-bold text-gray-800 text-sm truncate">#{order.orderId}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.placedAt)}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FiPackage size={11} /> {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
            </span>
            {order.paymentStatus && (
              <span className={order.paymentStatus === 'paid' ? 'text-green-600 font-semibold' : ''}>
                {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                {order.paymentMethod ? ` · ${String(order.paymentMethod).toUpperCase()}` : ''}
              </span>
            )}
            {order.deliveryDate && (
              <span className="flex items-center gap-1">
                <FiCalendar size={11} /> {formatDate(order.deliveryDate)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {order.hasDeclinedItems && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Some items updated — refund applies
              </span>
            )}
            {['initiated', 'pending', 'processing'].includes(order.refundStatus) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                💰 Refund Initiated
              </span>
            )}
            {order.refundStatus === 'completed' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                💰 Refund Completed
              </span>
            )}
            {['failed', 'manual_required'].includes(order.refundStatus) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                🔄 Refund Processing
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="font-bold" style={{ color: vm.color }}>{formatINR(order.totalAmount)}</span>
          <FiChevronRight size={16} className="text-gray-300" />
        </div>
      </div>
    </Link>
  );
}
