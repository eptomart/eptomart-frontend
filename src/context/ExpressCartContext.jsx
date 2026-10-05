// ============================================
// EPTOMART EXPRESS — Cart Context
// Unlike the other verticals' cart contexts, Express has no guest-cart
// mode: adding to cart always requires login (matches the backend's
// `protect` middleware on every /express/cart route). The selected store
// (from the nearest-store lookup) is remembered in localStorage so a
// returning customer doesn't have to re-pin their location every visit.
// This context is purely additive — it does not touch any other
// vertical's cart context or state.
// ============================================
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STORE_KEY = 'express_selected_store';

const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

const readSelectedStore = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
};
const writeSelectedStore = (store) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
};

const ExpressCartContext = createContext(null);

export const ExpressCartProvider = ({ children }) => {
  const [selectedStore, setSelectedStoreState] = useState(readSelectedStore());
  const [cart, setCart] = useState({ items: [], itemCount: 0, subtotal: 0, totalWeightKg: 0, largeOrderWarning: false });
  const [loading, setLoading] = useState(false);

  const setSelectedStore = useCallback((store) => {
    setSelectedStoreState(store);
    writeSelectedStore(store);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const { data } = await api.get('/express/cart');
      setCart(data.cart || { items: [], itemCount: 0, subtotal: 0, totalWeightKg: 0, largeOrderWarning: false });
    } catch { /* silent — cart just stays empty */ }
  }, []);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!isLoggedIn()) {
      toast.error('Please log in to add items to your cart');
      return false;
    }
    if (!selectedStore?._id) {
      toast.error('Please pin your delivery location first');
      return false;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/express/cart', { storeId: selectedStore._id, productId, quantity });
      setCart(data.cart);
      toast.success('Added to cart 🛒', { duration: 1500 });
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  // Quantity +/- taps used to fire a network round-trip (and a loading
  // state flip) on every single tap, which made rapid tapping feel sluggish
  // and could even race two in-flight requests against each other. Now the
  // displayed quantity updates instantly (optimistic), and the actual save
  // is debounced per product so a burst of taps collapses into one request
  // once the customer pauses, instead of one request per tap.
  //
  // Flicker fix: a slow response from an EARLIER save used to land after the
  // customer had already tapped again and overwrite the newer optimistic
  // quantity (the number jumped back, then forward again). Now each product
  // carries a version, and a server response is only applied when (a) it is
  // still the latest save for that product and (b) no other save/timer is
  // outstanding — the final response always carries the true cart.
  const updateTimers = useRef({});
  const versions = useRef({});       // productId -> latest local edit number
  const outstanding = useRef(0);     // timers + in-flight requests
  const updateItem = useCallback((productId, quantity) => {
    // Optimistic: update the line AND the totals together (subtotal / count),
    // so the price doesn't lag a tap behind and then jump when the server
    // answers. Removing (qty <= 0) drops the row immediately.
    setCart(c => {
      const items = c.items
        .map(i => String(i.product?._id || i.product) === String(productId) ? { ...i, quantity } : i)
        .filter(i => Number(i.quantity) > 0);
      const subtotal = Math.round(items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0));
      return { ...c, items, subtotal, itemCount: items.length };
    });

    const version = (versions.current[productId] || 0) + 1;
    versions.current[productId] = version;

    if (updateTimers.current[productId]) {
      clearTimeout(updateTimers.current[productId]);
    } else {
      outstanding.current += 1; // new burst for this product
    }
    updateTimers.current[productId] = setTimeout(async () => {
      delete updateTimers.current[productId];
      try {
        const { data } = await api.put('/express/cart', { productId, quantity });
        const isLatest = versions.current[productId] === version;
        outstanding.current -= 1;
        // Apply only the final response, so nothing older can overwrite a newer tap.
        if (isLatest && outstanding.current <= 0 && data?.cart) setCart(data.cart);
      } catch (err) {
        outstanding.current -= 1;
        toast.error(err?.response?.data?.message || 'Failed to update cart');
        if (versions.current[productId] === version) fetchCart(); // re-sync with the server
      }
    }, 450);
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    setCart({ items: [], itemCount: 0, subtotal: 0, totalWeightKg: 0, largeOrderWarning: false });
    if (!isLoggedIn()) return;
    try { await api.delete('/express/cart/clear'); } catch { /* non-blocking */ }
  }, []);

  return (
    <ExpressCartContext.Provider value={{
      selectedStore, setSelectedStore,
      cart, loading, fetchCart, addToCart, updateItem, clearCart,
      itemCount: cart.itemCount || 0,
    }}>
      {children}
    </ExpressCartContext.Provider>
  );
};

export const useExpressCart = () => {
  const ctx = useContext(ExpressCartContext);
  if (!ctx) throw new Error('useExpressCart must be inside ExpressCartProvider');
  return ctx;
};
