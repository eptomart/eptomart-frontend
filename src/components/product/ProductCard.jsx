// ============================================
// PRODUCT CARD — Wishlist + Compare + Smart UX
// ============================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar, FiColumns, FiEye } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCompare } from '../../context/CompareContext';
import { formatINR, getDiscountPercent } from '../../utils/currency';
import { imgCard } from '../../utils/cloudinary';

export default function ProductCard({ product }) {
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const navigate = useNavigate();
  const [heartAnim, setHeartAnim] = useState(false);
  const [adding,    setAdding]    = useState(false);

  const { name, slug, price, discountPrice, images, ratings, stock, category, codAvailable, seller, location } = product;
  const sellerCity = seller?.address?.city || seller?.city || location?.city || null;
  const inCart = isInCart(product._id);
  const inWishlist = isInWishlist(product._id);
  const inCompare = isInCompare(product._id);
  const discount = getDiscountPercent(price, discountPrice);
  const effectivePrice = discountPrice || price;
  const mainImage = imgCard(images?.[0]?.url) || 'https://via.placeholder.com/300x300?text=No+Image';

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    toggleWishlist(product);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCompare(product);
  };

  return (
    <div className="card group overflow-hidden relative">
      <Link to={`/product/${slug}`} className="block relative overflow-hidden">
        <div className="aspect-square bg-gray-50 overflow-hidden">
          <img src={mainImage} alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy" />
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-500 text-white">{discount}% OFF</span>}
          {stock === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500 text-white">Out of Stock</span>}
          {stock > 0 && stock <= 5 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white">Only {stock} left!</span>}
          {stock > 5 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{stock} in stock</span>}
          {codAvailable === false && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">Online only</span>}
        </div>

        {/* Hover action buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          <button onClick={handleWishlist} title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${heartAnim ? 'scale-125' : 'scale-100'}
              ${inWishlist ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:text-red-500'}`}>
            <FiHeart size={15} style={{ fill: inWishlist ? 'currentColor' : 'none' }} />
          </button>
          <button onClick={handleCompare} title="Compare product"
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all
              ${inCompare ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 hover:text-blue-500'}`}>
            <FiColumns size={15} />
          </button>
          <button onClick={(e) => { e.preventDefault(); navigate(`/product/${slug}`); }} title="Quick view"
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-primary-500 transition-all">
            <FiEye size={15} />
          </button>
        </div>
      </Link>

      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          {category?.name && <p className="text-xs text-gray-400 uppercase tracking-wide">{category.name}</p>}
          {sellerCity && <p className="text-xs text-gray-400 flex items-center gap-0.5">📍{sellerCity}</p>}
        </div>

        <Link to={`/product/${slug}`}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 hover:text-primary-600 transition-colors leading-snug">{name}</h3>
        </Link>

        {ratings?.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-0.5 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
              <span>{ratings.average?.toFixed(1)}</span>
              <FiStar size={9} style={{ fill: 'currentColor' }} />
            </div>
            <span className="text-xs text-gray-400">({ratings.count})</span>
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-bold text-gray-900 text-base">{formatINR(effectivePrice)}</span>
          {discount > 0 && <span className="text-xs text-gray-400 line-through">{formatINR(price)}</span>}
        </div>

        {/* Variant chips — shown on card if product has options */}
        {product.variants?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.variants.slice(0, 3).map((v, i) => {
              const label = [v.label, v.value ? `${v.value}${v.unit || ''}` : null].filter(Boolean).join(' ');
              return (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-orange-50 border border-orange-100 text-orange-700 rounded font-medium leading-tight">
                  {label}
                </span>
              );
            })}
            {product.variants.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium leading-tight">
                +{product.variants.length - 3} more
              </span>
            )}
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Products with variants must be configured on the product page
            if (product.variants?.length > 0) {
              navigate(`/product/${slug}`);
              return;
            }
            if (adding || inCart) { addToCart(product); return; }
            setAdding(true);
            addToCart(product);
            setTimeout(() => setAdding(false), 800);
          }}
          disabled={stock === 0}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all
            ${adding ? 'scale-95 opacity-80' : 'active:scale-95'}
            ${inCart ? 'bg-green-500 text-white' : stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : adding ? 'bg-primary-600 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white'}`}
        >
          {adding
            ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adding…</>
            : <><FiShoppingCart size={15} />{stock === 0 ? 'Out of Stock' : inCart ? 'In Cart ✓' : product.variants?.length > 0 ? 'Select Options' : 'Add to Cart'}</>
          }
        </button>
      </div>
    </div>
  );
}
