// ============================================
// PRODUCT CARD — Grid Item
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { formatINR, getDiscountPercent } from '../../utils/currency';

export default function ProductCard({ product }) {
  const { addToCart, isInCart } = useCart();
  const { name, slug, price, discountPrice, images, ratings, stock, category } = product;

  const inCart = isInCart(product._id);
  const discount = getDiscountPercent(price, discountPrice);
  const effectivePrice = discountPrice || price;
  const mainImage = images?.[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image';

  return (
    <div className="card group overflow-hidden">
      {/* Image */}
      <Link to={`/product/${slug}`} className="block relative overflow-hidden">
        <div className="aspect-square bg-gray-50 overflow-hidden">
          <img
            src={mainImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-green-500 text-white">{discount}% OFF</span>
          )}
          {stock === 0 && (
            <span className="badge bg-gray-500 text-white">Out of Stock</span>
          )}
        </div>

        {/* Wishlist */}
        <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400">
          <FiHeart size={15} />
        </button>
      </Link>

      {/* Info */}
      <div className="p-3">
        {category?.name && (
          <p className="text-xs text-gray-400 mb-1">{category.name}</p>
        )}

        <Link to={`/product/${slug}`}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 hover:text-primary-600 transition-colors">
            {name}
          </h3>
        </Link>

        {/* Ratings */}
        {ratings?.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-0.5 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
              <span>{ratings.average}</span>
              <FiStar size={10} />
            </div>
            <span className="text-xs text-gray-400">({ratings.count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-gray-900">{formatINR(effectivePrice)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatINR(price)}</span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={(e) => { e.preventDefault(); addToCart(product); }}
          disabled={stock === 0}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95
            ${inCart
              ? 'bg-green-500 text-white'
              : stock === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            }`}
        >
          <FiShoppingCart size={15} />
          {stock === 0 ? 'Out of Stock' : inCart ? 'In Cart ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
