// ============================================
// EPTOFRESH CART CONTEXT
// Guest-first: localStorage for guests, API for logged-in users
// Single-seller cart with GPS location tracking
// ============================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const GUEST_CART_KEY = 'epf_guest_cart';

const EptoFreshCartContext = createContext();

// ── Guest cart helpers (localStorage) ──────────────────────
function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : { seller: null, items: [] };
  } catch {
    return { seller: null, items: [] };
  }
}

function writeGuestCart(cart) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  } catch {}
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function isLoggedIn() {
  return !!localStorage.getItem('eptomart_token');
}

function calcGuestTotal(items) {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

// ── Provider ───────────────────────────────────────────────
export function EptoFreshCartProvider({ children }) {
  const [cart, setCart]           = useState(null);
  const [items, setItems]         = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }

  // Request GPS once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // ── Fetch / init cart ──────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!isLoggedIn()) {
      // Guest: load from localStorage
      const gc = readGuestCart();
      setCart(gc.seller ? { seller: gc.seller, items: gc.items } : null);
      setItems(gc.items || []);
      setCartTotal(calcGuestTotal(gc.items || []));
      return;
    }
    try {
      const { data } = await api.get('/eptofresh/cart');
      if (data.success) {
        setCart(data.cart);
        setItems(data.cart?.items || []);
        setCartTotal(data.total || 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // ── Add to cart ────────────────────────────────────────
  const addToCart = async ({
    sellerId, sellerName, productId, variantId, weight, label,
    price, quantity, cutType, name, image,
  }) => {
    setLoading(true);

    // ── GUEST path ─────────────────────────────────────
    if (!isLoggedIn()) {
      const gc = readGuestCart();

      // Different seller check
      if (gc.seller && gc.seller._id !== sellerId && gc.items.length > 0) {
        const ok = window.confirm(
          'Your cart has items from a different store. Starting a new cart will clear the current one. Continue?'
        );
        if (!ok) { setLoading(false); return false; }
        gc.items = [];
      }

      gc.seller = { _id: sellerId, shopName: sellerName || '' };

      const existing = gc.items.findIndex(
        i => i.productId === productId && i.variantId === (variantId || null)
      );
      if (existing >= 0) {
        gc.items[existing].quantity += (quantity || 1);
      } else {
        gc.items.push({
          productId, variantId: variantId || null,
          name, image, price, quantity: quantity || 1,
          weight, label, cutType,
        });
      }

      writeGuestCart(gc);
      setCart({ seller: gc.seller, items: gc.items });
      setItems([...gc.items]);
      setCartTotal(calcGuestTotal(gc.items));
      toast.success('Added to cart');
      setLoading(false);
      return true;
    }

    // ── LOGGED-IN path ────────────────────────────────
    try {
      if (cart?.seller && cart.seller._id !== sellerId && items.length > 0) {
        const confirm = window.confirm(
          'Your cart has items from a different store. Starting a new cart will clear the current one. Continue?'
        );
        if (!confirm) { setLoading(false); return false; }
      }

      const { data } = await api.post('/eptofresh/cart', {
        sellerId, productId, variantId, weight, label, price, quantity, cutType, name, image,
        buyerLat: userLocation?.lat,
        buyerLng: userLocation?.lng,
      });

      if (data.success) {
        setCart(data.cart);
        setItems(data.cart?.items || []);
        setCartTotal(data.total || 0);
        toast.success('Added to cart');
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
    return false;
  };

  // ── Update quantity ────────────────────────────────────
  const updateQuantity = async ({
    productId, variantId, quantity,
    sellerId, price, name, image, weight, label, cutType,
  }) => {
    // ── GUEST path ─────────────────────────────────────
    if (!isLoggedIn()) {
      const gc = readGuestCart();
      const idx = gc.items.findIndex(
        i => i.productId === productId && i.variantId === (variantId || null)
      );
      if (idx >= 0) {
        if (quantity <= 0) {
          gc.items.splice(idx, 1);
        } else {
          gc.items[idx].quantity = quantity;
        }
      }
      if (gc.items.length === 0) gc.seller = null;
      writeGuestCart(gc);
      setCart(gc.seller ? { seller: gc.seller, items: gc.items } : null);
      setItems([...gc.items]);
      setCartTotal(calcGuestTotal(gc.items));
      return;
    }

    // ── LOGGED-IN path ────────────────────────────────
    try {
      const { data } = await api.post('/eptofresh/cart', {
        sellerId: sellerId || cart?.seller?._id,
        productId, variantId, weight, label, price, quantity, cutType, name, image,
      });
      if (data.success) {
        setCart(data.cart);
        setItems(data.cart?.items || []);
        setCartTotal(data.total || 0);
      }
    } catch { /* silent */ }
  };

  const removeFromCart = (productId, variantId) =>
    updateQuantity({ productId, variantId, quantity: 0 });

  // ── Clear cart ─────────────────────────────────────────
  const clearCart = async () => {
    if (!isLoggedIn()) {
      clearGuestCart();
      setCart(null); setItems([]); setCartTotal(0);
      return;
    }
    try {
      await api.delete('/eptofresh/cart');
      setCart(null); setItems([]); setCartTotal(0);
    } catch { /* silent */ }
  };

  // ── Merge guest cart into server on login ──────────────
  // Call this from wherever you handle login success
  const mergeGuestCartOnLogin = useCallback(async () => {
    const gc = readGuestCart();
    if (!gc.seller || gc.items.length === 0) {
      await fetchCart(); // just load server cart
      return;
    }
    // Push each guest item to server
    for (const item of gc.items) {
      try {
        await api.post('/eptofresh/cart', {
          sellerId: gc.seller._id,
          productId: item.productId,
          variantId: item.variantId,
          weight: item.weight,
          label: item.label,
          price: item.price,
          quantity: item.quantity,
          cutType: item.cutType,
          name: item.name,
          image: item.image,
        });
      } catch { /* skip failed items */ }
    }
    clearGuestCart();
    await fetchCart();
  }, [fetchCart]);

  // ── Helpers ────────────────────────────────────────────
  const cartCount = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const getItemQuantity = (productId, variantId) => {
    const item = items.find(i =>
      (i.product === productId || i.product?._id === productId || i.productId === productId)
    );
    return item?.quantity || 0;
  };

  return (
    <EptoFreshCartContext.Provider value={{
      cart, items, cartTotal, cartCount, loading, userLocation,
      setUserLocation, fetchCart, addToCart, updateQuantity,
      removeFromCart, clearCart, getItemQuantity, mergeGuestCartOnLogin,
    }}>
      {children}
    </EptoFreshCartContext.Provider>
  );
}

export const useEptoFreshCart = () => useContext(EptoFreshCartContext);
