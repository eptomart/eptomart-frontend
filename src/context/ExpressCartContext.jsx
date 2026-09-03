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
import { createContext, useContext, useState, useCallback } from 'react';
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

  const updateItem = useCallback(async (productId, quantity) => {
    setLoading(true);
    try {
      const { data } = await api.put('/express/cart', { productId, quantity });
      setCart(data.cart);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update cart');
    } finally {
      setLoading(false);
    }
  }, []);

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
