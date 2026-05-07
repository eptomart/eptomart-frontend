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

              {/* Shipping slabs — graphical bar */}
              <div className="mt-4">
                {/* Progress bar */}
                <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((cartGrandExShipping / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                      background: cartGrandExShipping >= FREE_SHIPPING_THRESHOLD
                        ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                        : 'linear-gradient(90deg,#f97316,#fb923c)',
                    }}
                  />
                  {/* Threshold markers */}
                  <div className="absolute top-0 h-full w-px bg-orange-300" style={{ left: '33%' }} />
                  <div className="absolute top-0 h-full w-px bg-orange-400" style={{ left: '66%' }} />
                </div>

                {/* Three slabs */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Slab 1 */}
                  <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                    shipping === LIGHT_SHIPPING
                      ? 'border-orange-400 bg-orange-50 shadow-sm scale-[1.02]'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                    {shipping === LIGHT_SHIPPING && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">YOUR RATE</span>
                    )}
                    <div className="text-xl mb-1">🛵</div>
                    <p className="text-[11px] font-semibold text-gray-600 leading-tight">≤ 500g</p>
                    <p className="text-sm font-extrabold text-orange-500 mt-0.5">₹{LIGHT_SHIPPING}</p>
                  </div>

                  {/* Slab 2 */}
                  <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                    shipping === HEAVY_SHIPPING
                      ? 'border-orange-400 bg-orange-50 shadow-sm scale-[1.02]'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                    {shipping === HEAVY_SHIPPING && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">YOUR RATE</span>
                    )}
                    <div className="text-xl mb-1">🚚</div>
                    <p className="text-[11px] font-semibold text-gray-600 leading-tight">&gt; 500g</p>
                    <p className="text-sm font-extrabold text-orange-500 mt-0.5">₹{HEAVY_SHIPPING}</p>
                  </div>

                  {/* Slab 3 — Free */}
                  <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                    shipping === 0
                      ? 'border-green-400 bg-green-50 shadow-sm scale-[1.02]'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                    {shipping === 0 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">APPLIED ✓</span>
                    )}
                    <div className="text-xl mb-1">🎁</div>
                    <p className="text-[11px] font-semibold text-gray-600 leading-tight">Above ₹{FREE_SHIPPING_THRESHOLD}</p>
                    <p className="text-sm font-extrabold text-green-500 mt-0.5">FREE</p>
                  </div>
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
