// ============================================
// WISHLIST PAGE — Smart wishlist with move to cart
// ============================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiHeart, FiShoppingCart, FiTrash2, FiShare2, FiColumns } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Loader from '../components/common/Loader';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { formatINR, getDiscountPercent } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist } = useWishlist();
  const { addToCompare } = useCompare();

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/wishlist');
      setWishlist(data.wishlist || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWishlist(); }, []);

  const removeFromWishlist = async (product) => {
    await toggleWishlist(product);
    setWishlist(prev => prev.filter(p => p._id !== product._id));
  };

  const addAllToCart = () => {
    const inStock = wishlist.filter(p => p.stock > 0);
    if (inStock.length === 0) return toast.error('No in-stock items to add');
    inStock.forEach(p => addToCart(p));
    toast.success(`${inStock.length} items added to cart! 🛒`);
  };

  const clearWishlist = async () => {
    try {
      await api.delete('/wishlist');
      setWishlist([]);
      toast.success('Wishlist cleared');
    } catch (_) {
      toast.error('Failed to clear wishlist');
    }
  };

  const inStockCount = wishlist.filter(p => p.stock > 0).length;

  return (
    <>
      <Helmet><title>My Wishlist — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiHeart className="text-red-400" style={{ fill: '#f87171' }} />
            My Wishlist
            {wishlist.length > 0 && <span className="text-primary-500">({wishlist.length})</span>}
          </h1>

          {wishlist.length > 0 && (
            <div className="flex items-center gap-2">
              {inStockCount > 0 && (
                <button onClick={addAllToCart}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95">
                  <FiShoppingCart size={15} />
                  Add All to Cart ({inStockCount})
                </button>
              )}
              <button onClick={clearWishlist}
                className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all border border-red-200">
                Clear All
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <Loader fullPage={false} />
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">💝</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 mb-6">Save products you love to buy later. Tap the ❤️ on any product!</p>
            <Link to="/shop" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all inline-block">
              Explore Products
            </Link>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-orange-50 rounded-xl text-sm text-gray-600 flex-wrap gap-y-2">
              <span>❤️ <strong>{wishlist.length}</strong> saved</span>
              <span>✅ <strong>{inStockCount}</strong> in stock</span>
              {wishlist.length - inStockCount > 0 && <span>⏳ <strong>{wishlist.length - inStockCount}</strong> out of stock</span>}
              <span className="ml-auto text-primary-600 font-medium">
                Total value: {formatINR(wishlist.reduce((sum, p) => sum + (p.discountPrice || p.price), 0))}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {wishlist.map(product => {
                const effectivePrice = product.discountPrice || product.price;
                const discount = getDiscountPercent(product.price, product.discountPrice);
                const inCart = isInCart(product._id);

                return (
                  <div key={product._id} className="card group overflow-hidden">
                    <Link to={`/product/${product.slug}`} className="block relative">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        <img
                          src={product.images?.[0]?.url || 'https://via.placeholder.com/300'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold bg-green-500 text-white">{discount}% OFF</span>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full font-medium">Out of Stock</span>
                        </div>
                      )}
                      {product.stock > 0 && product.stock <= 5 && (
                        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white">Only {product.stock} left</span>
                      )}
                    </Link>

                    <div className="p-3">
                      <Link to={`/product/${product.slug}`}>
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary-600 mb-2 leading-snug">
                          {product.name}
                        </h3>
                      </Link>

                      {product.ratings?.count > 0 && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                            ⭐ {product.ratings.average?.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">({product.ratings.count})</span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="font-bold text-gray-900">{formatINR(effectivePrice)}</span>
                        {discount > 0 && <span className="text-xs text-gray-400 line-through">{formatINR(product.price)}</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95
                            ${inCart ? 'bg-green-500 text-white' : product.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 text-white'}`}
                        >
                          <FiShoppingCart size={12} />
                          {product.stock === 0 ? 'N/A' : inCart ? '✓' : 'Cart'}
                        </button>
                        <button
                          onClick={() => addToCompare(product)}
                          title="Add to compare"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-xl transition-all"
                        >
                          <FiColumns size={13} />
                        </button>
                        <button
                          onClick={() => removeFromWishlist(product)}
                          title="Remove from wishlist"
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-all"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
