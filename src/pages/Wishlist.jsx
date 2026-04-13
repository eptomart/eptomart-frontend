// ============================================
// WISHLIST PAGE
// ============================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Loader from '../components/common/Loader';
import { useCart } from '../context/CartContext';
import { formatINR, getDiscountPercent } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/wishlist');
      setWishlist(data.wishlist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWishlist(); }, []);

  const removeFromWishlist = async (productId) => {
    try {
      await api.post(`/wishlist/${productId}`);
      setWishlist(prev => prev.filter(p => p._id !== productId));
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  return (
    <>
      <Helmet><title>My Wishlist — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FiHeart className="text-red-400" /> My Wishlist
          {wishlist.length > 0 && <span className="text-primary-500">({wishlist.length})</span>}
        </h1>

        {loading ? (
          <Loader fullPage={false} />
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20">
            <FiHeart size={64} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 mb-6">Save products you love to buy later!</p>
            <Link to="/shop" className="btn-primary inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {wishlist.map(product => {
              const effectivePrice = product.discountPrice || product.price;
              const discount = getDiscountPercent(product.price, product.discountPrice);

              return (
                <div key={product._id} className="card group overflow-hidden">
                  {/* Image */}
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
                      <span className="absolute top-2 left-2 badge bg-green-500 text-white">{discount}% OFF</span>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="badge bg-gray-800 text-white text-sm">Out of Stock</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3">
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary-600 mb-2">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-gray-900">{formatINR(effectivePrice)}</span>
                      {discount > 0 && (
                        <span className="text-xs text-gray-400 line-through">{formatINR(product.price)}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <FiShoppingCart size={13} />
                        {product.stock === 0 ? 'Unavailable' : 'Add to Cart'}
                      </button>
                      <button
                        onClick={() => removeFromWishlist(product._id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
