// ============================================
// CART PAGE — with GST breakdown + quantity controls
// ============================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiTrash2, FiShoppingBag, FiTruck, FiMinus, FiLoader, FiEdit2 } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import QuantityControl from '../components/cart/QuantityControl';
import VariantPickerModal from '../components/cart/VariantPickerModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Cart() {
  const { enrichedItems, sellerGroups, cartCount, subtotalExGst, gstTotal, shipping, total, updateQuantity, removeFromCart, updateItemVariant, isCodBlocked, codBlockedItems, setShippingRate } = useCart();
  const { isLoggedIn, user } = useAuth();
  const navigate  = useNavigate();
  const [updating, setUpdating] = useState({});
  const [pincodeInput, setPincodeInput] = useState('');
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [variantPickerItem, setVariantPickerItem] = useState(null);
  const [lastPincode, setLastPincode] = useState('');
  const [shippingPincode, setShippingPincode] = useState(''); // pincode currently used for calc

  const FREE_SHIPPING_THRESHOLD = 1499;
  const cartGrandExShipping = subtotalExGst + gstTotal;

  const handleQtyChange = async (cartItemId, newQty) => {
    // Just update quantity — the "Change" button already handles variant switching.
    // Never intercept qty changes to open the variant picker.
    setUpdating(p => ({ ...p, [cartItemId]: true }));
    updateQuantity(cartItemId, newQty);
    setTimeout(() => setUpdating(p => ({ ...p, [cartItemId]: false })), 300);
  };

  // Called when user picks a new variant from the modal — directly updates the cart item
  const handleVariantSelect = (variant, vLabel) => {
    if (!variantPickerItem) return;
    updateItemVariant(variantPickerItem.cartItemId, variant.price, vLabel, variant.stock);
    setVariantPickerItem(null);
  };

  // Total weight = 0.5kg per unit (default; products without explicit weight)
  const totalWeight = Math.max(cartCount * 0.5, 0.5);

  const fetchShipping = async (pincode, silent = false) => {
    if (!pincode || pincode.length !== 6) return;

    // Free shipping threshold — skip Shiprocket call entirely
    if (cartGrandExShipping >= FREE_SHIPPING_THRESHOLD) {
      setShippingRate(0);
      setShippingPincode(pincode);
      setLastPincode(pincode);
      if (!silent) toast.success('🎉 Free shipping on orders above ₹1,499!');
      return;
    }

    setLastPincode(pincode);
    setLoadingShipping(true);
    try {
      const { data } = await api.get(
        `/delivery/cod-check?delivery=${pincode}&weight=${totalWeight}`
      );
      const rate = data.minShippingRate != null ? data.minShippingRate
                 : data.shippingRate    != null ? data.shippingRate
                 : null;
      setShippingRate(rate);
      setShippingPincode(pincode);
      if (!silent) {
        if (rate === null) toast('Could not get rate — try again at checkout', { icon: 'ℹ️' });
        else toast.success(`Shipping to ${pincode}: ${rate === 0 ? 'FREE' : formatINR(rate)}`);
      }
    } catch {
      if (!silent) toast.error('Could not calculate shipping');
    } finally {
      setLoadingShipping(false);
    }
  };

  // Auto-fetch on mount if user has saved address — pre-fill pincode input too
  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const addr = user.addresses.find(a => a.isDefault) || user.addresses[0];
      if (addr?.pincode) {
        setPincodeInput(addr.pincode);
        fetchShipping(addr.pincode);
      }
    }
  }, [user]);

  // Re-fetch silently when qty or cart total changes (weight & free-threshold both change)
  useEffect(() => {
    if (lastPincode.length === 6) fetchShipping(lastPincode, true);
  }, [cartCount, cartGrandExShipping]);

  const handleCalculateShipping = async () => {
    if (!pincodeInput || pincodeInput.length !== 6) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    await fetchShipping(pincodeInput);
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

            {/* Shipping calculator */}
            <div className="card p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <FiTruck size={14} /> Delivery Charges
              </h3>

              {/* Free shipping banner */}
              {cartGrandExShipping >= FREE_SHIPPING_THRESHOLD ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2 text-sm text-green-700 font-medium">
                  🎉 You qualify for <strong>FREE shipping</strong> (orders above ₹1,499)
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-2">
                  Add items worth {formatINR(FREE_SHIPPING_THRESHOLD - cartGrandExShipping)} more for free shipping
                </p>
              )}

              {/* Pincode input — always visible, pre-filled from address */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter delivery pincode"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    className="input-field w-full text-sm"
                  />
                  {shippingPincode && pincodeInput === shippingPincode && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium">✓ calculated</span>
                  )}
                </div>
                <button
                  onClick={handleCalculateShipping}
                  disabled={loadingShipping || pincodeInput.length !== 6}
                  className="btn-primary text-sm px-4 disabled:opacity-60 whitespace-nowrap"
                >
                  {loadingShipping ? <FiLoader size={14} className="animate-spin" /> : 'Check'}
                </button>
              </div>
              {shippingPincode && (
                <p className="text-xs text-gray-400 mt-1">
                  Showing charges for <strong>{shippingPincode}</strong> · Change pincode above to recalculate
                </p>
              )}
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
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : shipping === null ? 'text-gray-400' : ''}>
                    {shipping === null ? 'Enter pincode to calculate' : shipping === 0 ? 'FREE' : formatINR(shipping)}
                  </span>
                </div>
                {shipping === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg p-2">
                    <FiTruck size={12} /> Free delivery applied
                  </div>
                )}
                {shipping !== null && (
                  <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-100">
                    <span>Grand Total</span>
                    <span className="text-primary-600">{total !== null ? formatINR(total) : '—'}</span>
                  </div>
                )}
                {shipping === null && (
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                    Total will be calculated once shipping is set
                  </div>
                )}
              </div>

              <button
                onClick={() => isLoggedIn ? navigate('/checkout') : navigate('/login', { state: { from: '/checkout' } })}
                disabled={shipping === null}
                className="btn-primary w-full mb-3 disabled:opacity-60"
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
