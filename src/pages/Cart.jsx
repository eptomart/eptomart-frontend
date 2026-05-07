// ============================================
// CART PAGE — with GST breakdown + quantity controls
// ============================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiTrash2, FiShoppingBag, FiTruck, FiEdit2 } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import QuantityControl from '../components/cart/QuantityControl';
import VariantPickerModal from '../components/cart/VariantPickerModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Flat shipping thresholds (must match CartContext)
const FREE_SHIPPING_THRESHOLD = 999; // ₹999+  → free
const LIGHT_SHIPPING = 49;            // ≤500g  → ₹49
const HEAVY_SHIPPING = 149;           // >500g  → ₹149

export default function Cart() {
  const { enrichedItems, sellerGroups, cartCount, subtotalExGst, gstTotal, shipping, total, updateQuantity, removeFromCart, updateItemVariant, isCodBlocked, codBlockedItems } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate  = useNavigate();
  const [updating, setUpdating] = useState({});
  const [variantPickerItem, setVariantPickerItem] = useState(null);

  const cartGrandExShipping = parseFloat((subtotalExGst + gstTotal).toFixed(2));

  const handleQtyChange = async (cartItemId, newQty) => {
    setUpdating(p => ({ ...p, [cartItemId]: true }));
    updateQuantity(cartItemId, newQty);
    setTimeout(() => setUpdating(p => ({ ...p, [cartItemId]: false })), 300);
  };

  const handleVariantSelect = (variant, vLabel) => {
    if (!variantPickerItem) return;
    updateItemVariant(variantPickerItem.cartItemId, variant.price, vLabel, variant.stock);
    setVariantPickerItem(null);
  };

  if (cartCount === 0) {
    return (
      <>
        <Helmet><title>Cart — Eptomart</title></Helmet>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Looks like you haven't added anything yet.</p>
          <Link to="/shop" className="btn-primary">Start Shopping</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet><title>{`Cart (${cartCount}) — Eptomart`}</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          My Cart <span className="text-primary-500">({cartCount} items)</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Cart Items (grouped by seller) ─────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {Object.entries(sellerGroups).map(([key, group]) => (
              <div key={key} className="card overflow-hidden">
                {/* Seller header */}
                {group.seller && (
                  <div className="bg-orange-50 px-4 py-2.5 border-b border-orange-100">
                    <p className="text-sm font-semibold text-gray-700">
                      🏪 {group.seller.businessName || 'Seller'}
                      {group.seller.city && <span className="font-normal text-gray-500 ml-1">· {group.seller.city}</span>}
                    </p>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {group.items.map(item => (
                    <div key={item.cartItemId} className="p-4 flex gap-4">
                      <Link to={`/product/${item.slug}`} className="flex-shrink-0">
                        <img src={item.image} alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl bg-gray-100" />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.slug}`}>
                          <h3 className="text-sm font-medium text-gray-800 hover:text-primary-600 line-clamp-2 mb-1">
                            {item.name}
                          </h3>
                        </Link>

                        {/* Variant label + change button */}
                        {item.variantLabel && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">
                              {item.variantLabel}
                            </span>
                            <button
                              onClick={() => setVariantPickerItem(item)}
                              className="flex items-center gap-0.5 text-xs text-primary-500 hover:text-primary-700 transition-colors"
                            >
                              <FiEdit2 size={10} /> Change
                            </button>
                          </div>
                        )}

                        {/* GST detail */}
                        <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                          <p>Price excl. GST: {formatINR(item.unitPriceExGst)}</p>
                          <p>GST {item.gstRate}%: {formatINR(item.gstPerUnit)} per unit</p>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* min=0 so clicking minus at qty=1 removes the item via CartContext */}
                          <QuantityControl
                            quantity={item.quantity}
                            min={0}
                            max={item.stock}
                            loading={updating[item.cartItemId]}
                            onChange={(q) => handleQtyChange(item.cartItemId, q)}
                            showTrashAtMin
                          />

                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatINR(item.lineGrandTotal)}</p>
                            <p className="text-xs text-gray-400">incl. GST</p>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* COD warning */}
            {isCodBlocked && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                ℹ️ <strong>Cash on Delivery not available</strong> for:{' '}
                {codBlockedItems.map(i => i.name).join(', ')}. Please pay online.
              </div>
            )}

            {/* Shipping info — flat rate, no pincode needed */}
            <div className="card p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <FiTruck size={14} /> Delivery Charges
              </h3>

              {cartGrandExShipping > FREE_SHIPPING_THRESHOLD ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-semibold">
                  🎉 FREE shipping — orders above ₹{FREE_SHIPPING_THRESHOLD}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700 mb-2">
                    <FiTruck size={13} />
                    <span>Shipping: <strong>{formatINR(shipping)}</strong></span>
                    <span className="text-xs text-gray-500 ml-1">(based on order weight)</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Add items worth <strong>{formatINR(FREE_SHIPPING_THRESHOLD - cartGrandExShipping)}</strong> more to get free shipping
                  </p>
                </>
              )}

              {/* Shipping slabs */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 border ${shipping === LIGHT_SHIPPING ? 'bg-orange-50 border-orange-300 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <span className="text-base">📦</span>
                  <span className="font-medium leading-tight text-center">≤ 500g</span>
                  <span className="font-bold">₹{LIGHT_SHIPPING}</span>
                </div>
                <div className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 border ${shipping === HEAVY_SHIPPING ? 'bg-orange-50 border-orange-300 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <span className="text-base">📦</span>
                  <span className="font-medium leading-tight text-center">&gt; 500g</span>
                  <span className="font-bold">₹{HEAVY_SHIPPING}</span>
                </div>
                <div className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 border ${shipping === 0 ? 'bg-green-50 border-green-300 text-green-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <span className="text-base">🎉</span>
                  <span className="font-medium leading-tight text-center">Above ₹{FREE_SHIPPING_THRESHOLD}</span>
                  <span className="font-bold">FREE</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Order Summary ───────────────────────────────── */}
          <div>
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

              <div className="space-y-2.5 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (excl. GST)</span>
                  <span>{formatINR(subtotalExGst)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>{formatINR(gstTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>
                    {shipping === 0 ? 'FREE 🎉' : formatINR(shipping)}
                  </span>
                </div>
                {shipping === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg p-2">
                    <FiTruck size={12} /> Free delivery applied
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatINR(total)}</span>
                </div>
              </div>

              <button
                onClick={() => isLoggedIn ? navigate('/checkout') : navigate('/login', { state: { from: '/checkout' } })}
                className="btn-primary w-full mb-3"
              >
                {isLoggedIn ? `Proceed to Checkout →` : 'Login to Checkout →'}
              </button>

              <Link to="/shop" className="block text-center text-sm text-primary-500 hover:underline">
                <FiShoppingBag className="inline mr-1" size={13} />
                Continue Shopping
              </Link>

              <p className="text-xs text-gray-400 text-center mt-3">🔒 Secure checkout</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Variant picker modal */}
      {variantPickerItem && (
        <VariantPickerModal
          item={variantPickerItem}
          onSelect={handleVariantSelect}
          onClose={() => setVariantPickerItem(null)}
        />
      )}
    </>
  );
}
