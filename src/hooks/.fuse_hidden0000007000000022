// ============================================
// RECENTLY VIEWED — localStorage hook
// Stores last 10 viewed products
// ============================================
import { useState, useEffect, useCallback } from 'react';

const KEY = 'eptomart_recently_viewed';
const MAX = 10;

export const useRecentlyViewed = () => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  });

  const addProduct = useCallback((product) => {
    if (!product?._id) return;
    setItems(prev => {
      const filtered = prev.filter(p => p._id !== product._id);
      const updated  = [
        {
          _id:          product._id,
          name:         product.name,
          slug:         product.slug,
          price:        product.discountPrice || product.price,
          originalPrice:product.price,
          image:        product.images?.[0]?.url || '',
          rating:       product.ratings?.average,
          ratingCount:  product.ratings?.count,
          gstRate:      product.gstRate || 18,
        },
        ...filtered,
      ].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setItems([]);
  }, []);

  return { items, addProduct, clear };
};
