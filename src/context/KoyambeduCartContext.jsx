// ============================================
// KOYAMBEDU CART CONTEXT
// Guest mode:  localStorage cart (no auth needed)
// Logged in:   server API with optimistic updates + debounced sync
// Sync:        guest cart is merged to server on first fetchCart() after login
// ============================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const KBD_COORDS_KEY  = 'kbd_coords';
const KBD_AREA_KEY    = 'kbd_area';
const GUEST_CART_KEY  = 'kbd_guest_cart';   // { [productId]: GuestEntry }
const DEBOUNCE_MS     = 700;

// GuestEntry: { qty, deliveryType, name, unitPrice, unit, images, weightKg, qtyStep }

const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

const readGuestCart = () => {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{}'); } catch { return {}; }
};
const writeGuestCart = (map) => {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(map)); } catch {}
};
const clearGuestCart = () => { try { localStorage.removeItem(GUEST_CART_KEY); } catch {} };

// Convert guest map → shape identical to server cart
const guestToCart = (guestMap) => ({
  items: Object.entries(guestMap)
    .filter(([, e]) => (e.qty || 0) > 0)
    .map(([pid, e]) => ({
      _id:         'local_' + pid,
      product:     { _id: pid, name: e.name, images: e.images || [], weightKg: e.weightKg || 1, qtyStep: e.qtyStep || 1 },
      name:        e.name        || 'Product',
      quantity:    e.qty,
      unitPrice:   e.unitPrice   || 0,
      unit:        e.unit        || '',
      deliveryType: e.deliveryType || 'tomorrow',
    })),
});

const KoyambeduCartContext = createContext(null);

export const KoyambeduCartProvider = ({ children }) => {
  const [cart,    setCart]    = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // optimisticQtys: { [productId]: qty } — overrides server state until API confirms
  const [optimisticQtys, setOptimisticQtys] = useState({});
  const pendingRef = useRef({});

  // ── Location persistence ──────────────────────
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
      label ? localStorage.setItem(KBD_AREA_KEY, label) : localStorage.removeItem(KBD_AREA_KEY);
    } catch {}
  }, []);

  // ── fetchCart ──────────────────────────────────
  // Guest: read from localStorage
  // Logged-in: sync guest cart first (if any), then fetch from server
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
            api.post('/koyambedu/cart', { productId: pid, quantity: e.qty, deliveryType: e.deliveryType || 'tomorrow' }).catch(() => {})
          )
        );
        clearGuestCart();
      } catch {}
    }

    try {
      const { data } = await api.get('/koyambedu/cart');
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
  const updateItem = useCallback((productId, quantity, deliveryType = 'tomorrow', { silent = false, productData } = {}) => {
    const pid    = String(productId);
    const qty    = Math.max(0, quantity);

    // ── GUEST MODE ──────────────────────────────
    if (!isLoggedIn()) {
      const guestMap = readGuestCart();
      const prevQty  = guestMap[pid]?.qty || 0;

      if (qty === 0) {
        delete guestMap[pid];
      } else {
        guestMap[pid] = {
          qty,
          deliveryType,
          // Keep existing product data if not provided (for stepper taps in cart)
          name:        productData?.name        || guestMap[pid]?.name        || 'Product',
          unitPrice:   productData?.currentPrice || guestMap[pid]?.unitPrice   || 0,
          unit:        productData?.unit          || guestMap[pid]?.unit        || '',
          images:      productData?.images       || guestMap[pid]?.images      || [],
          weightKg:    productData?.weightKg     || guestMap[pid]?.weightKg    || 1,
          qtyStep:     productData?.qtyStep      || guestMap[pid]?.qtyStep     || 1,
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
    const prevQty    = optimisticQtys[pid] ?? (cart.items?.find(i => String(i.product?._id || i.product) === pid)?.quantity || 0);
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
          const { data } = await api.post('/koyambedu/cart', { productId, quantity: qty, deliveryType });
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
    if (!isLoggedIn()) { setCart({ items: [] }); return; }
    try {
      await api.delete('/koyambedu/cart/clear');
      setCart({ items: [] });
    } catch {}
  }, []);

  // ── Derived values (merge optimistic for logged-in) ─
  const effectiveItems = isLoggedIn()
    ? (cart.items?.map(item => {
        const pid = String(item.product?._id || item.product);
        const qty = pid in optimisticQtys ? optimisticQtys[pid] : item.quantity;
        return { ...item, quantity: qty };
      }).filter(i => i.quantity > 0) || [])
    : (cart.items || []);

  const itemCount = effectiveItems.length;
  const subtotal  = effectiveItems.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);

  return (
    <KoyambeduCartContext.Provider value={{
      cart: { ...cart, items: effectiveItems },
      loading, fetchCart, updateItem, clearCart,
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
