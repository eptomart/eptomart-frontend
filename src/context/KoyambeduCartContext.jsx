// ============================================
// KOYAMBEDU CART CONTEXT
// Optimistic local updates + debounced API sync
// — UI responds instantly, no lag on every tap
// — Only toasts on first add / remove
// ============================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const KBD_COORDS_KEY = 'kbd_coords';
const KBD_AREA_KEY   = 'kbd_area';
const DEBOUNCE_MS    = 700;

const KoyambeduCartContext = createContext(null);

export const KoyambeduCartProvider = ({ children }) => {
  const [cart,    setCart]    = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // optimisticQtys: { [productId]: qty } — overrides server state until API responds
  const [optimisticQtys, setOptimisticQtys] = useState({});
  const pendingRef = useRef({}); // debounce timers per product

  // ── Persisted location ────────────────────────
  const [userLocation, setUserLocationRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KBD_COORDS_KEY) || 'null'); } catch { return null; }
  });
  const [locationLabel, setLocationLabelRaw] = useState(
    () => localStorage.getItem(KBD_AREA_KEY) || ''
  );

  const setUserLocation = useCallback((loc) => {
    setUserLocationRaw(loc);
    try {
      loc ? localStorage.setItem(KBD_COORDS_KEY, JSON.stringify(loc))
          : localStorage.removeItem(KBD_COORDS_KEY);
    } catch {}
  }, []);

  const setLocationLabel = useCallback((label) => {
    setLocationLabelRaw(label);
    try {
      label ? localStorage.setItem(KBD_AREA_KEY, label)
            : localStorage.removeItem(KBD_AREA_KEY);
    } catch {}
  }, []);

  // ── Fetch cart from server ────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const { data } = await api.get('/koyambedu/cart');
      setCart(data.cart || { items: [] });
    } catch {}
  }, []);

  // ── getQty: optimistic override first ─────────
  const getQty = useCallback((productId) => {
    const pid = String(productId);
    if (pid in optimisticQtys) return optimisticQtys[pid];
    return cart.items?.find(i => String(i.product?._id || i.product) === pid)?.quantity || 0;
  }, [cart, optimisticQtys]);

  // ── updateItem: optimistic + debounced API ────
  // showToast: true only on first add (called from "Add" button, not +/− stepper)
  const updateItem = useCallback((productId, quantity, deliveryType = 'tomorrow', { silent = false } = {}) => {
    const pid       = String(productId);
    const prevQty   = optimisticQtys[pid] ?? (cart.items?.find(i => String(i.product?._id || i.product) === pid)?.quantity || 0);
    const isFirstAdd = prevQty === 0 && quantity > 0;
    const isRemove   = quantity <= 0;

    // 1. Optimistic update — instant UI response
    setOptimisticQtys(prev => ({ ...prev, [pid]: Math.max(0, quantity) }));

    // 2. Toast only on meaningful events (not every stepper tap)
    if (!silent) {
      if (isFirstAdd) toast.success('Added to cart 🛒', { duration: 1500 });
      else if (isRemove) toast.success('Removed from cart', { duration: 1200 });
    }

    // 3. Debounce API call — only fires after 700ms pause
    if (pendingRef.current[pid]?.timer) clearTimeout(pendingRef.current[pid].timer);
    pendingRef.current[pid] = {
      timer: setTimeout(async () => {
        try {
          setLoading(true);
          const { data } = await api.post('/koyambedu/cart', {
            productId, quantity: Math.max(0, quantity), deliveryType,
          });
          // Sync server truth, clear optimistic override for this product
          setCart(data.cart || { items: [] });
          setOptimisticQtys(prev => {
            const next = { ...prev };
            delete next[pid];
            return next;
          });
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to update cart');
          // Revert optimistic state
          setOptimisticQtys(prev => {
            const next = { ...prev };
            delete next[pid];
            return next;
          });
          fetchCart();
        } finally {
          setLoading(false);
          delete pendingRef.current[pid];
        }
      }, DEBOUNCE_MS),
    };
  }, [cart, optimisticQtys, fetchCart]);

  // ── clearCart ─────────────────────────────────
  const clearCart = useCallback(async () => {
    try {
      await api.delete('/koyambedu/cart/clear');
      setCart({ items: [] });
      setOptimisticQtys({});
    } catch {}
  }, []);

  // ── Derived values ────────────────────────────
  // Merge server cart with optimistic overrides for accurate counts
  const effectiveItems = cart.items?.map(item => {
    const pid = String(item.product?._id || item.product);
    const qty = pid in optimisticQtys ? optimisticQtys[pid] : item.quantity;
    return { ...item, quantity: qty };
  }).filter(i => i.quantity > 0) || [];

  const itemCount = effectiveItems.length;
  const subtotal  = effectiveItems.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);

  return (
    <KoyambeduCartContext.Provider value={{
      cart, loading, fetchCart, updateItem, clearCart,
      itemCount, subtotal, getQty,
      userLocation, setUserLocation,
      locationLabel, setLocationLabel,
    }}>
      {children}
    </KoyambeduCartContext.Provider>
  );
};

export const useKoyambeduCart = () => {
  const ctx = useContext(KoyambeduCartContext);
  if (!ctx) throw new Error('useKoyambeduCart must be inside KoyambeduCartProvider');
  return ctx;
};
