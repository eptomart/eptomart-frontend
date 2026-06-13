// ============================================
// COMPARE BAR — Floating bottom widget
// ============================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiColumns } from 'react-icons/fi';
import { useCompare } from '../../context/CompareContext';

export default function CompareBar() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();

  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-primary-500 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-primary-600 font-semibold text-sm flex-shrink-0">
          <FiColumns size={18} />
          <span>Compare ({compareList.length}/3)</span>
        </div>

        <div className="flex items-center gap-3 flex-1 overflow-x-auto">
          {compareList.map(product => (
            <div key={product._id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-shrink-0 min-w-0">
              <img
                src={product.images?.[0]?.url}
                alt={product.name}
                className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{product.name}</p>
                <p className="text-xs text-primary-600 font-bold">
                  ₹{((product.discountPrice || product.price) / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => removeFromCompare(product._id)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-1"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 3 - compareList.length }).map((_, i) => (
            <div key={i} className="flex items-center justify-center w-36 h-14 border-2 border-dashed border-gray-200 rounded-xl flex-shrink-0">
              <p className="text-xs text-gray-400">+ Add product</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {compareList.length >= 2 && (
            <button
              onClick={() => navigate('/compare')}
              className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
            >
              Compare Now
            </button>
          )}
          <button
            onClick={clearCompare}
            className="text-gray-500 hover:text-red-500 text-sm px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
