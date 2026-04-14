// ============================================
// CART CONTEXT — Shopping Cart State
// ============================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

const CART_KEY = 'eptomart_cart';

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item._id === product._id);

      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        toast.success('Quantity updated!');
        return prev.map(item =>
          item._id === product._id ? { ...item, quantity: newQty } : item
        );
      }

      if (quantity > product.stock) {
        toast.error(`Only ${product.stock} units available`);
        return prev;
      }

      toast.success('Added to cart! 🛒', {
        icon: '✅',
        duration: 2000,
      });
      return [...prev, {
        _id: product._id,
        name: product.name,
        price: product.discountPrice || product.price,
        originalPrice: product.price,
        image: product.images?.[0]?.url || '',
        stock: product.stock,
        slug: product.slug,
        codAvailable: product.codAvailable !== false,
        quantity,
      }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item._id !== productId));
    toast.success('Removed from cart');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        if (item._id === productId) {
          if (quantity > item.stock) {
            toast.error(`Only ${item.stock} units available`);
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const isInCart = (productId) => cartItems.some(item => item._id === productId);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 499 ? 0 : 49;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      subtotal,
      shipping,
      tax,
      total,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
