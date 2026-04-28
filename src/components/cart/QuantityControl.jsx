import React from 'react';
import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';

/**
 * QuantityControl
 * @prop {number}  quantity       - current quantity
 * @prop {number}  min            - minimum (pass 0 to allow removal)
 * @prop {number}  max            - maximum (stock)
 * @prop {Function} onChange      - called with new quantity
 * @prop {boolean} loading        - show spinner
 * @prop {string}  size           - 'sm' | 'md'
 * @prop {boolean} showTrashAtMin - show 🗑 icon when quantity === min+1 (about to remove)
 */
export default function QuantityControl({
  quantity,
  min = 1,
  max = 999,
  onChange,
  loading = false,
  size = 'md',
  showTrashAtMin = false,
}) {
  const sm = size === 'sm';

  // When min=0 and qty=1, the next decrement removes the item — show trash icon
  const atRemoveThreshold = showTrashAtMin && min === 0 && quantity === 1;

  return (
    <div className={`flex items-center border border-gray-200 rounded-xl overflow-hidden ${sm ? 'h-8' : 'h-10'}`}>
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={loading || quantity <= min}
        title={atRemoveThreshold ? 'Remove from cart' : 'Decrease'}
        className={`flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          ${atRemoveThreshold
            ? 'bg-red-50 hover:bg-red-100 text-red-500'
            : 'bg-gray-50 hover:bg-gray-100'}
          ${sm ? 'w-8 text-xs' : 'w-10'}`}
      >
        {atRemoveThreshold
          ? <FiTrash2 size={sm ? 11 : 13} />
          : <FiMinus size={sm ? 12 : 14} />}
      </button>

      <span className={`border-x border-gray-200 flex items-center justify-center font-semibold text-gray-800 bg-white
        ${sm ? 'w-8 text-sm' : 'w-12 text-base'}`}>
        {loading
          ? <span className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          : quantity}
      </span>

      <button
        onClick={() => onChange(quantity + 1)}
        disabled={loading || quantity >= max}
        title="Increase"
        className={`flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          ${sm ? 'w-8 text-xs' : 'w-10'}`}
      >
        <FiPlus size={sm ? 12 : 14} />
      </button>
    </div>
  );
}
