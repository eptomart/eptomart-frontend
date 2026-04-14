// ============================================
// WISHLIST CONTEXT — Global heart button state
// ============================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const { isLoggedIn } = useAuth();

  // Load wishlist IDs on login
  useEffect(() => {
    if (isLoggedIn) {
      fetchWishlistIds();
    } else {
      setWishlistIds(new Set());
    }
  }, [isLoggedIn]);

  const fetchWishlistIds = async () => {
    try {
      const { data } = await api.get('/wishlist');
      const ids = new Set((data.wishlist || []).map(p => p._id || p));
      setWishlistIds(ids);
    } catch (_) {}
  };

  const toggleWishlist = useCallback(async (product) => {
    if (!isLoggedIn) {
      toast.error('Please login to save to wishlist');
      return;
    }

    const productId = product._id;
    const wasInWishlist = wishlistIds.has(productId);

    // Optimistic update
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (wasInWishlist) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      const { data } = await api.post(`/wishlist/${productId}`);
      if (data.inWishlist) {
        toast.success('Added to wishlist ❤️', {
          action: { label: 'View', onClick: () => window.location.href = '/wishlist' },
        });
      } else {
        toast.success('Removed from wishlist');
      }
    } catch (_) {
      // Revert on error
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (wasInWishlist) next.add(productId);
        else next.delete(productId);
        return next;
      });
      toast.error('Failed to update wishlist');
    }
  }, [isLoggedIn, wishlistIds]);

  const isInWishlist = useCallback((productId) => wishlistIds.has(productId), [wishlistIds]);

  const wishlistCount = wishlistIds.size;

  return (
    <WishlistContext.Provider value={{ wishlistIds, wishlistCount, toggleWishlist, isInWishlist, refreshWishlist: fetchWishlistIds }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};
