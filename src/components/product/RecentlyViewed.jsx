// ============================================
// RECENTLY VIEWED — horizontal scroll section
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiX } from 'react-icons/fi';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { formatINR } from '../../utils/currency';

export default function RecentlyViewed({ excludeSlug }) {
  const { items, clear } = useRecentlyViewed();

  const visible = excludeSlug
    ? items.filter(p => p.slug !== excludeSlug)
    : items;

  if (visible.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FiClock size={18} className="text-primary-500" />
          Recently Viewed
        </h2>
        <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <FiX size={12} /> Clear
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {visible.map(product => (
          <Link
            key={product._id}
            to={`/product/${product.slug}`}
            className="flex-shrink-0 w-36 card overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div className="aspect-square bg-gray-50 overflow-hidden">
              <img
                src={product.image || 'https://via.placeholder.com/140'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-1">
                {product.name}
              </p>
              <p className="text-xs font-bold text-primary-600">{formatINR(product.price)}</p>
              {product.rating > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">⭐ {product.rating?.toFixed(1)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
