// ============================================
// CART CONTEXT — with GST, seller groups, server sync
// ============================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { extractBasePrice } from '../utils/gst';
import { BUSINESS } from '../utils/businessInfo';

const CartContext = createContext(null);
const CART_KEY   = 'eptomart_cart';

const calcItemGst = (item, buyerState = BUSINESS.state) => {
  const price      = item.price || 0;
  const gstRate    = item.gstRate || 18;
  const unitExGst  = extractBasePrice(price, gstRate);
  const lineBase   = unitExGst * item.quantity;
  const lineGst    = lineBase * gstRate / 100;
  return {
    unitPriceExGst:  unitExGst,
    gstPerUnit:      unitExGst * gstRate / 100,
    lineBase:        parseFloat(lineBase.toFixed(2)),
    lineGst:         parseFloat(lineGst.toFixed(2)),
    lineGrandTotal:  parseFloat((lineBase + lineGst).toFixed(2)),
  };
};

export const CartProvider = ({ children }) => {
  const [cartItems,   setCartItems]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  });
  const [isCartOpen,  setIsCartOpen]  = useState(false);
  const [isLoggedIn,  setIsLoggedIn]  = useState(!!localStorage.getItem('eptomart_token'));

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Watch auth state
  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem('eptomart_token'));
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i._id === product._id &&
        (!product.selectedSeller || i.seller?._id === product.selectedSeller?._id));

      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        toast.success('Quantity updated!');
        return prev.map(i => i._id === existing._id ? { ...i, quantity: newQty } : i);
      }

      if (quantity > product.stock) {
        toast.error(`Only ${product.stock} units available`);
        return prev;
      }

      toast.success('Added to cart! 🛒', { duration: 2000 });
      return [...prev, {
        _id:          product._id,
        name:         product.name,
        price:        product.discountPrice || product.price,
        originalPrice:product.price,
        image:        product.images?.[0]?.url || '',
        stock:        product.stock,
        slug:         product.slug,
        gstRate:      product.gstRate || 18,
        codAvailable: product.codAvailable !== false,
        seller:       product.selectedSeller || product.seller || null,
        quantity,
      }];
    });

    // Sync to server if logged in
    if (isLoggedIn) {
      api.post('/cart/add', {
        productId: product._id,
        sellerId:  product.selectedSeller?._id || product.seller?._id,
        quantity,
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  const removeFromCart = useCallback((productId) => {
    setCartItems(prev => prev.filter(i => i._id !== productId));
    toast.success('Removed from cart');
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCartItems(prev => prev.map(item => {
      if (item._id !== productId) return item;
      if (quantity > item.stock) {
        toast.error(`Only ${item.stock} units available`);
        return item;
      }
      return { ...item, quantity };
    }));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCartItems([]), []);

  const isInCart = useCallback((id) => cartItems.some(i => i._id === id), [cartItems]);

  // ── Derived values ─────────────────────────────────────
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const enriched = cartItems.map(item => ({
    ...item,
    ...calcItemGst(item),
  }));

  const subtotalExGst = enriched.reduce((s, i) => s + i.lineBase,      0);
  const gstTotal      = enriched.reduce((s, i) => s + i.lineGst,       0);
  const shipping      = (subtotalExGst + gstTotal) >= 499 ? 0 : 49;
  const total         = parseFloat((subtotalExGst + gstTotal + shipping).toFixed(2));

  // Group by seller for display
  const sellerGroups = enriched.reduce((acc, item) => {
    const key = item.seller?._id || item.seller?.businessName || 'eptomart';
    if (!acc[key]) acc[key] = { seller: item.seller, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  // COD availability
  const codBlockedItems = cartItems.filter(i => i.codAvailable === false);
  const isCodBlocked    = codBlockedItems.length > 0;

  return (
    <CartContext.Provider value={{
      cartItems,
      enrichedItems: enriched,
      cartCount,
      subtotalExGst: parseFloat(subtotalExGst.toFixed(2)),
      gstTotal:      parseFloat(gstTotal.toFixed(2)),
      subtotal:      parseFloat(subtotalExGst.toFixed(2)),
      shipping,
      tax:           parseFloat(gstTotal.toFixed(2)),
      total,
      sellerGroups,
      codBlockedItems,
      isCodBlocked,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
