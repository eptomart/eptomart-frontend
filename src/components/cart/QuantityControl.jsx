import React from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';

export default function QuantityControl({ quantity, min = 1, max = 999, onChange, loading = false, size = 'md' }) {
  const sm = size === 'sm';
  return (
    <div className={`flex items-center border border-gray-200 rounded-xl overflow-hidden ${sm ? 'h-8' : 'h-10'}`}>
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={loading || quantity <= min}
        className={`flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          ${sm ? 'w-8 text-xs' : 'w-10'}`}
      >
        <FiMinus size={sm ? 12 : 14} />
      </button>
      <span className={`border-x border-gray-200 flex items-center justify-center font-semibold text-gray-800 bg-white
        ${sm ? 'w-8 text-sm' : 'w-12 text-base'}`}>
        {loading ? <span className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /> : quantity}
      </span>
      <button
        onClick={() => onChange(quantity + 1)}
        disabled={loading || quantity >= max}
        className={`flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          ${sm ? 'w-8 text-xs' : 'w-10'}`}
      >
        <FiPlus size={sm ? 12 : 14} />
      </button>
    </div>
  );
}
