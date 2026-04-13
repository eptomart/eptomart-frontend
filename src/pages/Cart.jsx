// ============================================
// CART PAGE
// ============================================
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';

export default function Cart() {
  const { cartItems, cartCount, subtotal, shipping, tax, total, updateQuantity, removeFromCart } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <>
      <Helmet><title>My Cart — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🛒 My Cart {cartCount > 0 && <span className="text-primary-500">({cartCount} items)</span>}
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <FiShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
            <p className="text-gray-400 mb-6">Add some products to get started!</p>
            <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
              Shop Now <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map(item => (
                <div key={item._id} className="card p-4 flex gap-4">
                  <Link to={`/product/${item.slug}`}>
                    <img
                      src={item.image || 'https://via.placeholder.com/80'}
                      alt={item.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.slug}`} className="font-medium text-gray-800 hover:text-primary-600 line-clamp-2 text-sm sm:text-base">
                      {item.name}
                    </Link>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-gray-900">{formatINR(item.price)}</span>
                      {item.originalPrice > item.price && (
                        <span className="text-xs text-gray-400 line-through">{formatINR(item.originalPrice)}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-green-50 hover:text-green-500 transition-colors disabled:opacity-50"
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary-600">{formatINR(item.price * item.quantity)}</span>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-20">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                    <span className="font-medium">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className={shipping === 0 ? 'text-green-500 font-medium' : 'font-medium'}>
                      {shipping === 0 ? 'FREE 🎉' : formatINR(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (5%)</span>
                    <span className="font-medium">{formatINR(tax)}</span>
                  </div>
                  {shipping > 0 && (
                    <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
                      💡 Add ₹{formatINR(499 - subtotal).replace('₹', '')} more for FREE delivery!
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mb-6">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">{formatINR(total)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Inclusive of all taxes</p>
                </div>

                <button onClick={handleCheckout} className="btn-primary w-full flex items-center justify-center gap-2">
                  Proceed to Checkout <FiArrowRight />
                </button>

                <Link to="/shop" className="block text-center text-sm text-primary-500 hover:underline mt-3">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
