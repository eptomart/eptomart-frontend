import { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const KoyambeduCartContext = createContext(null);

export const KoyambeduCartProvider = ({ children }) => {
  const [cart, setCart]       = useState({ items: [] });
  const [loading, setLoading] = useState(false);

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

  const itemCount  = cart.items?.reduce((s, i) => s + 1, 0) || 0;
  const subtotal   = cart.items?.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0) || 0;
  const getQty     = (productId) => cart.items?.find(i => String(i.product?._id || i.product) === String(productId))?.quantity || 0;

  return (
    <KoyambeduCartContext.Provider value={{ cart, loading, fetchCart, updateItem, clearCart, itemCount, subtotal, getQty }}>
      {children}
    </KoyambeduCartContext.Provider>
  );
};

export const useKoyambeduCart = () => {
  const ctx = useContext(KoyambeduCartContext);
  if (!ctx) throw new Error('useKoyambeduCart must be inside KoyambeduCartProvider');
  return ctx;
};
