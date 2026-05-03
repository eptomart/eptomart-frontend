// ============================================
// CART CONTEXT — with GST, seller groups, server sync
// Cart item uniqueness: cartItemId = productId + "_" + variantLabel
// ============================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { extractBasePrice } from '../utils/gst';
import { BUSINESS } from '../utils/businessInfo';

const CartContext = createContext(null);
const CART_KEY   = 'eptomart_cart';

// Stable composite key: guarantees each product+variant is a separate line item
const makeCartItemId = (productId, variantLabel) =>
  `${productId}_${variantLabel || ''}`;

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

// Migrate old cart items that lack cartItemId (added in this version)
const migrateItems = (items) =>
  items.map(i => i.cartItemId ? i : { ...i, cartItemId: makeCartItemId(i._id, i.variantLabel) });

export const CartProvider = ({ children }) => {
  const [cartItems,   setCartItems]   = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return migrateItems(raw);
    } catch { return []; }
  });
  const [isCartOpen,  setIsCartOpen]  = useState(false);
  const [isLoggedIn,  setIsLoggedIn]  = useState(!!localStorage.getItem('eptomart_token'));
  const [shippingRate, setShippingRate] = useState(null);

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

  // ── addToCart ─────────────────────────────────────────────
  // Uniqueness: productId + variantLabel
  //   Same product + SAME variant  → increment quantity of that line item
  //   Same product + DIFF variant  → add as a SEPARATE new line item
  //   Completely new product       → add new line item
  const addToCart = useCallback((product, quantity = 1) => {
    const incomingPrice        = product.discountPrice || product.price;
    const incomingVariantLabel = product.variantLabel  || null;
    const cartItemId           = makeCartItemId(product._id, incomingVariantLabel);

    setCartItems(prev => {
      // Find existing by composite key: productId + variantLabel (+ optional seller match)
      const existing = prev.find(i =>
        i.cartItemId === cartItemId &&
        (!product.selectedSeller || i.seller?._id === product.selectedSeller?._id)
      );

      if (existing) {
        // Same product AND same variant — just increase quantity
        const newQty = existing.quantity + quantity;
        if (newQty > existing.stock) {
          toast.error(`Only ${existing.stock} units available`);
          return prev;
        }
        toast.success('Quantity updated!');
        return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i);
      }

      // No matching line item — add as a new entry (covers both new products and different variants)
      if (quantity > product.stock) {
        toast.error(`Only ${product.stock} units available`);
        return prev;
      }

      toast.success('Added to cart! 🛒', { duration: 2000 });
      return [...prev, {
        cartItemId,                                          // ← composite unique key
        _id:          product._id,
        name:         product.name,
        price:        incomingPrice,
        originalPrice:product.price,
        image:        product.images?.[0]?.url || '',
        stock:        product.stock,
        slug:         product.slug,
        gstRate:      product.gstRate || 18,
        codAvailable: product.codAvailable !== false,
        seller:       product.selectedSeller || product.seller || null,
        variantLabel: incomingVariantLabel,
        quantity,
      }];
    });

    // Sync to server if logged in
    if (isLoggedIn) {
      api.post('/cart/add', {
        productId:    product._id,
        sellerId:     product.selectedSeller?._id || product.seller?._id,
        quantity,
        price:        incomingPrice,
        variantLabel: incomingVariantLabel,
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  // ── removeFromCart ────────────────────────────────────────
  // Always pass cartItemId (not _id alone) — prevents removing all variants of a product
  const removeFromCart = useCallback((cartItemId) => {
    setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
    toast.success('Removed from cart');
  }, []);

  // ── updateQuantity ────────────────────────────────────────
  // Always pass cartItemId (not _id alone)
  const updateQuantity = useCallback((cartItemId, quantity) => {
    if (quantity <= 0) { removeFromCart(cartItemId); return; }
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;
      if (quantity > item.stock) {
        toast.error(`Only ${item.stock} units available`);
        return item;
      }
      return { ...item, quantity };
    }));
  }, [removeFromCart]);

  // ── updateItemVariant ─────────────────────────────────────
  // Direct variant swap from VariantPickerModal.
  // Pass cartItemId (not _id) to locate the correct line item.
  // Updates cartItemId when variant label changes.
  const updateItemVariant = useCallback((cartItemId, newPrice, newVariantLabel, newStock) => {
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.cartItemId === cartItemId);
      if (idx === -1) return prev;
      const updated   = [...prev];
      const newCartId = makeCartItemId(updated[idx]._id, newVariantLabel);
      updated[idx] = {
        ...updated[idx],
        cartItemId:   newCartId,
        price:        newPrice,
        variantLabel: newVariantLabel,
        stock:        newStock != null ? newStock : updated[idx].stock,
      };
      return updated;
    });
    toast.success('Variant updated! 🛒', { duration: 2000 });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  // isInCart — checks if ANY variant of this product is in cart (used by ProductCard)
  const isInCart = useCallback((id) => cartItems.some(i => i._id === id), [cartItems]);

  // ── Derived values ─────────────────────────────────────
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const enriched = cartItems.map(item => ({
    ...item,
    ...calcItemGst(item),
  }));

  const subtotalExGst = enriched.reduce((s, i) => s + i.lineBase,      0);
  const gstTotal      = enriched.reduce((s, i) => s + i.lineGst,       0);
  // Use != null (loose) to catch both null and undefined from setShippingRate
  const shipping      = shippingRate != null ? shippingRate : null;
  const total         = shipping != null ? parseFloat((subtotalExGst + gstTotal + shipping).toFixed(2)) : null;

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
      shippingRate,
      setShippingRate,
      sellerGroups,
      codBlockedItems,
      isCodBlocked,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateItemVariant,
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
