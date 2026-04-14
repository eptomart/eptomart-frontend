// ============================================
// COMPARE PAGE — Side-by-side product comparison
// ============================================
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiX, FiShoppingCart, FiHeart, FiStar, FiCheck, FiMinus } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatINR, getDiscountPercent } from '../utils/currency';

const Row = ({ label, values, highlight }) => (
  <tr className={highlight ? 'bg-orange-50' : 'hover:bg-gray-50 transition-colors'}>
    <td className="py-3 px-4 text-sm font-medium text-gray-600 w-32 border-r border-gray-100">{label}</td>
    {values.map((val, i) => (
      <td key={i} className="py-3 px-4 text-sm text-gray-800 text-center border-r border-gray-100 last:border-r-0">
        {val}
      </td>
    ))}
    {/* empty columns if fewer than 3 products */}
    {Array.from({ length: 3 - values.length }).map((_, i) => (
      <td key={`empty-${i}`} className="py-3 px-4 text-center text-gray-300 border-r border-gray-100 last:border-r-0">—</td>
    ))}
  </tr>
);

export default function Compare() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  if (compareList.length === 0) {
    return (
      <>
        <Helmet><title>Compare Products — Eptomart</title></Helmet>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-6xl mb-4">⚖️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nothing to compare</h1>
          <p className="text-gray-500 mb-6">Add products using the compare button on product cards</p>
          <button onClick={() => navigate('/shop')} className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all">
            Browse Products
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const getValue = (product, key) => {
    if (!product) return '—';
    const val = key.split('.').reduce((obj, k) => obj?.[k], product);
    return val ?? '—';
  };

  return (
    <>
      <Helmet><title>Compare Products — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ⚖️ Compare Products
            <span className="text-sm font-normal text-gray-500 ml-1">({compareList.length} products)</span>
          </h1>
          <button onClick={clearCompare} className="text-sm text-red-500 hover:underline">Clear all</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-4 text-left text-sm font-semibold text-gray-600 w-32 border-r border-gray-200">Product</th>
                {compareList.map(product => (
                  <th key={product._id} className="py-4 px-4 border-r border-gray-200 last:border-r-0">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(product._id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10"
                      >
                        <FiX size={12} />
                      </button>
                      <Link to={`/product/${product.slug}`}>
                        <img
                          src={product.images?.[0]?.url}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-xl mx-auto mb-2 hover:opacity-90 transition-opacity"
                        />
                        <p className="text-sm font-semibold text-gray-800 text-center line-clamp-2 hover:text-primary-600 transition-colors">
                          {product.name}
                        </p>
                      </Link>
                    </div>
                  </th>
                ))}
                {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                  <th key={i} className="py-4 px-4 border-r border-gray-200 last:border-r-0">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl text-gray-300">+</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Add product</p>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              <Row label="Price" highlight
                values={compareList.map(p => (
                  <div>
                    <p className="font-bold text-primary-600 text-base">{formatINR(p.discountPrice || p.price)}</p>
                    {p.discountPrice && <p className="text-xs text-gray-400 line-through">{formatINR(p.price)}</p>}
                    {p.discountPrice && <p className="text-xs text-green-600 font-medium">{getDiscountPercent(p.price, p.discountPrice)}% off</p>}
                  </div>
                ))}
              />

              <Row label="Rating"
                values={compareList.map(p => p.ratings?.count > 0 ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      {p.ratings.average?.toFixed(1)} <FiStar size={9} style={{ fill: 'white' }} />
                    </span>
                    <span className="text-xs text-gray-400">({p.ratings.count})</span>
                  </div>
                ) : <span className="text-gray-400 text-xs">No ratings</span>)}
              />

              <Row label="Availability"
                values={compareList.map(p => p.stock > 0
                  ? <span className="text-green-600 font-medium flex items-center justify-center gap-1"><FiCheck size={14} /> In Stock ({p.stock})</span>
                  : <span className="text-red-500 font-medium">Out of Stock</span>
                )}
              />

              <Row label="Category"
                values={compareList.map(p => <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{p.category?.name || '—'}</span>)}
              />

              <Row label="Brand"
                values={compareList.map(p => p.brand || <span className="text-gray-400">—</span>)}
              />

              <Row label="Cash on Delivery"
                values={compareList.map(p => p.codAvailable !== false
                  ? <span className="text-green-600 flex items-center justify-center gap-1"><FiCheck size={14} /> Available</span>
                  : <span className="text-red-500 flex items-center justify-center gap-1"><FiMinus size={14} /> Not Available</span>
                )}
              />

              {/* Actions row */}
              <tr className="bg-gray-50">
                <td className="py-4 px-4 text-sm font-medium text-gray-600 border-r border-gray-100">Actions</td>
                {compareList.map(product => (
                  <td key={product._id} className="py-4 px-4 border-r border-gray-100 last:border-r-0">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all w-full
                          ${isInCart(product._id) ? 'bg-green-500 text-white' : product.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 text-white'}`}
                      >
                        <FiShoppingCart size={14} />
                        {product.stock === 0 ? 'Out of Stock' : isInCart(product._id) ? 'In Cart ✓' : 'Add to Cart'}
                      </button>
                      <button
                        onClick={() => toggleWishlist(product)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all w-full
                          ${isInWishlist(product._id) ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
                      >
                        <FiHeart size={14} style={{ fill: isInWishlist(product._id) ? 'currentColor' : 'none' }} />
                        {isInWishlist(product._id) ? 'Wishlisted' : 'Wishlist'}
                      </button>
                    </div>
                  </td>
                ))}
                {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                  <td key={i} className="py-4 px-4 border-r border-gray-100 last:border-r-0" />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Hover over any product card and click <strong>⚖️</strong> to add more products to compare
        </p>
      </main>

      <Footer />
    </>
  );
}
