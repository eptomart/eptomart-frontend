// ============================================
// KOYAMBEDU CART CONTEXT
// Adds userLocation with localStorage persistence (same pattern as EptoFresh)
// ============================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const KBD_COORDS_KEY = 'kbd_coords';
const KBD_AREA_KEY   = 'kbd_area';

const KoyambeduCartContext = createContext(null);

export const KoyambeduCartProvider = ({ children }) => {
  const [cart, setCart]       = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // Restore persisted location (survives refresh)
  const [userLocation, setUserLocationRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(KBD_COORDS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [locationLabel, setLocationLabelRaw] = useState(() => {
    return localStorage.getItem(KBD_AREA_KEY) || '';
  });

  const setUserLocation = useCallback((loc) => {
    setUserLocationRaw(loc);
    if (loc) {
      try { localStorage.setItem(KBD_COORDS_KEY, JSON.stringify(loc)); } catch {}
    } else {
      localStorage.removeItem(KBD_COORDS_KEY);
    }
  }, []);

  const setLocationLabel = useCallback((label) => {
    setLocationLabelRaw(label);
    if (label) {
      try { localStorage.setItem(KBD_AREA_KEY, label); } catch {}
    } else {
      localStorage.removeItem(KBD_AREA_KEY);
    }
  }, []);

  // Request GPS once — only if no saved location
  useEffect(() => {
    if (userLocation) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await api.get('/koyambedu/cart');
      setCart(data.cart || { items: [] });
    } catch {}
  }, []);

  const updateItem = useCallback(async (productId, quantity, deliveryType = 'tomorrow') => {
    setLoading(true);
    try {
      const { data } = await api.post('/koyambedu/cart', { productId, quantity, deliveryType });
      setCart(data.cart || { items: [] });
      if (quantity > 0) toast.success('Cart updated');
      else toast.success('Item removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update cart');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await api.delete('/koyambedu/cart/clear');
      setCart({ items: [] });
    } catch {}
  }, []);

  const itemCount = cart.items?.reduce((s, i) => s + 1, 0) || 0;
  const subtotal  = cart.items?.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0) || 0;
  const getQty    = (productId) => cart.items?.find(i => String(i.product?._id || i.product) === String(productId))?.quantity || 0;

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
