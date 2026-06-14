// ============================================
// PRODUCT CARD — Compact (Zepto-style)
// 20% smaller: aspect-[5/4] image, p-2 padding, round + button
// ============================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatINR, getDiscountPercent } from '../../utils/currency';
import { imgCard } from '../../utils/cloudinary';

export default function ProductCard({ product }) {
  const { addToCart, updateQuantity, removeFromCart, cartItems, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [heartAnim, setHeartAnim] = useState(false);
  const [adding,    setAdding]    = useState(false);

  const { name, slug, price, discountPrice, images, stock } = product;
  const inCart      = isInCart(product._id);
  const cartItem    = cartItems.find(i => i._id === product._id);
  const cartQty     = cartItem?.quantity || 0;
  const cartItemId  = cartItem?.cartItemId || null;
  const inWishlist  = isInWishlist(product._id);
  const discount    = getDiscountPercent(price, discountPrice);
  const pricedVariants  = (product.variants || []).filter(v => v.price != null && v.price > 0);
  const hasVariants     = product.variants?.length > 0;
  const lowestVarPrice  = pricedVariants.length > 0 ? Math.min(...pricedVariants.map(v => v.price)) : null;
  const effectivePrice  = discountPrice || price;
  const mainImage       = imgCard(images?.find(i => i.isDefault)?.url || images?.[0]?.url) || 'https://via.placeholder.com/300x300?text=No+Image';
  const isUnavailable   = product.isActive === false;
  const isOutOfStock    = stock === 0;
  const canAdd          = !isUnavailable && !isOutOfStock;

  const handleWishlist = (e) => {
    e.preventDefault(); e.stopPropagation();
    setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400);
    toggleWishlist(product);
  };

  const handleAdd = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (hasVariants) { navigate(`/product/${slug}`); return; }
    if (!canAdd) return;
    setAdding(true);
    addToCart(product);
    setTimeout(() => setAdding(false), 600);
  };

  const handleQty = (e, delta) => {
    e.preventDefault(); e.stopPropagation();
    if (!cartItemId) return;
    const newQty = cartQty + delta;
    if (newQty <= 0) removeFromCart(cartItemId);
    else updateQuantity(cartItemId, newQty);
  };

  return (
    <div className={`card-lift group bg-white rounded-2xl overflow-hidden relative flex flex-col ${isUnavailable ? 'opacity-60 grayscale' : ''}`}
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

      {/* ── Image ── */}
      <Link to={`/product/${slug}`} className="block relative overflow-hidden">
        <div className="aspect-[5/4] bg-gray-50 overflow-hidden">
          <img
            src={mainImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
            loading="lazy"
          />
        </div>

        {/* Discount badge */}
        {discount > 0 && !isUnavailable && !isOutOfStock && (
          <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-green-500 text-white shadow-sm leading-tight">
            {discount}% OFF
          </span>
        )}
        {isUnavailable && (
          <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold bg-gray-600 text-white leading-tight">Unavailable</span>
        )}
        {!isUnavailable && isOutOfStock && (
          <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold bg-gray-500 text-white leading-tight">Out of Stock</span>
        )}
        {canAdd && stock > 0 && stock <= 5 && (
          <span className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500 text-white animate-pulse leading-tight">Only {stock} left</span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow backdrop-blur-sm transition-all duration-200
            ${heartAnim ? 'scale-125' : 'scale-100'}
            ${inWishlist ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}
        >
          <FiHeart size={12} style={{ fill: inWishlist ? 'currentColor' : 'none' }} />
        </button>
      </Link>

      {/* ── Info ── */}
      <div className="p-2 flex flex-col flex-1">
        <Link to={`/product/${slug}`}>
          <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-primary-600 transition-colors">{name}</h3>
        </Link>

        {product.unitLabel && (
          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{product.unitLabel}</p>
        )}

        {/* Price row + Add button */}
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            {hasVariants && lowestVarPrice ? (
              <p className="font-bold text-gray-900 text-sm leading-none">From {formatINR(lowestVarPrice)}</p>
            ) : (
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-bold text-gray-900 text-sm leading-none">{formatINR(effectivePrice)}</span>
                {discount > 0 && (
                  <span className="text-[9px] text-gray-400 line-through leading-none">{formatINR(price)}</span>
                )}
              </div>
            )}
          </div>

          {/* Qty controls (in-cart) or Add button */}
          {inCart && canAdd && !hasVariants ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => handleQty(e, -1)}
                className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm leading-none active:scale-90 transition"
              >
                {cartQty === 1 ? <FiTrash2 size={9} /> : '−'}
              </button>
              <span className="text-xs font-bold text-green-700 w-5 text-center select-none">{cartQty}</span>
              <button
                onClick={(e) => handleQty(e, +1)}
                disabled={cartQty >= stock}
                className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm leading-none active:scale-90 transition disabled:opacity-40"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!hasVariants && !canAdd}
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-base leading-none shadow-sm transition-all
                ${adding ? 'scale-90 bg-green-700' : 'active:scale-90'}
                ${(!hasVariants && !canAdd) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700'}`}
              style={canAdd || hasVariants ? { boxShadow: '0 3px 10px rgba(22,163,74,0.35)' } : {}}
            >
              {adding
                ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : hasVariants
                  ? <FiShoppingCart size={12} />
                  : isOutOfStock
                    ? '×'
                    : '+'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
