// ============================================
// FRUIT BASKET CART CONTEXT
// Guest mode:  localStorage cart (no auth needed)
// Logged in:   server API with optimistic updates + debounced sync
// Sync:        guest cart is merged to server on first fetchCart() after login
//
// Mirrors KoyambeduCartContext.jsx (same guest/server/optimistic pattern),
// simplified for Fruit Baskets — no grades/variants/delivery-type per line.
// This context is purely additive: it does not touch KoyambeduCartContext,
// CartContext, or any other vertical's cart state.
// ============================================
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const GUEST_CART_KEY = 'fb_guest_cart';
const DEBOUNCE_MS    = 700;

const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

const readGuestCart = () => {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{}'); } catch { return {}; }
};
const writeGuestCart = (map) => {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(map)); } catch {}
};
const clearGuestCart = () => { try { localStorage.removeItem(GUEST_CART_KEY); } catch {} };

// Convert guest map → shape identical to server cart items
const guestToCart = (guestMap) => ({
  items: Object.entries(guestMap)
    .filter(([, e]) => (e.qty || 0) > 0)
    .map(([pid, e]) => ({
      _id:      'local_' + pid,
      product:  pid,
      name:     e.name || 'Basket',
      price:    e.price || 0,
      compareAtPrice: e.compareAtPrice ?? null,
      image:    e.image || '',
      occasion: e.occasion || 'general',
      weightKg: e.weightKg ?? null,
      quantity: e.qty,
    })),
});

const FruitBasketCartContext = createContext(null);

export const FruitBasketCartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // optimisticQtys: { [productId]: qty }
  const [optimisticQtys, setOptimisticQtys] = useState({});
  const pendingRef = useRef({});

  // ── fetchCart ──────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setCart(guestToCart(readGuestCart()));
      return;
    }

    // Sync any pending guest items to server
    const guestMap = readGuestCart();
    const guestItems = Object.entries(guestMap).filter(([, e]) => (e.qty || 0) > 0);
    if (guestItems.length > 0) {
      try {
        await Promise.all(
          guestItems.map(([pid, e]) =>
            api.post('/fruitbaskets/cart', { productId: pid, quantity: e.qty }).catch(() => {})
          )
        );
        clearGuestCart();
      } catch {}
    }

    try {
      const { data } = await api.get('/fruitbaskets/cart');
      setCart(data.cart || { items: [] });
    } catch {}
  }, []);

  // ── getQty ─────────────────────────────────────
  const getQty = useCallback((productId) => {
    const pid = String(productId);
    if (!isLoggedIn()) {
      const guestMap = readGuestCart();
      return guestMap[pid]?.qty || 0;
    }
    if (pid in optimisticQtys) return optimisticQtys[pid];
    return cart.items?.find(i => String(i.product?._id || i.product) === pid)?.quantity || 0;
  }, [cart, optimisticQtys]);

  // ── updateItem ─────────────────────────────────
  // options.silent      — suppress toast (stepper taps)
  // options.productData — product object for guest cart display
  const updateItem = useCallback((productId, quantity, { silent = false, productData } = {}) => {
    const pid = String(productId);

    if (!productId || pid === 'null' || pid === 'undefined') {
      console.warn('[FruitBasketCart] updateItem called with invalid productId:', productId);
      return;
    }
    const qty = Math.max(0, quantity);

    // ── GUEST MODE ──────────────────────────────
    if (!isLoggedIn()) {
      const guestMap = readGuestCart();
      const prevQty  = guestMap[pid]?.qty || 0;

      if (qty === 0) {
        delete guestMap[pid];
      } else {
        guestMap[pid] = {
          qty,
          name:           productData?.name           || guestMap[pid]?.name           || 'Basket',
          price:          productData?.price           ?? guestMap[pid]?.price          ?? 0,
          compareAtPrice: productData?.compareAtPrice   ?? guestMap[pid]?.compareAtPrice ?? null,
          image:          productData?.images?.[0]     || guestMap[pid]?.image          || '',
          occasion:       productData?.occasion         || guestMap[pid]?.occasion        || 'general',
          weightKg:       productData?.weightKg        ?? guestMap[pid]?.weightKg        ?? null,
        };
      }
      writeGuestCart(guestMap);
      setCart(guestToCart(guestMap));

      if (!silent) {
        if (prevQty === 0 && qty > 0) toast.success('Added to cart 🛒', { duration: 1500 });
        else if (qty === 0)           toast.success('Removed', { duration: 1200 });
      }
      return;
    }

    // ── LOGGED-IN MODE (optimistic + debounced) ──
    const prevQty = optimisticQtys[pid] ?? (cart.items?.find(i =>
      String(i.product?._id || i.product) === pid
    )?.quantity || 0);

    const isFirstAdd = prevQty === 0 && qty > 0;
    const isRemove   = qty === 0;

    setOptimisticQtys(prev => ({ ...prev, [pid]: qty }));

    if (!silent) {
      if (isFirstAdd) toast.success('Added to cart 🛒', { duration: 1500 });
      else if (isRemove) toast.success('Removed from cart', { duration: 1200 });
    }

    if (pendingRef.current[pid]?.timer) clearTimeout(pendingRef.current[pid].timer);
    pendingRef.current[pid] = {
      timer: setTimeout(async () => {
        try {
          setLoading(true);
          const { data } = await api.post('/fruitbaskets/cart', { productId, quantity: qty });
          setCart(data.cart || { items: [] });
          setOptimisticQtys(prev => { const n = { ...prev }; delete n[pid]; return n; });
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to update cart');
          setOptimisticQtys(prev => { const n = { ...prev }; delete n[pid]; return n; });
          fetchCart();
        } finally {
          setLoading(false);
          delete pendingRef.current[pid];
        }
      }, DEBOUNCE_MS),
    };
  }, [cart, optimisticQtys, fetchCart]);

  // ── clearCart ──────────────────────────────────
  const clearCart = useCallback(async () => {
    clearGuestCart();
    setOptimisticQtys({});
    setCart({ items: [] });
    if (!isLoggedIn()) return;
    try {
      await api.delete('/fruitbaskets/cart/clear');
    } catch (e) {
      console.error('[FruitBasketCart] Redundant clear-cart call failed (non-blocking):', e.message);
    }
  }, []);

  // ── Derived values (merge optimistic for logged-in) ─
  const effectiveItems = isLoggedIn()
    ? (cart.items?.filter(item => {
        const pid = String(item.product?._id || item.product);
        return item.product != null && pid !== 'null' && pid !== 'undefined';
      }).map(item => {
        const pid = String(item.product?._id || item.product);
        const newQty = pid in optimisticQtys ? optimisticQtys[pid] : item.quantity;
        return { ...item, quantity: newQty };
      }).filter(i => i.quantity > 0) || [])
    : (cart.items || []);

  const itemCount = effectiveItems.length;
  const subtotal  = effectiveItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);

  return (
    <FruitBasketCartContext.Provider value={{
      cart: { ...cart, items: effectiveItems },
      loading, fetchCart, updateItem, clearCart,
      itemCount, subtotal, getQty,
    }}>
      {children}
    </FruitBasketCartContext.Provider>
  );
};

export const useFruitBasketCart = () => {
  const ctx = useContext(FruitBasketCartContext);
  if (!ctx) throw new Error('useFruitBasketCart must be inside FruitBasketCartProvider');
  return ctx;
};
