// ============================================
// EPTOFRESH CART CONTEXT
// Single-seller cart with GPS location tracking
// ============================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EptoFreshCartContext = createContext();

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

  const fetchCart = useCallback(async () => {
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

  const addToCart = async ({ sellerId, productId, variantId, weight, label, price, quantity, cutType, name, image }) => {
    setLoading(true);
    try {
      // Check if cart has different seller
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

  const updateQuantity = async ({ productId, variantId, quantity, sellerId, price, name, image, weight, label, cutType }) => {
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

  const removeFromCart = (productId, variantId) => updateQuantity({ productId, variantId, quantity: 0 });

  const clearCart = async () => {
    try {
      await api.delete('/eptofresh/cart');
      setCart(null); setItems([]); setCartTotal(0);
    } catch { /* silent */ }
  };

  const cartCount = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const getItemQuantity = (productId, variantId) => {
    const item = items.find(i =>
      i.product === productId || i.product?._id === productId
    );
    return item?.quantity || 0;
  };

  return (
    <EptoFreshCartContext.Provider value={{
      cart, items, cartTotal, cartCount, loading, userLocation,
      setUserLocation, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart, getItemQuantity,
    }}>
      {children}
    </EptoFreshCartContext.Provider>
  );
}

export const useEptoFreshCart = () => useContext(EptoFreshCartContext);
