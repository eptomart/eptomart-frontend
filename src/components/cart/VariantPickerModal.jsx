// ============================================
// VARIANT PICKER MODAL
// Fetches live variants for a product and lets the user switch.
// On selection the caller receives (variant, variantLabel).
// ============================================
import React, { useEffect, useState } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';

export default function VariantPickerModal({ item, onSelect, onClose }) {
  const [variants, setVariants] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    if (!item?.slug && !item?._id) { setLoading(false); setError(true); return; }
    const endpoint = item.slug ? `/products/${item.slug}` : `/products/id/${item._id}`;
    api.get(endpoint)
      .then(({ data }) => {
        const vs = data.product?.variants || data.variants || [];
        setVariants(vs);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [item?.slug, item?._id]);

  // Must match ProductPage's variantLabel format exactly:
  // [label, value, unit].filter(Boolean).join(' ')
  const buildLabel = (v) =>
    [v.label, v.value, v.unit].filter(Boolean).join(' ');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Select Variant</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <FiLoader size={18} className="animate-spin" />
              <span className="text-sm">Loading options…</span>
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-6">
              Couldn't load variants. Please try again.
            </p>
          ) : variants.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">
              This product has no variants to switch.
            </p>
          ) : (
            <div className="space-y-2.5">
              {variants.map((v, i) => {
                const vLabel     = buildLabel(v);
                const isSelected = vLabel === item?.variantLabel;
                const outOfStock = (v.stock ?? 1) === 0;
                return (
                  <button
                    key={v._id || i}
                    onClick={() => !outOfStock && !isSelected && onSelect(v, vLabel)}
                    disabled={outOfStock || isSelected}
                    className={`w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all text-sm
                      ${isSelected
                        ? 'border-primary-500 bg-orange-50 cursor-default'
                        : outOfStock
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-orange-50/40 cursor-pointer'
                      }`}
                  >
                    <span className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                      {vLabel || 'Default'}
                      {isSelected && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-primary-500 text-white px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-bold text-gray-800 text-sm">
                      {formatINR(v.price)}
                      {outOfStock && (
                        <span className="ml-1.5 text-[10px] text-red-400 font-normal">Out of stock</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
