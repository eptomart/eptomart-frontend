// ============================================
// KOYAMBEDU CART CONTEXT
// Guest mode:  localStorage cart (no auth needed)
// Logged in:   server API with optimistic updates + debounced sync
// Sync:        guest cart is merged to server on first fetchCart() after login
//
// Grade support: graded products use composite key  "${pid}__${gradeKey}"
//   in optimisticQtys and guest cart so each grade is tracked independently.
// ============================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const KBD_COORDS_KEY  = 'kbd_coords';
const KBD_AREA_KEY    = 'kbd_area';
const GUEST_CART_KEY  = 'kbd_guest_cart';
const DEBOUNCE_MS     = 700;

const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

// Composite key: "pid__gradeKey" for graded items, just "pid" otherwise
const cartKey = (productId, gradeKey) =>
  gradeKey ? `${String(productId)}__${gradeKey}` : String(productId);

// Parse composite key back to { pid, gradeKey }
const parseKey = (key) => {
  const sep = key.indexOf('__');
  if (sep === -1) return { pid: key, gradeKey: null };
  return { pid: key.substring(0, sep), gradeKey: key.substring(sep + 2) };
};

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
    .map(([key, e]) => {
      const { pid, gradeKey } = parseKey(key);
      return {
        _id:          'local_' + key,
        product:      { _id: pid, name: e.name, images: e.images || [], weightKg: e.weightKg || 1, qtyStep: e.qtyStep || 1 },
        name:         e.name         || 'Product',
        quantity:     e.qty,
        unitPrice:    e.unitPrice    || 0,
        unit:         e.unit         || '',
        deliveryType: e.deliveryType || 'tomorrow',
        gradeKey:     gradeKey       || null,
        gradeName:    e.gradeName    || null,
      };
    }),
});

const KoyambeduCartContext = createContext(null);

export const KoyambeduCartProvider = ({ children }) => {
  const [cart,    setCart]    = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // optimisticQtys: { [cartKey]: qty }
  // cartKey = pid for non-graded, "pid__gradeKey" for graded
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
          guestItems.map(([key, e]) => {
            const { pid, gradeKey } = parseKey(key);
            return api.post('/koyambedu/cart', {
              productId: pid, quantity: e.qty,
              deliveryType: e.deliveryType || 'tomorrow',
              ...(gradeKey ? { gradeKey } : {}),
            }).catch(() => {});
          })
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
  // gradeKey optional: when provided, returns qty for that specific grade
  const getQty = useCallback((productId, gradeKey = null) => {
    const pid = String(productId);
    const key = cartKey(pid, gradeKey);
    if (!isLoggedIn()) {
      const guestMap = readGuestCart();
      return guestMap[key]?.qty || 0;
    }
    if (key in optimisticQtys) return optimisticQtys[key];
    return cart.items?.find(i => {
      const itemPid = String(i.product?._id || i.product);
      if (gradeKey) return itemPid === pid && (i.gradeKey || null) === gradeKey;
      // No gradeKey: match non-graded item (gradeKey null/undefined)
      return itemPid === pid && !i.gradeKey;
    })?.quantity || 0;
  }, [cart, optimisticQtys]);

  // ── updateItem ─────────────────────────────────
  // options.silent      — suppress toast (stepper taps)
  // options.productData — product object for guest cart display
  // options.gradeKey    — grade to update (null = non-graded product)
  const updateItem = useCallback((productId, quantity, deliveryType = 'tomorrow', { silent = false, productData, gradeKey = null, gradeName = null } = {}) => {
    const pid    = String(productId);
    const qty    = Math.max(0, quantity);
    const key    = cartKey(pid, gradeKey);

    // ── GUEST MODE ──────────────────────────────
    if (!isLoggedIn()) {
      const guestMap = readGuestCart();
      const prevQty  = guestMap[key]?.qty || 0;

      if (qty === 0) {
        delete guestMap[key];
      } else {
        guestMap[key] = {
          qty,
          deliveryType,
          gradeName: gradeName || guestMap[key]?.gradeName || null,
          name:        productData?.name        || guestMap[key]?.name        || 'Product',
          unitPrice:   productData?.currentPrice || guestMap[key]?.unitPrice   || 0,
          unit:        productData?.unit          || guestMap[key]?.unit        || '',
          images:      productData?.images       || guestMap[key]?.images      || [],
          weightKg:    productData?.weightKg     || guestMap[key]?.weightKg    || 1,
          qtyStep:     productData?.qtyStep      || guestMap[key]?.qtyStep     || 1,
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
    const prevQty = optimisticQtys[key] ?? (cart.items?.find(i => {
      const itemPid = String(i.product?._id || i.product);
      if (gradeKey) return itemPid === pid && (i.gradeKey || null) === gradeKey;
      return itemPid === pid && !i.gradeKey;
    })?.quantity || 0);

    const isFirstAdd = prevQty === 0 && qty > 0;
    const isRemove   = qty === 0;

    setOptimisticQtys(prev => ({ ...prev, [key]: qty }));

    if (!silent) {
      if (isFirstAdd) toast.success('Added to cart 🛒', { duration: 1500 });
      else if (isRemove) toast.success('Removed from cart', { duration: 1200 });
    }

    if (pendingRef.current[key]?.timer) clearTimeout(pendingRef.current[key].timer);
    pendingRef.current[key] = {
      timer: setTimeout(async () => {
        try {
          setLoading(true);
          const { data } = await api.post('/koyambedu/cart', {
            productId, quantity: qty, deliveryType,
            ...(gradeKey ? { gradeKey } : {}),
          });
          setCart(data.cart || { items: [] });
          setOptimisticQtys(prev => { const n = { ...prev }; delete n[key]; return n; });
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to update cart');
          setOptimisticQtys(prev => { const n = { ...prev }; delete n[key]; return n; });
          fetchCart();
        } finally {
          setLoading(false);
          delete pendingRef.current[key];
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
        const pid    = String(item.product?._id || item.product);
        const optKey = cartKey(pid, item.gradeKey || null);
        const newQty = optKey in optimisticQtys ? optimisticQtys[optKey] : item.quantity;

        // Recompute unitPrice from variants when qty changes optimistically
        let unitPrice = item.unitPrice;
        const variants = item.gradeKey
          ? (item.product?.grades?.find(g => g.gradeKey === item.gradeKey)?.variants || [])
          : (item.product?.variants || []);
        if (optKey in optimisticQtys && variants.length > 0) {
          const match = variants.find(v =>
            !v.toQty ? newQty >= v.fromQty : (newQty >= v.fromQty && newQty <= v.toQty)
          );
          if (match?.finalPrice != null) unitPrice = match.finalPrice;
        }

        return { ...item, quantity: newQty, unitPrice };
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
